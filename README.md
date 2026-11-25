# 📦 Logistics & Delivery API Engine

A RESTful backend API for a **package delivery platform** built with Node.js, Express, and MongoDB. The system algorithmically assigns the **nearest available driver** to delivery requests using MongoDB geospatial queries (`$near` + `2dsphere` indexing) and the Haversine distance formula — replacing manual order-processing with an automated, state-machine-driven dispatch system.

> Think of it as the backend engine powering apps like Swiggy, Uber Eats, or any courier service — where customers place delivery orders, the system intelligently matches them with nearby drivers, and everyone can track the package in real-time with live ETA.

---

## ✨ Key Features

- **🧠 Algorithmic Driver Assignment** — MongoDB `$near` geospatial query finds the closest available driver with capacity in O(log n) time using a `2dsphere` index
- **📍 Live Package Tracking** — Real-time distance and ETA calculation using the Haversine formula with road-distance approximation
- **🔐 JWT Authentication** — Role-based access control (Customer, Driver, Admin) with bcrypt password hashing
- **🌍 Address Geocoding** — Human-readable addresses automatically converted to GPS coordinates via the Geoapify API
- **📦 Delivery State Machine** — Full lifecycle management: `PENDING → ASSIGNED → IN_TRANSIT → DELIVERED`
- **🔒 Race-Condition Safe** — All critical state transitions use atomic `findOneAndUpdate` operations to prevent double-booking and double-delivery
- **🛡️ Security** — IDOR prevention, driver authorization checks, vague login errors, password never exposed
- **📄 Pagination** — Driver listing supports paginated responses with configurable limits (max 10)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB (Mongoose 9) |
| Authentication | JWT + bcryptjs |
| Geocoding | Geoapify API |
| HTTP Client | Axios |
| Dev Tools | Nodemon, dotenv, CORS |
| Containerization | Docker + Docker Compose |

---

## 📁 Project Structure

```
├── index.js                         # Express server entry point
├── .env                             # Environment variables
├── package.json
├── Dockerfile                       # Container image definition
├── docker-compose.yml               # Multi-container orchestration (API + MongoDB + Tests)
│
├── Config/
│   └── db.js                        # MongoDB connection via Mongoose
│
├── Models/
│   ├── User.js                      # User schema (name, email, password, role)
│   ├── Driver.js                    # Driver schema (vehicle, location, capacity, status)
│   └── Package.js                   # Package schema (pickup, dropoff, status, assigned driver)
│
├── Controllers/
│   ├── userController.js            # Register, login, get profile
│   ├── driverController.js          # Register driver, list drivers, update location
│   ├── driverAssigningController.js # 🧠 Nearest-driver assignment algorithm
│   └── packageController.js         # Create package, track, pickup, complete delivery
│
├── Routers/
│   ├── userRoutes.js                # /api/user/*
│   ├── driverRoutes.js              # /api/drivers/*
│   └── packageRoutes.js             # /api/packages/*
│
├── Middlewares/
│   └── authMiddleware.js            # JWT verification (protect) + Admin guard (adminOnly)
│
├── utils/
│   ├── geoservice.js                # Geoapify geocoding (address → coordinates)
│   └── distanceCalculator.js        # Haversine formula + ETA calculator
│
└── tests/
    └── validate-api.js              # End-to-end API validation script (53 assertions)
```

---

## 📊 Data Models

```
┌─────────────────┐       ┌─────────────────────┐       ┌──────────────────────┐
│      USER       │       │       DRIVER         │       │      PACKAGE         │
├─────────────────┤       ├─────────────────────┤       ├──────────────────────┤
│ _id             │◄──┐   │ _id                 │◄──┐   │ _id                  │
│ name            │   │   │ user (→ User)        │   │   │ customerId (→ User)  │
│ email (unique)  │   └───│                     │   └───│ driverId (→ Driver)  │
│ password (hash) │       │ vehicleType          │       │ pickupLocation       │
│ role            │       │ status               │       │ dropoffLocation      │
│  (Customer /    │       │  (AVAILABLE /        │       │ status               │
│   Admin /       │       │   BUSY / OFFLINE)    │       │  (PENDING / ASSIGNED │
│   Driver)       │       │ currentLoad          │       │   / IN_TRANSIT /     │
│                 │       │ maxCapacity          │       │   DELIVERED)         │
│                 │       │ location (GeoJSON)   │       │                      │
└─────────────────┘       └─────────────────────┘       └──────────────────────┘
```

