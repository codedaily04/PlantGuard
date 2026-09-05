const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createFactory,
  getFactories,
  getFactory,
  updateFactory,
  deleteFactory,
} = require("../controllers/factoryController");

const router = express.Router();

router.use(protect);

router.post("/", createFactory);

router.get("/", getFactories);

router.get("/:id", getFactory);

router.put("/:id", updateFactory);

router.delete("/:id", deleteFactory);

module.exports = router;