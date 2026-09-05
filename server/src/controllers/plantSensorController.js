const PlantSensorReading = require("../models/PlantSensorReading");
const Plant = require("../models/Plant");

// ADD SENSOR READING
const addReading = async (req, res) => {
  try {
    const { plantId } = req.body;

    // Verify the plant exists and belongs to the user
    const plant = await Plant.findOne({
      _id: plantId,
      owner: req.user._id,
    });

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    const reading = await PlantSensorReading.create(req.body);

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

// GET ALL READINGS FOR A PLANT
const getPlantReadings = async (req, res) => {
  try {
    const { plantId } = req.params;

    // Verify the plant belongs to the user
    const plant = await Plant.findOne({
      _id: plantId,
      owner: req.user._id,
    });

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    const readings = await PlantSensorReading.find({ plantId })
      .sort({ timestamp: -1 })
      .limit(100); // Limit to last 100 readings

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

// GET LATEST READING FOR A PLANT
const getLatestReading = async (req, res) => {
  try {
    const { plantId } = req.params;

    // Verify the plant belongs to the user
    const plant = await Plant.findOne({
      _id: plantId,
      owner: req.user._id,
    });

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    const reading = await PlantSensorReading.findOne({ plantId })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!reading) {
      return res.status(404).json({
        message: "No sensor readings found for this plant",
      });
    }

    res.json({
      reading,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch latest reading",
      error: error.message,
    });
  }
};

// GET HISTORICAL READINGS
const getHistoricalReadings = async (req, res) => {
  try {
    const { plantId } = req.params;
    const { limit = 50, startDate, endDate } = req.query;

    // Verify the plant belongs to the user
    const plant = await Plant.findOne({
      _id: plantId,
      owner: req.user._id,
    });

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    // Build query
    const query = { plantId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const readings = await PlantSensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch historical readings",
      error: error.message,
    });
  }
};

module.exports = {
  addReading,
  getPlantReadings,
  getLatestReading,
  getHistoricalReadings,
};
