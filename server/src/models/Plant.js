const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    plantType: {
      type: String,
      required: true,
      trim: true,
    },

    factoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Factory",
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    capacity: {
      type: Number,
      min: 0,
    },

    commissioningDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["OPERATIONAL", "MAINTENANCE", "OFFLINE", "STARTUP"],
      default: "OPERATIONAL",
    },

    healthStatus: {
      type: String,
      enum: ["HEALTHY", "WARNING", "CRITICAL", "OFFLINE"],
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

// Index for efficient querying
plantSchema.index({ owner: 1 });
plantSchema.index({ factoryId: 1 });

module.exports = mongoose.model("Plant", plantSchema);
