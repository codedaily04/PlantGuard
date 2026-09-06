const SensorReading = require("../models/SensorReading");
const Machine = require("../models/Machine");
const {
  extractLatestSensorSnapshot,
  assessDataQuality,
  calculateMachineHealth,
  detectAnomalies,
} = require("./healthCalculations");

/**
 * Generate health intelligence for a single machine (PRIMARY)
 */
const generateMachineHealthIntelligence = async (machine, readingLimit = 50) => {
  const readings = await SensorReading.find({ machineId: machine._id })
    .sort({ recordedAt: -1 })
    .limit(readingLimit);

  const snapshot = extractLatestSensorSnapshot(readings);
  const healthData = calculateMachineHealth(snapshot, machine);
  const anomalies = detectAnomalies(snapshot, machine, readings);
  const dataQuality = assessDataQuality(readings);

  return {
    machineId: machine._id,
    machineName: machine.name,
    machineType: machine.type,
    healthScore: healthData.healthScore,
    status: healthData.status,
    telemetry: snapshot,
    anomalies,
    scoreBreakdown: healthData.scoreBreakdown,
    scoreReasons: healthData.scoreReasons,
    dataQuality,
    readingsAnalyzed: readings.length,
    analyzedAt: new Date().toISOString(),
  };
};

/**
 * Generate plant health summary by aggregating machine health (SECONDARY)
 */
const generatePlantHealthSummary = async (plant) => {
  const machines = await Machine.find({ plantId: plant._id });

  if (machines.length === 0) {
    return {
      plantId: plant._id,
      plantName: plant.name,
      plantType: plant.plantType,
      overallHealthScore: 0,
      status: "offline",
      machineCount: 0,
      machinesByStatus: { healthy: 0, warning: 0, critical: 0, offline: 0 },
      machines: [],
      analyzedAt: new Date().toISOString(),
    };
  }

  const machineHealthPromises = machines.map(m =>
    generateMachineHealthIntelligence(m)
  );
  const machineHealthData = await Promise.all(machineHealthPromises);

  const totalHealth = machineHealthData.reduce((sum, m) => sum + m.healthScore, 0);
  const avgHealthScore = Math.round(totalHealth / machines.length);

  const statusCounts = {
    healthy: machineHealthData.filter(m => m.status === "healthy").length,
    warning: machineHealthData.filter(m => m.status === "warning").length,
    critical: machineHealthData.filter(m => m.status === "critical").length,
    offline: machineHealthData.filter(m => m.status === "offline").length,
  };

  let plantStatus = "healthy";
  if (statusCounts.critical > 0) plantStatus = "critical";
  else if (statusCounts.warning > 0) plantStatus = "warning";
  else if (statusCounts.offline === machines.length) plantStatus = "offline";

  return {
    plantId: plant._id,
    plantName: plant.name,
    plantType: plant.plantType,
    location: plant.location,
    overallHealthScore: avgHealthScore,
    status: plantStatus,
    machineCount: machines.length,
    machinesByStatus: statusCounts,
    machines: machineHealthData,
    analyzedAt: new Date().toISOString(),
  };
};

/**
 * Legacy compatibility: generate health intelligence (uses machine if available)
 */
const generateHealthIntelligence = async (entity, readingLimit = 50) => {
  // If it's a machine, use machine-level intelligence
  if (entity.machineId) {
    return generateMachineHealthIntelligence(entity, readingLimit);
  }
  
  // If it's a plant, use plant aggregation
  if (entity.plantType) {
    return generatePlantHealthSummary(entity);
  }
  
  // Fallback
  return generateMachineHealthIntelligence(entity, readingLimit);
};

module.exports = {
  generateMachineHealthIntelligence,
  generatePlantHealthSummary,
  generateHealthIntelligence,
};
