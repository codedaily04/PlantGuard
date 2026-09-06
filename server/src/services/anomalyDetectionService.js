/**
 * Anomaly Detection Engine
 * Deterministic equipment-specific and trend-based anomaly detection
 */

const SensorReading = require("../models/SensorReading");
const { getEquipmentProfile } = require("./healthCalculations");

/**
 * Calculate baseline from historical readings
 */
function calculateBaseline(readings, metric) {
  const values = readings
    .map(r => r[metric])
    .filter(v => v != null && !isNaN(v));
  
  if (values.length === 0) return null;
  
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  
  return {
    value: avg,
    sampleSize: values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

/**
 * Detect threshold-based anomalies
 */
function detectThresholdAnomalies(snapshot, machine, profile) {
  const anomalies = [];
  const timestamp = snapshot.recordedAt || new Date();
  
  // Temperature anomaly
  if (snapshot.temperature != null) {
    const temp = snapshot.temperature;
    const t = profile.temperature;
    let severity = null;
    let deviation = null;
    let baselineValue = (t.optimalMin + t.optimalMax) / 2;
    
    if (temp < t.criticalLow) {
      severity = "critical";
      deviation = ((temp - t.criticalLow) / t.criticalLow) * 100;
    } else if (temp > t.criticalHigh) {
      severity = "critical";
      deviation = ((temp - t.criticalHigh) / t.criticalHigh) * 100;
    } else if (temp > t.high) {
      severity = "high";
      deviation = ((temp - t.optimalMax) / t.optimalMax) * 100;
    } else if (temp < t.low) {
      severity = "medium";
      deviation = ((temp - t.optimalMin) / t.optimalMin) * 100;
    }
    
    if (severity) {
      anomalies.push({
        metric: "temperature",
        machineId: machine._id,
        currentValue: parseFloat(temp.toFixed(2)),
        baselineValue: parseFloat(baselineValue.toFixed(2)),
        deviation: parseFloat(deviation.toFixed(2)),
        deviationPercent: `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`,
        severity,
        detectionType: "threshold",
        timestamp: timestamp.toISOString(),
        explanation: temp < t.low 
          ? `Temperature ${temp.toFixed(1)}°C is below normal range (${t.optimalMin}-${t.optimalMax}°C)`
          : `Temperature ${temp.toFixed(1)}°C exceeds normal range (${t.optimalMin}-${t.optimalMax}°C)`
      });
    }
  }
  
  // Vibration anomaly
  if (snapshot.vibration != null) {
    const vib = snapshot.vibration;
    const t = profile.vibration;
    let severity = null;
    let deviation = null;
    let baselineValue = t.normal;
    
    if (vib >= t.critical) {
      severity = "critical";
      deviation = ((vib - t.normal) / t.normal) * 100;
    } else if (vib >= t.high) {
      severity = "high";
      deviation = ((vib - t.normal) / t.normal) * 100;
    } else if (vib >= t.elevated) {
      severity = "medium";
      deviation = ((vib - t.normal) / t.normal) * 100;
    }
    
    if (severity) {
      anomalies.push({
        metric: "vibration",
        machineId: machine._id,
        currentValue: parseFloat(vib.toFixed(2)),
        baselineValue: parseFloat(baselineValue.toFixed(2)),
        deviation: parseFloat(deviation.toFixed(2)),
        deviationPercent: `+${deviation.toFixed(1)}%`,
        severity,
        detectionType: "threshold",
        timestamp: timestamp.toISOString(),
        explanation: `Vibration ${vib.toFixed(2)} mm/s exceeds normal range (<${t.normal} mm/s)`
      });
    }
  }
  
  // Pressure anomaly (if applicable)
  if (snapshot.pressure != null && profile.pressure) {
    const press = snapshot.pressure;
    const t = profile.pressure;
    let severity = null;
    let deviation = null;
    let baselineValue = (t.optimalMin + t.optimalMax) / 2;
    
    if (press < t.criticalLow) {
      severity = "critical";
      deviation = ((press - t.criticalLow) / t.criticalLow) * 100;
    } else if (press > t.criticalHigh) {
      severity = "critical";
      deviation = ((press - t.criticalHigh) / t.criticalHigh) * 100;
    } else if (press < t.low) {
      severity = "high";
      deviation = ((press - t.optimalMin) / t.optimalMin) * 100;
    } else if (press > t.high) {
      severity = "high";
      deviation = ((press - t.optimalMax) / t.optimalMax) * 100;
    }
    
    if (severity) {
      anomalies.push({
        metric: "pressure",
        machineId: machine._id,
        currentValue: parseFloat(press.toFixed(2)),
        baselineValue: parseFloat(baselineValue.toFixed(2)),
        deviation: parseFloat(deviation.toFixed(2)),
        deviationPercent: `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%`,
        severity,
        detectionType: "threshold",
        timestamp: timestamp.toISOString(),
        explanation: press < t.low
          ? `Pressure ${press.toFixed(1)} PSI is below normal range (${t.optimalMin}-${t.optimalMax} PSI)`
          : `Pressure ${press.toFixed(1)} PSI exceeds normal range (${t.optimalMin}-${t.optimalMax} PSI)`
      });
    }
  }
  
  // Power anomaly
  if (snapshot.powerConsumption != null) {
    const power = snapshot.powerConsumption;
    const t = profile.power;
    let severity = null;
    let deviation = null;
    let baselineValue = t.normal;
    
    if (power >= t.critical) {
      severity = "critical";
      deviation = ((power - t.normal) / t.normal) * 100;
    } else if (power >= t.high) {
      severity = "high";
      deviation = ((power - t.normal) / t.normal) * 100;
    }
    
    if (severity) {
      anomalies.push({
        metric: "powerConsumption",
        machineId: machine._id,
        currentValue: parseFloat(power.toFixed(2)),
        baselineValue: parseFloat(baselineValue.toFixed(2)),
        deviation: parseFloat(deviation.toFixed(2)),
        deviationPercent: `+${deviation.toFixed(1)}%`,
        severity,
        detectionType: "threshold",
        timestamp: timestamp.toISOString(),
        explanation: `Power consumption ${power.toFixed(1)} kW exceeds normal range (~${t.normal} kW)`
      });
    }
  }
  
  return anomalies;
}

/**
 * Detect sustained trend-based anomalies (degradation)
 */
function detectTrendAnomalies(readings, machine, profile) {
  const anomalies = [];
  
  if (readings.length < 20) {
    return anomalies; // Need sufficient history for trend detection
  }
  
  const timestamp = readings[0].recordedAt || new Date();
  
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
    const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    // Sustained increase threshold: >15%
    if (trendPercent > 15) {
      const severity = recentAvg > profile.vibration.elevated ? "high" : "medium";
      
      anomalies.push({
        metric: "vibration",
        machineId: machine._id,
        currentValue: parseFloat(recentAvg.toFixed(2)),
        baselineValue: parseFloat(olderAvg.toFixed(2)),
        deviation: parseFloat((recentAvg - olderAvg).toFixed(2)),
        deviationPercent: `+${trendPercent.toFixed(1)}%`,
        trendPercent: parseFloat(trendPercent.toFixed(2)),
        severity,
        detectionType: "trend",
        timestamp: timestamp.toISOString(),
        explanation: `Vibration increased ${trendPercent.toFixed(1)}% over 20 readings (${olderAvg.toFixed(2)} → ${recentAvg.toFixed(2)} mm/s). Possible bearing wear or misalignment.`
      });
    }
  }
  
  // Temperature trend analysis
  const tempReadings = readings
    .filter(r => r.temperature != null)
    .slice(0, 20)
    .map(r => r.temperature);
  
  if (tempReadings.length >= 20) {
    const recentTemp = tempReadings.slice(0, 10);
    const olderTemp = tempReadings.slice(10, 20);
    
    const recentAvg = recentTemp.reduce((a, b) => a + b, 0) / recentTemp.length;
    const olderAvg = olderTemp.reduce((a, b) => a + b, 0) / olderTemp.length;
    const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    // Sustained temperature increase: >10%
    if (trendPercent > 10 && recentAvg > profile.temperature.optimalMax * 0.9) {
      anomalies.push({
        metric: "temperature",
        machineId: machine._id,
        currentValue: parseFloat(recentAvg.toFixed(2)),
        baselineValue: parseFloat(olderAvg.toFixed(2)),
        deviation: parseFloat((recentAvg - olderAvg).toFixed(2)),
        deviationPercent: `+${trendPercent.toFixed(1)}%`,
        trendPercent: parseFloat(trendPercent.toFixed(2)),
        severity: "medium",
        detectionType: "trend",
        timestamp: timestamp.toISOString(),
        explanation: `Temperature increased ${trendPercent.toFixed(1)}% over 20 readings (${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)}°C). Possible cooling system degradation.`
      });
    }
  }
  
  // Pressure trend analysis (if applicable)
  if (profile.pressure) {
    const pressureReadings = readings
      .filter(r => r.pressure != null)
      .slice(0, 20)
      .map(r => r.pressure);
    
    if (pressureReadings.length >= 20) {
      const recentPress = pressureReadings.slice(0, 10);
      const olderPress = pressureReadings.slice(10, 20);
      
      const recentAvg = recentPress.reduce((a, b) => a + b, 0) / recentPress.length;
      const olderAvg = olderPress.reduce((a, b) => a + b, 0) / olderPress.length;
      const trendPercent = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      // Sustained pressure drop: >10% decrease
      if (trendPercent < -10) {
        anomalies.push({
          metric: "pressure",
          machineId: machine._id,
          currentValue: parseFloat(recentAvg.toFixed(2)),
          baselineValue: parseFloat(olderAvg.toFixed(2)),
          deviation: parseFloat((recentAvg - olderAvg).toFixed(2)),
          deviationPercent: `${trendPercent.toFixed(1)}%`,
          trendPercent: parseFloat(trendPercent.toFixed(2)),
          severity: "high",
          detectionType: "trend",
          timestamp: timestamp.toISOString(),
          explanation: `Pressure decreased ${Math.abs(trendPercent).toFixed(1)}% over 20 readings (${olderAvg.toFixed(1)} → ${recentAvg.toFixed(1)} PSI). Possible leak or valve issue.`
        });
      }
    }
  }
  
  return anomalies;
}

/**
 * Main anomaly detection function
 * Returns structured anomaly objects with full metrics
 */
async function detectEquipmentAnomalies(machine, options = {}) {
  const { readingLimit = 50, includeThreshold = true, includeTrend = true } = options;
  
  // Fetch sensor readings
  const readings = await SensorReading.find({ machineId: machine._id })
    .sort({ recordedAt: -1 })
    .limit(readingLimit);
  
  if (readings.length === 0) {
    return {
      machineId: machine._id,
      machineName: machine.name,
      machineType: machine.type,
      anomalies: [],
      readingsAnalyzed: 0,
      detectionTimestamp: new Date().toISOString(),
      message: "No sensor readings available"
    };
  }
  
  const profile = getEquipmentProfile(machine.type);
  const latest = readings[0];
  
  const snapshot = {
    temperature: latest.temperature,
    vibration: latest.vibration,
    pressure: latest.pressure,
    powerConsumption: latest.powerConsumption,
    operatingHours: latest.operatingHours,
    recordedAt: latest.recordedAt
  };
  
  const anomalies = [];
  
  // Threshold-based detection
  if (includeThreshold) {
    const thresholdAnomalies = detectThresholdAnomalies(snapshot, machine, profile);
    anomalies.push(...thresholdAnomalies);
  }
  
  // Trend-based detection (requires sufficient history)
  if (includeTrend && readings.length >= 20) {
    const trendAnomalies = detectTrendAnomalies(readings, machine, profile);
    anomalies.push(...trendAnomalies);
  }
  
  return {
    machineId: machine._id,
    machineName: machine.name,
    machineType: machine.type,
    anomalies,
    readingsAnalyzed: readings.length,
    detectionTimestamp: new Date().toISOString(),
    summary: {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === "critical").length,
      high: anomalies.filter(a => a.severity === "high").length,
      medium: anomalies.filter(a => a.severity === "medium").length,
      byType: {
        threshold: anomalies.filter(a => a.detectionType === "threshold").length,
        trend: anomalies.filter(a => a.detectionType === "trend").length
      }
    }
  };
}

module.exports = {
  detectEquipmentAnomalies,
  detectThresholdAnomalies,
  detectTrendAnomalies,
  calculateBaseline,
};
