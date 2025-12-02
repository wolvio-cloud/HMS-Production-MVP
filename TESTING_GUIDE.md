# HMS Production MVP - Testing Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Git installed

---

## 📋 Step 1: Environment Setup

### Backend Environment Variables

Create `/backend/.env` file:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/hms_db?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Server
PORT=3001
NODE_ENV=development

# CORS (Frontend URL)
CORS_ORIGIN="http://localhost:3000"
```

### Frontend Environment Variables

Create `/frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 📦 Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in another terminal)
cd frontend
npm install
```

---

## 🗄️ Step 3: Database Setup

### Apply Prisma Migrations

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# IMPORTANT: Seed database with demo data
npx prisma db seed
```

**What gets seeded:**
- Demo users (doctors, nurses, pharmacist, lab tech, admin)
- Sample medicines with stock levels
- Sample lab tests
- Initial patient data

---

## 🏃 Step 4: Run the Application

### Terminal 1: Backend Server

```bash
cd backend
npm run start:dev
```

**Expected Output:**
```
Server running on http://localhost:3001
WebSocket server initialized
✅ Database connected
```

### Terminal 2: Frontend Next.js

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
Ready on http://localhost:3000
```

---

## 🧪 Step 5: Test TIER 2 Features

### Test 1: WebSocket Real-Time Updates ✅

**Goal:** Verify queue updates happen in real-time across multiple browser windows.

**Steps:**
1. **Open 2 Browser Windows** (side-by-side)
   - Window A: `http://localhost:3000/login`
   - Window B: `http://localhost:3000/login`

2. **Login as different doctors:**
   - Window A: Login as `dr.kumar` / `password123`
   - Window B: Login as `dr.sharma` / `password123`

3. **Check WebSocket Connection:**
   - Both windows should show **"Live"** badge (green) in top-right
   - If "Offline" (red), check backend WebSocket logs

4. **Test Real-Time Update:**
   - In Window A: Select a patient from queue
   - Watch Window B: Queue should auto-refresh immediately
   - Check browser console for: `🔔 Real-time queue update`

5. **Test Nurse → Doctor Flow:**
   - Open Window C: Login as `nurse.priya` / `password123` at `/nurse`
   - Select a patient waiting for vitals
   - Record vitals and click "Submit & Send to Doctor"
   - **Expected:** Patient appears in Doctor Console queue immediately

**Expected Results:**
- ✅ WebSocket status shows "Live" (green badge)
- ✅ Queue auto-refreshes when patients move
- ✅ Toast notifications appear for updates
- ✅ Console shows `WebSocket connected` message

**Troubleshooting:**
- If "Offline": Restart backend server
- Check CORS settings in backend `.env`
- Verify port 3001 is not blocked by firewall

---

### Test 2: Nurse Console - Vitals Entry 💉

**Goal:** Test complete vitals entry workflow from nurse perspective.

**Steps:**

1. **Login as Nurse:**
   ```
   URL: http://localhost:3000/nurse
   Username: nurse.priya
   Password: password123
   ```

2. **Verify Queue Display:**
   - Should see patients with status "VITALS_PENDING"
   - Patient cards show: Token #, Name, Age, Gender
   - Real-time count displayed at top

3. **Select a Patient:**
   - Click on any patient card
   - Card highlights with gradient (pink/rose)
   - Vitals entry form appears on right side

4. **Enter Vitals (test validation):**

   **Test Case 1: Valid Vitals**
   ```
   Blood Pressure: 120/80
   Pulse: 72 bpm
   Temperature: 98.6°F
   SpO2: 98%
   Height: 170 cm
   Weight: 70 kg
   Chief Complaint: Fever and headache since 2 days
   Allergies: Penicillin
   ```
   - **Expected:** BMI auto-calculates to 24.22 (Normal category in green)

   **Test Case 2: Invalid Range (should show error)**
   ```
   Pulse: 300 (invalid - should be 40-200)
   ```
   - **Expected:** Toast error "Pulse must be between 40-200 bpm"

5. **Save Draft vs Submit:**
   - **Save Draft:** Saves vitals but keeps patient in VITALS_PENDING
   - **Submit & Send to Doctor:** Saves + Moves to DOCTOR_PENDING

6. **Verify Workflow:**
   - Click "Submit & Send to Doctor"
   - **Expected Results:**
     - Toast: "Patient [name] sent to doctor queue!"
     - Patient disappears from nurse queue
     - Patient appears in Doctor Console queue (if WebSocket working)

**Expected Results:**
- ✅ BMI auto-calculates correctly
- ✅ Form validation works (test with invalid values)
- ✅ Patient transitions to doctor queue
- ✅ Vitals are saved to database

**Troubleshooting:**
- If patient doesn't appear in doctor queue: Check workflow transitions
- If BMI doesn't calculate: Check height/weight are numbers
- If submit fails: Check JWT token in localStorage

