const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    species: {
      type: String,
      required: true,
      trim: true,
    },

    cropType: {
      type: String,
      required: true,
      trim: true,
    },

    growthStage: {
      type: String,
      enum: ["SEEDLING", "VEGETATIVE", "FLOWERING", "FRUITING", "MATURE", "HARVESTED"],
      default: "SEEDLING",
    },

    plantingDate: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    healthStatus: {
      type: String,
      enum: ["HEALTHY", "STRESSED", "AT_RISK", "DISEASED", "CRITICAL"],
      default: "HEALTHY",
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by owner
plantSchema.index({ owner: 1 });

module.exports = mongoose.model("Plant", plantSchema);
