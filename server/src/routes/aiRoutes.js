const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { analyzePlant } = require("../controllers/aiController");

// All routes require authentication
router.use(protect);

// Analyze plant health
router.get("/analyze/:plantId", analyzePlant);

module.exports = router;
