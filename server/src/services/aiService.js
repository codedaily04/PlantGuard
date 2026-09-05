const { GoogleGenerativeAI } = require("@google/generative-ai");
const PlantSensorReading = require("../models/PlantSensorReading");

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
 * Calculate statistics from sensor readings
 */
const calculateSensorStatistics = (readings) => {
  if (!readings || readings.length === 0) {
    return null;
  }

  const stats = {
    temperature: { values: [], avg: null, min: null, max: null, latest: null },
    humidity: { values: [], avg: null, min: null, max: null, latest: null },
    soilMoisture: { values: [], avg: null, min: null, max: null, latest: null },
    soilPH: { values: [], avg: null, min: null, max: null, latest: null },
    lightIntensity: { values: [], avg: null, min: null, max: null, latest: null },
  };

  // Collect values
  readings.forEach((reading) => {
    if (reading.temperature != null) stats.temperature.values.push(reading.temperature);
    if (reading.humidity != null) stats.humidity.values.push(reading.humidity);
    if (reading.soilMoisture != null) stats.soilMoisture.values.push(reading.soilMoisture);
    if (reading.soilPH != null) stats.soilPH.values.push(reading.soilPH);
    if (reading.lightIntensity != null) stats.lightIntensity.values.push(reading.lightIntensity);
  });

  // Calculate statistics for each metric
  Object.keys(stats).forEach((metric) => {
    const values = stats[metric].values;
    if (values.length > 0) {
      stats[metric].latest = values[0]; // Latest reading is first (sorted by timestamp desc)
      stats[metric].avg = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
      stats[metric].min = parseFloat(Math.min(...values).toFixed(2));
      stats[metric].max = parseFloat(Math.max(...values).toFixed(2));
      
      // Calculate trend (comparing recent vs older readings)
      if (values.length >= 10) {
        const recentAvg = values.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const olderAvg = values.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const difference = recentAvg - olderAvg;
        
        if (Math.abs(difference) > 0.1) {
          stats[metric].trend = difference > 0 ? "increasing" : "decreasing";
          stats[metric].trendValue = parseFloat(difference.toFixed(2));
        } else {
          stats[metric].trend = "stable";
          stats[metric].trendValue = 0;
        }
      }
    }
  });

  return stats;
};

/**
 * Detect abnormal readings based on typical plant conditions
 */
const detectAbnormalConditions = (stats) => {
  const abnormalities = [];

  // Temperature checks (typical range: 15-30°C)
  if (stats.temperature.latest != null) {
    if (stats.temperature.latest < 10) {
      abnormalities.push({ metric: "temperature", issue: "critically low", value: stats.temperature.latest });
    } else if (stats.temperature.latest < 15) {
      abnormalities.push({ metric: "temperature", issue: "low", value: stats.temperature.latest });
    } else if (stats.temperature.latest > 35) {
      abnormalities.push({ metric: "temperature", issue: "critically high", value: stats.temperature.latest });
    } else if (stats.temperature.latest > 30) {
      abnormalities.push({ metric: "temperature", issue: "high", value: stats.temperature.latest });
    }
  }

  // Humidity checks (typical range: 40-70%)
  if (stats.humidity.latest != null) {
    if (stats.humidity.latest < 30) {
      abnormalities.push({ metric: "humidity", issue: "very low", value: stats.humidity.latest });
    } else if (stats.humidity.latest < 40) {
      abnormalities.push({ metric: "humidity", issue: "low", value: stats.humidity.latest });
    } else if (stats.humidity.latest > 80) {
      abnormalities.push({ metric: "humidity", issue: "very high", value: stats.humidity.latest });
    } else if (stats.humidity.latest > 70) {
      abnormalities.push({ metric: "humidity", issue: "high", value: stats.humidity.latest });
    }
  }

  // Soil moisture checks (typical range: 40-60%)
  if (stats.soilMoisture.latest != null) {
    if (stats.soilMoisture.latest < 20) {
      abnormalities.push({ metric: "soilMoisture", issue: "critically low", value: stats.soilMoisture.latest });
    } else if (stats.soilMoisture.latest < 30) {
      abnormalities.push({ metric: "soilMoisture", issue: "low", value: stats.soilMoisture.latest });
    } else if (stats.soilMoisture.latest > 80) {
      abnormalities.push({ metric: "soilMoisture", issue: "very high (risk of overwatering)", value: stats.soilMoisture.latest });
    }
  }

  // Soil pH checks (typical range: 6.0-7.5)
  if (stats.soilPH.latest != null) {
    if (stats.soilPH.latest < 5.5) {
      abnormalities.push({ metric: "soilPH", issue: "too acidic", value: stats.soilPH.latest });
    } else if (stats.soilPH.latest > 8.0) {
      abnormalities.push({ metric: "soilPH", issue: "too alkaline", value: stats.soilPH.latest });
    }
  }

  // Light intensity checks (typical range varies, but very low is concerning)
  if (stats.lightIntensity.latest != null && stats.lightIntensity.latest < 1000) {
    abnormalities.push({ metric: "lightIntensity", issue: "low light conditions", value: stats.lightIntensity.latest });
  }

  return abnormalities;
};

/**
 * Create structured prompt for AI analysis
 */
