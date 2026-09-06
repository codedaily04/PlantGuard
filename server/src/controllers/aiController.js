const Plant = require("../models/Plant");
const { analyzePlantHealth } = require("../services/aiService");

/**
 * Analyze plant health using AI
 * GET /api/ai/analyze/:plantId
 */
const analyzePlant = async (req, res) => {
  try {
    const { plantId } = req.params;

    // Check if GEMINI_API_KEY is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "AI service is not configured. Please add GEMINI_API_KEY to environment variables.",
      });
    }

    // Verify the plant exists and belongs to the user
    const plant = await Plant.findOne({
      _id: plantId,
      owner: req.user._id,
    });

    if (!plant) {
      return res.status(404).json({
        message: "Plant not found or access denied",
      });
    }

    // Perform AI analysis
    const analysis = await analyzePlantHealth(plant, req.user._id);

    res.json({
      success: true,
      plant: {
        id: plant._id,
        name: plant.name,
        species: plant.species,
        cropType: plant.cropType,
        growthStage: plant.growthStage,
        location: plant.location
      },
      health: {
        score: analysis.healthScore,
        status: analysis.healthStatus,
        detectedRisks: analysis.detectedRisks,
        scoreBreakdown: analysis.scoreBreakdown
      },
      aiAnalysis: {
        summary: analysis.summary,
        detectedIssues: analysis.detectedIssues,
        recommendations: analysis.recommendations,
        irrigationAdvice: analysis.irrigationAdvice,
        environmentalAdvice: analysis.environmentalAdvice,
        confidence: analysis.confidence
      },
      metadata: {
        readingsAnalyzed: analysis.readingsAnalyzed,
        analyzedAt: analysis.analyzedAt,
        dataQuality: analysis.dataQuality
      }
    });
  } catch (error) {
    console.error("AI Analysis Error:", error);

    // Handle specific error cases
    if (error.message.includes("No sensor readings")) {
      return res.status(404).json({
        message: "No sensor readings available for this plant",
        error: error.message,
      });
    }

    if (error.message.includes("GEMINI_API_KEY")) {
      return res.status(500).json({
        message: "AI service configuration error",
        error: error.message,
      });
    }

    if (error.message.includes("API quota") || error.message.includes("rate limit")) {
      return res.status(429).json({
        message: "AI service rate limit exceeded. Please try again later.",
        error: error.message,
      });
    }

    if (error.message.includes("parse")) {
      return res.status(500).json({
        message: "Failed to parse AI response. The AI service may be experiencing issues.",
        error: error.message,
      });
    }

    // Generic error
    res.status(500).json({
      message: "Failed to analyze plant health",
      error: error.message,
    });
  }
};

module.exports = {
  analyzePlant,
};
