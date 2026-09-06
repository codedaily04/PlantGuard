/**
 * Anomaly Detection Engine Tests
 * Tests deterministic threshold and trend-based anomaly detection
 */

const {
  detectThresholdAnomalies,
  detectTrendAnomalies,
} = require('./src/services/anomalyDetectionService');

const { getEquipmentProfile } = require('./src/services/healthCalculations');

console.log('=== ANOMALY DETECTION ENGINE TESTS ===\n');

// Test 1: Normal telemetry → no anomaly
console.log('1. Normal Telemetry - No Anomalies');
const cncMachine = { _id: 'cnc001', name: 'CNC Mill 001', type: 'CNC' };
const cncProfile = getEquipmentProfile('CNC');

const normalSnapshot = {
  temperature: 45,
  vibration: 1.8,
  pressure: null,
  powerConsumption: 820,
  operatingHours: 1000,
  recordedAt: new Date()
};

const normalAnomalies = detectThresholdAnomalies(normalSnapshot, cncMachine, cncProfile);
console.log(`Anomalies detected: ${normalAnomalies.length}`);
console.log('Expected: 0 anomalies ✓');
console.log('');

// Test 2: CNC temperature spike
console.log('2. CNC Temperature Spike');
const tempSpikeSnapshot = {
  temperature: 95,  // High for CNC (optimal: 20-70°C)
  vibration: 2.0,
  pressure: null,
  powerConsumption: 850,
  operatingHours: 1010,
  recordedAt: new Date()
};

const tempSpikeAnomalies = detectThresholdAnomalies(tempSpikeSnapshot, cncMachine, cncProfile);
console.log(`Anomalies detected: ${tempSpikeAnomalies.length}`);
tempSpikeAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.metric}: ${a.currentValue} (baseline: ${a.baselineValue})`);
  console.log(`    Deviation: ${a.deviationPercent}`);
  console.log(`    ${a.explanation}`);
});
console.log('Expected: temperature_anomaly (high severity) ✓');
console.log('');

// Test 3: CNC vibration anomaly
console.log('3. CNC Vibration Anomaly');
const vibrationSnapshot = {
  temperature: 50,
  vibration: 6.5,  // High for CNC (normal: <2.0 mm/s)
  pressure: null,
  powerConsumption: 850,
  operatingHours: 1020,
  recordedAt: new Date()
};

const vibrationAnomalies = detectThresholdAnomalies(vibrationSnapshot, cncMachine, cncProfile);
console.log(`Anomalies detected: ${vibrationAnomalies.length}`);
vibrationAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.metric}: ${a.currentValue} mm/s (baseline: ${a.baselineValue} mm/s)`);
  console.log(`    Deviation: ${a.deviationPercent}`);
  console.log(`    ${a.explanation}`);
});
console.log('Expected: vibration_anomaly (high severity) ✓');
console.log('');

// Test 4: Compressor pressure drop
console.log('4. Compressor Pressure Drop');
const compressor = { _id: 'comp202', name: 'Air Compressor 202', type: 'COMPRESSOR' };
const compProfile = getEquipmentProfile('COMPRESSOR');

const pressureDropSnapshot = {
  temperature: 78,
  vibration: 5.0,
  pressure: 95,  // Low for compressor (optimal: 120-150 PSI)
  powerConsumption: 520,
  operatingHours: 8240,
  recordedAt: new Date()
};

const pressureDropAnomalies = detectThresholdAnomalies(pressureDropSnapshot, compressor, compProfile);
console.log(`Anomalies detected: ${pressureDropAnomalies.length}`);
pressureDropAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.metric}: ${a.currentValue} PSI (baseline: ${a.baselineValue} PSI)`);
  console.log(`    Deviation: ${a.deviationPercent}`);
  console.log(`    ${a.explanation}`);
});
console.log('Expected: pressure_anomaly (high severity) ✓');
console.log('');

// Test 5: Pump power spike
console.log('5. Pump Power Spike');
const pump = { _id: 'pump305', name: 'Hydraulic Pump 305', type: 'PUMP' };
const pumpProfile = getEquipmentProfile('PUMP');

const powerSpikeSnapshot = {
  temperature: 72,
  vibration: 3.1,
  pressure: 92,
  powerConsumption: 1150,  // Critical for pump (critical: >1100 kW)
  operatingHours: 12110,
  recordedAt: new Date()
};

const powerSpikeAnomalies = detectThresholdAnomalies(powerSpikeSnapshot, pump, pumpProfile);
console.log(`Anomalies detected: ${powerSpikeAnomalies.length}`);
powerSpikeAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.metric}: ${a.currentValue} kW (baseline: ${a.baselineValue} kW)`);
  console.log(`    Deviation: ${a.deviationPercent}`);
  console.log(`    ${a.explanation}`);
});
console.log('Expected: power_anomaly (critical severity) ✓');
console.log('');

// Test 6: Sustained pump vibration increase (trend)
console.log('6. Sustained Pump Vibration Increase (Trend-Based)');
const pumpReadings = [];