const createAnalysisPrompt = (plant, stats, abnormalities, readingsCount) => {
  const prompt = `You are an expert plant health analysis system. Analyze the following plant data and provide a structured health assessment.

**Plant Information:**
- Name: ${plant.name}
- Species: ${plant.species}
- Crop Type: ${plant.cropType}
- Growth Stage: ${plant.growthStage}
- Planting Date: ${plant.plantingDate.toISOString().split('T')[0]}
- Location: ${plant.location}
- Current Health Status: ${plant.healthStatus}
- Age: ${Math.floor((Date.now() - new Date(plant.plantingDate)) / (1000 * 60 * 60 * 24))} days

**Current Sensor Readings (Latest):**
- Temperature: ${stats.temperature.latest != null ? stats.temperature.latest + '°C' : 'N/A'}
- Humidity: ${stats.humidity.latest != null ? stats.humidity.latest + '%' : 'N/A'}
- Soil Moisture: ${stats.soilMoisture.latest != null ? stats.soilMoisture.latest + '%' : 'N/A'}
- Soil pH: ${stats.soilPH.latest != null ? stats.soilPH.latest : 'N/A'}
- Light Intensity: ${stats.lightIntensity.latest != null ? stats.lightIntensity.latest + ' lux' : 'N/A'}

**Historical Averages (${readingsCount} readings analyzed):**
- Avg Temperature: ${stats.temperature.avg != null ? stats.temperature.avg + '°C' : 'N/A'}
- Avg Humidity: ${stats.humidity.avg != null ? stats.humidity.avg + '%' : 'N/A'}
- Avg Soil Moisture: ${stats.soilMoisture.avg != null ? stats.soilMoisture.avg + '%' : 'N/A'}
- Avg Soil pH: ${stats.soilPH.avg != null ? stats.soilPH.avg : 'N/A'}
- Avg Light Intensity: ${stats.lightIntensity.avg != null ? stats.lightIntensity.avg + ' lux' : 'N/A'}

**Range (Min-Max):**
- Temperature: ${stats.temperature.min != null ? stats.temperature.min + '°C to ' + stats.temperature.max + '°C' : 'N/A'}
- Humidity: ${stats.humidity.min != null ? stats.humidity.min + '% to ' + stats.humidity.max + '%' : 'N/A'}
- Soil Moisture: ${stats.soilMoisture.min != null ? stats.soilMoisture.min + '% to ' + stats.soilMoisture.max + '%' : 'N/A'}

**Trends:**
- Temperature: ${stats.temperature.trend || 'insufficient data'}${stats.temperature.trendValue ? ' (' + stats.temperature.trendValue + '°C)' : ''}
- Humidity: ${stats.humidity.trend || 'insufficient data'}${stats.humidity.trendValue ? ' (' + stats.humidity.trendValue + '%)' : ''}
- Soil Moisture: ${stats.soilMoisture.trend || 'insufficient data'}${stats.soilMoisture.trendValue ? ' (' + stats.soilMoisture.trendValue + '%)' : ''}

**Detected Abnormalities:**
${abnormalities.length > 0 ? abnormalities.map(a => `- ${a.metric}: ${a.issue} (value: ${a.value})`).join('\n') : '- No significant abnormalities detected'}

**Instructions:**
Analyze this plant's health based on the provided sensor data. Your analysis must:
1. Be based ONLY on the provided data - do not invent sensor values
2. Consider the plant's species, crop type, and growth stage
3. Identify any concerning trends or conditions
4. Provide practical, actionable recommendations
5. Avoid claiming certainty about diseases - phrase as risks or possibilities
6. Return ONLY valid JSON (no markdown, no code blocks, no additional text)

**Required JSON Response Format:**
{
  "healthScore": <number 0-100>,
  "healthStatus": "<one of: Healthy | Moderate Stress | At Risk | Critical>",
  "summary": "<2-3 sentence overall assessment>",
  "detectedIssues": [<array of specific issues found>],
  "riskLevel": "<Low | Medium | High | Critical>",
  "recommendations": [<array of 3-5 specific actionable recommendations>],
  "irrigationAdvice": "<specific watering guidance>",
  "environmentalAdvice": "<specific environmental control guidance>",
  "confidence": <number 0-1 indicating confidence level>
}

Respond ONLY with the JSON object. Do not include any other text, markdown formatting, or code blocks.`;

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

    // Validate required fields
    const required = ['healthScore', 'healthStatus', 'summary', 'detectedIssues', 'riskLevel', 'recommendations', 'confidence'];
    for (const field of required) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate types and ranges
    if (typeof parsed.healthScore !== 'number' || parsed.healthScore < 0 || parsed.healthScore > 100) {
      throw new Error('healthScore must be a number between 0 and 100');
    }

    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error('confidence must be a number between 0 and 1');
    }

    if (!Array.isArray(parsed.detectedIssues)) {
      throw new Error('detectedIssues must be an array');
    }

    if (!Array.isArray(parsed.recommendations)) {
      throw new Error('recommendations must be an array');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
};

/**
 * Main function to analyze plant health using AI
 */
const analyzePlantHealth = async (plant, userId) => {
  try {
    // Initialize AI if not already done
    if (!model) {
      initializeAI();
    }

    // Fetch sensor readings from MongoDB
    const readings = await PlantSensorReading.find({ plantId: plant._id })
      .sort({ timestamp: -1 })
      .limit(50); // Last 50 readings for analysis

    if (!readings || readings.length === 0) {
      throw new Error("No sensor readings available for this plant");
    }

    // Calculate statistics
    const stats = calculateSensorStatistics(readings);
    
    if (!stats) {
      throw new Error("Failed to calculate sensor statistics");
    }

    // Detect abnormalities
    const abnormalities = detectAbnormalConditions(stats);

    // Create AI prompt
    const prompt = createAnalysisPrompt(plant, stats, abnormalities, readings.length);

    // Call Gemini AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();

    // Parse and validate response
    const analysis = parseAIResponse(aiResponseText);

    // Add metadata
    analysis.analyzedAt = new Date().toISOString();
    analysis.readingsAnalyzed = readings.length;
    analysis.sensorStatistics = stats;
    analysis.abnormalConditions = abnormalities;

    return analysis;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  analyzePlantHealth,
  initializeAI,
};
