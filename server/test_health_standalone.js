/**
 * STANDALONE TEST FOR HEALTH INTELLIGENCE ENGINE
 * Tests the core logic without requiring MongoDB connection
 */

const {
  calculateHealthScore,
  detectRisks,
  assessDataQuality,
  THRESHOLDS
} = require("./src/services/healthIntelligenceService");

console.log("\n╔" + "═".repeat(58) + "╗");
console.log("║" + " ".repeat(5) + "HEALTH INTELLIGENCE ENGINE - STANDALONE TEST" + " ".repeat(7) + "║");
console.log("╚" + "═".repeat(58) + "╝\n");

/**
 * Helper to create sensor snapshot
 */
function createSnapshot(params) {
  return {
    temperature: params.temperature !== undefined ? params.temperature : null,
    humidity: params.humidity !== undefined ? params.humidity : null,
    soilMoisture: params.soilMoisture !== undefined ? params.soilMoisture : null,
    ph: params.ph !== undefined ? params.ph : null,
    light: params.light !== undefined ? params.light : null,
    timestamp: new Date(),
    availability: {
      temperature: params.temperature !== undefined,
      humidity: params.humidity !== undefined,
      soilMoisture: params.soilMoisture !== undefined,
      ph: params.ph !== undefined,
      light: params.light !== undefined,
    }
  };
}

/**
 * Helper to create mock readings
 */
function createMockReadings(count, params) {
  const readings = [];
  for (let i = 0; i < count; i++) {
    readings.push({
      temperature: params.temperature,
      humidity: params.humidity,
      soilMoisture: params.soilMoisture,
      soilPH: params.ph,
      lightIntensity: params.light,
      timestamp: new Date(Date.now() - i * 3600000)
    });
  }
  return readings;
}

/**
 * Test Case Runner
 */
