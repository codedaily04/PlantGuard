/**
 * Industrial equipment health calculation functions
 * Equipment-type aware thresholds for CNC, COMPRESSOR, PUMP
 */

const EQUIPMENT_PROFILES = {
  CNC: {
    temperature: {
      criticalLow: 10,
      low: 15,
      optimalMin: 20,
      optimalMax: 70,
      high: 85,
      criticalHigh: 100
    },
    vibration: {
      normal: 2.0,
      elevated: 4.0,
      high: 6.0,
      critical: 8.0
    },
    pressure: null,
    power: {
      idle: 100,
      normal: 800,
      high: 1200,
      critical: 1500
    }
  },
  
  COMPRESSOR: {
    temperature: {
      criticalLow: 5,
      low: 10,
      optimalMin: 15,
      optimalMax: 90,
      high: 110,
      criticalHigh: 130
    },
    vibration: {
      normal: 3.0,
      elevated: 6.0,
      high: 9.0,
      critical: 12.0
    },
    pressure: {
      criticalLow: 80,
      low: 100,
      optimalMin: 120,
      optimalMax: 150,
      high: 170,
      criticalHigh: 200
    },
    power: {
      idle: 50,
      normal: 500,
      high: 750,
      critical: 900
    }
  },
  
  PUMP: {
    temperature: {
      criticalLow: 0,
      low: 5,
      optimalMin: 10,
      optimalMax: 80,
      high: 95,
      criticalHigh: 110
    },
    vibration: {
      normal: 2.5,
      elevated: 5.0,
      high: 7.5,
      critical: 10.0
    },
    pressure: {
      criticalLow: 20,
      low: 40,
      optimalMin: 60,
      optimalMax: 100,
      high: 120,
      criticalHigh: 150
    },
    power: {
      idle: 75,
      normal: 600,
      high: 900,
      critical: 1100
    }
  }
};

const DEFAULT_PROFILE = {
  temperature: {
    criticalLow: 0,
    low: 10,
    optimalMin: 20,
    optimalMax: 80,
    high: 100,
    criticalHigh: 120
  },
  vibration: {
    normal: 2.5,
    elevated: 5.0,
    high: 7.5,
    critical: 10.0
  },
  pressure: {
    criticalLow: 50,
    low: 80,
    optimalMin: 100,
    optimalMax: 150,
    high: 180,
    criticalHigh: 200
  },
  power: {
    idle: 50,
    normal: 500,
    high: 800,
    critical: 1000
  }
};

function getEquipmentProfile(machineType) {
  if (!machineType) return DEFAULT_PROFILE;
  const normalizedType = machineType.toUpperCase().replace(/[^A-Z]/g, '');
  return EQUIPMENT_PROFILES[normalizedType] || DEFAULT_PROFILE;
}

function extractLatestSensorSnapshot(readings) {
  if (!readings || readings.length === 0) {
    return {
      temperature: null,
      vibration: null,
      pressure: null,
      powerConsumption: null,
      operatingHours: null,
      recordedAt: null,
      availability: {
        temperature: false,
        vibration: false,
        pressure: false,
        power: false,
        operatingHours: false,
      },
    };
  }

  const latest = readings[0];
  
  return {
    temperature: latest.temperature != null ? Number(latest.temperature) : null,
    vibration: latest.vibration != null ? Number(latest.vibration) : null,
    pressure: latest.pressure != null ? Number(latest.pressure) : null,
    powerConsumption: latest.powerConsumption != null ? Number(latest.powerConsumption) : null,
    operatingHours: latest.operatingHours != null ? Number(latest.operatingHours) : null,
    recordedAt: latest.recordedAt,
    availability: {
      temperature: latest.temperature != null,
      vibration: latest.vibration != null,
      pressure: latest.pressure != null,
      power: latest.powerConsumption != null,
      operatingHours: latest.operatingHours != null,
    },
  };
}

