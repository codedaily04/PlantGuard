const Plant = require("../models/Plant");
const Factory = require("../models/Factory");

// CREATE PLANT
const createPlant = async (req, res) => {
  try {
    // Validate required fields for industrial plant
    const { name, plantType, factoryId, location } = req.body;
    
    if (!name || !plantType || !factoryId || !location) {
      return res.status(400).json({
        message: "Missing required fields: name, plantType, factoryId, location",
      });
    }
    
    // Verify factory exists and user has access
    const factory = await Factory.findOne({
      _id: factoryId,
      owner: req.user._id,
    });
    
    if (!factory) {
      return res.status(404).json({
        message: "Factory not found or access denied",
      });
    }

    const plant = await Plant.create({
      ...req.body,
      owner: req.user._id,
    });

    res.status(201).json({
      message: "Plant created successfully",
      plant,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create plant",
      error: error.message,
    });
  }
};

// GET ALL PLANTS (only user's plants)
const getPlants = async (req, res) => {
  try {
    const plants = await Plant.find({ owner: req.user._id })
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    res.json({
      count: plants.length,
      plants,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch plants",
      error: error.message,
    });
  }
};

// GET SINGLE PLANT
const getPlant = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      owner: req.user._id, // Ensure user owns this plant
    }).populate("owner", "name email");

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    res.json({
      plant,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch plant",
      error: error.message,
    });
  }
};

// UPDATE PLANT
const updatePlant = async (req, res) => {
  try {
    const plant = await Plant.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id, // Ensure user owns this plant
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    res.json({
      message: "Plant updated successfully",
      plant,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update plant",
      error: error.message,
    });
  }
};

// DELETE PLANT
const deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id, // Ensure user owns this plant
    });

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    res.json({
      message: "Plant deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete plant",
      error: error.message,
    });
  }
};

module.exports = {
  createPlant,
  getPlants,
  getPlant,
  updatePlant,
  deletePlant,
};
