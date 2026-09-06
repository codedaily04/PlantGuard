/**
 * What-If Simulation Controller
 */

const Machine = require('../models/Machine');
const Plant = require('../models/Plant');
const { 
  simulateTelemetryChange, 
  simulateScenarios 
} = require('../services/whatIfSimulationService');
const { analyzeMachineHealth } = require('../services/aiService');

/**
 * POST /api/simulation/what-if
 * Single scenario simulation
 */
exports.runWhatIfSimulation = async (req, res) => {
  try {
    const { machineId, modifications, options } = req.body;
    
    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }
    
    if (!modifications || Object.keys(modifications).length === 0) {
      return res.status(400).json({ error: 'modifications object is required' });
    }
    
    // Fetch machine
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    // DEBUG: Log ownership chain before validation
    console.log('\n=== WHAT-IF OWNERSHIP DEBUG ===');
    console.log('Request User:', {
      _id: req.user._id.toString(),
      email: req.user.email
    });
    console.log('Machine:', {
      _id: machine._id.toString(),
      name: machine.name,
      plantId: machine.plantId ? machine.plantId.toString() : null
    });
    
    // Verify ownership (skip if machine has no plant - legacy data)
    if (machine.plantId) {
      const plant = await Plant.findById(machine.plantId);
      
      console.log('Plant:', plant ? {
        _id: plant._id.toString(),
        name: plant.name,
        owner: plant.owner.toString()
      } : 'NOT FOUND');
      
      if (plant) {
        const ownerMatch = plant.owner.toString() === req.user._id.toString();
        console.log('Ownership Check:', {
          plantOwner: plant.owner.toString(),
          requestUser: req.user._id.toString(),
          match: ownerMatch
        });
        
        if (!ownerMatch) {
          console.log('❌ ACCESS DENIED: User does not own plant');
          console.log('=== END DEBUG ===\n');
          return res.status(403).json({ error: 'Access denied' });
        }
        console.log('✓ Ownership verified');
      } else {
        console.log('⚠️ Plant not found for plantId:', machine.plantId.toString());
      }
    } else {
      console.log('ℹ️ Machine has no plantId - skipping ownership check');
    }
    console.log('=== END DEBUG ===\n');
    
    // Run simulation
    const result = await simulateTelemetryChange(machine, modifications, options);
    
    res.json({
      success: true,
      simulation: result
    });
    
  } catch (error) {
    console.error('What-If Simulation Error:', error);
    
    if (error.message.includes('Invalid modification') || 
        error.message.includes('Invalid metric') ||
        error.message.includes('Insufficient telemetry')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Simulation failed' });
  }
};

/**
 * POST /api/simulation/scenarios
 * Batch scenario simulation
 */
exports.runScenarios = async (req, res) => {
  try {
    const { machineId, scenarios, options } = req.body;
    
    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }
    
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({ error: 'scenarios array is required' });
    }
    
    // Validate scenario structure
    for (const scenario of scenarios) {
      if (!scenario.name || !scenario.modifications) {
        return res.status(400).json({ 
          error: 'Each scenario must have name and modifications' 
        });
      }
    }
    
    // Fetch machine
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    // Verify ownership (skip if machine has no plant - legacy data)
    if (machine.plantId) {
      const plant = await Plant.findById(machine.plantId);
      if (plant && plant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Run batch simulations
    const results = await simulateScenarios(machine, scenarios, options);
    
    res.json({
      success: true,
      scenarios: results,
      total: results.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length
    });
    
  } catch (error) {
    console.error('Batch Simulation Error:', error);
    res.status(500).json({ error: 'Batch simulation failed' });
  }
};

/**
 * POST /api/simulation/what-if-ai
 * What-if simulation with AI interpretation
 */
exports.runWhatIfWithAI = async (req, res) => {
  try {
    const { machineId, modifications, options = {} } = req.body;
    
    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }
    
    if (!modifications || Object.keys(modifications).length === 0) {
      return res.status(400).json({ error: 'modifications object is required' });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "AI service is not configured"
      });
    }
    
    // Fetch machine
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    // Fetch plant for ownership verification and AI context
    let plant = null;
    if (machine.plantId) {
      plant = await Plant.findById(machine.plantId);
      
      // Verify ownership
      if (plant && plant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Run simulation
    const simulationResult = await simulateTelemetryChange(machine, modifications, {
      ...options,
      includeRisk: true
    });
    
    // Get AI interpretation of the simulation
    const aiAnalysis = await analyzeMachineHealth(machine, plant, {
      includeRisk: true,
      whatIfContext: simulationResult
    });
    
    res.json({
      success: true,
      simulation: simulationResult,
      aiInterpretation: aiAnalysis.aiInterpretation,
      metadata: {
        analyzedAt: aiAnalysis.analyzedAt,
        confidence: aiAnalysis.confidence
      }
    });
    
  } catch (error) {
    console.error('What-If AI Analysis Error:', error);
    
    if (error.message.includes('Invalid modification') || 
        error.message.includes('Invalid metric') ||
        error.message.includes('Insufficient telemetry')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes("API quota") || error.message.includes("rate limit")) {
      return res.status(429).json({
        error: "AI service rate limit exceeded. Please try again later."
      });
    }
    
    res.status(500).json({ error: 'AI-enhanced simulation failed' });
  }
};
