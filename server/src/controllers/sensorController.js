const SensorReading = require("../models/SensorReading");

const addReading = async (req, res) => {
  try {
    const reading = await SensorReading.create(req.body);

    res.status(201).json({
      message: "Sensor reading added successfully",
      reading,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add sensor reading",
      error: error.message,
    });
  }
};

const getMachineReadings = async (req, res) => {
  try {
    const readings = await SensorReading.find({
      machineId: req.params.machineId,
    }).sort({ recordedAt: -1 });

    res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch sensor readings",
      error: error.message,
    });
  }
};

module.exports = {
  addReading,
  getMachineReadings,
};