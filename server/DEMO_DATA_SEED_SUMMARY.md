# PlantGuard AI - Demo Data Seed Summary

## Overview
A simple, deterministic seed script that creates realistic demo data for development and manual testing of the PlantGuard AI application.

## What Was Created

### Implementation
- **File**: `scripts/seed.js` (320 lines)
- **NPM Command**: `npm run seed`
- **Safe to Rerun**: Yes - cleans only its own demo data first
- **Deterministic**: Uses seeded random number generator for reproducible data

### Demo Data Structure

#### 1. Demo User
- **Email**: `demo@plantguard.ai`
- **Password**: `demo123` (for documentation only - actual hash in DB)
- **Role**: ADMIN

#### 2. Factory
- **Name**: DEMO_FACTORY
- **Location**: Silicon Valley, CA
- **Industry**: Advanced Manufacturing

#### 3. Plant
- **Name**: DEMO_PLANT
- **Type**: MANUFACTURING
- **Location**: Building A - Production Floor
- **Status**: OPERATIONAL
- **Capacity**: 1000 units

#### 4. Machines (3 total)

##### CNC Milling Center
- **Machine ID**: CNC-001
- **Type**: CNC
- **Telemetry Readings**: 45 (spanning 7 days)
- **Status**: Demonstrates elevated temperature and vibration trend
- **Latest Metrics**:
  - Temperature: 78°C (elevated, near threshold)
  - Vibration: 1.49 mm/s (with +56.1% upward trend)
  - Power: 770.7 kW
  - Operating Hours: 1220
- **Health Score**: 89/100
- **Anomalies**: Degradation detected (vibration trending upward)
- **Risk Score**: 16/100 (LOW)

##### Air Compressor Unit
- **Machine ID**: COMP-001
- **Type**: COMPRESSOR
- **Telemetry Readings**: 50 (spanning 7 days)
- **Status**: Healthy with gradual vibration increase for trend demonstration
- **Latest Metrics**:
  - Temperature: 48°C (optimal)
  - Vibration: 2.52 mm/s (showing gradual trend)
  - Pressure: 134.2 PSI (optimal)
  - Power: 524.8 kW
  - Operating Hours: 1245
- **Health Score**: 90/100
- **Anomalies**: None currently
- **Risk Score**: 4/100 (LOW)

##### Hydraulic Pump
- **Machine ID**: PUMP-001
- **Type**: PUMP
- **Telemetry Readings**: 40 (spanning 7 days)
- **Status**: Demonstrates power consumption anomaly
- **Latest Metrics**:
  - Temperature: 26.4°C (optimal)
  - Vibration: 1.56 mm/s (normal)
  - Pressure: 69.7 PSI (optimal)
  - Power: 925 kW (HIGH - 53% above normal)
  - Operating Hours: 1195
- **Health Score**: 85/100
- **Anomalies**: High power consumption detected
- **Risk Score**: 12/100 (LOW)

---

## Telemetry Data Characteristics

### Realistic Value Ranges
All values based on `EQUIPMENT_PROFILES` from `healthCalculations.js`:

**CNC**:
- Temperature: 20-70°C optimal (85°C high, 100°C critical)
- Vibration: 0-2.0 mm/s normal (4.0 elevated, 6.0 high, 8.0 critical)
- Power: 800W normal (1200W high, 1500W critical)
- Pressure: N/A

**COMPRESSOR**:
- Temperature: 15-90°C optimal (110°C high, 130°C critical)
- Vibration: 0-3.0 mm/s normal (6.0 elevated, 9.0 high, 12.0 critical)
- Pressure: 120-150 PSI optimal (170 high, 200 critical)
- Power: 500W normal (750W high, 900W critical)

**PUMP**:
- Temperature: 10-80°C optimal (95°C high, 110°C critical)
- Vibration: 0-2.5 mm/s normal (5.0 elevated, 7.5 high, 10.0 critical)
- Pressure: 60-100 PSI optimal (120 high, 150 critical)
- Power: 600W normal (900W high, 1100W critical)

### Data Distribution
- **Mostly Normal**: 85-90% of readings in optimal range
- **Deliberate Anomalies**: 10-15% show elevated/anomalous values
- **Temporal Distribution**: Readings spread evenly over 7 days
- **Operating Hours**: Increment realistically with each reading

### Anomaly Injection Strategy
1. **Historical anomalies** at 60-80% mark (for historical analysis)
2. **Recent anomalies** in last 2-5 readings (visible in current dashboard)
3. **Gradual trends** throughout time series (for degradation detection)

