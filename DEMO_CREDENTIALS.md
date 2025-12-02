# 🔑 HMS Demo Credentials

## Quick Login Guide

All demo users have the same password: **`password123`**

---

## 👨‍⚕️ Doctors

### Dr. Rajesh Kumar (General Physician)
```
Username: dr.kumar
Password: password123
Role: DOCTOR
Specialty: GENERAL
Access: Doctor Console (/doctor)
```

**Can:**
- View general queue (shared)
- Lock patients to self
- Write prescriptions
- Order lab tests
- Print prescriptions as PDF

---

### Dr. Priya Sharma (General Physician)
```
Username: dr.sharma
Password: password123
Role: DOCTOR
Specialty: GENERAL
Access: Doctor Console (/doctor)
```

**Can:**
- View general queue (shared)
- Lock patients to self
- Write prescriptions
- Order lab tests
- Print prescriptions as PDF

---

### Dr. Amit Verma (Cardiologist - Specialist)
```
Username: dr.verma
Password: password123
Role: DOCTOR
Specialty: CARDIOLOGY
Access: Doctor Console (/doctor)
```

**Can:**
- View only assigned patients
- Cannot see general queue
- Write prescriptions
- Order specialized cardiac tests

---

## 💉 Nurses

### Nurse Priya Reddy
```
Username: nurse.priya
Password: password123
Role: NURSE
Access: Nurse Console (/nurse)
```

**Can:**
- View vitals queue (VITALS_PENDING patients)
- Record patient vitals:
  - Blood Pressure, Pulse, Temperature
  - SpO2, Height, Weight
  - Chief Complaint, Allergies
- Auto-calculate BMI
- Send patients to doctor queue

---

## 💊 Pharmacist

### Pharmacist Ankit Joshi
```
Username: pharmacist.ankit
Password: password123
Role: PHARMACIST
Access: Pharmacy Console (future)
```

**Can (future):**
- View pharmacy queue (PHARMACY_PENDING)
- Dispense medicines
- Check stock levels
- Update inventory

---

## 🔬 Lab Technician

### Lab Tech Sneha Patel
```
Username: labtech.sneha
Password: password123
Role: LAB_TECH
Access: Lab Console (future)
```

**Can (future):**
- View lab queue (LAB_PENDING)
- Perform lab tests
- Enter lab results
- Send patients to next stage

---

## 💰 Billing Staff

### Billing Clerk Rahul Singh
```
Username: billing.rahul
Password: password123
Role: BILLING
Access: Billing Console (future)
```

**Can (future):**
- View billing queue (BILLING_PENDING)
- Generate bills
- Accept payments
- Complete patient visits

---

## 👑 Admin

### Admin Arjun Kapoor
```
Username: admin.arjun
Password: password123
Role: ADMIN
Access: All modules + Analytics
```

**Can:**
- Access all consoles
- View all queues
- Override workflows
- View analytics and reports
- Manage users (future)

---

## 🧪 Quick Test Scenarios

### Scenario 1: Complete Patient Journey

1. **Login as Nurse** (`nurse.priya`)
   - Select patient from vitals queue
   - Record vitals
   - Submit to doctor queue

2. **Login as Doctor** (`dr.kumar`)
   - Select patient from queue
   - View vitals from nurse
   - Write prescription with medicines
   - Order lab tests
   - Finish consultation
   - Patient routes to LAB_PENDING

3. **Check Medical History**
   - Go to Medical History tab
   - Click "Print" on prescription
   - Verify PDF opens with all details

### Scenario 2: Specialist Referral

1. **Login as General Doctor** (`dr.kumar`)
   - Create prescription
   - Add note: "Refer to cardiology for chest pain evaluation"

2. **Manually assign patient to specialist** (via admin or database)
   - Patient appears only in Dr. Verma's queue
   - Dr. Verma can write specialist prescription

### Scenario 3: Real-Time Updates Test

1. **Open 2 browsers:**
   - Browser A: Login as `dr.kumar`
   - Browser B: Login as `dr.sharma`

2. **In Browser A:**
   - Select and lock a patient
   - Watch Browser B queue update in real-time

3. **Open Browser C:**
   - Login as `nurse.priya`
   - Submit vitals for a patient
   - Watch both Doctor browsers update immediately

---

## 🗄️ Database Seed Data

When you run `npx prisma db seed`, the following are created:

### Users (7)
- 3 Doctors (2 General, 1 Cardiologist)
- 1 Nurse
- 1 Pharmacist
- 1 Lab Tech
- 1 Admin

### Medicines (~20)
Common medicines with stock levels:
- Paracetamol 500mg (🟢 In Stock)
- Ibuprofen 400mg (🟢 In Stock)
- Amoxicillin 500mg (🟡 Low Stock)
- Azithromycin 250mg (🟢 In Stock)
- Cetirizine 10mg (🟡 Low Stock)
- Omeprazole 20mg (🟢 In Stock)
- Metformin 500mg (🟢 In Stock)
- Aspirin 75mg (🟡 Low Stock)
- Atorvastatin 10mg (🟢 In Stock)
- Losartan 50mg (🟢 In Stock)

### Lab Tests (~15)
Common lab investigations:
- CBC - Complete Blood Count (₹300)
- Blood Sugar (Fasting) (₹80)
- Blood Sugar (PP) (₹80)
- HbA1c (₹400)
- Lipid Profile (₹500)
- Liver Function Test (₹600)
- Kidney Function Test (₹550)
- Thyroid Profile (₹350)
- ECG (₹150)
- Chest X-Ray (₹250)

### Sample Patients (5)
- Mix of ages, genders
- Various stages (VITALS_PENDING, DOCTOR_PENDING)
- Some with vitals already recorded

---

## 🔐 Security Notes

**⚠️ IMPORTANT: FOR DEMO/DEVELOPMENT ONLY**

1. **Default Password:** All users have `password123`
   - **DO NOT use in production**
   - Change in production deployment

2. **JWT Secret:** Current secret is demo-only
   - Update `JWT_SECRET` in `.env` for production
   - Use strong random secret (min 32 characters)

3. **Database:** PostgreSQL connection
   - Update credentials in production
   - Use connection pooling for production

4. **CORS:** Currently allows `localhost:3000`
   - Update `CORS_ORIGIN` for production domain

---

## 🎯 Role Permissions Summary

| Feature | Nurse | Doctor | Pharmacist | Lab Tech | Billing | Admin |
|---------|-------|--------|------------|----------|---------|-------|
| Record Vitals | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Vitals Queue | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Doctor Queue | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Write Prescriptions | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Order Lab Tests | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Print Prescriptions | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Dispense Medicines | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Perform Lab Tests | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Process Billing | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Analytics | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

---

**Quick Tip:** Bookmark this page for easy access during testing! 🔖
