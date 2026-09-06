const PlantSensorReading = require("../models/PlantSensorReading");

/**
 * PLANT HEALTH INTELLIGENCE ENGINE
 * 
 * Deterministic service that processes real MongoDB sensor readings
 * to calculate health scores, detect risks, and provide structured intelligence.
 * 
 * This service runs BEFORE AI analysis to provide explainable, data-driven insights.
 */

// ==================== AGRICULTURAL THRESHOLDS ====================
/**
 * ASSUMPTIONS & THRESHOLDS:
 * 
 * These are general agricultural standards suitable for most common crops.
 * In production, these should be customizable per plant species/crop type.
 * 
 * SOIL MOISTURE (%)
 * - Optimal: 40-60% (well-drained, adequate water)
 * - Low: 20-40% (slight water stress)
 * - Critical Low: <20% (severe water stress)
 * - High: 60-80% (possible overwatering)
 * - Critical High: >80% (root rot risk)
 * 
 * TEMPERATURE (°C)
 * - Optimal: 18-28°C (ideal growing temperature)
 * - Cool: 15-18°C (slower growth)
 * - Cold Stress: 10-15°C (stress begins)
 * - Critical Cold: <10°C (damage risk)
 * - Warm: 28-32°C (stress begins)
 * - Heat Stress: 32-38°C (significant stress)
 * - Critical Heat: >38°C (severe damage risk)
 * 
 * HUMIDITY (%)
 * - Optimal: 50-70% (ideal for most plants)
 * - Low: 30-50% (acceptable, watch for drying)
 * - Critical Low: <30% (desiccation risk)
 * - High: 70-85% (fungal risk increases)
 * - Critical High: >85% (high fungal/mold risk)
 * 
 * SOIL pH
 * - Optimal: 6.0-7.0 (neutral to slightly acidic)
 * - Acceptable: 5.5-6.0 or 7.0-7.5 (suboptimal but manageable)
 * - Acidic: <5.5 (nutrient lockout risk)
 * - Alkaline: >7.5 (nutrient availability reduced)
 * 
 * LIGHT INTENSITY (lux)
 * - High Light: >20000 (full sun)
 * - Medium Light: 10000-20000 (partial sun/shade)
 * - Low Light: 2000-10000 (shade/indoor)
 * - Insufficient: <2000 (growth limited)
 * - Excessive: >50000 (stress/burning possible)
 */

const THRESHOLDS = {
  soilMoisture: {
    criticalLow: 20,
    low: 40,
    optimalMin: 40,
    optimalMax: 60,
    high: 80,
    criticalHigh: 80,
  },
  temperature: {
    criticalCold: 10,
    cold: 15,
    optimalMin: 18,
    optimalMax: 28,
    warm: 32,
    hot: 38,
  },
  humidity: {
    criticalLow: 30,
    low: 50,
    optimalMin: 50,
    optimalMax: 70,
    high: 85,
  },
  ph: {
    acidic: 5.5,
    optimalMin: 6.0,
    optimalMax: 7.0,
    alkaline: 7.5,
  },
  light: {
    insufficient: 2000,
    low: 10000,
    medium: 20000,
    excessive: 50000,
  },
};

// ==================== SENSOR DATA FETCHING ====================

/**
 * Fetch recent sensor readings from MongoDB
 * @param {String} plantId - Plant MongoDB ObjectId
 * @param {Number} limit - Number of readings to fetch (default: 50)
 * @returns {Array} Array of sensor readings
 */
const fetchSensorReadings = async (plantId, limit = 50) => {
  try {
    const readings = await PlantSensorReading.find({ plantId })
      .sort({ timestamp: -1 }) // Most recent first
      .limit(limit);
    
    return readings;
  } catch (error) {
    throw new Error(`Failed to fetch sensor readings: ${error.message}`);
  }
};

// ==================== DATA VALIDATION & QUALITY ====================

/**
 * Validate and extract the latest sensor values
 * @param {Array} readings - Array of sensor readings
 * @returns {Object} Latest sensor snapshot with quality indicators
 */
