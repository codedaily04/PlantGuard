const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateMachineHealthIntelligence } = require("./healthIntelligenceService");

let genAI;
let model;

const initializeAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables");
  }
  
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
};

const createOperationsAdvisorPrompt = (machine, plant, intelligence) => {
  const { healthScore, status, telemetry, anomalies, dataQuality } = intelligence;
  
  const prompt = `You are an AI operations advisor for industrial equipment monitoring.
Analyze machine telemetry data and operational health metrics to provide actionable insights.

**Machine Information:**
- Machine: ${machine.name}
- Type: ${machine.type}
- Plant: ${plant.name}
- Location: ${plant.location}

**DETERMINISTIC HEALTH ANALYSIS (DO NOT CONTRADICT):**
- Health Score: ${healthScore}/100
- Status: ${status.toUpperCase()}
- Data Quality: ${dataQuality.quality.toUpperCase()}

**Current Telemetry:**
- Temperature: ${telemetry.temperature != null ? telemetry.temperature + '°C' : 'N/A'}
- Vibration: ${telemetry.vibration != null ? telemetry.vibration + ' mm/s' : 'N/A'}
- Pressure: ${telemetry.pressure != null ? telemetry.pressure + ' PSI' : 'N/A'}
- Power: ${telemetry.powerConsumption != null ? telemetry.powerConsumption + ' kW' : 'N/A'}
- Operating Hours: ${telemetry.operatingHours != null ? telemetry.operatingHours : 'N/A'}

**Detected Anomalies (${anomalies.length} total):**
${anomalies.length > 0 ? anomalies.map(a => `- [${a.severity.toUpperCase()}] ${a.type}: ${a.message}`).join('\n') : '- No anomalies detected'}

**Your Task:**
Based on this deterministic analysis, provide:
1. Explanation of detected anomalies
2. Possible root causes
3. Operational risks
4. Maintenance recommendations
5. Severity assessment
6. Recommended next actions

**Guidelines:**
- Accept the health score and anomalies as definitive
- Do NOT recalculate or contradict the metrics
- Focus on EXPLAINING the anomalies
- Provide equipment-specific recommendations
- Be specific about maintenance timing and actions
- Consider equipment type: ${machine.type}

**Response Format (JSON only):**
{
  "summary": "<brief operational status explanation>",
  "detectedIssues": [<issues based on anomalies above>],
  "recommendations": [<3-5 specific actionable recommendations>],
  "maintenanceAdvice": "<specific maintenance guidance>",
  "operationalImpact": "<impact on operations if not addressed>",
  "severity": "<LOW/MEDIUM/HIGH/CRITICAL>",
  "confidence": <0-1>
}

Respond ONLY with JSON. No markdown.`;

  return prompt;
};