function assessDataQuality(readings) {
  const readingCount = readings.length;
  
  let quality = "excellent";
  const issues = [];
  
  if (readingCount === 0) {
    quality = "no_data";
    issues.push("No sensor readings available");
  } else if (readingCount < 5) {
    quality = "insufficient";
    issues.push(`Only ${readingCount} readings available (need 5+ for basic analysis)`);
  } else if (readingCount < 20) {
    quality = "limited";
    issues.push("Limited historical data for trend analysis (need 20+ for degradation detection)");
  }
  
  if (readingCount > 0) {
    const latest = readings[0];
    const availableSensors = [
      latest.temperature,
      latest.vibration,
      latest.pressure,
      latest.powerConsumption
    ].filter(v => v != null).length;
    
    if (availableSensors <= 1) {
      quality = "poor";
      issues.push("Most sensors unavailable");
    } else if (availableSensors <= 2 && quality === "excellent") {
      quality = "good";
      issues.push("Some sensors unavailable");
    }
  }
  
  return {
    quality,
    readingCount,
    issues,
  };
}

function scoreSensor(value, type, profile) {
  if (value == null) return { score: 0, reason: "No data available", weight: 25 };
  
  const t = profile[type];
  if (!t) return { score: 0, reason: "Not applicable for this equipment", weight: 0 };
  
  let score = 0;
  let reason = "";
  
  if (type === "temperature") {
    if (value < t.criticalLow) {
      score = 5;
      reason = "Critical low temperature";
    } else if (value < t.low) {
      score = 10 + ((value - t.criticalLow) / (t.low - t.criticalLow)) * 5;
      reason = "Below normal temperature";
    } else if (value >= t.optimalMin && value <= t.optimalMax) {
      score = 25;
      reason = "Optimal temperature";
    } else if (value < t.high) {
      score = 20 - ((value - t.optimalMax) / (t.high - t.optimalMax)) * 5;
      reason = "Elevated temperature";
    } else if (value < t.criticalHigh) {
      score = 10 - ((value - t.high) / (t.criticalHigh - t.high)) * 5;
      reason = "High temperature warning";
    } else {
      score = 2;
      reason = "Critical high temperature";
    }
  } else if (type === "vibration") {
    if (value <= t.normal) {
      score = 25;
      reason = "Normal vibration levels";
    } else if (value < t.elevated) {
      score = 20 - ((value - t.normal) / (t.elevated - t.normal)) * 5;
      reason = "Slightly elevated vibration";
    } else if (value < t.high) {
      score = 10 - ((value - t.elevated) / (t.high - t.elevated)) * 5;
      reason = "High vibration detected";
    } else if (value < t.critical) {
      score = 5;
      reason = "Very high vibration";
    } else {
      score = 2;
      reason = "Critical vibration levels";
    }
  } else if (type === "pressure") {
    if (value < t.criticalLow) {
      score = 2;
      reason = "Critical low pressure";
    } else if (value < t.low) {
      score = 10;
      reason = "Low pressure detected";
    } else if (value >= t.optimalMin && value <= t.optimalMax) {
      score = 25;
      reason = "Optimal pressure";
    } else if (value < t.high) {
      score = 15;
      reason = "Elevated pressure";
    } else if (value < t.criticalHigh) {
      score = 10;
      reason = "High pressure warning";
    } else {
      score = 2;
      reason = "Critical high pressure";
    }
  } else if (type === "power") {
    if (value < t.idle) {
      score = 20;
      reason = "Idle power consumption";
    } else if (value <= t.normal) {
      score = 25;
      reason = "Normal power consumption";
    } else if (value < t.high) {
      score = 15;
      reason = "Elevated power consumption";
    } else if (value < t.critical) {
      score = 10;
      reason = "High power consumption";
    } else {
      score = 2;
      reason = "Critical power consumption";
    }
  }
  
  return { score: Math.round(score), reason, weight: 25 };
}