---

### Test 3: Doctor Console - Prescription & PDF 📋🖨️

**Goal:** Test complete doctor workflow including prescription creation and PDF generation.

**Steps:**

1. **Login as Doctor:**
   ```
   URL: http://localhost:3000/doctor
   Username: dr.kumar
   Password: password123
   ```

2. **Verify Dashboard:**
   - **Stats Bar:** Waiting, Lab Pending, Pharmacy, Completed Today
   - **Queue:** Patients in DOCTOR_PENDING stage (FIFO order)
   - **WebSocket Status:** "Live" badge (green)

3. **Select Patient with Vitals:**
   - Click patient from queue (should have vitals from nurse)
   - Verify vitals display: BP, Pulse, Temp, SpO2, Weight
   - **Check Medical History tab:** Previous prescriptions (if any)

4. **Create Prescription:**

   **Tab 1: Prescription & Advice**

   a) **Enter Diagnosis:**
   ```
   Diagnosis: Viral Fever with Headache
   ```

   b) **Add Medicines:**
   - Search: "Paracetamol"
   - Select from dropdown
   - **Check Stock Indicator:**
     - 🟢 In Stock (green)
     - 🟡 Low Stock (yellow)
     - 🔴 Out of Stock (red)
   - Enter:
     ```
     Dosage: 500mg
     Frequency: 3 times daily
     Duration: 5 days
     ```
   - Click "+" to add

   - Repeat for 2-3 medicines

   c) **Add Lab Tests:**
   - Click quick button: "CBC - Complete Blood Count"
   - Click quick button: "Blood Sugar (Fasting)"
   - Or search: "ESR" and select from dropdown

   d) **Add Lifestyle Advice:**
   - Click chip: "💧 Drink Plenty of Water"
   - Click chip: "🛌 Take Adequate Rest"
   - Click chip: "🚶 Walk 30 Mins Daily"

   e) **Additional Notes:**
   ```
   Follow up after 5 days if symptoms persist.
   Avoid spicy and oily food.
   ```

5. **Finish Consultation:**
   - Click "Finish Consultation" button
   - **Expected:**
     - Toast: "Consultation completed! Patient routed to next stage."
     - Patient disappears from queue
     - Doctor Console refreshes
     - Patient moves to LAB_PENDING (if labs ordered) or PHARMACY_PENDING

6. **Test PDF Generation:**

   a) **View Medical History:**
   - Select another patient (or wait for previous patient to cycle back)
   - Go to "Medical History" tab
   - Should see list of previous prescriptions

   b) **Print Prescription:**
   - Click "Print" button next to any prescription
   - **Expected:**
     - Toast: "Generating prescription PDF..."
     - New browser tab opens with PDF
     - Toast: "Prescription PDF opened!"

   c) **Verify PDF Content:**
   ```
   PDF should contain:
   ✅ Hospital header with branding
   ✅ Patient info card (name, age, gender, token)
   ✅ Doctor info card (name, specialty)
   ✅ Vitals summary (BP, Pulse, Temp, SpO2, Weight, BMI)
   ✅ Diagnosis
   ✅ Medicines table (name, dosage, frequency, duration)
   ✅ Notes and lifestyle advice
   ✅ Doctor signature section
   ✅ Footer with validity date
   ```

**Expected Results:**
- ✅ Medicine search works with debouncing (300ms delay)
- ✅ Stock indicators show correctly (🟢🟡🔴)
- ✅ Lab tests add with one click
- ✅ Patient auto-routes to correct next stage
- ✅ PDF generates and opens in new tab
- ✅ PDF contains all prescription details

**Troubleshooting:**
- **PDF doesn't open:** Check browser popup blocker settings
- **PDF auth error:** Verify JWT token is being sent in fetch headers
- **Stock indicators don't show:** Check pharmacy database seeding
- **Auto-routing fails:** Check workflow service logs

---

## 🔍 Step 6: Verify Database Changes

### Check Vitals Table

```bash
cd backend
npx prisma studio
```

- Navigate to `Vitals` table
- Verify vitals from nurse console are saved
- Check BMI is calculated correctly
- Verify `recordedById` references nurse user

### Check Patient Workflow

- Navigate to `PatientStateHistory` table
- Should see state transitions:
  ```
  REGISTERED → VITALS_PENDING (Patient Registration)
  VITALS_PENDING → DOCTOR_PENDING (Nurse completed vitals)
  DOCTOR_PENDING → LAB_PENDING (Doctor ordered labs)
  LAB_PENDING → PHARMACY_PENDING (Lab completed)
  PHARMACY_PENDING → BILLING_PENDING (Pharmacy dispensed)
  BILLING_PENDING → COMPLETED (Billing completed)
  ```

### Check Prescriptions

- Navigate to `Prescription` table
- Verify prescription created by doctor
- Check `PrescriptionItem` table for medicines
- Verify `diagnosis` and `notes` fields populated

