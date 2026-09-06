const PlantSensorReading = require("../models/PlantSensorReading");
const {
  extractLatestSensorSnapshot,
  assessDataQuality,
  calculateHealthScore,
  detectRisks,
} = require("./healthCalculations");

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

const generateHealthIntelligence = async (plant, readingLimit = 50) => {
  try {
    const readings = await fetchSensorReadings(plant._id, readingLimit);
    const sensorSnapshot = extractLatestSensorSnapshot(readings);
    const dataQuality = assessDataQuality(readings, sensorSnapshot);
    const healthScoreData = calculateHealthScore(sensorSnapshot);
    const detectedRisks = detectRisks(sensorSnapshot, readings);
    
    return {
      healthScore: healthScoreData.healthScore,
      status: healthScoreData.status,
      scoreBreakdown: healthScoreData.scoreBreakdown,
      scoreReasons: healthScoreData.scoreReasons,
      detectedRisks,
      riskCount: detectedRisks.length,
      criticalRisks: detectedRisks.filter(r => r.severity === "critical").length,
      highRisks: detectedRisks.filter(r => r.severity === "high").length,
      sensorSnapshot: {
        temperature: sensorSnapshot.temperature,
        humidity: sensorSnapshot.humidity,
        soilMoisture: sensorSnapshot.soilMoisture,
        ph: sensorSnapshot.ph,
        light: sensorSnapshot.light,
        timestamp: sensorSnapshot.timestamp,
      },
      dataQuality,
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
  } catch (error) {
    throw new Error(`Health intelligence generation failed: ${error.message}`);
  }
};

module.exports = {
  generateHealthIntelligence,
  fetchSensorReadings,
};
