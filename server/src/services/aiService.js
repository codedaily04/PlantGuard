const { GoogleGenerativeAI } = require("@google/generative-ai");
const { generateHealthIntelligence } = require("./healthIntelligenceService");

// Initialize Gemini AI
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

/**
 * Create structured prompt for AI analysis based on deterministic intelligence
 */
const createEnhancedAnalysisPrompt = (plant, intelligence) => {
  const { healthScore, status, scoreBreakdown, scoreReasons, detectedRisks, sensorSnapshot, dataQuality } = intelligence;
  
  const prompt = `You are an expert plant health advisor. Analyze the following plant health data and provide contextual explanations and actionable recommendations.

**Plant Information:**
- Name: ${plant.name}
- Species: ${plant.species}
- Crop Type: ${plant.cropType}
- Growth Stage: ${plant.growthStage}
- Age: ${intelligence.plantInfo.ageInDays} days
- Location: ${plant.location}

**DETERMINISTIC HEALTH ANALYSIS (DO NOT CONTRADICT THESE FINDINGS):**
- Overall Health Score: ${healthScore}/100
- Health Status: ${status.toUpperCase()}
- Data Quality: ${dataQuality.quality.toUpperCase()} (${dataQuality.completeness.toFixed(1)}% complete)

**Current Sensor Readings:**
- Temperature: ${sensorSnapshot.temperature != null ? sensorSnapshot.temperature + '°C' : 'Not available'}
- Humidity: ${sensorSnapshot.humidity != null ? sensorSnapshot.humidity + '%' : 'Not available'}
- Soil Moisture: ${sensorSnapshot.soilMoisture != null ? sensorSnapshot.soilMoisture + '%' : 'Not available'}
- Soil pH: ${sensorSnapshot.ph != null ? sensorSnapshot.ph : 'Not available'}
- Light Intensity: ${sensorSnapshot.light != null ? sensorSnapshot.light + ' lux' : 'Not available'}

**Score Breakdown & Reasoning:**
- Soil Moisture: ${scoreBreakdown.soilMoisture}/20 points - ${scoreReasons.soilMoisture}
- Temperature: ${scoreBreakdown.temperature}/20 points - ${scoreReasons.temperature}
- Humidity: ${scoreBreakdown.humidity}/20 points - ${scoreReasons.humidity}
- pH: ${scoreBreakdown.ph}/20 points - ${scoreReasons.ph}
- Light: ${scoreBreakdown.light}/20 points - ${scoreReasons.light}

**Detected Health Risks (${detectedRisks.length} total):**
${detectedRisks.length > 0 ? detectedRisks.map(r => `- [${r.severity.toUpperCase()}] ${r.type}: ${r.message}`).join('\n') : '- No significant risks detected'}

**Your Task:**
Based on this deterministic analysis, provide:
1. A clear summary explaining the plant's condition
2. Contextual interpretation of the findings
3. Specific, actionable recommendations
4. Irrigation guidance
5. Environmental management advice

**Important Guidelines:**
- Accept the health score and status as definitive
- Do not recalculate or contradict the health metrics
- Focus on explaining WHY these conditions exist
- Provide practical, species-appropriate recommendations
- Consider the plant's growth stage and age
- Be specific about timing and quantities for recommendations

**Required JSON Response Format:**
{
  "summary": "<2-3 sentence overview explaining the plant's current condition>",
  "detectedIssues": [<array of issues found, based on the risks above>],
  "recommendations": [<array of 3-5 specific actionable recommendations>],
  "irrigationAdvice": "<specific watering guidance with frequency/amount>",
  "environmentalAdvice": "<specific environmental control guidance>",
  "confidence": <number 0-1 indicating your confidence in this analysis>
}

Respond ONLY with the JSON object. No markdown formatting or additional text.`;

  return prompt;
};

/**
 * Parse and validate AI response
 */