const extractLatestSensorSnapshot = (readings) => {
  if (!readings || readings.length === 0) {
    return {
      temperature: null,
      humidity: null,
      soilMoisture: null,
      ph: null,
      light: null,
      timestamp: null,
      availability: {
        temperature: false,
        humidity: false,
        soilMoisture: false,
        ph: false,
        light: false,
      },
    };
  }

  const latest = readings[0]; // Readings are sorted desc by timestamp
  
  return {
    temperature: latest.temperature != null ? Number(latest.temperature) : null,
    humidity: latest.humidity != null ? Number(latest.humidity) : null,
    soilMoisture: latest.soilMoisture != null ? Number(latest.soilMoisture) : null,
    ph: latest.soilPH != null ? Number(latest.soilPH) : null,
    light: latest.lightIntensity != null ? Number(latest.lightIntensity) : null,
    timestamp: latest.timestamp,
    availability: {
      temperature: latest.temperature != null,
      humidity: latest.humidity != null,
      soilMoisture: latest.soilMoisture != null,
      ph: latest.soilPH != null,
      light: latest.lightIntensity != null,
    },
  };
};

/**
 * Calculate data quality metrics
 * @param {Array} readings - Array of sensor readings
 * @param {Object} snapshot - Latest sensor snapshot
 * @returns {Object} Data quality assessment
 */
const assessDataQuality = (readings, snapshot) => {
  const readingCount = readings.length;
  const availability = snapshot.availability;
  
  // Count available sensors
  const availableSensors = Object.values(availability).filter(Boolean).length;
  const totalSensors = 5;
  
  // Determine overall quality
  let quality = "excellent";
  const issues = [];
  
  if (readingCount === 0) {
    quality = "no_data";
    issues.push("No sensor readings available");
  } else if (readingCount < 5) {
    quality = "insufficient";
    issues.push(`Only ${readingCount} readings available (need 5+ for trends)`);
  } else if (readingCount < 10) {
    quality = "limited";
    issues.push("Limited historical data for trend analysis");
  }
  
  if (availableSensors < totalSensors) {
    const missingSensors = Object.entries(availability)
      .filter(([_, available]) => !available)
      .map(([sensor, _]) => sensor);
    
    issues.push(`Missing sensors: ${missingSensors.join(", ")}`);
    
    if (availableSensors <= 2) {
      quality = "poor";
    } else if (availableSensors <= 3 && quality === "excellent") {
      quality = "good";
    }
  }
  
  return {
    quality,
    readingCount,
    availableSensors,
    totalSensors,
    completeness: (availableSensors / totalSensors) * 100,
    issues,
  };
};

// ==================== HEALTH SCORE CALCULATION ====================

/**
 * Calculate health score for soil moisture (0-20 points)
 * @param {Number} value - Soil moisture percentage
 * @returns {Object} Score and reasoning
 */
const scoreSoilMoisture = (value) => {
  if (value == null) return { score: 0, reason: "No data available", weight: 20 };
  
  const t = THRESHOLDS.soilMoisture;
  let score = 0;
  let reason = "";
  
  if (value < t.criticalLow) {
    // <20%: Critical water stress
    score = 2;
    reason = "Critical water stress";
  } else if (value < t.low) {
    // 20-40%: Low moisture, needs water
    score = 8 + ((value - t.criticalLow) / (t.low - t.criticalLow)) * 8;
    reason = "Low moisture, needs irrigation";
  } else if (value >= t.optimalMin && value <= t.optimalMax) {
    // 40-60%: Optimal range
    score = 20;
    reason = "Optimal moisture level";
  } else if (value < t.high) {
    // 60-80%: Slightly high but acceptable
    score = 18 - ((value - t.optimalMax) / (t.high - t.optimalMax)) * 3;
    reason = "Slightly high moisture";
  } else {
    // >80%: Overwatering risk
    score = 8 - Math.min((value - t.high) / 10, 1) * 5;
    reason = "Overwatering risk";
  }
  
  return { score: Math.round(score), reason, weight: 20 };
};

/**
 * Calculate health score for temperature (0-20 points)
 * @param {Number} value - Temperature in Celsius
 * @returns {Object} Score and reasoning
 */