function calculateMachineHealth(snapshot, machine) {
  const profile = getEquipmentProfile(machine.type);
  
  const scores = [
    scoreSensor(snapshot.temperature, 'temperature', profile),
    scoreSensor(snapshot.vibration, 'vibration', profile),
    scoreSensor(snapshot.pressure, 'pressure', profile),
    scoreSensor(snapshot.powerConsumption, 'power', profile)
  ];
  
  const availableScores = scores.filter(s => s.weight > 0 && s.score > 0);
  const totalScore = availableScores.reduce((sum, s) => sum + s.score, 0);
  const totalWeight = availableScores.reduce((sum, s) => sum + s.weight, 0);
  const healthScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  
  let status = "offline";
  if (healthScore >= 85) status = "healthy";
  else if (healthScore >= 65) status = "warning";
  else if (healthScore > 0) status = "critical";
  
  return {
    healthScore,
    status,
    scoreBreakdown: {
      temperature: scores[0].score,
      vibration: scores[1].score,
      pressure: scores[2].score,
      power: scores[3].score,
    },
    scoreReasons: {
      temperature: scores[0].reason,
      vibration: scores[1].reason,
      pressure: scores[2].reason,
      power: scores[3].reason,
    },
  };
}

function detectDegradation(readings, machine) {
  if (readings.length < 20) return null;
  
  const profile = getEquipmentProfile(machine.type);
  
  // Vibration trend analysis
  const vibrationReadings = readings
    .filter(r => r.vibration != null)
    .slice(0, 20)
    .map(r => r.vibration);
  
  if (vibrationReadings.length >= 20) {
    const recentVibration = vibrationReadings.slice(0, 10);
    const olderVibration = vibrationReadings.slice(10, 20);
    
    const recentAvg = recentVibration.reduce((a, b) => a + b, 0) / recentVibration.length;
    const olderAvg = olderVibration.reduce((a, b) => a + b, 0) / olderVibration.length;
    const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (trend > 15) {
      return {
        type: "degradation_detected",
        severity: recentAvg > profile.vibration.elevated ? "high" : "medium",
        message: `Equipment degradation detected - vibration trending upward (+${trend.toFixed(1)}%)`,
        evidence: {
          metric: "vibration",
          trend: `+${trend.toFixed(1)}%`,
          recentAvg: recentAvg.toFixed(2),
          olderAvg: olderAvg.toFixed(2),
          analysis: "Possible bearing wear or misalignment"
        }
      };
    }
  }
  
  return null;
}

