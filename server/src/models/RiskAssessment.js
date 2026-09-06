const mongoose = require("mongoose");

const riskAssessmentSchema = new mongoose.Schema(
  {
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },

    assessmentDate: {
      type: Date,
      default: Date.now,
      required: true,
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    riskCategory: {
      type: String,
      enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"],
      required: true,
    },

    riskFactors: [
      {
        factor: String,
        contribution: Number,
        evidence: String,
        weight: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    timeToAction: {
      type: String,
    },

    recommendations: [
      {
        priority: String,
        action: String,
        reason: String,
        estimatedDuration: String,
      },
    ],

    // Supporting metrics at time of assessment
    healthScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    healthStatus: {
      type: String,
    },

    anomalyCount: {
      type: Number,
      default: 0,
    },

    trendAnomalyCount: {
      type: Number,
      default: 0,
    },

    // Metadata
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    dataQuality: {
      type: String,
    },

    readingsAnalyzed: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
riskAssessmentSchema.index({ machineId: 1, assessmentDate: -1 });
riskAssessmentSchema.index({ riskCategory: 1, assessmentDate: -1 });
riskAssessmentSchema.index({ assessmentDate: -1 });

module.exports = mongoose.model("RiskAssessment", riskAssessmentSchema);