const scoreTemperature = (value) => {
  if (value == null) return { score: 0, reason: "No data available", weight: 20 };
  
  const t = THRESHOLDS.temperature;
  let score = 0;
  let reason = "";
  
  if (value < t.criticalCold) {
    // <10°C: Critical cold
    score = 2;
    reason = "Critical cold stress";
  } else if (value < t.cold) {
    // 10-15°C: Cold stress
    score = 5 + ((value - t.criticalCold) / (t.cold - t.criticalCold)) * 5;
    reason = "Cold stress";
  } else if (value < t.optimalMin) {
    // 15-18°C: Cool but acceptable
    score = 10 + ((value - t.cold) / (t.optimalMin - t.cold)) * 5;
    reason = "Cool temperature";
  } else if (value >= t.optimalMin && value <= t.optimalMax) {
    // 18-28°C: Optimal range
    score = 20;
    reason = "Optimal temperature";
  } else if (value < t.warm) {
    // 28-32°C: Warm but manageable
    score = 15 + (1 - ((value - t.optimalMax) / (t.warm - t.optimalMax))) * 5;
    reason = "Warm temperature";
  } else if (value < t.hot) {
    // 32-38°C: Heat stress
    score = 5 + (1 - ((value - t.warm) / (t.hot - t.warm))) * 10;
    reason = "Heat stress";
  } else {
    // >38°C: Critical heat
    score = Math.max(0, 5 - ((value - t.hot) / 5));
    reason = "Critical heat stress";
  }
  
  return { score: Math.round(score), reason, weight: 20 };
};

/**
 * Calculate health score for humidity (0-20 points)
 * @param {Number} value - Humidity percentage
 * @returns {Object} Score and reasoning
 */
const scoreHumidity = (value) => {
  if (value == null) return { score: 0, reason: "No data available", weight: 20 };
  
  const t = THRESHOLDS.humidity;
  let score = 0;
  let reason = "";
  
  if (value < t.criticalLow) {
    // <30%: Very dry air
    score = 5;
    reason = "Very low humidity, desiccation risk";
  } else if (value < t.low) {
    // 30-50%: Low humidity
    score = 10 + ((value - t.criticalLow) / (t.low - t.criticalLow)) * 5;
    reason = "Low humidity";
  } else if (value >= t.optimalMin && value <= t.optimalMax) {
    // 50-70%: Optimal range
    score = 20;
    reason = "Optimal humidity";
  } else if (value < t.high) {
    // 70-85%: High humidity
    score = 18 - ((value - t.optimalMax) / (t.high - t.optimalMax)) * 6;
    reason = "High humidity, monitor for fungi";
  } else {
    // >85%: Very high humidity
    score = 8 - Math.min((value - t.high) / 10, 1) * 3;
    reason = "Excessive humidity, fungal risk";
  }
  
  return { score: Math.round(score), reason, weight: 20 };
};

/**
 * Calculate health score for pH (0-20 points)
 * @param {Number} value - Soil pH value
 * @returns {Object} Score and reasoning
 */
const scorePH = (value) => {
  if (value == null) return { score: 0, reason: "No data available", weight: 20 };
  
  const t = THRESHOLDS.ph;
  let score = 0;
  let reason = "";
  
  if (value < t.acidic) {
    // <5.5: Too acidic
    score = 8 - Math.min((t.acidic - value) / 1.0, 1) * 5;
    reason = "Too acidic, nutrient lockout risk";
  } else if (value < t.optimalMin) {
    // 5.5-6.0: Slightly acidic
    score = 12 + ((value - t.acidic) / (t.optimalMin - t.acidic)) * 3;
    reason = "Slightly acidic";
  } else if (value >= t.optimalMin && value <= t.optimalMax) {
    // 6.0-7.0: Optimal range
    score = 20;
    reason = "Optimal pH";
  } else if (value < t.alkaline) {
    // 7.0-7.5: Slightly alkaline
    score = 15 + (1 - ((value - t.optimalMax) / (t.alkaline - t.optimalMax))) * 5;
    reason = "Slightly alkaline";
  } else {
    // >7.5: Too alkaline
    score = 8 - Math.min((value - t.alkaline) / 1.0, 1) * 5;
    reason = "Too alkaline, reduced nutrient availability";
  }
  
  return { score: Math.round(score), reason, weight: 20 };
};

/**
 * Calculate health score for light intensity (0-20 points)
 * @param {Number} value - Light intensity in lux
 * @returns {Object} Score and reasoning
 */