const parseAIResponse = (responseText) => {
  try {
    // Remove markdown code blocks if present
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    // Validate required fields for new format
    const required = ['summary', 'recommendations', 'confidence'];
    for (const field of required) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate types
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      parsed.confidence = 0.8; // Fallback value
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

/**
 * Create AI fallback when Gemini fails
 */
const createAIFallback = (intelligence) => {
  const { healthScore, status, detectedRisks, sensorSnapshot } = intelligence;
  
  let summary = `Plant health score is ${healthScore}/100 (${status})`;
  if (detectedRisks.length > 0) {
    summary += ` with ${detectedRisks.length} detected risk(s)`;
  }
  summary += ". Analysis based on deterministic sensor evaluation.";
  
  const detectedIssues = detectedRisks.map(risk => risk.message);
  
  const recommendations = [];
  if (detectedRisks.some(r => r.type === "water_stress")) {
    recommendations.push("Increase watering frequency based on soil moisture levels");
  }
  if (detectedRisks.some(r => r.type === "heat_stress")) {
    recommendations.push("Provide shade or cooling during peak temperature hours");
  }
  if (detectedRisks.some(r => r.type === "fungal_risk")) {
    recommendations.push("Improve air circulation and monitor for fungal symptoms");
  }
  if (detectedRisks.some(r => r.type === "ph_abnormal")) {
    recommendations.push("Test and adjust soil pH levels");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue current care routine");
  }
  
  let irrigationAdvice = "Monitor soil moisture levels regularly";
  if (sensorSnapshot.soilMoisture != null) {
    if (sensorSnapshot.soilMoisture < 30) {
      irrigationAdvice = "Water immediately - soil moisture is critically low";
    } else if (sensorSnapshot.soilMoisture < 40) {
      irrigationAdvice = "Water within 24 hours - soil moisture is low";
    } else if (sensorSnapshot.soilMoisture > 70) {
      irrigationAdvice = "Reduce watering frequency - soil moisture is high";
    }
  }
  
  let environmentalAdvice = "Maintain stable growing conditions";
  if (sensorSnapshot.temperature != null) {
    if (sensorSnapshot.temperature > 32) {
      environmentalAdvice = "Provide cooling - temperature is too high";
    } else if (sensorSnapshot.temperature < 15) {
      environmentalAdvice = "Provide warming - temperature is too low";
    }
  }
  
  return {
    summary,
    detectedIssues,
    recommendations,
    irrigationAdvice,
    environmentalAdvice,
    confidence: 0.7 // Lower confidence for fallback
  };
};

/**
 * Map new status format to legacy format
 */
const mapStatusToLegacyFormat = (status) => {
  const statusMap = {
    'excellent': 'Healthy',
    'healthy': 'Healthy', 
    'stressed': 'Moderate Stress',
    'critical': 'Critical',
    'unknown': 'At Risk'
  };
  return statusMap[status] || 'At Risk';
};

/**
 * Determine risk level based on detected risks and health score
 */
const determineRiskLevel = (detectedRisks, healthScore) => {
  if (detectedRisks.some(r => r.severity === 'critical')) return 'Critical';
  if (detectedRisks.some(r => r.severity === 'high') || healthScore < 50) return 'High';
  if (detectedRisks.some(r => r.severity === 'medium') || healthScore < 75) return 'Medium';
  return 'Low';
};

/**
 * Main function to analyze plant health using deterministic intelligence + AI
 */
const analyzePlantHealth = async (plant, userId) => {
  try {
    // Initialize AI if not already done
    if (!model) {
      initializeAI();
    }

    let healthIntelligence;
    try {
      // Generate deterministic health intelligence
      healthIntelligence = await generateHealthIntelligence(plant);
    } catch (error) {
      // If health intelligence fails, still try to proceed with basic data
      if (error.message.includes("No sensor readings")) {
        throw error; // Rethrow this specific error
      }
      
      // For other health intelligence errors, create a fallback
      healthIntelligence = {
        healthScore: 0,
        status: "unknown",
        scoreBreakdown: { soilMoisture: 0, temperature: 0, humidity: 0, ph: 0, light: 0 },
        scoreReasons: { soilMoisture: "Data error", temperature: "Data error", humidity: "Data error", ph: "Data error", light: "Data error" },
        detectedRisks: [],
        riskCount: 0,
        sensorSnapshot: { temperature: null, humidity: null, soilMoisture: null, ph: null, light: null },
        dataQuality: { quality: "no_data", readingCount: 0, availableSensors: 0, completeness: 0, issues: ["Health intelligence generation failed"] },
        plantInfo: {
          name: plant.name,
          species: plant.species,
          ageInDays: Math.floor((Date.now() - new Date(plant.plantingDate)) / (1000 * 60 * 60 * 24))
        }
      };
    }

    let aiAnalysis = null;
    try {
      // Create AI prompt with deterministic intelligence
      const prompt = createEnhancedAnalysisPrompt(plant, healthIntelligence);

      // Call Gemini AI
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponseText = response.text();

      // Parse AI response
      aiAnalysis = parseAIResponse(aiResponseText);
      
    } catch (error) {
      console.warn("AI analysis failed, providing fallback:", error.message);
      
      // AI fallback - provide basic interpretation based on deterministic intelligence
      aiAnalysis = createAIFallback(healthIntelligence);
    }

    // Combine deterministic intelligence with AI analysis
    const combinedAnalysis = {
      // Deterministic data (source of truth)
      healthScore: healthIntelligence.healthScore,
      healthStatus: mapStatusToLegacyFormat(healthIntelligence.status),
      detectedRisks: healthIntelligence.detectedRisks,
      scoreBreakdown: healthIntelligence.scoreBreakdown,
      
      // AI contextual analysis
      summary: aiAnalysis.summary || "Analysis completed",
      detectedIssues: aiAnalysis.detectedIssues || [],
      riskLevel: determineRiskLevel(healthIntelligence.detectedRisks, healthIntelligence.healthScore),
      recommendations: aiAnalysis.recommendations || [],
      irrigationAdvice: aiAnalysis.irrigationAdvice || "Monitor soil moisture levels",
      environmentalAdvice: aiAnalysis.environmentalAdvice || "Maintain stable conditions",
      confidence: aiAnalysis.confidence || 0.8,
      
      // Metadata
      analyzedAt: new Date().toISOString(),
      readingsAnalyzed: healthIntelligence.dataQuality.readingCount,
      sensorStatistics: healthIntelligence.sensorSnapshot,
      dataQuality: healthIntelligence.dataQuality,
    };

    return combinedAnalysis;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  analyzePlantHealth,
  initializeAI,
};