### Specific Anomalies Seeded

**CNC Machine**:
- Temperature spike at 70% mark (historical)
- Vibration spike at 80% mark (historical)
- **Elevated temperature** in last 3 readings (78°C - current issue)
- **Vibration upward trend** throughout series (+56.1% detected)

**COMPRESSOR**:
- Pressure drop at 60% mark (historical)
- **Gradual vibration increase** over last 60% of readings (trend for degradation demo)
- Additional vibration boost in last 5 readings (trend visibility)

**PUMP**:
- Power spike at 75% mark (historical)
- **High power consumption** in last 2 readings (925 kW - current issue)

---

## Usage

### Running the Seed Script

```bash
cd server
npm run seed
```

### Expected Output

```
═══════════════════════════════════════
   PlantGuard AI - Demo Data Seeder
═══════════════════════════════════════

Connecting to MongoDB...
✓ Connected to MongoDB

🧹 Cleaning existing demo data...
✓ Demo data cleaned

🌱 Creating demo data...

Creating demo user...
✓ User created: demo@plantguard.ai

Creating demo factory...
✓ Factory created: DEMO_FACTORY

Creating demo plant...
✓ Plant created: DEMO_PLANT

Creating machines and telemetry...

  Creating CNC machine...
  ✓ Machine created: CNC Milling Center
    Generating 45 telemetry readings...
    ✓ Created 45 sensor readings

  Creating COMPRESSOR machine...
  ✓ Machine created: Air Compressor Unit
    Generating 50 telemetry readings...
    ✓ Created 50 sensor readings

  Creating PUMP machine...
  ✓ Machine created: Hydraulic Pump
    Generating 40 telemetry readings...
    ✓ Created 40 sensor readings

📊 Verifying created data...

✓ Factory: DEMO_FACTORY
✓ Plant: DEMO_PLANT (MANUFACTURING)
✓ Machines: 3
  - CNC Milling Center (CNC): 45 readings
  - Air Compressor Unit (COMPRESSOR): 50 readings
  - Hydraulic Pump (PUMP): 40 readings

═══════════════════════════════════════
✓ DEMO DATA SEEDED SUCCESSFULLY
═══════════════════════════════════════
```

### Rerunning the Script
Safe to run multiple times. The script:
1. Identifies existing demo data by email (`demo@plantguard.ai`)
2. Deletes all associated sensor readings, machines, plant, factory, and user
3. Creates fresh demo data with the same structure
4. Does NOT affect any other users or data in the database

---

## Verification

### MongoDB Verification

```bash
# Connect to MongoDB
mongo plantguard

# Check demo data exists
db.users.findOne({ email: "demo@plantguard.ai" })
db.factories.findOne({ name: "DEMO_FACTORY" })
db.plants.findOne({ name: "DEMO_PLANT" })
db.machines.find({ machineId: /^(CNC|COMP|PUMP)-001$/ }).count()  // Should return 3
db.sensorreadings.find({ machineId: { $exists: true } }).count()  // Should return 135
```

### Application Testing

**1. Health Analysis**
- CNC shows elevated temperature and degradation trend
- COMPRESSOR shows healthy status with vibration trend
- PUMP shows power consumption anomaly
- All data quality marked as "excellent"

**2. Anomaly Detection**
- CNC: 1 anomaly (vibration degradation trend)
- COMPRESSOR: 0 anomalies (healthy)
- PUMP: 1 anomaly (high power consumption)

**3. Degradation Risk**
- CNC: 16/100 (LOW) - due to vibration trend
- COMPRESSOR: 4/100 (LOW) - minimal risk
- PUMP: 12/100 (LOW) - due to power anomaly

**4. What-If Simulations**
All machines have sufficient telemetry data (30-50 readings) for:
- Single scenario simulations
- Batch scenario comparisons
- Baseline vs simulated health calculations
- Risk category changes

**5. AI Operations Advisor**
Sufficient context for AI analysis:
- Machine type and telemetry
- Historical trends
- Current anomalies
- Risk assessments

---

## Test Results

### Existing Tests (All Passing ✓)

