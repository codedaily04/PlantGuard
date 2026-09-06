/**
 * What-If Fault Simulation Service
 * Deterministic telemetry modification and recalculation
 * NO database persistence, NO ML predictions
 */

const SensorReading = require('../models/SensorReading');
const { 
  extractLatestSensorSnapshot,
  calculateMachineHealth,
  detectAnomalies,
  getEquipmentProfile
} = require('./healthCalculations');

// Lazy load to avoid circular dependency
let calculateMachineDegradationRisk = null;
function getDegradationRiskService() {
  if (!calculateMachineDegradationRisk) {
    const service = require('./degradationRiskService');
    calculateMachineDegradationRisk = service.calculateMachineDegradationRisk;
  }
  return calculateMachineDegradationRisk;
}

/**
 * Parse modification value (supports absolute and relative changes)
 */
function parseModification(currentValue, modification) {
  if (typeof modification === 'number') {
    // Absolute value
    return modification;
  }
  
  if (typeof modification === 'string') {
    // Relative change: "+30%" or "-15" or "+10"
    const trimmed = modification.trim();
    
    if (trimmed.includes('%')) {
      // Percentage change
      const percentMatch = trimmed.match(/^([+-]?\d+\.?\d*)%$/);
      if (percentMatch) {
        const percent = parseFloat(percentMatch[1]);
        return currentValue * (1 + percent / 100);
      }
    } else {
      // Absolute delta: "+10" or "-5"
      const deltaMatch = trimmed.match(/^([+-]?\d+\.?\d*)$/);
      if (deltaMatch) {
        const delta = parseFloat(deltaMatch[1]);
        return currentValue + delta;
      }
    }
  }
  
  throw new Error(`Invalid modification format: ${modification}. Use number, "+X", "-X", or "+X%"`);
}

/**
 * Apply modifications to telemetry snapshot
 */
function applyModifications(baseline, modifications) {
  const modified = { ...baseline };
  
  for (const [metric, value] of Object.entries(modifications)) {
    if (!['temperature', 'vibration', 'pressure', 'powerConsumption'].includes(metric)) {
      throw new Error(`Invalid metric: ${metric}. Supported: temperature, vibration, pressure, powerConsumption`);
    }
    
    const currentValue = baseline[metric];
    
    if (currentValue == null) {
      // If baseline doesn't have this metric, use absolute value
      if (typeof value === 'number') {
        modified[metric] = value;
      } else {
        throw new Error(`Cannot apply relative change "${value}" to null baseline ${metric}`);
      }
    } else {
      modified[metric] = parseModification(currentValue, value);
    }
  }
  
  return modified;
}

/**
 * Calculate state (health + anomalies) from snapshot
 */
function calculateState(snapshot, machine, readings, profile) {
  const healthData = calculateMachineHealth(snapshot, machine);
  const anomalies = detectAnomalies(snapshot, machine, readings);
  
  return {
    telemetry: {
      temperature: snapshot.temperature,
      vibration: snapshot.vibration,
      pressure: snapshot.pressure,
      powerConsumption: snapshot.powerConsumption,
      operatingHours: snapshot.operatingHours
    },
    healthScore: healthData.healthScore,
    healthStatus: healthData.status,
    anomalies: anomalies.map(a => ({
      metric: a.type,
      severity: a.severity,
      message: a.message
    })),
    anomalyCount: anomalies.length
  };
}

/**
 * Compare baseline and simulated states
 */
function compareStates(baseline, simulated) {
  const healthDelta = simulated.healthScore - baseline.healthScore;
  const anomalyDelta = simulated.anomalyCount - baseline.anomalyCount;
  
  // Find new anomalies
  const baselineMetrics = new Set(baseline.anomalies.map(a => a.metric));
  const newAnomalies = simulated.anomalies.filter(a => !baselineMetrics.has(a.metric));
  
  // Find resolved anomalies
  const simulatedMetrics = new Set(simulated.anomalies.map(a => a.metric));
  const resolvedAnomalies = baseline.anomalies.filter(a => !simulatedMetrics.has(a.metric));
  
  return {
    healthDelta,
    healthDeltaPercent: baseline.healthScore > 0 
      ? ((healthDelta / baseline.healthScore) * 100).toFixed(1) + '%'
      : 'N/A',
    anomalyDelta,
    newAnomalies,
    resolvedAnomalies,
    statusChanged: baseline.healthStatus !== simulated.healthStatus,
    statusBefore: baseline.healthStatus,
    statusAfter: simulated.healthStatus
  };
}

/**
 * Generate simulation recommendations
 */
