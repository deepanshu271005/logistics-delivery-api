/**
 * ============================================================
 *  Logistic API — End-to-End Validation Script
 * ============================================================
 *  Runs against a live API (default: http://localhost:3000)
 *  and walks through the FULL delivery lifecycle:
 *
 *  1. Register customer, admin, driver users
 *  2. Login all three
 *  3. Register a driver profile
 *  4. Update driver location
 *  5. Create a package (customer)
 *  6. Assign the nearest driver (admin algorithm)
 *  7. Pick up the package (driver)
 *  8. Track the package (customer)
 *  9. Complete the delivery (driver)
 * 10. Verify final state
 * ============================================================
 */

const axios = require('axios');

const API = process.env.API_URL || 'http://localhost:3000';

// ── Helpers ──────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    results.push({ status: '✅', label });
    console.log(`  ✅  ${label}`);
  } else {
    failed++;
    results.push({ status: '❌', label });
    console.log(`  ❌  ${label}`);
  }
}

async function step(name, fn) {
  console.log(`\n━━━ ${name} ━━━`);
  try {
    await fn();
  } catch (err) {
    const msg = err.response
      ? `${err.response.status} — ${JSON.stringify(err.response.data)}`
      : err.message;
    failed++;
    results.push({ status: '💥', label: `${name} THREW: ${msg}` });
    console.log(`  💥  EXCEPTION: ${msg}`);
  }
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ── Unique test data (timestamp-based to avoid conflicts) ───

const TS = Date.now();
const CUSTOMER = { name: 'TestCustomer', email: `customer_${TS}@test.com`, password: 'Pass1234!', role: 'Customer' };
const ADMIN    = { name: 'TestAdmin',    email: `admin_${TS}@test.com`,    password: 'Pass1234!', role: 'Admin' };
const DRIVER_USER = { name: 'TestDriver', email: `driver_${TS}@test.com`, password: 'Pass1234!', role: 'Driver' };

let customerToken, adminToken, driverToken;
let packageId, driverId;

// ── Delhi-area coordinates for realistic geo tests ──────────
const DRIVER_LOCATION  = { longitude: 77.2090, latitude: 28.6139 }; // near India Gate
const PICKUP_ADDRESS   = 'Connaught Place, New Delhi';
const DROPOFF_ADDRESS  = 'Sarojini Nagar Market, New Delhi';

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

(async () => {
  console.log(`\n🚀 Validating API at: ${API}\n${'═'.repeat(50)}`);

  // ─────────────────────────────────────────────────────────
  // 1. REGISTER USERS
  // ─────────────────────────────────────────────────────────
  await step('1 · Register Customer', async () => {
    const res = await axios.post(`${API}/api/user/create`, CUSTOMER);
    assert(res.status === 201, 'Status 201');
    assert(res.data.user && res.data.user.email === CUSTOMER.email, 'Email matches');
    assert(res.data.user.role === 'Customer', 'Role is Customer');
  });

  await step('1 · Register Admin', async () => {
    const res = await axios.post(`${API}/api/user/create`, ADMIN);
    assert(res.status === 201, 'Status 201');
    assert(res.data.user.role === 'Admin', 'Role is Admin');
  });

  await step('1 · Register Driver User', async () => {
    const res = await axios.post(`${API}/api/user/create`, DRIVER_USER);
    assert(res.status === 201, 'Status 201');
    assert(res.data.user.role === 'Driver', 'Role is Driver');
  });

  // ─────────────────────────────────────────────────────────
  // 1b. DUPLICATE REGISTRATION (should fail)
  // ─────────────────────────────────────────────────────────
  await step('1b · Duplicate registration rejected', async () => {
    try {
      await axios.post(`${API}/api/user/create`, CUSTOMER);
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400');
      assert(err.response.data.error.includes('already exists'), 'Error mentions already exists');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 2. LOGIN ALL USERS
  // ─────────────────────────────────────────────────────────
  await step('2 · Login Customer', async () => {
    const res = await axios.post(`${API}/api/user/login`, { email: CUSTOMER.email, password: CUSTOMER.password });
    assert(res.status === 200, 'Status 200');
    assert(typeof res.data.token === 'string', 'Token received');
    customerToken = res.data.token;
  });

  await step('2 · Login Admin', async () => {
    const res = await axios.post(`${API}/api/user/login`, { email: ADMIN.email, password: ADMIN.password });
    assert(res.status === 200, 'Status 200');
    adminToken = res.data.token;
  });

  await step('2 · Login Driver', async () => {
    const res = await axios.post(`${API}/api/user/login`, { email: DRIVER_USER.email, password: DRIVER_USER.password });
    assert(res.status === 200, 'Status 200');
    driverToken = res.data.token;
  });

  // ─────────────────────────────────────────────────────────
  // 2b. WRONG PASSWORD (should fail)
  // ─────────────────────────────────────────────────────────
  await step('2b · Wrong password rejected', async () => {
    try {
      await axios.post(`${API}/api/user/login`, { email: CUSTOMER.email, password: 'WrongPass!' });
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 401, 'Status 401');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 2c. GET PROFILE (protected route)
  // ─────────────────────────────────────────────────────────
  await step('2c · Get profile (authenticated)', async () => {
    const res = await axios.get(`${API}/api/user/me`, auth(customerToken));
    assert(res.status === 200, 'Status 200');
    assert(res.data.user.email === CUSTOMER.email, 'Email matches');
    assert(!res.data.user.password, 'Password not exposed');
  });

  await step('2c · Get profile without token rejected', async () => {
    try {
      await axios.get(`${API}/api/user/me`);
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 401, 'Status 401');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 3. REGISTER DRIVER PROFILE
  // ─────────────────────────────────────────────────────────
  await step('3 · Register driver profile', async () => {
    const res = await axios.post(`${API}/api/drivers/`, {
      vehicleType: 'car',
      maxCapacity: 3,
      location: {
        type: 'Point',
        coordinates: [DRIVER_LOCATION.longitude, DRIVER_LOCATION.latitude]
      }
    }, auth(driverToken));
    assert(res.status === 201, 'Status 201');
    assert(res.data.driver.vehicleType === 'car', 'Vehicle type is car');
    driverId = res.data.driver._id;
  });

  await step('3b · Duplicate driver profile rejected', async () => {
    try {
      await axios.post(`${API}/api/drivers/`, {
        vehicleType: 'bike',
        maxCapacity: 1
      }, auth(driverToken));
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 4. UPDATE DRIVER LOCATION
  // ─────────────────────────────────────────────────────────
  await step('4 · Update driver location', async () => {
    const res = await axios.put(`${API}/api/drivers/updateLocation`, DRIVER_LOCATION, auth(driverToken));
    assert(res.status === 200, 'Status 200');
    const coords = res.data.driver.location.coordinates;
    assert(coords[0] === DRIVER_LOCATION.longitude, 'Longitude updated');
    assert(coords[1] === DRIVER_LOCATION.latitude, 'Latitude updated');
  });

  // ─────────────────────────────────────────────────────────
  // 4b. LIST ALL DRIVERS (admin only)
  // ─────────────────────────────────────────────────────────
  await step('4b · List drivers (admin)', async () => {
    const res = await axios.get(`${API}/api/drivers/?page=1&limit=5`, auth(adminToken));
    assert(res.status === 200, 'Status 200');
    assert(res.data.totalDrivers >= 1, 'At least 1 driver');
    assert(Array.isArray(res.data.drivers), 'Drivers array returned');
  });

  await step('4b · List drivers (non-admin) rejected', async () => {
    try {
      await axios.get(`${API}/api/drivers/`, auth(customerToken));
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 403, 'Status 403');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 5. CREATE PACKAGE (customer)
  // ─────────────────────────────────────────────────────────
  await step('5 · Create package', async () => {
    const res = await axios.post(`${API}/api/packages/create`, {
      pickupAddress: PICKUP_ADDRESS,
      dropoffAddress: DROPOFF_ADDRESS
    }, auth(customerToken));
    assert(res.status === 201, 'Status 201');
    assert(res.data.packageDetails.status === 'PENDING', 'Status is PENDING');
    packageId = res.data.packageDetails._id;
    console.log(`     📦 Package ID: ${packageId}`);
  });

  // ─────────────────────────────────────────────────────────
  // 5b. TRACK PENDING PACKAGE (should say not assigned yet)
  // ─────────────────────────────────────────────────────────
  await step('5b · Track pending package (no driver yet)', async () => {
    try {
      await axios.get(`${API}/api/packages/track/${packageId}`, auth(customerToken));
      assert(false, 'Should have returned 400');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400');
      assert(err.response.data.message.includes('not assigned'), 'Says not assigned');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 6. ASSIGN DRIVER (admin — the core algorithm!)
  // ─────────────────────────────────────────────────────────
  await step('6 · Assign nearest driver (algorithm)', async () => {
    const res = await axios.post(`${API}/api/drivers/assign-driver`, { packageId }, auth(adminToken));
    assert(res.status === 200, 'Status 200');
    assert(res.data.message.includes('assigned'), 'Driver assigned message');
    assert(res.data.packageDetails.status === 'ASSIGNED', 'Package now ASSIGNED');
    assert(res.data.distances, 'Distance metrics returned');
    assert(res.data.estimatedTotalTime, 'ETA returned');
    console.log(`     🚗 Distance: ${res.data.distances.totalDistanceKm} km`);
    console.log(`     ⏱️  ETA: ${res.data.estimatedTotalTime}`);
  });

  await step('6b · Re-assign same package rejected', async () => {
    try {
      await axios.post(`${API}/api/drivers/assign-driver`, { packageId }, auth(adminToken));
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400 (already assigned)');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 7. PICK UP PACKAGE (driver)
  // ─────────────────────────────────────────────────────────
  await step('7 · Driver picks up package', async () => {
    const res = await axios.put(`${API}/api/packages/${packageId}/pickup`, {}, auth(driverToken));
    assert(res.status === 200, 'Status 200');
    assert(res.data.status === 'IN_TRANSIT', 'Status now IN_TRANSIT');
  });

  await step('7b · Double pickup rejected', async () => {
    try {
      await axios.put(`${API}/api/packages/${packageId}/pickup`, {}, auth(driverToken));
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 8. TRACK IN-TRANSIT PACKAGE (customer)
  // ─────────────────────────────────────────────────────────
  await step('8 · Track in-transit package (live ETA)', async () => {
    const res = await axios.get(`${API}/api/packages/track/${packageId}`, auth(customerToken));
    assert(res.status === 200, 'Status 200');
    assert(res.data.status === 'IN_TRANSIT', 'Status is IN_TRANSIT');
    assert(res.data.trackingStage.includes('dropoff'), 'Stage says heading to dropoff');
    assert(res.data.liveMetrics.distanceRemainingKm, 'Distance remaining returned');
    assert(res.data.liveMetrics.etaRemainingMins, 'ETA remaining returned');
    console.log(`     📍 Distance remaining: ${res.data.liveMetrics.distanceRemainingKm} km`);
    console.log(`     ⏱️  ETA: ${res.data.liveMetrics.etaRemainingMins}`);
  });

  await step('8b · Track by wrong user rejected (IDOR check)', async () => {
    try {
      // Admin tries to track customer's package — should be denied
      await axios.get(`${API}/api/packages/track/${packageId}`, auth(adminToken));
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 403, 'Status 403 (IDOR prevented)');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 9. COMPLETE DELIVERY (driver)
  // ─────────────────────────────────────────────────────────
  await step('9 · Driver completes delivery', async () => {
    const res = await axios.put(`${API}/api/packages/${packageId}/complete`, {}, auth(driverToken));
    assert(res.status === 200, 'Status 200');
    assert(res.data.packageStatus === 'DELIVERED', 'Package status is DELIVERED');
    assert(res.data.driverDetails.driverNewStatus === 'AVAILABLE', 'Driver back to AVAILABLE');
    console.log(`     ✅ Driver load: ${res.data.driverDetails.newLoad}`);
  });

  await step('9b · Double delivery rejected', async () => {
    try {
      await axios.put(`${API}/api/packages/${packageId}/complete`, {}, auth(driverToken));
      assert(false, 'Should have been rejected');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400 (already delivered)');
    }
  });

  // ─────────────────────────────────────────────────────────
  // 10. TRACK DELIVERED PACKAGE (should say already delivered)
  // ─────────────────────────────────────────────────────────
  await step('10 · Track delivered package (final state)', async () => {
    try {
      await axios.get(`${API}/api/packages/track/${packageId}`, auth(customerToken));
      assert(false, 'Should have returned 400');
    } catch (err) {
      assert(err.response.status === 400, 'Status 400');
      assert(err.response.data.message.includes('already been delivered'), 'Says already delivered');
    }
  });

  // ─────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
  console.log(`${'═'.repeat(50)}\n`);

  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.status !== '✅').forEach(r => console.log(`   ${r.status} ${r.label}`));
    console.log('');
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED — Full delivery lifecycle validated!\n');
    process.exit(0);
  }
})();
