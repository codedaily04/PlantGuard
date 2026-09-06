/**
 * Pure health calculation functions (no database dependencies)
 */

const THRESHOLDS = {
  soilMoisture: { criticalLow: 20, low: 40, optimalMin: 40, optimalMax: 60, high: 80 },
  temperature: { criticalCold: 10, cold: 15, optimalMin: 18, optimalMax: 28, warm: 32, hot: 38 },
  humidity: { criticalLow: 30, low: 50, optimalMin: 50, optimalMax: 70, high: 85 },
  ph: { acidic: 5.5, optimalMin: 6.0, optimalMax: 7.0, alkaline: 7.5 },
  light: { insufficient: 2000, low: 10000, medium: 20000, excessive: 50000 },
};

function extractLatestSensorSnapshot(readings) {
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

  const latest = readings[0];
  
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
}

function assessDataQuality(readings, snapshot) {
  const readingCount = readings.length;
  const availability = snapshot.availability;
  
  const availableSensors = Object.values(availability).filter(Boolean).length;
  const totalSensors = 5;
  
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
}

function scoreSensor(value, type) {
  if (value == null) return { score: 0, reason: "No data available", weight: 20 };
  
  const t = THRESHOLDS[type];
  let score = 0;
  let reason = "";
  
  if (type === "soilMoisture") {
    if (value < t.criticalLow) {
      score = 2;
      reason = "Critical water stress";
    } else if (value < t.low) {
      score = 8 + ((value - t.criticalLow) / (t.low - t.criticalLow)) * 8;
      reason = "Low moisture, needs irrigation";
    } else if (value >= t.optimalMin && value <= t.optimalMax) {
      score = 20;
      reason = "Optimal moisture level";
    } else if (value < t.high) {
      score = 18 - ((value - t.optimalMax) / (t.high - t.optimalMax)) * 3;
      reason = "Slightly high moisture";
    } else {
      score = 8 - Math.min((value - t.high) / 10, 1) * 5;
      reason = "Overwatering risk";
    }
  } else if (type === "temperature") {
    if (value < t.criticalCold) {
      score = 2;
      reason = "Critical cold stress";
    } else if (value < t.cold) {
      score = 5 + ((value - t.criticalCold) / (t.cold - t.criticalCold)) * 5;
      reason = "Cold stress";
    } else if (value < t.optimalMin) {
      score = 10 + ((value - t.cold) / (t.optimalMin - t.cold)) * 5;
      reason = "Cool temperature";
    } else if (value >= t.optimalMin && value <= t.optimalMax) {
      score = 20;
      reason = "Optimal temperature";
    } else if (value < t.warm) {
      score = 15 + (1 - ((value - t.optimalMax) / (t.warm - t.optimalMax))) * 5;
      reason = "Warm temperature";
    } else if (value < t.hot) {
      score = 5 + (1 - ((value - t.warm) / (t.hot - t.warm))) * 10;
      reason = "Heat stress";
    } else {
      score = Math.max(0, 5 - ((value - t.hot) / 5));
      reason = "Critical heat stress";
    }
  } else if (type === "humidity") {
    if (value < t.criticalLow) {
      score = 5;
      reason = "Very low humidity, desiccation risk";
    } else if (value < t.low) {
      score = 10 + ((value - t.criticalLow) / (t.low - t.criticalLow)) * 5;
      reason = "Low humidity";
    } else if (value >= t.optimalMin && value <= t.optimalMax) {
      score = 20;
      reason = "Optimal humidity";
    } else if (value < t.high) {
      score = 18 - ((value - t.optimalMax) / (t.high - t.optimalMax)) * 6;
      reason = "High humidity, monitor for fungi";
    } else {
      score = 8 - Math.min((value - t.high) / 10, 1) * 3;
      reason = "Excessive humidity, fungal risk";
    }
  } else if (type === "ph") {
    if (value < t.acidic) {
      score = 8 - Math.min((t.acidic - value) / 1.0, 1) * 5;
      reason = "Too acidic, nutrient lockout risk";
    } else if (value < t.optimalMin) {
      score = 12 + ((value - t.acidic) / (t.optimalMin - t.acidic)) * 3;
      reason = "Slightly acidic";
    } else if (value >= t.optimalMin && value <= t.optimalMax) {
      score = 20;
      reason = "Optimal pH";
    } else if (value < t.alkaline) {
      score = 15 + (1 - ((value - t.optimalMax) / (t.alkaline - t.optimalMax))) * 5;
      reason = "Slightly alkaline";
    } else {
      score = 8 - Math.min((value - t.alkaline) / 1.0, 1) * 5;
      reason = "Too alkaline, reduced nutrient availability";
    }
  } else if (type === "light") {
    if (value < t.insufficient) {
      score = 5 + (value / t.insufficient) * 5;
      reason = "Insufficient light for growth";
    } else if (value < t.low) {
      score = 10 + ((value - t.insufficient) / (t.low - t.insufficient)) * 5;
      reason = "Low light conditions";
    } else if (value < t.medium) {
      score = 15 + ((value - t.low) / (t.medium - t.low)) * 3;
      reason = "Moderate light levels";
    } else if (value < t.excessive) {
      score = 20;
      reason = "Good light exposure";
    } else {
      score = 18 - Math.min((value - t.excessive) / 20000, 1) * 8;
      reason = "Very high light, monitor for stress";
    }
  }
  
  return { score: Math.round(score), reason, weight: 20 };
}

