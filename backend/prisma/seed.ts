import { PrismaClient, DoctorSpecialty, UserRole, Gender, PatientStage } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.patientStateHistory.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.labOrder.deleteMany();
  await prisma.vitals.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.medicineStock.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.labTest.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('demo', 10);

  // ============ USERS ============

  // General Doctors (Shared Queue)
  const drKumarGeneral = await prisma.user.create({
    data: {
      username: 'dr.kumar',
      password: hashedPassword,
      name: 'Dr. Rajesh Kumar',
      role: UserRole.DOCTOR,
      specialty: DoctorSpecialty.GENERAL,
    },
  });

  const drPriyaGeneral = await prisma.user.create({
    data: {
      username: 'dr.priya',
      password: hashedPassword,
      name: 'Dr. Priya Reddy',
      role: UserRole.DOCTOR,
      specialty: DoctorSpecialty.GENERAL,
    },
  });

  // Specialist Doctors (Assigned Queue)
  const drSharmaOrtho = await prisma.user.create({
    data: {
      username: 'dr.sharma',
      password: hashedPassword,
      name: 'Dr. Amit Sharma',
      role: UserRole.DOCTOR,
      specialty: DoctorSpecialty.ORTHOPEDIC,
    },
  });

  const drMeeraGyn = await prisma.user.create({
    data: {
      username: 'dr.meera',
      password: hashedPassword,
      name: 'Dr. Meera Iyer',
      role: UserRole.DOCTOR,
      specialty: DoctorSpecialty.GYNECOLOGY,
    },
  });

  // Nurse
  const nursePriya = await prisma.user.create({
    data: {
      username: 'nurse.priya',
      password: hashedPassword,
      name: 'Nurse Priya',
      role: UserRole.NURSE,
    },
  });

  console.log('✅ Created 5 users (2 general doctors, 2 specialists, 1 nurse)');

  // ============ MEDICINES ============

  const medicines = [
    // In Stock (>10 units)
    { name: 'Paracetamol 500mg', genericName: 'Paracetamol', type: 'Tablet', strength: '500mg', mrp: 3.0, sellingPrice: 2.5, stock: 150 },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', type: 'Capsule', strength: '500mg', mrp: 10.0, sellingPrice: 8.0, stock: 80 },
    { name: 'Cetrizine 10mg', genericName: 'Cetrizine', type: 'Tablet', strength: '10mg', mrp: 2.0, sellingPrice: 1.5, stock: 120 },
    { name: 'Omeprazole 20mg', genericName: 'Omeprazole', type: 'Capsule', strength: '20mg', mrp: 5.0, sellingPrice: 4.0, stock: 60 },
    { name: 'Cough Syrup 100ml', genericName: 'Dextromethorphan', type: 'Syrup', strength: '100ml', mrp: 80.0, sellingPrice: 70.0, stock: 40 },

    // Low Stock (1-10 units)
    { name: 'Azithromycin 500mg', genericName: 'Azithromycin', type: 'Tablet', strength: '500mg', mrp: 15.0, sellingPrice: 12.0, stock: 8 },
    { name: 'Paracetamol 650mg', genericName: 'Paracetamol', type: 'Tablet', strength: '650mg', mrp: 4.0, sellingPrice: 3.0, stock: 5 },
    { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', type: 'Tablet', strength: '400mg', mrp: 6.0, sellingPrice: 5.0, stock: 7 },
    { name: 'Metformin 500mg', genericName: 'Metformin', type: 'Tablet', strength: '500mg', mrp: 3.5, sellingPrice: 3.0, stock: 9 },
    { name: 'Atorvastatin 10mg', genericName: 'Atorvastatin', type: 'Tablet', strength: '10mg', mrp: 8.0, sellingPrice: 6.5, stock: 6 },

    // Out of Stock (0 units)
    { name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', type: 'Tablet', strength: '500mg', mrp: 12.0, sellingPrice: 10.0, stock: 0 },
    { name: 'Insulin Injection 100IU', genericName: 'Insulin', type: 'Injection', strength: '100IU', mrp: 350.0, sellingPrice: 320.0, stock: 0 },
    { name: 'Aspirin 75mg', genericName: 'Aspirin', type: 'Tablet', strength: '75mg', mrp: 2.5, sellingPrice: 2.0, stock: 0 },
    { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', type: 'Tablet', strength: '40mg', mrp: 7.0, sellingPrice: 5.5, stock: 0 },
    { name: 'Diclofenac Gel 30g', genericName: 'Diclofenac', type: 'Gel', strength: '30g', mrp: 90.0, sellingPrice: 80.0, stock: 0 },
  ];

  for (const med of medicines) {
    const medicine = await prisma.medicine.create({
      data: {
        name: med.name,
        genericName: med.genericName,
        type: med.type,
        strength: med.strength,
        mrp: med.mrp,
        sellingPrice: med.sellingPrice,
        currentStock: med.stock,
        reorderLevel: 10,
      },
    });

    // Create stock batches (FIFO)
    if (med.stock > 0) {
      await prisma.medicineStock.create({
        data: {
          medicineId: medicine.id,
          batchNumber: `BATCH${Math.random().toString(36).substring(7).toUpperCase()}`,
          quantity: med.stock,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      });
    }
  }

  console.log('✅ Created 15 medicines with stock');

  // ============ LAB TESTS ============

  const labTests = [
    { name: 'CBC (Complete Blood Count)', category: 'Hematology', price: 300, sampleType: 'Blood', tat: 120 },
    { name: 'Blood Sugar (Fasting)', category: 'Biochemistry', price: 50, sampleType: 'Blood', tat: 60 },
    { name: 'LFT (Liver Function Test)', category: 'Biochemistry', price: 500, sampleType: 'Blood', tat: 180 },
    { name: 'KFT (Kidney Function Test)', category: 'Biochemistry', price: 500, sampleType: 'Blood', tat: 180 },
    { name: 'Lipid Profile', category: 'Biochemistry', price: 400, sampleType: 'Blood', tat: 120 },
    { name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 600, sampleType: 'Blood', tat: 240 },
    { name: 'Urine Routine', category: 'Pathology', price: 150, sampleType: 'Urine', tat: 60 },
    { name: 'X-Ray Chest PA', category: 'Radiology', price: 250, sampleType: 'Imaging', tat: 30 },
  ];

  for (const test of labTests) {
    await prisma.labTest.create({ data: test });
  }

  console.log('✅ Created 8 lab tests');

  // ============ PATIENTS ============

  // General Queue Patients (No specific doctor assigned)
  const generalPatients = [
    {
      token: 101,
      uhid: 'UH2024001',
      name: 'Ramesh Kumar',
      age: 45,
      gender: Gender.M,
      mobile: '9876543210',
      address: '123, MG Road, Bangalore',
      consultationType: DoctorSpecialty.GENERAL,
      chiefComplaint: 'Fever and headache for 3 days',
      bp: '120/80',
      pulse: 78,
      temp: 101.2,
      spo2: 98,
      height: 170,
      weight: 70,
      allergies: 'Penicillin',
    },
    {
      token: 102,
      uhid: 'UH2024002',
      name: 'Lakshmi Devi',
      age: 38,
      gender: Gender.F,
      mobile: '9876543211',
      address: '456, Brigade Road, Bangalore',
      consultationType: DoctorSpecialty.GENERAL,
      chiefComplaint: 'Cough and cold for 1 week',
      bp: '110/70',
      pulse: 72,
      temp: 98.6,
      spo2: 99,
      height: 160,
      weight: 60,
      allergies: null,
    },
    {
      token: 103,
      uhid: 'UH2024003',
      name: 'Suresh Reddy',
      age: 52,
      gender: Gender.M,
      mobile: '9876543212',
      address: '789, Indiranagar, Bangalore',
      consultationType: DoctorSpecialty.GENERAL,
      chiefComplaint: 'Stomach pain and acidity',
      bp: '130/85',
      pulse: 80,
      temp: 98.4,
      spo2: 97,
      height: 175,
      weight: 85,
      allergies: null,
    },
  ];

  for (const p of generalPatients) {
    const bmi = parseFloat((p.weight / Math.pow(p.height / 100, 2)).toFixed(1));

    const patient = await prisma.patient.create({
      data: {
        token: p.token,
        uhid: p.uhid,
        name: p.name,
        age: p.age,
        gender: p.gender,
        mobile: p.mobile,
        address: p.address,
        stage: PatientStage.DOCTOR_PENDING,
        consultationType: p.consultationType,
        doctorId: null, // Shared queue
      },
    });

    await prisma.vitals.create({
      data: {
        patientId: patient.id,
        bp: p.bp,
        pulse: p.pulse,
        temperature: p.temp,
        spo2: p.spo2,
        height: p.height,
        weight: p.weight,
        bmi: bmi,
        chiefComplaint: p.chiefComplaint,
        allergies: p.allergies,
        recordedById: nursePriya.id,
      },
    });
  }

  // Orthopedic Specialist Patients (Assigned to Dr. Sharma)
  const orthoPatients = [
    {
      token: 104,
      uhid: 'UH2024004',
      name: 'Vikram Singh',
      age: 35,
      gender: Gender.M,
      mobile: '9876543213',
      address: '321, Koramangala, Bangalore',
      chiefComplaint: 'Knee pain after sports injury',
      bp: '118/75',
      pulse: 75,
      temp: 98.6,
      spo2: 99,
      height: 178,
      weight: 78,
      allergies: null,
    },
    {
      token: 105,
      uhid: 'UH2024005',
      name: 'Anjali Sharma',
      age: 42,
      gender: Gender.F,
      mobile: '9876543214',
      address: '654, Whitefield, Bangalore',
      chiefComplaint: 'Lower back pain for 2 months',
      bp: '115/72',
      pulse: 70,
      temp: 98.4,
      spo2: 98,
      height: 165,
      weight: 68,
      allergies: null,
    },
  ];

  for (const p of orthoPatients) {
    const bmi = parseFloat((p.weight / Math.pow(p.height / 100, 2)).toFixed(1));

    const patient = await prisma.patient.create({
      data: {
        token: p.token,
        uhid: p.uhid,
        name: p.name,
        age: p.age,
        gender: p.gender,
        mobile: p.mobile,
        address: p.address,
        stage: PatientStage.DOCTOR_PENDING,
        consultationType: DoctorSpecialty.ORTHOPEDIC,
        doctorId: drSharmaOrtho.id, // Assigned
      },
    });

    await prisma.vitals.create({
      data: {
        patientId: patient.id,
        bp: p.bp,
        pulse: p.pulse,
        temperature: p.temp,
        spo2: p.spo2,
        height: p.height,
        weight: p.weight,
        bmi: bmi,
        chiefComplaint: p.chiefComplaint,
        allergies: p.allergies,
        recordedById: nursePriya.id,
      },
    });
  }

  // Gynecology Specialist Patients (Assigned to Dr. Meera)
  const gynePatients = [
    {
      token: 106,
      uhid: 'UH2024006',
      name: 'Priya Menon',
      age: 28,
      gender: Gender.F,
      mobile: '9876543215',
      address: '987, HSR Layout, Bangalore',
      chiefComplaint: 'Irregular menstrual cycle',
      bp: '110/70',
      pulse: 72,
      temp: 98.6,
      spo2: 99,
      height: 162,
      weight: 58,
      allergies: null,
    },
  ];

  for (const p of gynePatients) {
    const bmi = parseFloat((p.weight / Math.pow(p.height / 100, 2)).toFixed(1));

    const patient = await prisma.patient.create({
      data: {
        token: p.token,
        uhid: p.uhid,
        name: p.name,
        age: p.age,
        gender: p.gender,
        mobile: p.mobile,
        address: p.address,
        stage: PatientStage.DOCTOR_PENDING,
        consultationType: DoctorSpecialty.GYNECOLOGY,
        doctorId: drMeeraGyn.id, // Assigned
      },
    });

    await prisma.vitals.create({
      data: {
        patientId: patient.id,
        bp: p.bp,
        pulse: p.pulse,
        temperature: p.temp,
        spo2: p.spo2,
        height: p.height,
        weight: p.weight,
        bmi: bmi,
        chiefComplaint: p.chiefComplaint,
        allergies: p.allergies,
        recordedById: nursePriya.id,
      },
    });
  }

  console.log('✅ Created 6 patients (3 general, 2 ortho, 1 gyno)');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials (all password: demo):');
  console.log('   👨‍⚕️ General Doctors:');
  console.log('      - dr.kumar (Dr. Rajesh Kumar)');
  console.log('      - dr.priya (Dr. Priya Reddy)');
  console.log('   🦴 Orthopedic Specialist:');
  console.log('      - dr.sharma (Dr. Amit Sharma)');
  console.log('   👩 Gynecology Specialist:');
  console.log('      - dr.meera (Dr. Meera Iyer)');
  console.log('   💉 Nurse:');
  console.log('      - nurse.priya (Nurse Priya)');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
