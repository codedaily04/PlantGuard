const mongoose = require("mongoose");

const plantSensorReadingSchema = new mongoose.Schema(
  {
    plantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plant",
      required: true,
    },

    temperature: {
      type: Number,
      required: false, // Optional - not all sensors may have all readings
    },

    humidity: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },

    soilMoisture: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },

    soilPH: {
      type: Number,
      required: false,
      min: 0,
      max: 14,
    },

    lightIntensity: {
      type: Number,
      required: false, // Lux or similar unit
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
plantSensorReadingSchema.index({ plantId: 1, timestamp: -1 });

module.exports = mongoose.model(
  "PlantSensorReading",
  plantSensorReadingSchema
);