const scoreLight = (value) => {
  if (value == null) return { score: 0, reason: "No data available", weight: 20 };
  
  const t = THRESHOLDS.light;
  let score = 0;
  let reason = "";
  
  if (value < t.insufficient) {
    // <2000 lux: Insufficient light
    score = 5 + (value / t.insufficient) * 5;
    reason = "Insufficient light for growth";
  } else if (value < t.low) {
    // 2000-10000: Low light (indoor/shade)
    score = 10 + ((value - t.insufficient) / (t.low - t.insufficient)) * 5;
    reason = "Low light conditions";
  } else if (value < t.medium) {
    // 10000-20000: Medium light (partial sun)
    score = 15 + ((value - t.low) / (t.medium - t.low)) * 3;
    reason = "Moderate light levels";
  } else if (value < t.excessive) {
    // 20000-50000: High light (full sun)
    score = 20;
    reason = "Good light exposure";
  } else {
    // >50000: Excessive light
    score = 18 - Math.min((value - t.excessive) / 20000, 1) * 8;
    reason = "Very high light, monitor for stress";
  }
  
  return { score: Math.round(score), reason, weight: 20 };
};

/**
 * Calculate overall health score from sensor readings
 * @param {Object} snapshot - Latest sensor snapshot
 * @returns {Object} Health score details
 */
const calculateHealthScore = (snapshot) => {
  const soilMoistureScore = scoreSoilMoisture(snapshot.soilMoisture);
  const temperatureScore = scoreTemperature(snapshot.temperature);
  const humidityScore = scoreHumidity(snapshot.humidity);
  const phScore = scorePH(snapshot.ph);
  const lightScore = scoreLight(snapshot.light);
  
  // Calculate weighted score based on available sensors
  const scores = [soilMoistureScore, temperatureScore, humidityScore, phScore, lightScore];
  const availableScores = scores.filter(s => s.score > 0);
  
  let totalScore = 0;
  let totalWeight = 0;
  
  availableScores.forEach(scoreObj => {
    totalScore += scoreObj.score;
    totalWeight += scoreObj.weight;
  });
  
  // Normalize to 0-100 scale
  const healthScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  
  // Determine status based on score
  let status = "unknown";
  if (healthScore >= 90) {
    status = "excellent";
  } else if (healthScore >= 75) {
    status = "healthy";
  } else if (healthScore >= 50) {
    status = "stressed";
  } else if (healthScore > 0) {
    status = "critical";
  }
  
  return {
    healthScore,
    status,
    scoreBreakdown: {
      soilMoisture: soilMoistureScore.score,
      temperature: temperatureScore.score,
      humidity: humidityScore.score,
      ph: phScore.score,
      light: lightScore.score,
    },
    scoreReasons: {
      soilMoisture: soilMoistureScore.reason,
      temperature: temperatureScore.reason,
      humidity: humidityScore.reason,
      ph: phScore.reason,
      light: lightScore.reason,
    },
  };
};

// ==================== RISK DETECTION ====================

/**
 * Detect plant health risks from sensor readings
 * @param {Object} snapshot - Latest sensor snapshot
 * @param {Array} readings - Historical readings for trend analysis
 * @returns {Array} Detected risks
 */