---

## 🐛 Common Issues & Fixes

### Issue 1: WebSocket shows "Offline"

**Symptoms:** Red "Offline" badge in UI

**Fixes:**
```bash
# 1. Restart backend
cd backend
npm run start:dev

# 2. Check backend logs for:
# "WebSocket server initialized"

# 3. Verify CORS settings in backend/.env:
CORS_ORIGIN="http://localhost:3000"

# 4. Clear browser cache and reload
```

### Issue 2: Database connection error

**Symptoms:** `Error: Can't reach database server`

**Fixes:**
```bash
# 1. Verify PostgreSQL is running
sudo systemctl status postgresql

# 2. Check DATABASE_URL in backend/.env
# Make sure credentials are correct

# 3. Test connection
cd backend
npx prisma db push
```

### Issue 3: PDF generation fails

**Symptoms:** "Failed to generate prescription PDF" toast

**Fixes:**
```bash
# 1. Check PDFKit dependency
cd backend
npm install pdfkit @types/pdfkit

# 2. Verify prescription exists in database
npx prisma studio
# Check Prescription table

# 3. Check browser console for network errors
# Should show POST to /prescriptions/:id/pdf

# 4. Disable popup blocker in browser
```

### Issue 4: Patient doesn't appear in doctor queue after vitals

**Symptoms:** Patient stuck in VITALS_PENDING

**Fixes:**
```bash
# 1. Check workflow controller logs
# Should see: "✅ Patient transitioned: VITALS_PENDING → DOCTOR_PENDING"

# 2. Verify completeVitals endpoint
curl -X POST http://localhost:3001/api/workflow/patients/:id/complete-vitals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Check database PatientStage
npx prisma studio
# Verify patient.stage = "DOCTOR_PENDING"

# 4. Refresh doctor console (F5)
```

### Issue 5: Stock indicators don't show for medicines

**Symptoms:** No 🟢🟡🔴 icons next to medicines

**Fixes:**
```bash
# 1. Verify pharmacy seed data
cd backend
npx prisma db seed

# 2. Check Medicine table in Prisma Studio
# Verify currentStock and minStockLevel fields

# 3. Check frontend PrescriptionBuilder component
# Should call api.searchMedicines()

# 4. Test medicine search API manually
curl http://localhost:3001/api/pharmacy/medicines/search?q=para&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✅ Success Checklist

After testing, you should be able to:

**WebSocket Features:**
- [ ] See "Live" status in Doctor Console
- [ ] See real-time queue updates when patient moves
- [ ] Get toast notifications for important events

**Nurse Console:**
- [ ] Login as nurse and see vitals queue
- [ ] Record vitals with auto-BMI calculation
- [ ] Submit vitals and patient moves to doctor queue
- [ ] Form validation works correctly

**Doctor Console:**
- [ ] See patient queue in FIFO order
- [ ] View patient vitals from nurse
- [ ] Search medicines with stock indicators (🟢🟡🔴)
- [ ] Add lab tests with one click
- [ ] Add lifestyle advice chips
- [ ] Finish consultation and auto-route patient
- [ ] Print prescription as PDF
- [ ] PDF opens in new tab with all details

**Database:**
- [ ] Vitals saved correctly
- [ ] Patient state transitions logged
- [ ] Prescriptions created with items
- [ ] All foreign keys resolved properly

---

## 🎯 Next Steps

Once all tests pass:

1. **Create Production Build:**
   ```bash
   # Backend
   cd backend
   npm run build

   # Frontend
   cd frontend
   npm run build
   ```

2. **Set up Production Database:**
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

3. **Deploy to Server** (if needed)

4. **Move to TIER 3 Features:**
   - Reports & Analytics
   - Appointments Scheduling
   - Patient Portal
   - Advanced Features

---

## 📞 Support

If you encounter issues not covered here:

1. Check backend logs: Look for error stack traces
2. Check browser console: Network errors, WebSocket errors
3. Check database: Use `npx prisma studio` to inspect data
4. Verify environment variables: Double-check `.env` files

**Debug Mode:**
```bash
# Backend with debug logs
cd backend
npm run start:dev

# Check specific service logs
# Look for console.log() statements in services
```

---

## 🔥 Quick Test Commands

```bash
# Test backend health
curl http://localhost:3001/api

# Test auth login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dr.kumar","password":"password123","role":"DOCTOR"}'

# Test protected endpoint (replace TOKEN)
curl http://localhost:3001/api/patients/queue/my-queue \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check WebSocket connection
# Open browser console on doctor page
# Should see: "✅ WebSocket connected"

# Test PDF generation (replace PRESCRIPTION_ID and TOKEN)
curl http://localhost:3001/api/prescriptions/PRESCRIPTION_ID/pdf \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output test.pdf

# Verify database
cd backend
npx prisma studio
```

---

**Happy Testing! 🎉**
