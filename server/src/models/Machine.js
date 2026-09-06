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

    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plant",
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

machineSchema.index({ plantId: 1 });
machineSchema.index({ factoryId: 1 });

module.exports = mongoose.model("Machine", machineSchema);