const detectRisks = (snapshot, readings) => {
  const risks = [];
  
  // ===== SOIL MOISTURE RISKS =====
  if (snapshot.soilMoisture != null) {
    const sm = snapshot.soilMoisture;
    
    if (sm < THRESHOLDS.soilMoisture.criticalLow) {
      risks.push({
        type: "water_stress",
        severity: "critical",
        message: "Severe water stress detected - immediate irrigation required",
        evidence: {
          parameter: "soilMoisture",
          value: sm,
          threshold: THRESHOLDS.soilMoisture.criticalLow,
        },
      });
    } else if (sm < THRESHOLDS.soilMoisture.low) {
      risks.push({
        type: "water_stress",
        severity: "high",
        message: "Low soil moisture - plant needs watering soon",
        evidence: {
          parameter: "soilMoisture",
          value: sm,
          threshold: THRESHOLDS.soilMoisture.low,
        },
      });
    } else if (sm > THRESHOLDS.soilMoisture.criticalHigh) {
      risks.push({
        type: "overwatering",
        severity: "high",
        message: "Excessive soil moisture - root rot risk",
        evidence: {
          parameter: "soilMoisture",
          value: sm,
          threshold: THRESHOLDS.soilMoisture.criticalHigh,
        },
      });
    } else if (sm > THRESHOLDS.soilMoisture.high) {
      risks.push({
        type: "overwatering",
        severity: "medium",
        message: "Soil moisture is high - reduce watering frequency",
        evidence: {
          parameter: "soilMoisture",
          value: sm,
          threshold: THRESHOLDS.soilMoisture.high,
        },
      });
    }
  }
  
  // ===== TEMPERATURE RISKS =====
  if (snapshot.temperature != null) {
    const temp = snapshot.temperature;
    
    if (temp < THRESHOLDS.temperature.criticalCold) {
      risks.push({
        type: "cold_stress",
        severity: "critical",
        message: "Critical cold temperature - frost damage risk",
        evidence: {
          parameter: "temperature",
          value: temp,
          threshold: THRESHOLDS.temperature.criticalCold,
        },
      });
    } else if (temp < THRESHOLDS.temperature.cold) {
      risks.push({
        type: "cold_stress",
        severity: "high",
        message: "Cold stress - growth may be impaired",
        evidence: {
          parameter: "temperature",
          value: temp,
          threshold: THRESHOLDS.temperature.cold,
        },
      });
    } else if (temp > THRESHOLDS.temperature.hot) {
      risks.push({
        type: "heat_stress",
        severity: "critical",
        message: "Extreme heat - severe stress and potential damage",
        evidence: {
          parameter: "temperature",
          value: temp,
          threshold: THRESHOLDS.temperature.hot,
        },
      });
    } else if (temp > THRESHOLDS.temperature.warm) {
      risks.push({
        type: "heat_stress",
        severity: "high",
        message: "Heat stress - increased water demand",
        evidence: {
          parameter: "temperature",
          value: temp,
          threshold: THRESHOLDS.temperature.warm,
        },
      });
    }
  }
  
  // ===== HUMIDITY RISKS =====
  if (snapshot.humidity != null) {
    const hum = snapshot.humidity;
    
    if (hum < THRESHOLDS.humidity.criticalLow) {
      risks.push({
        type: "low_humidity",
        severity: "high",
        message: "Very low humidity - desiccation and wilting risk",
        evidence: {
          parameter: "humidity",
          value: hum,
          threshold: THRESHOLDS.humidity.criticalLow,
        },
      });
    } else if (hum > THRESHOLDS.humidity.high) {
      risks.push({
        type: "excessive_humidity",
        severity: "high",
        message: "Excessive humidity - high fungal disease risk",
        evidence: {
          parameter: "humidity",
          value: hum,
          threshold: THRESHOLDS.humidity.high,
        },
      });
    }
  }
  
  // ===== FUNGAL RISK (Combined condition) =====
  if (snapshot.humidity != null && snapshot.temperature != null) {
    const hum = snapshot.humidity;
    const temp = snapshot.temperature;
    
    // Fungal diseases thrive in warm (20-30°C) and humid (>70%) conditions
    if (hum > 70 && temp >= 20 && temp <= 30) {
      risks.push({
        type: "fungal_risk",
        severity: "high",
        message: "Conditions favorable for fungal diseases - monitor leaves closely",
        evidence: {
          parameter: "humidity + temperature",
          value: { humidity: hum, temperature: temp },
          conditions: "High humidity with warm temperature",
        },
      });
    }
  }
  
  // ===== pH RISKS =====
  if (snapshot.ph != null) {
    const ph = snapshot.ph;
    
    if (ph < THRESHOLDS.ph.acidic) {
      risks.push({
        type: "ph_abnormal",
        severity: "high",
        message: "Soil too acidic - nutrient uptake impaired",
        evidence: {
          parameter: "ph",
          value: ph,
          threshold: THRESHOLDS.ph.acidic,
        },
      });
    } else if (ph > THRESHOLDS.ph.alkaline) {
      risks.push({
        type: "ph_abnormal",
        severity: "high",
        message: "Soil too alkaline - reduced nutrient availability",
        evidence: {
          parameter: "ph",
          value: ph,
          threshold: THRESHOLDS.ph.alkaline,
        },
      });
    } else if (ph < THRESHOLDS.ph.optimalMin) {
      risks.push({
        type: "ph_abnormal",
        severity: "medium",
        message: "Soil slightly acidic - monitor nutrient levels",
        evidence: {
          parameter: "ph",
          value: ph,
          threshold: THRESHOLDS.ph.optimalMin,
        },
      });
    } else if (ph > THRESHOLDS.ph.optimalMax) {
      risks.push({
        type: "ph_abnormal",
        severity: "medium",
        message: "Soil slightly alkaline - watch for deficiencies",
        evidence: {
          parameter: "ph",
          value: ph,
          threshold: THRESHOLDS.ph.optimalMax,
        },
      });
    }
  }
  
  // ===== LIGHT RISKS =====
  if (snapshot.light != null) {
    const light = snapshot.light;
    
    if (light < THRESHOLDS.light.insufficient) {
      risks.push({
        type: "insufficient_light",
        severity: "high",
        message: "Insufficient light for healthy growth",
        evidence: {
          parameter: "light",
          value: light,
          threshold: THRESHOLDS.light.insufficient,
        },
      });
    } else if (light < THRESHOLDS.light.low) {
      risks.push({
        type: "insufficient_light",
        severity: "medium",
        message: "Low light conditions - growth may be slower",
        evidence: {
          parameter: "light",
          value: light,
          threshold: THRESHOLDS.light.low,
        },
      });
    } else if (light > THRESHOLDS.light.excessive) {
      risks.push({
        type: "excessive_light",
        severity: "medium",
        message: "Very high light intensity - monitor for leaf burn",
        evidence: {
          parameter: "light",
          value: light,
          threshold: THRESHOLDS.light.excessive,
        },
      });
    }
  }
  
  // ===== TREND-BASED RISKS =====
  if (readings && readings.length >= 10) {
    // Calculate trend for soil moisture
    if (snapshot.soilMoisture != null) {
      const moistureReadings = readings
        .filter(r => r.soilMoisture != null)
        .slice(0, 10)
        .map(r => r.soilMoisture);
      
      if (moistureReadings.length >= 10) {
        const recent = moistureReadings.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const older = moistureReadings.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
        const trend = recent - older;
        
        if (trend < -10) {
          risks.push({
            type: "rapid_drying",
            severity: "medium",
            message: "Soil moisture declining rapidly - check irrigation schedule",
            evidence: {
              parameter: "soilMoisture",
              value: snapshot.soilMoisture,
              trend: `Decreasing by ${Math.abs(trend).toFixed(1)}% over recent readings`,
            },
          });
        }
      }
    }
  }
  
  return risks;
};