function detectAnomalies(snapshot, machine, readings) {
  const anomalies = [];
  const profile = getEquipmentProfile(machine.type);
  
  // Temperature anomalies
  if (snapshot.temperature != null) {
    const temp = snapshot.temperature;
    const t = profile.temperature;
    
    if (temp < t.criticalLow || temp > t.criticalHigh) {
      anomalies.push({
        type: "temperature_anomaly",
        severity: "critical",
        message: temp < t.criticalLow 
          ? `Critical low temperature: ${temp}°C (min: ${t.criticalLow}°C)`
          : `Critical high temperature: ${temp}°C (max: ${t.criticalHigh}°C)`,
        evidence: { parameter: "temperature", value: temp, threshold: temp < t.criticalLow ? t.criticalLow : t.criticalHigh }
      });
    } else if (temp > t.high) {
      anomalies.push({
        type: "temperature_anomaly",
        severity: "high",
        message: `Elevated temperature: ${temp}°C (normal max: ${t.optimalMax}°C)`,
        evidence: { parameter: "temperature", value: temp, threshold: t.high }
      });
    } else if (temp < t.low) {
      anomalies.push({
        type: "temperature_anomaly",
        severity: "medium",
        message: `Low temperature: ${temp}°C (normal min: ${t.optimalMin}°C)`,
        evidence: { parameter: "temperature", value: temp, threshold: t.low }
      });
    }
  }
  
  // Vibration anomalies
  if (snapshot.vibration != null) {
    const vib = snapshot.vibration;
    const t = profile.vibration;
    
    if (vib >= t.critical) {
      anomalies.push({
        type: "vibration_anomaly",
        severity: "critical",
        message: `Critical vibration: ${vib} mm/s (critical: ${t.critical} mm/s)`,
        evidence: { parameter: "vibration", value: vib, threshold: t.critical }
      });
    } else if (vib >= t.high) {
      anomalies.push({
        type: "vibration_anomaly",
        severity: "high",
        message: `High vibration: ${vib} mm/s (normal: <${t.normal} mm/s)`,
        evidence: { parameter: "vibration", value: vib, threshold: t.high }
      });
    } else if (vib >= t.elevated) {
      anomalies.push({
        type: "vibration_anomaly",
        severity: "medium",
        message: `Elevated vibration: ${vib} mm/s`,
        evidence: { parameter: "vibration", value: vib, threshold: t.elevated }
      });
    }
  }
  
  // Pressure anomalies (if applicable)
  if (snapshot.pressure != null && profile.pressure) {
    const press = snapshot.pressure;
    const t = profile.pressure;
    
    if (press < t.criticalLow || press > t.criticalHigh) {
      anomalies.push({
        type: "pressure_anomaly",
        severity: "critical",
        message: press < t.criticalLow
          ? `Critical low pressure: ${press} PSI (min: ${t.criticalLow} PSI)`
          : `Critical high pressure: ${press} PSI (max: ${t.criticalHigh} PSI)`,
        evidence: { parameter: "pressure", value: press, threshold: press < t.criticalLow ? t.criticalLow : t.criticalHigh }
      });
    } else if (press < t.low) {
      anomalies.push({
        type: "pressure_anomaly",
        severity: "high",
        message: `Low pressure: ${press} PSI (normal: ${t.optimalMin}-${t.optimalMax} PSI)`,
        evidence: { parameter: "pressure", value: press, threshold: t.low }
      });
    } else if (press > t.high) {
      anomalies.push({
        type: "pressure_anomaly",
        severity: "high",
        message: `High pressure: ${press} PSI (normal: ${t.optimalMin}-${t.optimalMax} PSI)`,
        evidence: { parameter: "pressure", value: press, threshold: t.high }
      });
    }
  }
  
  // Power anomalies
  if (snapshot.powerConsumption != null) {
    const power = snapshot.powerConsumption;
    const t = profile.power;
    
    if (power >= t.critical) {
      anomalies.push({
        type: "power_anomaly",
        severity: "critical",
        message: `Critical power consumption: ${power} kW (critical: ${t.critical} kW)`,
        evidence: { parameter: "power", value: power, threshold: t.critical }
      });
    } else if (power >= t.high) {
      anomalies.push({
        type: "power_anomaly",
        severity: "high",
        message: `High power consumption: ${power} kW (normal: ${t.normal} kW)`,
        evidence: { parameter: "power", value: power, threshold: t.high }
      });
    }
  }
  
  // Degradation detection (trend-based)
  const degradation = detectDegradation(readings, machine);
  if (degradation) {
    anomalies.push(degradation);
  }
  
  // Maintenance required (multiple indicators)
  if (anomalies.length >= 2) {
    const highSeverity = anomalies.filter(a => a.severity === "critical" || a.severity === "high").length;
    if (highSeverity >= 2) {
      anomalies.push({
        type: "maintenance_required",
        severity: "high",
        message: `Multiple anomalies detected - maintenance recommended`,
        evidence: { anomalyCount: anomalies.length, highSeverityCount: highSeverity }
      });
    }
  }
  
  return anomalies;
}

module.exports = {
  extractLatestSensorSnapshot,
  assessDataQuality,
  calculateMachineHealth,
  detectAnomalies,
  getEquipmentProfile,
  EQUIPMENT_PROFILES,
  DEFAULT_PROFILE,
};
