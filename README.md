# PlantGuard AI

Industrial equipment monitoring and predictive maintenance platform with AI-powered health analysis, anomaly detection, and what-if scenario simulation.

## Overview

PlantGuard AI is a full-stack application for monitoring industrial machinery across manufacturing plants. It provides real-time health scoring, anomaly detection, degradation risk assessment, and AI-powered operational insights using Google's Gemini API.

### Key Features

- **Real-time Health Monitoring**: Equipment-specific health scoring based on temperature, vibration, pressure, and power consumption
- **Anomaly Detection**: Automatic detection of threshold breaches and degradation trends
- **Degradation Risk Assessment**: Predictive risk scoring combining health status, anomaly severity, and trend analysis
- **What-If Simulation**: In-memory scenario testing to predict equipment behavior under different conditions
- **AI Operations Advisor**: Natural language insights and recommendations powered by Google Gemini
- **Equipment Profiles**: Customized thresholds and scoring for CNC machines, compressors, and pumps

## Technology Stack

### Backend
- Node.js with Express
- MongoDB with Mongoose ODM
- JWT authentication
- Google Generative AI (Gemini)
- bcryptjs for password hashing

### Frontend
- React 18
- React Router for navigation
- Context API for state management
- Tailwind CSS for styling
- Vite for build tooling

## Project Structure

```
plantguard-ai/
├── server/                      # Backend API
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── models/              # MongoDB schemas
│   │   ├── services/            # Business logic
│   │   │   ├── healthIntelligenceService.js
│   │   │   ├── healthCalculations.js
│   │   │   ├── anomalyDetectionService.js
│   │   │   ├── degradationRiskService.js
│   │   │   ├── whatIfSimulationService.js
│   │   │   └── aiService.js
│   │   ├── middleware/          # Auth and validation
│   │   ├── routes/              # API endpoints
│   │   └── config/              # Database config
│   ├── scripts/
│   │   └── seed.js              # Demo data generator
│   └── test_*.js                # Test suites
│
└── client/                      # Frontend React app
    ├── src/
    │   ├── components/          # Reusable UI components
    │   ├── pages/               # Route components
    │   ├── context/             # React context
    │   └── utils/               # API client
    └── public/                  # Static assets
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Google Gemini API key

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd plantguard-ai
```

### 2. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Configure environment variables

#### Server (.env)

Create `server/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/plantguard
JWT_SECRET=your_jwt_secret_here
PORT=5001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
```

#### Client (.env)

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

### 4. Start MongoDB

```bash
mongod --dbpath /path/to/data/directory
```

### 5. Seed demo data (optional)

```bash
cd server
npm run seed
```

This creates:
- Demo user: `demo@plantguard.ai` / `demo123`
- 1 Factory, 1 Plant, 3 Machines (CNC, Compressor, Pump)
- 135 sensor readings with realistic telemetry data
- Deliberate anomalies for testing

### 6. Start the application

#### Start backend server

```bash
cd server
npm run dev
```

Server runs on `http://localhost:5001`

#### Start frontend development server

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and receive JWT token

### Factories
- `GET /api/factories` - List all factories
- `POST /api/factories` - Create factory
- `GET /api/factories/:id` - Get factory details
- `PUT /api/factories/:id` - Update factory
- `DELETE /api/factories/:id` - Delete factory

### Plants
- `GET /api/plants` - List all plants
- `POST /api/plants` - Create plant
- `GET /api/plants/:id` - Get plant details
- `PUT /api/plants/:id` - Update plant
- `DELETE /api/plants/:id` - Delete plant

### Machines
- `GET /api/machines` - List all machines
- `POST /api/machines` - Create machine
- `GET /api/machines/:id` - Get machine details
- `PUT /api/machines/:id` - Update machine
- `DELETE /api/machines/:id` - Delete machine

### Sensor Readings
- `GET /api/sensors/machine/:machineId` - Get machine's sensor readings
- `POST /api/sensors` - Add sensor reading

### Health Analysis
- `GET /api/ai/health/:machineId` - Get AI-powered health analysis
- `GET /api/ai/degradation-risk/:machineId` - Get degradation risk assessment

### What-If Simulation
- `POST /api/simulation/what-if` - Run single scenario simulation
- `POST /api/simulation/what-if-ai` - Run simulation with AI interpretation
- `POST /api/simulation/scenarios` - Run batch scenario simulations

## Equipment Profiles

### CNC Machines
- Temperature: 20-70°C optimal (85°C high, 100°C critical)
- Vibration: 0-2.0 mm/s normal (4.0 elevated, 6.0 high, 8.0 critical)
- Power: 800W normal (1200W high, 1500W critical)

### Compressors
- Temperature: 15-90°C optimal (110°C high, 130°C critical)
- Vibration: 0-3.0 mm/s normal (6.0 elevated, 9.0 high, 12.0 critical)
- Pressure: 120-150 PSI optimal (170 high, 200 critical)
- Power: 500W normal (750W high, 900W critical)

### Pumps
- Temperature: 10-80°C optimal (95°C high, 110°C critical)
- Vibration: 0-2.5 mm/s normal (5.0 elevated, 7.5 high, 10.0 critical)
- Pressure: 60-100 PSI optimal (120 high, 150 critical)
- Power: 600W normal (900W high, 1100W critical)

## Health Scoring Algorithm

Health score (0-100) is calculated from four components:
- **Temperature**: 25 points
- **Vibration**: 25 points
- **Pressure**: 25 points (if applicable)
- **Power Consumption**: 25 points

Each component is scored based on how close the value is to the optimal range for that equipment type.