- **User ↔ Driver**: A User with the "Driver" role creates a separate Driver profile linked via the `user` field. This keeps identity (auth) separate from logistics (vehicle, location, capacity).
- **Driver locations** use GeoJSON `Point` format `[longitude, latitude]` with a `2dsphere` index for geospatial queries.
- **Package locations** (pickup & dropoff) also use GeoJSON Points with `2dsphere` indexes.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally on port 27017)
- A free [Geoapify API key](https://myprojects.geoapify.com/) (for address geocoding)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/deepanshu271005/logistics-delivery-api.git
cd logistics-delivery-api

# 2. Install dependencies
npm install

# 3. Create .env file
```

Create a `.env` file in the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/logistic_api
JWT_SECRET=your_super_secret_key_here
GEOAPIFY_KEY=your_geoapify_api_key_here
```

```bash
# 4. Make sure MongoDB is running, then start the server
npm run dev
```

The API will be running at **http://localhost:3000**.

### Run the Validation Tests

```bash
# In a separate terminal (server must be running)
cd tests
npm install
node validate-api.js
```

This runs **53 assertions** across all endpoints — the full delivery lifecycle including security checks.

---

## 🐳 Running with Docker (Zero Setup)

Docker lets anyone run the entire stack without installing Node.js or MongoDB.

```bash
# Start everything (MongoDB + API + Tests) with one command
docker compose up --build

# Or on Windows, use the included script
.\run-tests.bat

# Clean up containers and volumes
docker compose down -v --remove-orphans
```

---

## 📡 API Endpoints

### Authentication (`/api/user`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create` | None | Register a new user (Customer / Admin / Driver) |
| `POST` | `/login` | None | Login and receive JWT token |
| `GET` | `/me` | 🔒 JWT | Get logged-in user's profile |

### Drivers (`/api/drivers`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/` | 🔒 JWT | Register a driver profile (vehicle, capacity, location) |
| `GET` | `/` | 🔒 JWT + 👑 Admin | List all drivers (paginated, max 10 per page) |
| `PUT` | `/updateLocation` | 🔒 JWT | Update driver's GPS coordinates |
| `POST` | `/assign-driver` | 🔒 JWT + 👑 Admin | 🧠 Assign nearest driver to a package |

### Packages (`/api/packages`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/create` | 🔒 JWT | Create a new delivery package |
| `GET` | `/track/:packageId` | 🔒 JWT | Track package with live distance + ETA |
| `PUT` | `/:packageId/pickup` | 🔒 JWT | Mark package as picked up → `IN_TRANSIT` |
| `PUT` | `/:packageId/complete` | 🔒 JWT | Mark delivery as completed → `DELIVERED` |

---

## 📋 API Usage Walkthrough

Here's the full delivery lifecycle. Replace `YOUR_TOKEN` with the JWT from login.

### 1. Register Users

```bash
# Customer
curl -X POST http://localhost:3000/api/user/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Rahul", "email": "rahul@test.com", "password": "Pass1234!", "role": "Customer"}'

# Admin
curl -X POST http://localhost:3000/api/user/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "email": "admin@test.com", "password": "Pass1234!", "role": "Admin"}'

# Driver
curl -X POST http://localhost:3000/api/user/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Amit", "email": "amit@test.com", "password": "Pass1234!", "role": "Driver"}'
```

### 2. Login (get JWT token)

```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rahul@test.com", "password": "Pass1234!"}'
# → { "token": "eyJhbGci...", "user": { ... } }
```

### 3. Register Driver Profile

```bash
curl -X POST http://localhost:3000/api/drivers/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DRIVER_TOKEN" \
  -d '{
    "vehicleType": "car",
    "maxCapacity": 3,
    "location": { "type": "Point", "coordinates": [77.2090, 28.6139] }
  }'
```

### 4. Create Package (Customer)

```bash
curl -X POST http://localhost:3000/api/packages/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -d '{
    "pickupAddress": "Connaught Place, New Delhi",
    "dropoffAddress": "Sarojini Nagar Market, New Delhi"
  }'
```

### 5. Assign Nearest Driver (Admin — the core algorithm)

```bash
curl -X POST http://localhost:3000/api/drivers/assign-driver \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"packageId": "PACKAGE_ID_HERE"}'
# → Returns: nearest driver, distance breakdown, ETA
```

### 6. Pick Up → Track → Complete

```bash
# Driver picks up
curl -X PUT http://localhost:3000/api/packages/PACKAGE_ID/pickup \
  -H "Authorization: Bearer DRIVER_TOKEN"

# Customer tracks (live ETA)
curl -X GET http://localhost:3000/api/packages/track/PACKAGE_ID \
  -H "Authorization: Bearer CUSTOMER_TOKEN"

# Driver completes delivery
curl -X PUT http://localhost:3000/api/packages/PACKAGE_ID/complete \
  -H "Authorization: Bearer DRIVER_TOKEN"
```

---

## 🧠 How the Driver Assignment Algorithm Works

The core intelligence lives in `driverAssigningController.js`:

```
1. Take the package's pickup coordinates
                    │
                    ▼
2. ATOMIC findOneAndUpdate with $near (2dsphere index)
   → Find the nearest driver WHERE:
     • status = "AVAILABLE"
     • currentLoad < maxCapacity
   → Claim them (increment load) in the SAME operation
   → Prevents race conditions (two orders can't grab the same driver)
                    │
                    ▼
3. Calculate total distance (Haversine formula):
   Leg A: Driver location → Pickup point
   Leg B: Pickup point → Dropoff point
   Total = (Leg A + Leg B) × 1.3 (road factor)
                    │
                    ▼
4. Calculate ETA:
   ETA = (Total Distance ÷ 40 km/h) × 60 + 5 min buffer
                    │
                    ▼
5. Update package:
   • driverId set, status → ASSIGNED
   • Driver status → BUSY if at max capacity
```

### Why `2dsphere` Index?

```js
driverSchema.index({ location: "2dsphere" });
```

Without this index, MongoDB would scan **every driver** to find the nearest one — O(n).
With `2dsphere`, MongoDB divides Earth into a spherical grid and uses a tree-based lookup — **O(log n)**. For 10,000 drivers, that's the difference between checking all 10,000 vs. checking ~13.

---

## 🔒 Race Condition Prevention

Three critical operations use **atomic `findOneAndUpdate`** to prevent concurrency bugs:

### 1. Driver Assignment (double-booking)
```
❌ Before: findOne() then findByIdAndUpdate() — two orders could grab the same driver
✅ After:  findOneAndUpdate() — find + claim in one atomic operation
```

### 2. Package Pickup (double-pickup)
```
❌ Before: findById() then .save() — two pickup requests could both see ASSIGNED
✅ After:  findOneAndUpdate({ status: 'ASSIGNED' }) — only the first request matches
```

### 3. Delivery Completion (double-delivery)
```
❌ Before: findById() then .save() — two complete requests could both see IN_TRANSIT
✅ After:  findOneAndUpdate({ status: { $ne: 'DELIVERED' } }) — second request gets rejected
```

This is a **TOCTOU (Time Of Check, Time Of Use)** pattern — the data could change between reading it and writing to it. Atomic operations eliminate this gap entirely.

---

## 🔐 Security Architecture

```
Request → [protect middleware] → [adminOnly middleware] → Controller
              │                        │
              │ Validates JWT           │ Checks role === Admin
              │ Attaches req.user       │
              ▼                        ▼
         401 if no/bad token      403 if not Admin
```

| Feature | Implementation |
|---|---|
| Password Hashing | bcrypt with 10 salt rounds |
| Token Auth | JWT with 24-hour expiry in `Authorization: Bearer <token>` |
| Role-Based Access | `protect` (any user) + `adminOnly` (Admin only) middleware chain |
| IDOR Prevention | Package tracking verifies `customerId === logged-in user` |
| Driver Authorization | Pickup/complete verifies `package.driverId === logged-in driver` |
| User Enumeration Prevention | Login returns vague "Invalid email or password" on failure |
| Password Leak Prevention | Profile endpoint uses `.select('-password')` |

---

## 🌍 Geocoding & Distance Utilities

### Geocoding (Address → Coordinates)
When a customer creates a package with addresses like "Connaught Place, Delhi", the `geoservice.js` utility converts them to `[longitude, latitude]` using the **Geoapify API**. Both addresses are geocoded in **parallel** using `Promise.all`.

### Haversine Formula
Calculates great-circle distance between two GPS points on Earth's surface. A **1.3× multiplier** is applied to approximate real road distance (accounting for turns, one-ways, etc.).

### ETA Calculation
`ETA = (road distance ÷ 40 km/h) × 60 minutes + 5 min buffer`

---

## 🧪 Testing

The project includes an end-to-end validation script that tests the **entire delivery lifecycle** with **53 assertions**:

- ✅ User registration + duplicate rejection
- ✅ Login + wrong password rejection
- ✅ Profile access + no-token rejection
- ✅ Driver profile creation + duplicate rejection
- ✅ GPS location update
- ✅ Driver listing (admin only) + non-admin rejection
- ✅ Package creation with geocoding
- ✅ Tracking states (pending, in-transit, delivered)
- ✅ **Nearest driver assignment algorithm**
- ✅ Package pickup + double-pickup prevention
- ✅ **IDOR attack prevention** (wrong user tracking)
- ✅ Delivery completion + double-delivery prevention

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.
