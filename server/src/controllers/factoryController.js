const Factory = require("../models/Factory");

// CREATE FACTORY
const createFactory = async (req, res) => {
  try {
    const factory = await Factory.create({
      ...req.body,
      createdBy: req.user.userId,
    });

    res.status(201).json({
      message: "Factory created successfully",
      factory,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create factory",
      error: error.message,
    });
  }
};

// GET ALL FACTORIES
const getFactories = async (req, res) => {
  try {
    const factories = await Factory.find()
      .populate("createdBy", "name email");

    res.json({
      count: factories.length,
      factories,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch factories",
      error: error.message,
    });
  }
};

// GET SINGLE FACTORY
const getFactory = async (req, res) => {
  try {
    const factory = await Factory.findById(req.params.id)
      .populate("createdBy", "name email");

    if (!factory) {
      return res.status(404).json({
        message: "Factory not found",
      });
    }

    res.json({
      factory,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch factory",
      error: error.message,
    });
  }
};

// UPDATE FACTORY
const updateFactory = async (req, res) => {
  try {
    const factory = await Factory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!factory) {
      return res.status(404).json({
        message: "Factory not found",
      });
    }

    res.json({
      message: "Factory updated successfully",
      factory,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update factory",
      error: error.message,
    });
  }
};

// DELETE FACTORY
const deleteFactory = async (req, res) => {
  try {
    const factory = await Factory.findByIdAndDelete(req.params.id);

    if (!factory) {
      return res.status(404).json({
        message: "Factory not found",
      });
    }

    res.json({
      message: "Factory deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete factory",
      error: error.message,
    });
  }
};

module.exports = {
  createFactory,
  getFactories,
  getFactory,
  updateFactory,
  deleteFactory,
};