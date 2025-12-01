import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PatientStage,
  PatientStatus,
  DoctorSpecialty,
  UserRole,
} from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  // ⭐ KEY METHOD: Get queue for doctor
  async getQueueForDoctor(
    doctorId: string,
    specialty: DoctorSpecialty,
  ) {
    // GENERAL doctors: See shared queue (doctorId IS NULL)
    // SPECIALISTS: See only their assigned patients
    const whereCondition =
      specialty === DoctorSpecialty.GENERAL
        ? {
            doctorId: null,
            consultationType: DoctorSpecialty.GENERAL,
            stage: PatientStage.DOCTOR_PENDING,
            status: PatientStatus.IN_PROGRESS,
          }
        : {
            doctorId: doctorId,
            stage: PatientStage.DOCTOR_PENDING,
            status: PatientStatus.IN_PROGRESS,
          };

    return this.prisma.patient.findMany({
      where: whereCondition,
      include: {
        vitals: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'asc', // FIFO: First come, first served
      },
    });
  }

  // Get patient by ID with full details
  async getPatientById(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        vitals: true,
        prescriptions: {
          include: {
            items: {
              include: {
                medicine: true,
              },
            },
          },
        },
        labOrders: {
          include: {
            test: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        stateHistory: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  // Get all patients (for admin/reports)
  async getAllPatients(filters?: {
    stage?: PatientStage;
    status?: PatientStatus;
    date?: Date;
  }) {
    return this.prisma.patient.findMany({
      where: {
        stage: filters?.stage,
        status: filters?.status,
        registeredAt: filters?.date
          ? {
              gte: new Date(filters.date.setHours(0, 0, 0, 0)),
              lt: new Date(filters.date.setHours(23, 59, 59, 999)),
            }
          : undefined,
      },
      include: {
        vitals: {
          select: {
            chiefComplaint: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        registeredAt: 'desc',
      },
    });
  }

  // Update patient stage (workflow transition)
  async updatePatientStage(
    patientId: string,
    toStage: PatientStage,
    performedBy?: string,
    reason?: string,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Update patient and log state history
    const updated = await this.prisma.$transaction([
      this.prisma.patient.update({
        where: { id: patientId },
        data: {
          stage: toStage,
          completedAt:
            toStage === PatientStage.COMPLETED ? new Date() : null,
          status:
            toStage === PatientStage.COMPLETED
              ? PatientStatus.COMPLETED
              : PatientStatus.IN_PROGRESS,
        },
      }),
      this.prisma.patientStateHistory.create({
        data: {
          patientId,
          fromStage: patient.stage,
          toStage,
          performedBy,
          reason,
        },
      }),
    ]);

    return updated[0];
  }

  // Lock patient to doctor (when doctor selects from general queue)
  async lockPatientToDoctor(patientId: string, doctorId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Only lock if patient is in general queue (doctorId is null)
    if (patient.doctorId !== null) {
      throw new Error('Patient already assigned to a doctor');
    }

    return this.prisma.patient.update({
      where: { id: patientId },
      data: { doctorId },
    });
  }

  // Get queue statistics
  async getQueueStats() {
    const stats = await Promise.all([
      this.prisma.patient.count({
        where: {
          stage: PatientStage.VITALS_PENDING,
          status: PatientStatus.IN_PROGRESS,
        },
      }),
      this.prisma.patient.count({
        where: {
          stage: PatientStage.DOCTOR_PENDING,
          status: PatientStatus.IN_PROGRESS,
        },
      }),
      this.prisma.patient.count({
        where: {
          stage: PatientStage.LAB_PENDING,
          status: PatientStatus.IN_PROGRESS,
        },
      }),
      this.prisma.patient.count({
        where: {
          stage: PatientStage.PHARMACY_PENDING,
          status: PatientStatus.IN_PROGRESS,
        },
      }),
      this.prisma.patient.count({
        where: {
          stage: PatientStage.BILLING_PENDING,
          status: PatientStatus.IN_PROGRESS,
        },
      }),
      this.prisma.patient.count({
        where: {
          status: PatientStatus.COMPLETED,
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      vitals: stats[0],
      doctor: stats[1],
      lab: stats[2],
      pharmacy: stats[3],
      billing: stats[4],
      completedToday: stats[5],
    };
  }
}