// ==================== MAIN INTELLIGENCE FUNCTION ====================

/**
 * Generate comprehensive plant health intelligence
 * @param {Object} plant - Plant document from MongoDB
 * @param {Number} readingLimit - Number of historical readings to analyze
 * @returns {Object} Complete health intelligence report
 */
const generateHealthIntelligence = async (plant, readingLimit = 50) => {
  try {
    // 1. Fetch sensor readings
    const readings = await fetchSensorReadings(plant._id, readingLimit);
    
    // 2. Extract latest sensor snapshot
    const sensorSnapshot = extractLatestSensorSnapshot(readings);
    
    // 3. Assess data quality
    const dataQuality = assessDataQuality(readings, sensorSnapshot);
    
    // 4. Calculate health score
    const healthScoreData = calculateHealthScore(sensorSnapshot);
    
    // 5. Detect risks
    const detectedRisks = detectRisks(sensorSnapshot, readings);
    
    // 6. Build final intelligence object
    const intelligence = {
      // Core metrics
      healthScore: healthScoreData.healthScore,
      status: healthScoreData.status,
      
      // Detailed breakdown
      scoreBreakdown: healthScoreData.scoreBreakdown,
      scoreReasons: healthScoreData.scoreReasons,
      
      // Risk assessment
      detectedRisks,
      riskCount: detectedRisks.length,
      criticalRisks: detectedRisks.filter(r => r.severity === "critical").length,
      highRisks: detectedRisks.filter(r => r.severity === "high").length,
      
      // Sensor data
      sensorSnapshot: {
        temperature: sensorSnapshot.temperature,
        humidity: sensorSnapshot.humidity,
        soilMoisture: sensorSnapshot.soilMoisture,
        ph: sensorSnapshot.ph,
        light: sensorSnapshot.light,
        timestamp: sensorSnapshot.timestamp,
      },
      
      // Data quality
      dataQuality,
      
      // Metadata
      plantInfo: {
        id: plant._id,
        name: plant.name,
        species: plant.species,
        cropType: plant.cropType,
        growthStage: plant.growthStage,
        ageInDays: Math.floor((Date.now() - new Date(plant.plantingDate)) / (1000 * 60 * 60 * 24)),
      },
      
      generatedAt: new Date().toISOString(),
    };
    
    return intelligence;
  } catch (error) {
    throw new Error(`Health intelligence generation failed: ${error.message}`);
  }
};

module.exports = {
  generateHealthIntelligence,
  fetchSensorReadings,
  calculateHealthScore,
  detectRisks,
  assessDataQuality,
  THRESHOLDS, // Export for testing
};
