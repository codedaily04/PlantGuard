const mongoose = require("mongoose");

const machineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    machineId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    factoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Factory",
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["HEALTHY", "WARNING", "CRITICAL", "OFFLINE"],
      default: "HEALTHY",
    },

    healthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },

    installationDate: {
      type: Date,
    },

    lastMaintenance: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Machine", machineSchema);