const Machine = require("../models/Machine");

// CREATE MACHINE
const createMachine = async (req, res) => {
  try {
    const machine = await Machine.create({
      ...req.body,
    });

    res.status(201).json({
      message: "Machine created successfully",
      machine,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create machine",
      error: error.message,
    });
  }
};

// GET ALL MACHINES
const getMachines = async (req, res) => {
  try {
    const machines = await Machine.find();

    res.json({
      count: machines.length,
      machines,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch machines",
      error: error.message,
    });
  }
};

// GET SINGLE MACHINE
const getMachine = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({
        message: "Machine not found",
      });
    }

    res.json({
      machine,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch machine",
      error: error.message,
    });
  }
};

// UPDATE MACHINE
const updateMachine = async (req, res) => {
  try {
    const machine = await Machine.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!machine) {
      return res.status(404).json({
        message: "Machine not found",
      });
    }

    res.json({
      message: "Machine updated successfully",
      machine,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update machine",
      error: error.message,
    });
  }
};

// DELETE MACHINE
const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);

    if (!machine) {
      return res.status(404).json({
        message: "Machine not found",
      });
    }

    res.json({
      message: "Machine deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete machine",
      error: error.message,
    });
  }
};

module.exports = {
  createMachine,
  getMachines,
  getMachine,
  updateMachine,
  deleteMachine,
};