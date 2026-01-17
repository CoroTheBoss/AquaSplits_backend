# AquaSplit Backend

> **Clean, efficient backend for swimming race data ingestion and querying**

AquaSplit Backend is a NestJS application that fetches swimming race data from external sources (FICR and future sources), parses it into structured MongoDB schemas, and exposes REST APIs for frontend consumption.

---

## 🏗️ Architecture

The project follows a clean, simple architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    External Sources                     │
│              (FICR, future sources...)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Sources Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  sources/ficr/                                   │   │
│  │  ├── ficr.client.ts    (HTTP calls)              │   │
│  │  ├── ficr.parser.ts    (DTO → Schema)            │   │
│  │  └── ficr.service.ts   (orchestrates)            │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 Ingestion Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ingestion.service.ts  (fetch + save)            │   │
│  │  ingestion.controller.ts  (HTTP endpoints)       │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Database Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  database/                                       │   │
│  │  ├── schemas/     (Mongoose schemas)             │   │
│  │  └── repository/  (database operations)          │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    API Layer                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  api/                                            │   │
│  │  ├── athlete/    (query endpoints)               │   │
│  │  ├── race/       (query endpoints)               │   │
│  │  └── result/     (query endpoints)               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── sources/              # External data sources
│   │   └── ficr/             # FICR integration
│   │       ├── dto/          # FICR API DTOs
│   │       ├── ficr.client.ts    # HTTP client
│   │       ├── ficr.parser.ts    # Data parser
│   │       └── ficr.service.ts   # Service layer
│   │
│   ├── ingestion/            # Data ingestion
│   │   ├── ingestion.service.ts
│   │   └── ingestion.controller.ts
│   │
│   ├── database/             # Database layer
│   │   ├── schema/           # Mongoose schemas
│   │   │   ├── athlete.schema.ts
│   │   │   ├── race.schema.ts
│   │   │   ├── result.schema.ts
│   │   │   └── event.enum.ts
│   │   └── repository/        # Database repositories
│   │       ├── athlete.repository.ts
│   │       ├── race.repository.ts
│   │       └── result.repository.ts
│   │
│   ├── api/                  # Query API
│   │   ├── athlete/
│   │   ├── race/
│   │   └── result/
│   │
│   └── config/               # Configuration
│
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or remote)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string
```

### Environment Variables

Create a `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/aquasplit
PORT=3000
```

### Running the Application

```bash
# Development mode
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## 📡 API Endpoints

### Ingestion Endpoints

**Ingest races for a year:**
```http
POST /ingestion/races/:year
```

**Ingest athletes for a race:**
```http
POST /ingestion/athletes/:year/:raceId
Body: { "teamCode": 123 }
```

**Ingest results for an athlete:**
```http
POST /ingestion/results/:year/:raceId/:athleteId
Body: { "teamCode": 123 }
```

**Ingest complete race (athletes + results):**
```http
POST /ingestion/complete-race/:year/:raceId
Body: { "teamCode": 123 }
```

### Query Endpoints

**Athletes:**
```http
GET /athletes                    # List/search athletes
GET /athletes/:id                # Get athlete by ID
GET /athletes/ficr/:ficrId      # Get athlete by FICR ID
```

**Races:**
```http
GET /races                       # List/search races
GET /races/:id                   # Get race by ID
GET /races/ficr/:ficrRaceId      # Get race by FICR ID
```

**Results:**
```http
GET /results                     # List/search results
GET /results/:id                 # Get result by ID
GET /results/best-times/:distance/:stroke  # Get best times
```

---

## 🔄 Data Flow

### 1. Fetch Data from Source
```typescript
FICR API → ficr.client.ts → Raw DTOs
```

### 2. Parse to Schemas
```typescript
Raw DTOs → ficr.parser.ts → Mongoose Schema Objects
```

### 3. Save to Database
```typescript
Schema Objects → ingestion.service.ts → repository.bulkUpsert() → MongoDB
```

### 4. Query via API
```typescript
Frontend → API Controller → Service → Repository → MongoDB → Response
```

---

## 📊 Database Schemas

### Athlete
- `firstName`, `lastName`
- `birthDate`, `gender`, `nationality`
- `ficrId` (external ID)

### Race
- `name`, `date`, `location`
- `poolLength` (25m or 50m)
- `ficrRaceId`, `source`, `year`

### Result
- `athlete` (ObjectId reference)
- `race` (ObjectId reference)
- `event` (object with `distance` and `stroke`)
- `time`, `millis`, `rank`

### Event Enum
- **Distance**: 50, 100, 200, 400, 800, 1500
- **Stroke**: freestyle, backstroke, breaststroke, butterfly, individual_medley

---

## 🛠️ Adding New Data Sources

To add a new data source (e.g., another swimming federation):

1. **Create source directory:**
   ```
   src/sources/newsource/
   ├── dto/
   ├── newsource.client.ts
   ├── newsource.parser.ts
   └── newsource.service.ts
   ```

2. **Implement client** (HTTP calls):
   ```typescript
   async fetchRaces(year: number) { ... }
   async fetchAthletes(...) { ... }
   async fetchResults(...) { ... }
   ```

3. **Implement parser** (DTO → Schema):
   ```typescript
   parseRace(dto) { return { ... } }
   parseAthlete(dto) { return { ... } }
   parseResult(dto) { return { ... } }
   ```

4. **Create service** (orchestrates client + parser)

5. **Update ingestion service** to use new source

---

## 🧪 Development

```bash
# Run in watch mode
npm run start:dev

# Build
npm run build

# Lint
npm run lint

# Format code
npm run format
```

---

## 📝 License

Private project - All rights reserved

---

## 🤝 Contributing

This is a private project. For questions or suggestions, please contact the maintainer.

---

**Built with ❤️ using NestJS and MongoDB**