function calculateHealthScore(snapshot) {
  const scores = [
    scoreSensor(snapshot.soilMoisture, 'soilMoisture'),
    scoreSensor(snapshot.temperature, 'temperature'),
    scoreSensor(snapshot.humidity, 'humidity'),
    scoreSensor(snapshot.ph, 'ph'),
    scoreSensor(snapshot.light, 'light')
  ];
  
  const availableScores = scores.filter(s => s.score > 0);
  const totalScore = availableScores.reduce((sum, s) => sum + s.score, 0);
  const totalWeight = availableScores.reduce((sum, s) => sum + s.weight, 0);
  const healthScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  
  let status = "unknown";
  if (healthScore >= 90) status = "excellent";
  else if (healthScore >= 75) status = "healthy";
  else if (healthScore >= 50) status = "stressed";
  else if (healthScore > 0) status = "critical";
  
  return {
    healthScore,
    status,
    scoreBreakdown: {
      soilMoisture: scores[0].score,
      temperature: scores[1].score,
      humidity: scores[2].score,
      ph: scores[3].score,
      light: scores[4].score,
    },
    scoreReasons: {
      soilMoisture: scores[0].reason,
      temperature: scores[1].reason,
      humidity: scores[2].reason,
      ph: scores[3].reason,
      light: scores[4].reason,
    },
  };
}

