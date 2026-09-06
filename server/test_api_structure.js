/**
 * TEST API RESPONSE STRUCTURE
 * 
 * Tests that the new integrated response structure matches expectations
 * without requiring MongoDB or Gemini API
 */

const { 
  extractLatestSensorSnapshot, 
  assessDataQuality, 
  calculateHealthScore, 
  detectRisks 
} = require('./src/services/healthCalculations');

function testAPIStructure() {
  console.log('\n🧪 Testing API Response Structure...\n');
  
  // Mock sensor readings
  const mockReadings = [
    {
      temperature: 25,
      humidity: 65,
      soilMoisture: 45,
      soilPH: 6.5,
      lightIntensity: 18000,
      timestamp: new Date()
    }
  ];
  
  // Mock plant
  const mockPlant = {
    _id: 'test-plant-id',
    name: 'Test Plant',
    species: 'Test Species',
    cropType: 'Test Crop',
    growthStage: 'VEGETATIVE',
    location: 'Test Location',
    plantingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };
  
  try {
    // Test deterministic intelligence structure
    console.log('🔬 Testing Deterministic Intelligence Structure...');
    
    const snapshot = extractLatestSensorSnapshot(mockReadings);
    const dataQuality = assessDataQuality(mockReadings, snapshot);
    const healthScoreData = calculateHealthScore(snapshot);
    const detectedRisks = detectRisks(snapshot, mockReadings);
    
    // Simulate the combined analysis structure
    const mockAnalysis = {
      // Deterministic data (source of truth)
      healthScore: healthScoreData.healthScore,
      healthStatus: 'Healthy',
      detectedRisks: detectedRisks,
      scoreBreakdown: healthScoreData.scoreBreakdown,
      
      // AI contextual analysis (mocked)
      summary: "Plant is in good health with optimal sensor readings",
      detectedIssues: [],
      riskLevel: 'Low',
      recommendations: ["Continue current care routine", "Monitor regularly"],
      irrigationAdvice: "Water when soil moisture drops below 40%",
      environmentalAdvice: "Maintain current temperature and humidity levels",
      confidence: 0.9,
      
      // Metadata
      analyzedAt: new Date().toISOString(),
      readingsAnalyzed: mockReadings.length,
      sensorStatistics: snapshot,
      dataQuality: dataQuality,
    };
    
    console.log('✅ Generated mock analysis successfully');
    
    // Simulate controller response structure
    const apiResponse = {
      success: true,
      plant: {
        id: mockPlant._id,
        name: mockPlant.name,
        species: mockPlant.species,
        cropType: mockPlant.cropType,
        growthStage: mockPlant.growthStage,
        location: mockPlant.location
      },
      health: {
        score: mockAnalysis.healthScore,
        status: mockAnalysis.healthStatus,
        detectedRisks: mockAnalysis.detectedRisks,
        scoreBreakdown: mockAnalysis.scoreBreakdown
      },
      aiAnalysis: {
        summary: mockAnalysis.summary,
        detectedIssues: mockAnalysis.detectedIssues,
        recommendations: mockAnalysis.recommendations,
        irrigationAdvice: mockAnalysis.irrigationAdvice,
        environmentalAdvice: mockAnalysis.environmentalAdvice,
        confidence: mockAnalysis.confidence
      },
      metadata: {
        readingsAnalyzed: mockAnalysis.readingsAnalyzed,
        analyzedAt: mockAnalysis.analyzedAt,
        dataQuality: mockAnalysis.dataQuality
      }
    };
    
    console.log('✅ Generated API response structure');
    
    // Validate response structure
    console.log('\n📋 Validating Response Structure...');
    
    const checks = [
      { name: 'Response has success field', pass: typeof apiResponse.success === 'boolean' },
      { name: 'Response has plant object', pass: typeof apiResponse.plant === 'object' },
      { name: 'Plant has required fields', pass: apiResponse.plant.id && apiResponse.plant.name && apiResponse.plant.species },
      { name: 'Response has health object', pass: typeof apiResponse.health === 'object' },
      { name: 'Health has score (0-100)', pass: typeof apiResponse.health.score === 'number' && apiResponse.health.score >= 0 && apiResponse.health.score <= 100 },
      { name: 'Health has status', pass: typeof apiResponse.health.status === 'string' },
      { name: 'Health has detectedRisks array', pass: Array.isArray(apiResponse.health.detectedRisks) },
      { name: 'Health has scoreBreakdown', pass: typeof apiResponse.health.scoreBreakdown === 'object' },
      { name: 'Response has aiAnalysis object', pass: typeof apiResponse.aiAnalysis === 'object' },
      { name: 'AI has summary', pass: typeof apiResponse.aiAnalysis.summary === 'string' },
      { name: 'AI has recommendations array', pass: Array.isArray(apiResponse.aiAnalysis.recommendations) },
      { name: 'AI has confidence (0-1)', pass: typeof apiResponse.aiAnalysis.confidence === 'number' && apiResponse.aiAnalysis.confidence >= 0 && apiResponse.aiAnalysis.confidence <= 1 },
      { name: 'Response has metadata object', pass: typeof apiResponse.metadata === 'object' },
      { name: 'Metadata has readingsAnalyzed', pass: typeof apiResponse.metadata.readingsAnalyzed === 'number' },
      { name: 'Metadata has analyzedAt timestamp', pass: typeof apiResponse.metadata.analyzedAt === 'string' }
    ];
    
    let passed = 0;
    checks.forEach(check => {
      if (check.pass) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}`);
      }
    });
    
    console.log(`\n📊 Structure Validation:`);
    console.log(`   Passed: ${passed}/${checks.length} checks`);
    console.log(`   Success Rate: ${(passed/checks.length*100).toFixed(1)}%`);
    
    if (passed === checks.length) {
      console.log(`\n🎉 API STRUCTURE TEST PASSED! 🎉`);
    } else {
      console.log(`\n⚠️  Some structure validations failed`);
    }
    
    // Display sample response
    console.log(`\n📋 Sample API Response:`);
    console.log(JSON.stringify(apiResponse, null, 2));
    
    return passed === checks.length;
    
  } catch (error) {
    console.error('\n❌ API Structure test failed:', error.message);
    return false;
  }
}

// Run the test
if (testAPIStructure()) {
  process.exit(0);
} else {
  process.exit(1);
}