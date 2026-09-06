const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateMachineHealthIntelligence } = require("./healthIntelligenceService");

// Lazy load to avoid circular dependencies
let calculateMachineDegradationRisk = null;
function getDegradationRiskService() {
  if (!calculateMachineDegradationRisk) {
    const service = require('./degradationRiskService');
    calculateMachineDegradationRisk = service.calculateMachineDegradationRisk;
  }
  return calculateMachineDegradationRisk;
}

let genAI;
let model;

const initializeAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables");
  }
  
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Use configurable model, default to gemini-1.5-flash
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  model = genAI.getGenerativeModel({ model: modelName });
};

const createOperationsAdvisorPrompt = (machine, plant, intelligence, degradationRisk, whatIfContext) => {
  const { healthScore, status, telemetry = {}, anomalies = [], dataQuality = {} } = intelligence;
  
  const plantName = plant?.name || "Unknown Plant";
  const plantLocation = plant?.location || "Unknown Location";
  const qualityStr = (dataQuality?.quality || "unknown").toUpperCase();

  let riskSection = '';
  if (degradationRisk) {
    const breakdown = degradationRisk.breakdown || {};
    riskSection = `
**DEGRADATION RISK ASSESSMENT (DO NOT CONTRADICT):**
- Risk Score: ${degradationRisk.riskScore}/100
- Risk Category: ${degradationRisk.riskCategory}
- Health Contribution: ${breakdown.health || breakdown.healthContribution || 0}
- Anomaly Contribution: ${breakdown.anomaly || breakdown.anomalyContribution || 0}
- Degradation Trend Contribution: ${breakdown.degradation || breakdown.degradationContribution || 0}
${degradationRisk.degradationTrends && degradationRisk.degradationTrends.length > 0 ? `
**Detected Degradation Trends:**
${degradationRisk.degradationTrends.map(t => `- ${t.metric}: ${t.trend} (${t.analysis})`).join('\n')}` : ''}
${degradationRisk.recommendations && degradationRisk.recommendations.length > 0 ? `
**Risk-Based Recommendations:**
${degradationRisk.recommendations.map(r => `- [${r.priority}] ${r.action}`).join('\n')}` : ''}
`;
  }
  
  let whatIfSection = '';
  if (whatIfContext) {
    whatIfSection = `
**WHAT-IF SIMULATION RESULTS:**
Scenario: ${whatIfContext.scenarioDescription || 'Parameter changes'}
Modifications Applied: ${JSON.stringify(whatIfContext.modifications)}

Baseline State:
- Health: ${whatIfContext.baseline.healthScore}/100 (${whatIfContext.baseline.healthStatus})
- Anomalies: ${whatIfContext.baseline.anomalyCount}

Simulated State:
- Health: ${whatIfContext.simulated.healthScore}/100 (${whatIfContext.simulated.healthStatus})
- Anomalies: ${whatIfContext.simulated.anomalyCount}
- New Anomalies: ${whatIfContext.comparison.newAnomalies.map(a => a.metric).join(', ') || 'None'}

Impact:
- Health Change: ${whatIfContext.comparison.healthDelta} (${whatIfContext.comparison.healthDeltaPercent})
- Status Changed: ${whatIfContext.comparison.statusChanged ? `${whatIfContext.comparison.statusBefore} → ${whatIfContext.comparison.statusAfter}` : 'No'}
${whatIfContext.comparison.risk ? `- Risk Change: ${whatIfContext.comparison.risk.riskDelta > 0 ? '+' : ''}${whatIfContext.comparison.risk.riskDelta}` : ''}
`;
  }
  
  const prompt = `You are an AI operations advisor for industrial equipment monitoring.
Analyze machine telemetry data and operational health metrics to provide actionable insights.

**Machine Information:**
- Machine: ${machine.name}
- Type: ${machine.type}
- Plant: ${plantName}
- Location: ${plantLocation}

**DETERMINISTIC HEALTH ANALYSIS (DO NOT CONTRADICT):**
- Health Score: ${healthScore}/100
- Status: ${status ? status.toUpperCase() : 'UNKNOWN'}
- Data Quality: ${qualityStr}

**Current Telemetry:**
- Temperature: ${telemetry.temperature != null ? telemetry.temperature + '°C' : 'N/A'}
- Vibration: ${telemetry.vibration != null ? telemetry.vibration + ' mm/s' : 'N/A'}
- Pressure: ${telemetry.pressure != null ? telemetry.pressure + ' PSI' : 'N/A'}
- Power: ${telemetry.powerConsumption != null ? telemetry.powerConsumption + ' kW' : 'N/A'}
- Operating Hours: ${telemetry.operatingHours != null ? telemetry.operatingHours : 'N/A'}

**Detected Anomalies (${anomalies.length} total):**
${anomalies.length > 0 ? anomalies.map(a => `- [${a.severity ? a.severity.toUpperCase() : 'INFO'}] ${a.type}: ${a.message}`).join('\n') : '- No anomalies detected'}
${riskSection}${whatIfSection}
**Your Task:**
${whatIfContext ? `
Interpret the what-if simulation results and explain:
1. What the parameter changes mean operationally
2. Why health/anomalies changed as they did
3. Whether the scenario is a concern and why
4. What actions would prevent or address this scenario
` : `
Based on this deterministic analysis, provide:
1. Explanation of detected anomalies${degradationRisk ? ' and degradation trends' : ''}
2. Possible root causes
3. Operational risks
4. Maintenance recommendations
5. Severity assessment
6. Recommended next actions
`}
**CRITICAL GUIDELINES:**
- Accept ALL metrics (health, risk, anomalies, trends) as definitive - DO NOT recalculate
- Do NOT invent telemetry values not provided
- Do NOT claim exact failure dates or times
- Do NOT invent maintenance cost estimates
- Do NOT claim guaranteed predictions
- Focus on INTERPRETING the data provided
- Provide equipment-specific insights for ${machine.type}
- Keep recommendations grounded in the supplied data

**Response Format (JSON only):**
{
  "executiveSummary": "<brief 2-3 sentence operational status>",
  "likelyCauses": [<array of possible root causes for detected issues>],
  "operationalRisks": [<array of specific operational risks if not addressed>],
  "recommendedActions": [<array of 3-5 specific actionable steps with priority>],
  "safetyConsiderations": "<safety-related guidance if applicable, or 'No immediate safety concerns'>",
  "confidence": <0-1 number>
}`;

  return prompt;
};