function runTest(testName, snapshot, readings, expectations) {
  console.log("\n" + "=".repeat(60));
  console.log(`TEST: ${testName}`);
  console.log("=".repeat(60));
  
  try {
    // Calculate health score
    const healthScore = calculateHealthScore(snapshot);
    
    // Detect risks
    const risks = detectRisks(snapshot, readings);
    
    // Assess data quality
    const dataQuality = assessDataQuality(readings, snapshot);
    
    console.log(`\n✅ Test executed successfully`);
    console.log(`\n📊 RESULTS:`);
    console.log(`  Health Score: ${healthScore.healthScore}/100`);
    console.log(`  Status: ${healthScore.status}`);
    console.log(`  Detected Risks: ${risks.length}`);
    console.log(`  Data Quality: ${dataQuality.quality}`);
    
    console.log(`\n📈 Score Breakdown:`);
    Object.entries(healthScore.scoreBreakdown).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}/20 - ${healthScore.scoreReasons[key]}`);
    });
    
    if (risks.length > 0) {
      console.log(`\n⚠️  Detected Risks:`);
      risks.forEach((risk, idx) => {
        console.log(`  ${idx + 1}. [${risk.severity.toUpperCase()}] ${risk.type}`);
        console.log(`     ${risk.message}`);
      });
    }
    
    // Verify expectations
    console.log(`\n🔍 VERIFICATION:`);
    let allPassed = true;
    
    if (expectations.minScore !== undefined) {
      const passed = healthScore.healthScore >= expectations.minScore;
      console.log(`  ${passed ? '✅' : '❌'} Score >= ${expectations.minScore}: ${healthScore.healthScore}`);
      if (!passed) allPassed = false;
    }
    
    if (expectations.maxScore !== undefined) {
      const passed = healthScore.healthScore <= expectations.maxScore;
      console.log(`  ${passed ? '✅' : '❌'} Score <= ${expectations.maxScore}: ${healthScore.healthScore}`);
      if (!passed) allPassed = false;
    }
    
    if (expectations.status) {
      const passed = healthScore.status === expectations.status;
      console.log(`  ${passed ? '✅' : '❌'} Status is "${expectations.status}": ${healthScore.status}`);
      if (!passed) allPassed = false;
    }
    
    if (expectations.minRisks !== undefined) {
      const passed = risks.length >= expectations.minRisks;
      console.log(`  ${passed ? '✅' : '❌'} Risks >= ${expectations.minRisks}: ${risks.length}`);
      if (!passed) allPassed = false;
    }
    
    if (expectations.hasRiskType) {
      const hasRisk = risks.some(r => r.type === expectations.hasRiskType);
      console.log(`  ${hasRisk ? '✅' : '❌'} Has risk type "${expectations.hasRiskType}": ${hasRisk}`);
      if (!hasRisk) allPassed = false;
    }
    
    return allPassed;
    
  } catch (error) {
    console.log(`\n❌ TEST FAILED WITH ERROR:`);
    console.log(`  ${error.message}`);
    console.log(error.stack);
    return false;
  }
}

// Run all tests
console.log("Starting test suite...\n");

const testResults = [];

// TEST 1: Healthy Plant
testResults.push({
  name: "Healthy Plant (Optimal Conditions)",
  passed: runTest(
    "Healthy Plant (Optimal Conditions)",
    createSnapshot({
      temperature: 23,
      humidity: 60,
      soilMoisture: 50,
      ph: 6.5,
      light: 18000
    }),
    createMockReadings(20, {
      temperature: 23,
      humidity: 60,
      soilMoisture: 50,
      ph: 6.5,
      light: 18000
    }),
    {
      minScore: 85,
      status: "healthy"
    }
  )
});

// TEST 2: Water Stress
testResults.push({
  name: "Water Stress (Low Soil Moisture)",
  passed: runTest(
    "Water Stress (Low Soil Moisture)",
    createSnapshot({
      temperature: 24,
      humidity: 55,
      soilMoisture: 18,
      ph: 6.5,
      light: 18000
    }),
    createMockReadings(20, {
      temperature: 24,
      humidity: 55,
      soilMoisture: 18,
      ph: 6.5,
      light: 18000
    }),
    {
      maxScore: 70,
      minRisks: 1,
      hasRiskType: "water_stress"
    }
  )
});

// TEST 3: Heat Stress
testResults.push({
  name: "Heat Stress (High Temperature)",
  passed: runTest(
    "Heat Stress (High Temperature)",
    createSnapshot({
      temperature: 36,
      humidity: 50,
      soilMoisture: 45,
      ph: 6.5,
      light: 18000
    }),
    createMockReadings(20, {
      temperature: 36,
      humidity: 50,
      soilMoisture: 45,
      ph: 6.5,
      light: 18000
    }),
    {
      maxScore: 75,
      minRisks: 1,
      hasRiskType: "heat_stress"
    }
  )
});

// TEST 4: Fungal Risk
testResults.push({
  name: "Fungal Risk (High Humidity + Warm Temp)",
  passed: runTest(
    "Fungal Risk (High Humidity + Warm Temp)",
    createSnapshot({
      temperature: 26,
      humidity: 88,
      soilMoisture: 50,
      ph: 6.5,
      light: 15000
    }),
    createMockReadings(20, {
      temperature: 26,
      humidity: 88,
      soilMoisture: 50,
      ph: 6.5,
      light: 15000
    }),
    {
      minRisks: 1,
      hasRiskType: "fungal_risk"
    }
  )
});

// TEST 5: Abnormal pH
testResults.push({
  name: "Abnormal pH (Too Acidic)",
  passed: runTest(
    "Abnormal pH (Too Acidic)",
    createSnapshot({
      temperature: 23,
      humidity: 60,
      soilMoisture: 50,
      ph: 5.2,
      light: 18000
    }),
    createMockReadings(20, {
      temperature: 23,
      humidity: 60,
      soilMoisture: 50,
      ph: 5.2,
      light: 18000
    }),
    {
      minRisks: 1,
      hasRiskType: "ph_abnormal"
    }
  )
});

// TEST 6: Missing Sensors
testResults.push({
  name: "Missing Sensor Values (Partial Data)",
  passed: runTest(
    "Missing Sensor Values (Partial Data)",
    createSnapshot({
      temperature: 23,
      humidity: 60,
      soilMoisture: undefined,
      ph: undefined,
      light: undefined
    }),
    createMockReadings(20, {
      temperature: 23,
      humidity: 60,
      soilMoisture: null,
      ph: null,
      light: null
    }),
    {
      minScore: 0 // Should not crash, any score is acceptable
    }
  )
});

// TEST 7: Insufficient Light
testResults.push({
  name: "Insufficient Light",
  passed: runTest(
    "Insufficient Light",
    createSnapshot({
      temperature: 23,
      humidity: 60,
      soilMoisture: 50,
      ph: 6.5,
      light: 1500
    }),
    createMockReadings(20, {
      temperature: 23,
      humidity: 60,
      soilMoisture: 50,
      ph: 6.5,
      light: 1500
    }),
    {
      minRisks: 1,
      hasRiskType: "insufficient_light"
    }
  )
});

// TEST 8: Cold Stress
testResults.push({
  name: "Cold Stress",
  passed: runTest(
    "Cold Stress",
    createSnapshot({
      temperature: 8,
      humidity: 60,
      soilMoisture: 50,
      ph: 6.5,
      light: 15000
    }),
    createMockReadings(20, {
      temperature: 8,
      humidity: 60,
      soilMoisture: 50,
      ph: 6.5,
      light: 15000
    }),
    {
      maxScore: 50,
      minRisks: 1,
      hasRiskType: "cold_stress"
    }
  )
});

// Summary
console.log("\n" + "=".repeat(60));
console.log("TEST SUMMARY");
console.log("=".repeat(60));

const passed = testResults.filter(r => r.passed).length;
const failed = testResults.filter(r => !r.passed).length;

testResults.forEach((result, idx) => {
  console.log(`${result.passed ? '✅' : '❌'} Test ${idx + 1}: ${result.name}`);
});

console.log(`\nTotal Tests: ${testResults.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log(`\n🎉 ALL TESTS PASSED! 🎉\n`);
  process.exit(0);
} else {
  console.log(`\n⚠️  SOME TESTS FAILED\n`);
  process.exit(1);
}
