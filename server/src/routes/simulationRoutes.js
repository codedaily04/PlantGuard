/**
 * What-If Simulation Routes
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const simulationController = require('../controllers/simulationController');

// All simulation routes require authentication
router.use(authMiddleware);

// POST /api/simulation/what-if - Single scenario
router.post('/what-if', simulationController.runWhatIfSimulation);

// POST /api/simulation/what-if-ai - Single scenario with AI interpretation
router.post('/what-if-ai', simulationController.runWhatIfWithAI);

// POST /api/simulation/scenarios - Batch scenarios
router.post('/scenarios', simulationController.runScenarios);

module.exports = router;
