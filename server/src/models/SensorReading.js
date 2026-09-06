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
    },

    vibration: {
      type: Number,
    },

    pressure: {
      type: Number,
    },

    powerConsumption: {
      type: Number,
    },

    operatingHours: {
      type: Number,
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

sensorReadingSchema.index({ machineId: 1, recordedAt: -1 });

module.exports = mongoose.model(
  "SensorReading",
  sensorReadingSchema
);