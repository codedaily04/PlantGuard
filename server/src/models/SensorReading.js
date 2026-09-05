const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },

    temperature: {
      type: Number,
      required: true,
    },

    vibration: {
      type: Number,
      required: true,
    },

    pressure: {
      type: Number,
      required: true,
    },

    powerConsumption: {
      type: Number,
      required: true,
    },

    operatingHours: {
      type: Number,
      required: true,
    },

    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SensorReading",
  sensorReadingSchema
);