```bash
# What-If Simulation Tests
node test_what_if_simulation.js
✓ ALL WHAT-IF SIMULATION TESTS PASSED (10/10)

# AI Operations Advisor Tests
node test_ai_operations_advisor.js
✓ ALL AI OPERATIONS ADVISOR TESTS PASSED (6/6)

# Degradation Risk Tests
node test_degradation_risk.js
✓ ALL TESTS PASSED (9/9)

# Health Standalone Tests
node test_health_standalone.js
✓ ALL TESTS PASSED (5/5)
```

### Demo Data Analysis
Created `test_demo_data.js` to verify demo machines (can be run separately):
- All machines analyzed successfully
- Health scores realistic (85-89/100)
- Anomalies detected where expected
- Degradation trends visible
- Risk scores appropriate (4-16/100)

---

## Dashboard Demonstration Capabilities

With this demo data, you can demonstrate:

### ✅ Normal Operations
- COMPRESSOR shows healthy machine with good telemetry
- All machines have excellent data quality
- Operating hours tracking

### ✅ Temperature Monitoring
- CNC shows elevated temperature (78°C near threshold)
- Score breakdown reflects temperature impact (17/25 vs 25/25)

### ✅ Power Anomalies
- PUMP demonstrates high power consumption anomaly
- Clear anomaly message: "High power consumption: 925 kW (normal: 600 kW)"
- Health score reduced appropriately (85/100)

### ✅ Degradation Trends
- CNC shows vibration trending upward (+56.1%)
- Medium severity degradation anomaly
- Recommendation: "Predictive maintenance assessment"

### ✅ Equipment Profiles
- Different thresholds per machine type (CNC vs COMPRESSOR vs PUMP)
- Pressure readings for COMPRESSOR and PUMP only
- Type-specific health scoring

### ✅ What-If Simulations
- Sufficient historical data for baseline calculations
- Can simulate temperature increases, vibration changes, pressure drops
- Shows health delta and status changes

### ✅ AI Operations Advisor
- Complete machine context for AI analysis
- Plant information available
- Historical telemetry for trend analysis
- Current anomalies for interpretation

---

## Implementation Details

### No Modifications to Core Logic
- ✅ Reused existing models (Factory, Plant, Machine, SensorReading)
- ✅ No changes to health calculations
- ✅ No changes to anomaly detection
- ✅ No changes to risk assessment
- ✅ No changes to simulation logic
- ✅ No changes to AI service
- ✅ No new dependencies added
- ✅ No hardcoded data in controllers

### Deterministic Data Generation
Uses seeded random number generator:
```javascript
class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  range(min, max) {
    return min + this.next() * (max - min);
  }
}
```

Each machine type uses a different seed based on its name, ensuring:
- Same output every time the script runs
- Different but realistic patterns per machine
- Reproducible for testing and debugging

### Safe Cleanup Logic
```javascript
async function cleanDemoData() {
  const demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (demoUser) {
    // Find and delete associated factory, plant, machines, readings
    // Only deletes data owned by demo user
  }
}
```

---

## Troubleshooting

### "Duplicate key error on email"
The script already cleans existing demo data. If you see this error:
1. Manually delete the demo user: `db.users.deleteOne({ email: "demo@plantguard.ai" })`
2. Run the seed again

### "No machines found"
If the dashboard shows no machines:
1. Verify MongoDB is running
2. Run `npm run seed` again
3. Check MongoDB connection in `.env`

### "No telemetry data"
If machines show but no readings:
1. Check that SensorReading model is imported correctly
2. Verify MongoDB indexes: `db.sensorreadings.getIndexes()`
3. Run seed script again

---

## Future Enhancements (Not Implemented)

This is a minimal seed script. Future improvements could include:
- Command-line arguments for custom data amounts
- Different severity levels (--normal, --degraded, --critical)
- Multiple plants/factories
- User roles (ADMIN, OPERATOR, TECHNICIAN)
- More machine types
- Custom time ranges
- Historical incident data

**Note**: These are NOT included to keep the implementation simple and focused on the immediate need for demo data.

---

## Summary

✅ **Created**: Simple, deterministic demo data seed script  
✅ **Data**: 1 Factory, 1 Plant, 3 Machines, 135 sensor readings  
✅ **Anomalies**: Deliberately included for demonstration  
✅ **Trends**: Vibration degradation trend visible  
✅ **Safe**: Rerunnable without affecting other data  
✅ **Command**: `npm run seed`  
✅ **Tests**: All existing tests still pass  
✅ **No Changes**: Zero modifications to core application logic  

The demo data is now ready for manual testing of health analysis, anomaly detection, degradation risk, What-If simulations, and AI operations advisor features.