const parseAIResponse = (responseText) => {
  try {
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    const required = ['summary', 'recommendations', 'confidence'];
    for (const field of required) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      parsed.confidence = 0.8;
    }

    if (!Array.isArray(parsed.detectedIssues)) {
      parsed.detectedIssues = [];
    }

    if (!Array.isArray(parsed.recommendations)) {
      parsed.recommendations = [];
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
};

const createAIFallback = (intelligence) => {
  const { healthScore, status, anomalies } = intelligence;
  
  let summary = `Machine health score: ${healthScore}/100 (${status})`;
  if (anomalies.length > 0) {
    summary += ` with ${anomalies.length} detected anomaly(ies)`;
  }
  summary += ". Analysis based on deterministic telemetry evaluation.";
  
  const detectedIssues = anomalies.map(a => a.message);
  
  const recommendations = [];
  if (anomalies.some(a => a.type === "temperature_anomaly")) {
    recommendations.push("Inspect cooling system and check for blockages");
  }
  if (anomalies.some(a => a.type === "vibration_anomaly")) {
    recommendations.push("Check alignment and bearings, schedule vibration analysis");
  }
  if (anomalies.some(a => a.type === "pressure_anomaly")) {
    recommendations.push("Inspect for leaks and verify pressure regulators");
  }
  if (anomalies.some(a => a.type === "power_anomaly")) {
    recommendations.push("Review electrical connections and load conditions");
  }
  if (anomalies.some(a => a.type === "degradation_detected")) {
    recommendations.push("Schedule preventive maintenance based on trend analysis");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue normal operations and monitoring");
  }
  
  let maintenanceAdvice = "Review telemetry and schedule inspection";
  let operationalImpact = "Continued operation possible, monitor closely";
  let severity = "MEDIUM";
  
  if (anomalies.some(a => a.severity === "critical")) {
    maintenanceAdvice = "Immediate inspection required";
    operationalImpact = "High risk of failure, consider shutting down for maintenance";
    severity = "CRITICAL";
  } else if (anomalies.some(a => a.severity === "high")) {
    maintenanceAdvice = "Schedule maintenance within 24-48 hours";
    operationalImpact = "Degraded performance, maintenance needed soon";
    severity = "HIGH";
  } else if (anomalies.length === 0) {
    severity = "LOW";
  }
  
  return {
    summary,
    detectedIssues,
    recommendations,
    maintenanceAdvice,
    operationalImpact,
    severity,
    confidence: 0.7
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

const determineRiskLevel = (anomalies, healthScore) => {
  if (anomalies.some(a => a.severity === 'critical')) return 'Critical';
  if (anomalies.some(a => a.severity === 'high') || healthScore < 50) return 'High';
  if (anomalies.some(a => a.severity === 'medium') || healthScore < 75) return 'Medium';
  return 'Low';
};

/**
 * Main function to analyze machine health using deterministic intelligence + AI
 */
const analyzeMachineHealth = async (machine, plant) => {
  try {
    if (!model) {
      initializeAI();
    }

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

    let aiAnalysis = null;
    try {
      const prompt = createOperationsAdvisorPrompt(machine, plant, healthIntelligence);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponseText = response.text();
      aiAnalysis = parseAIResponse(aiResponseText);
    } catch (error) {
      console.warn("AI analysis failed, providing fallback:", error.message);
      aiAnalysis = createAIFallback(healthIntelligence);
    }

    const combinedAnalysis = {
      // Deterministic data (source of truth)
      healthScore: healthIntelligence.healthScore,
      healthStatus: mapStatusToLegacyFormat(healthIntelligence.status),
      detectedAnomalies: healthIntelligence.anomalies,
      scoreBreakdown: healthIntelligence.scoreBreakdown,
      
      // AI contextual analysis
      summary: aiAnalysis.summary || "Analysis completed",
      detectedIssues: aiAnalysis.detectedIssues || [],
      riskLevel: determineRiskLevel(healthIntelligence.anomalies, healthIntelligence.healthScore),
      recommendations: aiAnalysis.recommendations || [],
      maintenanceAdvice: aiAnalysis.maintenanceAdvice || "Monitor telemetry",
      operationalImpact: aiAnalysis.operationalImpact || "No immediate impact",
      severity: aiAnalysis.severity || "LOW",
      confidence: aiAnalysis.confidence || 0.8,
      
      // Metadata
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

/**
 * Legacy compatibility wrapper
 */
const analyzePlantHealth = async (entity, userId) => {
  // If entity is a machine
  if (entity.machineId) {
    const Plant = require("../models/Plant");
    const plant = entity.plantId 
      ? await Plant.findById(entity.plantId)
      : { name: "Unknown Plant", location: "Unknown" };
    return analyzeMachineHealth(entity, plant);
  }
  
  // If entity is a plant, analyze all its machines
  const Machine = require("../models/Machine");
  const machines = await Machine.find({ plantId: entity._id });
  
  if (machines.length === 0) {
    throw new Error("No machines found for this plant");
  }
  
  // Analyze first machine as default
  return analyzeMachineHealth(machines[0], entity);
};

module.exports = {
  analyzeMachineHealth,
  analyzePlantHealth,
  initializeAI,
};