function generateRecommendations(comparison, riskComparison) {
  const recommendations = [];
  
  if (comparison.healthDelta < -20) {
    recommendations.push({
      type: 'critical',
      message: `Significant health decline (${comparison.healthDelta}) - immediate action required`,
      action: 'Prevent conditions that could lead to this scenario'
    });
  } else if (comparison.healthDelta < -10) {
    recommendations.push({
      type: 'warning',
      message: `Moderate health decline (${comparison.healthDelta})`,
      action: 'Monitor closely and address underlying issues'
    });
  } else if (comparison.healthDelta > 10) {
    recommendations.push({
      type: 'positive',
      message: `Health improvement (${comparison.healthDelta})`,
      action: 'Maintenance actions would be beneficial'
    });
  }
  
  if (comparison.newAnomalies.length > 0) {
    recommendations.push({
      type: 'warning',
      message: `${comparison.newAnomalies.length} new anomaly(ies) would be triggered`,
      action: `Address: ${comparison.newAnomalies.map(a => a.metric).join(', ')}`
    });
  }
  
  if (riskComparison && riskComparison.categoryChanged) {
    recommendations.push({
      type: riskComparison.riskDelta > 0 ? 'critical' : 'positive',
      message: `Risk category would change: ${riskComparison.categoryBefore} → ${riskComparison.categoryAfter}`,
      action: riskComparison.riskDelta > 0 
        ? 'Prevent conditions leading to increased risk'
        : 'Maintenance would reduce operational risk'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'Minimal impact on equipment health',
      action: 'Changes are within normal operating parameters'
    });
  }
  
  return recommendations;
}

/**
 * Main simulation function
 */
async function simulateTelemetryChange(machine, modifications, options = {}) {
  const { includeRisk = true, readingLimit = 50 } = options;
  
  // Validate inputs
  if (!machine || !machine._id) {
    throw new Error('Valid machine object required');
  }
  
  if (!modifications || Object.keys(modifications).length === 0) {
    throw new Error('At least one telemetry modification required');
  }
  
  // Fetch actual telemetry (not modified)
  const readings = await SensorReading.find({ machineId: machine._id })
    .sort({ recordedAt: -1 })
    .limit(readingLimit);
  
  if (readings.length === 0) {
    throw new Error('Insufficient telemetry data for simulation');
  }
  
  // Get baseline
  const baselineSnapshot = extractLatestSensorSnapshot(readings);
  const profile = getEquipmentProfile(machine.type);
  
  // Calculate baseline state
  const baselineState = calculateState(baselineSnapshot, machine, readings, profile);
  
  // Apply modifications IN MEMORY
  const modifiedSnapshot = applyModifications(baselineSnapshot, modifications);
  
  // Calculate simulated state
  const simulatedState = calculateState(modifiedSnapshot, machine, readings, profile);
  
  // Compare states
  const comparison = compareStates(baselineState, simulatedState);
  
  // Optional: Calculate risk for both states
  let baselineRisk = null;
  let simulatedRisk = null;
  let riskComparison = null;
  
  if (includeRisk) {
    try {
      const riskService = getDegradationRiskService();
      // For risk, we use real anomaly detection which includes trends
      // For baseline, use actual calculation
      baselineRisk = await riskService(machine, { readingLimit });
      
      // For simulated, we can't calculate real risk without historical trend
      // So we estimate based on current state changes
      simulatedRisk = {
        riskScore: baselineRisk.riskScore + Math.round(comparison.healthDelta * -0.4),
        riskCategory: null // Will be determined
      };
      simulatedRisk.riskScore = Math.max(0, Math.min(100, simulatedRisk.riskScore));
      
      // Determine simulated risk category
      if (simulatedRisk.riskScore >= 76) simulatedRisk.riskCategory = 'CRITICAL';
      else if (simulatedRisk.riskScore >= 51) simulatedRisk.riskCategory = 'HIGH';
      else if (simulatedRisk.riskScore >= 26) simulatedRisk.riskCategory = 'MODERATE';
      else simulatedRisk.riskCategory = 'LOW';
      
      riskComparison = {
        riskDelta: simulatedRisk.riskScore - baselineRisk.riskScore,
        categoryBefore: baselineRisk.riskCategory,
        categoryAfter: simulatedRisk.riskCategory,
        categoryChanged: baselineRisk.riskCategory !== simulatedRisk.riskCategory
      };
    } catch (error) {
      // Risk calculation failed, continue without it
      console.warn('Risk calculation failed in simulation:', error.message);
    }
  }
  
  // Generate recommendations
  const recommendations = generateRecommendations(comparison, riskComparison);
  
  return {
    simulationId: `sim_${Date.now()}_${machine._id}`,
    machine: {
      id: machine._id,
      name: machine.name,
      type: machine.type
    },
    modifications,
    baseline: {
      ...baselineState,
      risk: baselineRisk ? {
        score: baselineRisk.riskScore,
        category: baselineRisk.riskCategory
      } : null
    },
    simulated: {
      ...simulatedState,
      risk: simulatedRisk ? {
        score: simulatedRisk.riskScore,
        category: simulatedRisk.riskCategory
      } : null
    },
    comparison: {
      ...comparison,
      risk: riskComparison
    },
    recommendations,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run multiple scenarios in batch
 */
async function simulateScenarios(machine, scenarios, options = {}) {
  const results = [];
  
  for (const scenario of scenarios) {
    const { name, modifications } = scenario;
    
    try {
      const result = await simulateTelemetryChange(machine, modifications, options);
      results.push({
        scenarioName: name,
        ...result
      });
    } catch (error) {
      results.push({
        scenarioName: name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

module.exports = {
  simulateTelemetryChange,
  simulateScenarios,
  parseModification,
  applyModifications,
  compareStates
};