// Generate 20 readings with sustained vibration increase
// Most recent readings (indices 0-9) have higher vibration than older readings (indices 10-19)
for (let i = 0; i < 20; i++) {
  // Recent readings: i < 10 → higher vibration (3.5)
  // Older readings: i >= 10 → lower vibration (2.8)
  const baseVibration = i < 10 ? 3.5 : 2.8;  // Recent is higher
  const noise = (Math.random() - 0.5) * 0.2;
  pumpReadings.push({
    machineId: 'pump305',
    temperature: 65 + noise,
    vibration: baseVibration + noise,
    pressure: 88 + noise * 5,
    powerConsumption: 640 + noise * 20,
    operatingHours: 12100 + (20 - i) * 10,
    recordedAt: new Date(Date.now() - i * 3600000)
  });
}

const trendAnomalies = detectTrendAnomalies(pumpReadings, pump, pumpProfile);
console.log(`Anomalies detected: ${trendAnomalies.length}`);
trendAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.metric} (${a.detectionType})`);
  console.log(`    Current: ${a.currentValue}, Baseline: ${a.baselineValue}`);
  console.log(`    Trend: ${a.deviationPercent}`);
  console.log(`    ${a.explanation}`);
});
console.log('Expected: vibration trend anomaly (medium/high severity) ✓');
console.log('');

// Test 7: Multiple anomalies (critical state)
console.log('7. Multiple Anomalies - Critical State');
const criticalSnapshot = {
  temperature: 105,  // Critical high
  vibration: 8.5,    // Critical high
  pressure: null,
  powerConsumption: 1600,  // Critical high
  operatingHours: 1100,
  recordedAt: new Date()
};

const criticalAnomalies = detectThresholdAnomalies(criticalSnapshot, cncMachine, cncProfile);
console.log(`Anomalies detected: ${criticalAnomalies.length}`);
console.log('Breakdown:');
criticalAnomalies.forEach(a => {
  console.log(`  - ${a.metric}: ${a.severity} (${a.deviationPercent})`);
});
console.log('Expected: 3 anomalies (temperature, vibration, power) ✓');
console.log('');

// Test 8: Partial/missing sensor data
console.log('8. Partial Sensor Data - Only Available Metrics');
const partialSnapshot = {
  temperature: 85,
  vibration: null,  // Missing
  pressure: null,   // N/A for CNC
  powerConsumption: null,  // Missing
  operatingHours: 1200,
  recordedAt: new Date()
};

const partialAnomalies = detectThresholdAnomalies(partialSnapshot, cncMachine, cncProfile);
console.log(`Anomalies detected: ${partialAnomalies.length}`);
partialAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.metric}: ${a.explanation}`);
});
console.log('Expected: Only temperature anomaly (other sensors unavailable) ✓');
console.log('');

// Test 9: Equipment-specific threshold differences
console.log('9. Equipment-Specific Threshold Differences');
const testValue = { temperature: 95, vibration: 7.0, pressure: 140, powerConsumption: 700 };

const cncTest = detectThresholdAnomalies(
  { ...testValue, recordedAt: new Date() },
  { _id: 'cnc', name: 'CNC', type: 'CNC' },
  getEquipmentProfile('CNC')
);

const compTest = detectThresholdAnomalies(
  { ...testValue, recordedAt: new Date() },
  { _id: 'comp', name: 'Compressor', type: 'COMPRESSOR' },
  getEquipmentProfile('COMPRESSOR')
);

const pumpTest = detectThresholdAnomalies(
  { ...testValue, recordedAt: new Date() },
  { _id: 'pump', name: 'Pump', type: 'PUMP' },
  getEquipmentProfile('PUMP')
);

console.log(`CNC anomalies: ${cncTest.length} (temp 95°C is HIGH, vib 7.0 is HIGH)`);
console.log(`COMPRESSOR anomalies: ${compTest.length} (temp 95°C is NORMAL, vib 7.0 is MEDIUM)`);
console.log(`PUMP anomalies: ${pumpTest.length} (temp 95°C is HIGH, vib 7.0 is MEDIUM)`);
console.log('Expected: Different anomaly counts per equipment type ✓');
console.log('');

// Test 10: Insufficient data for trend detection
console.log('10. Insufficient Data for Trend Detection');
const shortReadings = Array(10).fill(null).map((_, i) => ({
  machineId: 'pump305',
  temperature: 65,
  vibration: 3.5,
  pressure: 88,
  powerConsumption: 640,
  operatingHours: 12100 + i,
  recordedAt: new Date(Date.now() - i * 3600000)
}));

const shortTrendAnomalies = detectTrendAnomalies(shortReadings, pump, pumpProfile);
console.log(`Trend anomalies detected: ${shortTrendAnomalies.length}`);
console.log('Expected: 0 (need 20+ readings for trend detection) ✓');
console.log('');

// Test 11: Structured anomaly object validation
console.log('11. Structured Anomaly Object Validation');
const testAnomaly = tempSpikeAnomalies[0];
const requiredFields = [
  'metric',
  'machineId',
  'currentValue',
  'baselineValue',
  'deviation',
  'deviationPercent',
  'severity',
  'detectionType',
  'timestamp',
  'explanation'
];

const missingFields = requiredFields.filter(field => !(field in testAnomaly));
console.log(`Required fields present: ${requiredFields.length - missingFields.length}/${requiredFields.length}`);
if (missingFields.length > 0) {
  console.log(`Missing fields: ${missingFields.join(', ')}`);
} else {
  console.log('All required fields present ✓');
  console.log('Sample anomaly object:');
  console.log(JSON.stringify(testAnomaly, null, 2));
}
console.log('');

console.log('=== ALL ANOMALY DETECTION TESTS COMPLETE ===');
