import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientStage, PatientStatus } from '@prisma/client';

interface StateTransition {
  fromStage: PatientStage;
  toStage: PatientStage;
  performedBy?: string;
  reason?: string;
}

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valid state transitions (state machine rules)
   */
  private readonly VALID_TRANSITIONS: Record<
    PatientStage,
    PatientStage[]
  > = {
    [PatientStage.REGISTERED]: [PatientStage.VITALS_PENDING],
    [PatientStage.VITALS_PENDING]: [PatientStage.DOCTOR_PENDING],
    [PatientStage.DOCTOR_PENDING]: [
      PatientStage.LAB_PENDING,
      PatientStage.PHARMACY_PENDING,
      PatientStage.BILLING_PENDING, // Direct if no lab/pharmacy needed
      PatientStage.COMPLETED, // Rare, but allowed (e.g., consultation only)
    ],
    [PatientStage.LAB_PENDING]: [
      PatientStage.DOCTOR_REVIEW_PENDING,
      PatientStage.PHARMACY_PENDING, // Parallel routing
    ],
    [PatientStage.DOCTOR_REVIEW_PENDING]: [
      PatientStage.PHARMACY_PENDING,
      PatientStage.BILLING_PENDING,
      PatientStage.LAB_PENDING, // May need more tests
    ],
    [PatientStage.PHARMACY_PENDING]: [
      PatientStage.BILLING_PENDING,
      PatientStage.LAB_PENDING, // Parallel routing
    ],
    [PatientStage.BILLING_PENDING]: [PatientStage.COMPLETED],
    [PatientStage.COMPLETED]: [], // Terminal state
  };

  /**
   * Validate if transition is allowed
   */
  isTransitionValid(fromStage: PatientStage, toStage: PatientStage): boolean {
    const allowedTransitions = this.VALID_TRANSITIONS[fromStage];
    return allowedTransitions.includes(toStage);
  }

  /**
   * ⭐ Transition patient to next stage with validation
   */
  async transitionPatient(
    patientId: string,
    toStage: PatientStage,
    performedBy?: string,
    reason?: string,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    // Validate transition
    if (!this.isTransitionValid(patient.stage, toStage)) {
      throw new BadRequestException(
        `Invalid transition from ${patient.stage} to ${toStage}`,
      );
    }

    // Perform transition with audit trail
    const updated = await this.prisma.$transaction([
      this.prisma.patient.update({
        where: { id: patientId },
        data: {
          stage: toStage,
          status:
            toStage === PatientStage.COMPLETED
              ? PatientStatus.COMPLETED
              : PatientStatus.IN_PROGRESS,
          completedAt:
            toStage === PatientStage.COMPLETED ? new Date() : undefined,
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

    console.log(
      `✅ Patient ${patient.token} transitioned: ${patient.stage} → ${toStage}`,
    );

    return updated[0];
  }

  /**
   * ⭐ Auto-route patient after doctor consultation
   * Determines next stage based on prescriptions and lab orders
   */
  async autoRouteAfterConsultation(patientId: string, doctorId: string) {
    // Get patient with prescriptions and lab orders
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        prescriptions: {
          where: {
            doctorId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
        labOrders: {
          where: {
            doctorId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    const hasPrescription = patient.prescriptions.length > 0;
    const hasLabOrder = patient.labOrders.length > 0;

    let nextStage: PatientStage;
    let reason: string;

    if (hasLabOrder && hasPrescription) {
      // Both lab and pharmacy - User chose parallel routing (Option B)
      nextStage = PatientStage.LAB_PENDING;
      reason =
        'Auto-routed to LAB (parallel with PHARMACY). Patient has both lab orders and prescriptions.';
    } else if (hasLabOrder) {
      // Only lab
      nextStage = PatientStage.LAB_PENDING;
      reason = 'Auto-routed to LAB. Patient has lab orders.';
    } else if (hasPrescription) {
      // Only pharmacy
      nextStage = PatientStage.PHARMACY_PENDING;
      reason = 'Auto-routed to PHARMACY. Patient has prescriptions.';
    } else {
      // No lab or pharmacy - direct to billing
      nextStage = PatientStage.BILLING_PENDING;
      reason =
        'Auto-routed to BILLING. Consultation only (no lab/pharmacy needed).';
    }

    return this.transitionPatient(patientId, nextStage, doctorId, reason);
  }

  /**
   * Complete vitals and send to doctor queue
   */
  async completeVitals(patientId: string, performedBy: string) {
    return this.transitionPatient(
      patientId,
      PatientStage.DOCTOR_PENDING,
      performedBy,
      'Vitals completed',
    );
  }

  /**
   * Complete lab work
   */
  async completeLabWork(patientId: string, performedBy: string) {
    // Check if patient also needs pharmacy
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        prescriptions: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    const hasPrescription = patient.prescriptions.length > 0;

    // If has prescription, go to pharmacy; else go to billing
    const nextStage = hasPrescription
      ? PatientStage.PHARMACY_PENDING
      : PatientStage.BILLING_PENDING;

    const reason = hasPrescription
      ? 'Lab completed. Moving to pharmacy for medicine dispensing.'
      : 'Lab completed. No pharmacy needed, moving to billing.';

    return this.transitionPatient(patientId, nextStage, performedBy, reason);
  }

  /**
   * Complete pharmacy dispensing
   */
  async completePharmacy(patientId: string, performedBy: string) {
    return this.transitionPatient(
      patientId,
      PatientStage.BILLING_PENDING,
      performedBy,
      'Medicine dispensed',
    );
  }

  /**
   * Complete billing and checkout patient
   */
  async completeBilling(patientId: string, performedBy: string) {
    return this.transitionPatient(
      patientId,
      PatientStage.COMPLETED,
      performedBy,
      'Payment completed',
    );
  }

  /**
   * Get patient workflow history
   */
  async getPatientWorkflowHistory(patientId: string) {
    return this.prisma.patientStateHistory.findMany({
      where: { patientId },
      orderBy: {
        timestamp: 'asc',
      },
    });
  }

  /**
   * Get current stage statistics
   */
  async getStageStatistics() {
    const stages = Object.values(PatientStage);

    const stats = await Promise.all(
      stages.map(async (stage) => {
        const count = await this.prisma.patient.count({
          where: {
            stage,
            status: PatientStatus.IN_PROGRESS,
          },
        });

        return {
          stage,
          count,
        };
      }),
    );

    const totalActive = await this.prisma.patient.count({
      where: {
        status: PatientStatus.IN_PROGRESS,
      },
    });

    const totalCompleted = await this.prisma.patient.count({
      where: {
        status: PatientStatus.COMPLETED,
      },
    });

    return {
      byStage: stats,
      totalActive,
      totalCompleted,
      totalAll: totalActive + totalCompleted,
    };
  }

  /**
   * Get bottleneck analysis (stages with most patients)
   */
  async getBottleneckAnalysis() {
    const stats = await this.getStageStatistics();

    const bottlenecks = stats.byStage
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 bottlenecks

    return {
      bottlenecks,
      recommendation:
        bottlenecks.length > 0
          ? `Focus resources on ${bottlenecks[0].stage} (${bottlenecks[0].count} patients waiting)`
          : 'No bottlenecks detected. Workflow is smooth.',
    };
  }
}