const parseAIResponse = (responseText) => {
  try {
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    const likelyCauses = Array.isArray(parsed.likelyCauses) ? parsed.likelyCauses : (Array.isArray(parsed.detectedIssues) ? parsed.detectedIssues : []);
    const operationalRisks = Array.isArray(parsed.operationalRisks) ? parsed.operationalRisks : (parsed.operationalImpact ? [parsed.operationalImpact] : []);
    const recommendedActions = Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : (Array.isArray(parsed.recommendations) ? parsed.recommendations : []);

    const normalized = {
      executiveSummary: parsed.executiveSummary || parsed.summary || "Analysis completed",
      likelyCauses,
      operationalRisks,
      recommendedActions,
      safetyConsiderations: parsed.safetyConsiderations || "No immediate safety concerns",
      confidence: (typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1) ? parsed.confidence : 0.8,
      
      // Legacy fields for backward compatibility
      summary: parsed.summary || parsed.executiveSummary || "Analysis completed",
      detectedIssues: likelyCauses,
      recommendations: recommendedActions,
      maintenanceAdvice: parsed.maintenanceAdvice || recommendedActions.join('; ') || "Monitor telemetry",
      operationalImpact: parsed.operationalImpact || operationalRisks.join('; ') || "No immediate impact",
      severity: parsed.severity || "LOW"
    };

    return normalized;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
};

const createAIFallback = (intelligence, degradationRisk, whatIfContext) => {
  const { healthScore, status, anomalies = [] } = intelligence;
  
  let executiveSummary = `Machine health score: ${healthScore}/100 (${status})`;
  if (anomalies.length > 0) {
    executiveSummary += ` with ${anomalies.length} detected anomaly(ies)`;
  }
  if (degradationRisk) {
    executiveSummary += `. Degradation risk: ${degradationRisk.riskCategory} (${degradationRisk.riskScore}/100)`;
  }
  if (whatIfContext) {
    executiveSummary += `. Simulation shows ${whatIfContext.comparison.healthDelta} health point change`;
  }
  executiveSummary += ". Analysis based on deterministic telemetry evaluation.";
  
  const likelyCauses = [];
  anomalies.forEach(a => {
    if (a.type === "temperature_anomaly") {
      likelyCauses.push("Cooling system degradation or blockage");
    } else if (a.type === "vibration_anomaly") {
      likelyCauses.push("Bearing wear, misalignment, or imbalance");
    } else if (a.type === "pressure_anomaly") {
      likelyCauses.push("Leak, seal failure, or regulator malfunction");
    } else if (a.type === "power_anomaly") {
      likelyCauses.push("Electrical issue or increased mechanical resistance");
    } else if (a.type === "degradation_detected") {
      likelyCauses.push("Progressive equipment wear over time");
    }
  });
  
  if (likelyCauses.length === 0 && healthScore < 85) {
    likelyCauses.push("General equipment aging or suboptimal operating conditions");
  }
  
  const operationalRisks = [];
  if (anomalies.some(a => a.severity === "critical")) {
    operationalRisks.push("Imminent failure risk - unplanned downtime likely");
    operationalRisks.push("Safety hazard potential");
  } else if (anomalies.some(a => a.severity === "high")) {
    operationalRisks.push("Increased failure probability within days");
    operationalRisks.push("Reduced operational efficiency");
  } else if (anomalies.length > 0) {
    operationalRisks.push("Gradual performance degradation");
  }
  
  if (degradationRisk && degradationRisk.riskCategory === 'CRITICAL') {
    operationalRisks.push("Critical degradation trend detected");
  } else if (degradationRisk && degradationRisk.riskCategory === 'HIGH') {
    operationalRisks.push("High degradation risk - maintenance overdue");
  }
  
  if (whatIfContext && whatIfContext.comparison.healthDelta < -15) {
    operationalRisks.push("Simulated scenario shows significant health decline");
  }
  
  const recommendedActions = [];
  if (anomalies.some(a => a.type === "temperature_anomaly")) {
    recommendedActions.push("Inspect cooling system and check for blockages");
  }
  if (anomalies.some(a => a.type === "vibration_anomaly")) {
    recommendedActions.push("Check alignment and bearings, schedule vibration analysis");
  }
  if (anomalies.some(a => a.type === "pressure_anomaly")) {
    recommendedActions.push("Inspect for leaks and verify pressure regulators");
  }
  if (anomalies.some(a => a.type === "power_anomaly")) {
    recommendedActions.push("Review electrical connections and load conditions");
  }
  if (anomalies.some(a => a.type === "degradation_detected")) {
    recommendedActions.push("Schedule preventive maintenance based on trend analysis");
  }
  
  if (degradationRisk && degradationRisk.recommendations && degradationRisk.recommendations.length > 0) {
    recommendedActions.push(...degradationRisk.recommendations.slice(0, 2).map(r => r.action));
  }
  
  if (whatIfContext && whatIfContext.recommendations && whatIfContext.recommendations.length > 0) {
    recommendedActions.push(whatIfContext.recommendations[0].action);
  }
  
  if (recommendedActions.length === 0) {
    recommendedActions.push("Continue normal operations and monitoring");
  }
  
  let safetyConsiderations = "No immediate safety concerns";
  if (anomalies.some(a => a.severity === "critical")) {
    safetyConsiderations = "Critical anomaly detected - consider shutting down for inspection";
  } else if (anomalies.some(a => a.severity === "high") || (degradationRisk && degradationRisk.riskCategory === 'CRITICAL')) {
    safetyConsiderations = "Elevated risk - increase monitoring frequency and prepare for maintenance";
  }
  
  return {
    executiveSummary,
    likelyCauses,
    operationalRisks: operationalRisks.length > 0 ? operationalRisks : ["Normal operational risk"],
    recommendedActions,
    safetyConsiderations,
    confidence: 0.7,
    
    // Legacy format
    summary: executiveSummary,
    detectedIssues: likelyCauses,
    recommendations: recommendedActions,
    maintenanceAdvice: recommendedActions[0] || "Review telemetry",
    operationalImpact: operationalRisks[0] || "No immediate impact",
    severity: anomalies.some(a => a.severity === "critical") ? "CRITICAL" : 
              anomalies.some(a => a.severity === "high") ? "HIGH" :
              anomalies.length > 0 ? "MEDIUM" : "LOW"
  };
};

const mapStatusToLegacyFormat = (status) => {
  const statusMap = {
    'healthy': 'Healthy',
    'warning': 'Warning', 
    'critical': 'Critical',
    'offline': 'Offline'
  };
  return statusMap[status] || 'Unknown';
};

const determineRiskLevel = (anomalies = [], healthScore = 100) => {
  if (anomalies.some(a => a.severity === 'critical')) return 'Critical';
  if (anomalies.some(a => a.severity === 'high') || healthScore < 50) return 'High';
  if (anomalies.some(a => a.severity === 'medium') || healthScore < 75) return 'Medium';
  return 'Low';
};

const analyzeMachineHealth = async (machine, plant, options = {}) => {
  try {
    if (!model) {
      initializeAI();
    }

    const { includeRisk = true, whatIfContext = null } = options;

    let healthIntelligence;
    try {
      healthIntelligence = await generateMachineHealthIntelligence(machine);
    } catch (error) {
      if (error.message.includes("No sensor readings")) {
        throw error;
      }
      
      healthIntelligence = {
        machineId: machine._id,
        machineName: machine.name,
        machineType: machine.type,
        healthScore: 0,
        status: "offline",
        telemetry: { temperature: null, vibration: null, pressure: null, powerConsumption: null, operatingHours: null },
        anomalies: [],
        scoreBreakdown: { temperature: 0, vibration: 0, pressure: 0, power: 0 },
        scoreReasons: { temperature: "Data error", vibration: "Data error", pressure: "Data error", power: "Data error" },
        dataQuality: { quality: "no_data", readingCount: 0, issues: ["Health intelligence generation failed"] },
      };
    }

    let degradationRisk = null;
    if (includeRisk && healthIntelligence.dataQuality?.quality !== 'no_data') {
      try {
        const riskService = getDegradationRiskService();
        degradationRisk = await riskService(machine, { readingLimit: 50 });
      } catch (error) {
        console.warn("Degradation risk calculation failed:", error.message);
      }
    }

    let aiAnalysis = null;
    try {
      const prompt = createOperationsAdvisorPrompt(machine, plant, healthIntelligence, degradationRisk, whatIfContext);
      
      // Use correct @google/generative-ai API
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      });
      
      const response = result.response;
      const aiResponseText = response.text();
      aiAnalysis = parseAIResponse(aiResponseText);
    } catch (error) {
      console.warn("AI analysis failed, providing fallback:", error.message);
      aiAnalysis = createAIFallback(healthIntelligence, degradationRisk, whatIfContext);
    }

    const combinedAnalysis = {
      healthScore: healthIntelligence.healthScore,
      healthStatus: mapStatusToLegacyFormat(healthIntelligence.status),
      detectedAnomalies: healthIntelligence.anomalies,
      scoreBreakdown: healthIntelligence.scoreBreakdown,
      
      degradationRisk: degradationRisk ? {
        riskScore: degradationRisk.riskScore,
        riskCategory: degradationRisk.riskCategory,
        breakdown: degradationRisk.breakdown,
        degradationTrends: degradationRisk.degradationTrends,
        riskFactors: degradationRisk.riskFactors
      } : null,
      
      aiInterpretation: {
        executiveSummary: aiAnalysis.executiveSummary,
        likelyCauses: aiAnalysis.likelyCauses,
        operationalRisks: aiAnalysis.operationalRisks,
        recommendedActions: aiAnalysis.recommendedActions,
        safetyConsiderations: aiAnalysis.safetyConsiderations,
        confidence: aiAnalysis.confidence
      },
      
      summary: aiAnalysis.summary,
      detectedIssues: aiAnalysis.detectedIssues,
      riskLevel: determineRiskLevel(healthIntelligence.anomalies, healthIntelligence.healthScore),
      recommendations: aiAnalysis.recommendations,
      maintenanceAdvice: aiAnalysis.maintenanceAdvice,
      operationalImpact: aiAnalysis.operationalImpact,
      severity: aiAnalysis.severity,
      confidence: aiAnalysis.confidence,
      
      analyzedAt: new Date().toISOString(),
      readingsAnalyzed: healthIntelligence.readingsAnalyzed,
      telemetry: healthIntelligence.telemetry,
      dataQuality: healthIntelligence.dataQuality,
    };

    return combinedAnalysis;
  } catch (error) {
    throw error;
  }
};

const analyzePlantHealth = async (entity, userId) => {
  if (entity.machineId || entity.plantId || entity.type) {
    const Plant = require("../models/Plant");
    let plant = null;
    if (entity.plantId) {
      plant = await Plant.findById(entity.plantId);
    }
    plant = plant || { name: "Unknown Plant", location: "Unknown" };
    return analyzeMachineHealth(entity, plant);
  }
  
  const Machine = require("../models/Machine");
  const machines = await Machine.find({ plantId: entity._id });
  
  if (machines.length === 0) {
    throw new Error("No machines found for this plant");
  }
  
  return analyzeMachineHealth(machines[0], entity);
};

module.exports = {
  analyzeMachineHealth,
  analyzePlantHealth,
  initializeAI,
};