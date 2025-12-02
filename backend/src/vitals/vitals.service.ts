import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from '../events/queue.gateway';

interface CreateVitalsDto {
  patientId: string;
  bp: string;
  pulse: number;
  temperature: number;
  spo2: number;
  height: number;
  weight: number;
  chiefComplaint: string;
  allergies?: string;
  recordedById: string;
}

@Injectable()
export class VitalsService {
  constructor(
    private prisma: PrismaService,
    private queueGateway: QueueGateway,
  ) {}

  /**
   * Calculate BMI from height (cm) and weight (kg)
   */
  private calculateBMI(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
  }

  /**
   * Create or update vitals for a patient
   */
  async createOrUpdateVitals(data: CreateVitalsDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Calculate BMI
    const bmi = this.calculateBMI(data.height, data.weight);

    // Check if vitals already exist
    const existingVitals = await this.prisma.vitals.findUnique({
      where: { patientId: data.patientId },
    });

    let vitals;
    if (existingVitals) {
      // Update existing vitals
      vitals = await this.prisma.vitals.update({
        where: { patientId: data.patientId },
        data: {
          bp: data.bp,
          pulse: data.pulse,
          temperature: data.temperature,
          spo2: data.spo2,
          height: data.height,
          weight: data.weight,
          bmi,
          chiefComplaint: data.chiefComplaint,
          allergies: data.allergies,
          recordedById: data.recordedById,
          recordedAt: new Date(),
        },
      });
    } else {
      // Create new vitals
      vitals = await this.prisma.vitals.create({
        data: {
          patientId: data.patientId,
          bp: data.bp,
          pulse: data.pulse,
          temperature: data.temperature,
          spo2: data.spo2,
          height: data.height,
          weight: data.weight,
          bmi,
          chiefComplaint: data.chiefComplaint,
          allergies: data.allergies,
          recordedById: data.recordedById,
        },
      });
    }

    console.log(`✅ Vitals recorded for patient ${patient.token}: BP ${data.bp}, Temp ${data.temperature}°F`);

    // Broadcast vitals update event
    this.queueGateway.broadcastQueueUpdate({
      type: 'patient_updated',
      patientId: patient.id,
      patientToken: patient.token,
      data: { vitalsRecorded: true },
    });

    return vitals;
  }

  /**
   * Get vitals for a patient
   */
  async getVitalsByPatientId(patientId: string) {
    const vitals = await this.prisma.vitals.findUnique({
      where: { patientId },
      include: {
        recordedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!vitals) {
      throw new NotFoundException('Vitals not found for this patient');
    }

    return vitals;
  }

  /**
   * Get all patients in vitals queue (VITALS_PENDING stage)
   */
  async getVitalsQueue() {
    return this.prisma.patient.findMany({
      where: {
        stage: 'VITALS_PENDING',
        status: 'IN_PROGRESS',
      },
      include: {
        vitals: true,
      },
      orderBy: {
        registeredAt: 'asc', // FIFO
      },
    });
  }
}