function detectRisks(snapshot, readings) {
  const risks = [];
  
  if (snapshot.soilMoisture != null) {
    const sm = snapshot.soilMoisture;
    const t = THRESHOLDS.soilMoisture;
    
    if (sm < t.criticalLow) {
      risks.push({
        type: "water_stress",
        severity: "critical",
        message: "Severe water stress detected - immediate irrigation required",
        evidence: { parameter: "soilMoisture", value: sm, threshold: t.criticalLow },
      });
    } else if (sm < t.low) {
      risks.push({
        type: "water_stress",
        severity: "high",
        message: "Low soil moisture - plant needs watering soon",
        evidence: { parameter: "soilMoisture", value: sm, threshold: t.low },
      });
    } else if (sm > t.high) {
      const severity = sm > 90 ? "high" : "medium";
      risks.push({
        type: "overwatering",
        severity,
        message: severity === "high" ? "Excessive soil moisture - root rot risk" : "Soil moisture is high - reduce watering frequency",
        evidence: { parameter: "soilMoisture", value: sm, threshold: t.high },
      });
    }
  }
  
  if (snapshot.temperature != null) {
    const temp = snapshot.temperature;
    const t = THRESHOLDS.temperature;
    
    if (temp < t.criticalCold) {
      risks.push({
        type: "cold_stress",
        severity: "critical",
        message: "Critical cold temperature - frost damage risk",
        evidence: { parameter: "temperature", value: temp, threshold: t.criticalCold },
      });
    } else if (temp < t.cold) {
      risks.push({
        type: "cold_stress",
        severity: "high",
        message: "Cold stress - growth may be impaired",
        evidence: { parameter: "temperature", value: temp, threshold: t.cold },
      });
    } else if (temp > t.hot) {
      risks.push({
        type: "heat_stress",
        severity: "critical",
        message: "Extreme heat - severe stress and potential damage",
        evidence: { parameter: "temperature", value: temp, threshold: t.hot },
      });
    } else if (temp > t.warm) {
      risks.push({
        type: "heat_stress",
        severity: "high",
        message: "Heat stress - increased water demand",
        evidence: { parameter: "temperature", value: temp, threshold: t.warm },
      });
    }
  }
  
  if (snapshot.humidity != null) {
    const hum = snapshot.humidity;
    const t = THRESHOLDS.humidity;
    
    if (hum < t.criticalLow) {
      risks.push({
        type: "low_humidity",
        severity: "high",
        message: "Very low humidity - desiccation and wilting risk",
        evidence: { parameter: "humidity", value: hum, threshold: t.criticalLow },
      });
    } else if (hum > t.high) {
      risks.push({
        type: "excessive_humidity",
        severity: "high",
        message: "Excessive humidity - high fungal disease risk",
        evidence: { parameter: "humidity", value: hum, threshold: t.high },
      });
    }
  }
  
  if (snapshot.humidity != null && snapshot.temperature != null) {
    const hum = snapshot.humidity;
    const temp = snapshot.temperature;
    
    if (hum > 70 && temp >= 20 && temp <= 30) {
      risks.push({
        type: "fungal_risk",
        severity: "high",
        message: "Conditions favorable for fungal diseases - monitor leaves closely",
        evidence: { parameter: "humidity + temperature", value: { humidity: hum, temperature: temp }, conditions: "High humidity with warm temperature" },
      });
    }
  }
  
  if (snapshot.ph != null) {
    const ph = snapshot.ph;
    const t = THRESHOLDS.ph;
    
    if (ph < t.acidic) {
      risks.push({
        type: "ph_abnormal",
        severity: "high",
        message: "Soil too acidic - nutrient uptake impaired",
        evidence: { parameter: "ph", value: ph, threshold: t.acidic },
      });
    } else if (ph > t.alkaline) {
      risks.push({
        type: "ph_abnormal",
        severity: "high",
        message: "Soil too alkaline - reduced nutrient availability",
        evidence: { parameter: "ph", value: ph, threshold: t.alkaline },
      });
    } else if (ph < t.optimalMin || ph > t.optimalMax) {
      const severity = "medium";
      const message = ph < t.optimalMin 
        ? "Soil slightly acidic - monitor nutrient levels"
        : "Soil slightly alkaline - watch for deficiencies";
      const threshold = ph < t.optimalMin ? t.optimalMin : t.optimalMax;
      risks.push({
        type: "ph_abnormal",
        severity,
        message,
        evidence: { parameter: "ph", value: ph, threshold },
      });
    }
  }
  
  if (snapshot.light != null) {
    const light = snapshot.light;
    const t = THRESHOLDS.light;
    
    if (light < t.insufficient) {
      risks.push({
        type: "insufficient_light",
        severity: "high",
        message: "Insufficient light for healthy growth",
        evidence: { parameter: "light", value: light, threshold: t.insufficient },
      });
    } else if (light < t.low) {
      risks.push({
        type: "insufficient_light",
        severity: "medium",
        message: "Low light conditions - growth may be slower",
        evidence: { parameter: "light", value: light, threshold: t.low },
      });
    } else if (light > t.excessive) {
      risks.push({
        type: "excessive_light",
        severity: "medium",
        message: "Very high light intensity - monitor for leaf burn",
        evidence: { parameter: "light", value: light, threshold: t.excessive },
      });
    }
  }
  
  if (readings && readings.length >= 10 && snapshot.soilMoisture != null) {
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
  
  return risks;
}

module.exports = {
  extractLatestSensorSnapshot,
  assessDataQuality,
  calculateHealthScore,
  detectRisks,
  THRESHOLDS,
};