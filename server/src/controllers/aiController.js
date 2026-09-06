const Plant = require("../models/Plant");
const Machine = require("../models/Machine");
const { analyzeMachineHealth } = require("../services/aiService");

/**
 * Analyze machine health using AI
 * GET /api/ai/analyze/:machineId
 */
const analyzePlant = async (req, res) => {
  try {
    const { plantId } = req.params;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        message: "AI service is not configured. Please add GEMINI_API_KEY to environment variables.",
      });
    }

    // Support both plant and machine analysis
    // Try to find as machine first (backward compatibility)
    let machine = await Machine.findById(plantId);
    let plant;
    
    if (machine) {
      // It's a machine ID
      plant = machine.plantId 
        ? await Plant.findById(machine.plantId)
        : { name: "Unknown Plant", location: "Unknown", plantType: "Unknown" };
    } else {
      // Try as plant ID, get first machine
      plant = await Plant.findOne({
        _id: plantId,
        owner: req.user._id,
      });

      if (!plant) {
        return res.status(404).json({
          message: "Plant or machine not found or access denied",
        });
      }

      // Get first machine for this plant
      machine = await Machine.findOne({ plantId: plant._id });
      
      if (!machine) {
        return res.status(404).json({
          message: "No machines found for this plant",
        });
      }
    }

    // Perform AI analysis on machine
    const analysis = await analyzeMachineHealth(machine, plant);

    res.json({
      success: true,
      machine: {
        id: machine._id,
        name: machine.name,
        type: machine.type,
        machineId: machine.machineId
      },
      plant: {
        id: plant._id,
        name: plant.name,
        plantType: plant.plantType,
        location: plant.location
      },
      health: {
        score: analysis.healthScore,
        status: analysis.healthStatus,
        detectedAnomalies: analysis.detectedAnomalies,
        scoreBreakdown: analysis.scoreBreakdown
      },
      aiAnalysis: {
        summary: analysis.summary,
        detectedIssues: analysis.detectedIssues,
        recommendations: analysis.recommendations,
        maintenanceAdvice: analysis.maintenanceAdvice,
        operationalImpact: analysis.operationalImpact,
        severity: analysis.severity,
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

    if (error.message.includes("No sensor readings")) {
      return res.status(404).json({
        message: "No sensor readings available for this machine",
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

    res.status(500).json({
      message: "Failed to analyze machine health",
      error: error.message,
    });
  }
};

module.exports = {
  analyzePlant,
};