### Status Classification
- **Healthy**: 85-100 points
- **Warning**: 50-84 points
- **Critical**: 0-49 points
- **Offline**: No recent data

## Degradation Risk Scoring

Risk score (0-100) combines three factors:
- **Health Status**: 40% weight (inverted: low health = high risk)
- **Anomaly Severity**: 30% weight (critical=30, high=20, medium=10, low=5 per anomaly)
- **Degradation Trends**: 30% weight (sustained upward/downward trends over time)

### Risk Categories
- **LOW**: 0-25 points
- **MODERATE**: 26-50 points
- **HIGH**: 51-75 points
- **CRITICAL**: 76-100 points

## What-If Simulation

Simulates equipment behavior under modified telemetry conditions without writing to the database.

### Modification Formats
- Absolute value: `"temperature": 75`
- Delta: `"temperature": "+10"` or `"temperature": "-5"`
- Percentage: `"vibration": "+50%"` or `"vibration": "-20%"`

### Example Request

```json
POST /api/simulation/what-if
{
  "machineId": "6a9dbd206b70557ccc5248a4",
  "modifications": {
    "temperature": "+15",
    "vibration": "+80%"
  },
  "options": {
    "includeRisk": true
  }
}
```

### Response Structure

```json
{
  "success": true,
  "simulation": {
    "baseline": {
      "healthScore": 89,
      "healthStatus": "healthy",
      "anomalies": [...],
      "risk": { "score": 16, "category": "LOW" }
    },
    "simulated": {
      "healthScore": 79,
      "healthStatus": "warning",
      "anomalies": [...],
      "risk": { "score": 20, "category": "LOW" }
    },
    "comparison": {
      "healthDelta": -10,
      "statusChanged": true,
      "newAnomalies": [...]
    }
  }
}
```

## AI Operations Advisor

Provides natural language insights using Google Gemini based on:
- Current telemetry readings
- Health score and breakdown
- Detected anomalies
- Degradation trends
- What-if simulation results (optional)

### Response Structure

```json
{
  "aiInterpretation": {
    "executiveSummary": "Brief operational status overview",
    "likelyCauses": ["Possible root causes..."],
    "operationalRisks": ["Specific risks if not addressed..."],
    "recommendedActions": ["Actionable maintenance steps..."],
    "safetyConsiderations": "Safety guidance",
    "confidence": 0.95
  }
}
```

## Testing

### Run test suites

```bash
cd server

# Health and anomaly detection tests
node test_health_standalone.js
node test_health_with_db.js

# Degradation risk tests
node test_degradation_risk.js
node test_degradation_risk_with_db.js

# What-if simulation tests
node test_what_if_simulation.js

# AI operations advisor tests
node test_ai_operations_advisor.js

# End-to-end tests
node test_end_to_end.js
```

All tests are standalone and can be run independently.

## Development

### Code Structure Principles

1. **Service Layer**: Business logic separated from controllers
2. **Equipment-Aware**: Thresholds and scoring vary by machine type
3. **Deterministic**: Health, anomaly, and risk calculations are reproducible
4. **AI Enhancement**: AI interprets but never overrides deterministic values
5. **In-Memory Simulation**: What-if scenarios don't modify database

### Adding New Equipment Types

1. Add profile to `healthCalculations.js`:
```javascript
EQUIPMENT_PROFILES.CONVEYOR = {
  temperature: { ... },
  vibration: { ... },
  // ...
};
```

2. Update frontend machine type options
3. Adjust health scoring weights if needed

## Production Deployment

### Security Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Use secure MongoDB connection string
- [ ] Enable MongoDB authentication
- [ ] Set NODE_ENV=production
- [ ] Configure CORS for specific origins
- [ ] Use HTTPS/TLS for API
- [ ] Rate limit API endpoints
- [ ] Sanitize user inputs
- [ ] Monitor API usage and quotas

### Environment Variables (Production)

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/plantguard
JWT_SECRET=<strong-random-secret>
PORT=5001
GEMINI_API_KEY=<production-key>
GEMINI_MODEL=gemini-3.6-flash
```

### Build Frontend

```bash
cd client
npm run build
```

Serve the `dist/` directory with a web server.

## Troubleshooting

### "Access denied" on What-If simulation
- Ensure logged in as the user who owns the plant
- Check machine → plant → user ownership chain
- Verify JWT token is being sent in Authorization header

### Gemini API errors
- Check `GEMINI_API_KEY` is set correctly
- Verify `GEMINI_MODEL` is a supported model name
- Check API quotas and rate limits
- System falls back to deterministic analysis if AI fails

### MongoDB connection issues
- Verify MongoDB is running
- Check `MONGO_URI` connection string
- Ensure database user has proper permissions

### Health score always 0
- Check machine has recent sensor readings
- Verify readings are within last 24 hours
- Ensure telemetry fields are not null

## License

[Specify your license here]

## Support

For issues and questions:
- Check existing documentation in `/server/*.md` files
- Review test files for usage examples
- Verify environment configuration

## Architecture Documentation

See additional documentation:
- `server/IMPLEMENTATION_SUMMARY.md` - Overall architecture
- `server/ANOMALY_DETECTION_SUMMARY.md` - Anomaly detection logic
- `server/DEGRADATION_RISK_SUMMARY.md` - Risk assessment details
- `server/WHAT_IF_SIMULATION_SUMMARY.md` - Simulation engine
- `server/GEMINI_AI_OPERATIONS_ADVISOR_SUMMARY.md` - AI integration
- `server/DEMO_DATA_SEED_SUMMARY.md` - Demo data structure
