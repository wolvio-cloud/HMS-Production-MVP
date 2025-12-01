import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';
import { LabStatus } from '@prisma/client';

@Injectable()
export class LabService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all available lab tests
   */
  async getAllTests() {
    return this.prisma.labTest.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get lab test by ID
   */
  async getTestById(testId: string) {
    const test = await this.prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      throw new NotFoundException('Lab test not found');
    }

    return test;
  }

  /**
   * Search lab tests by name
   */
  async searchTests(query: string) {
    return this.prisma.labTest.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * ⭐ Create lab order for patient
   */
  async createLabOrder(createDto: CreateLabOrderDto, doctorId: string) {
    const { patientId, testIds, clinicalNotes, urgency } = createDto;

    // Verify patient exists
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Verify all tests exist
    const tests = await this.prisma.labTest.findMany({
      where: {
        id: {
          in: testIds,
        },
      },
    });

    if (tests.length !== testIds.length) {
      throw new NotFoundException('One or more lab tests not found');
    }

    // Calculate total cost
    const totalCost = tests.reduce((sum, test) => sum + test.price, 0);

    // Create lab orders (one for each test)
    const orders = await Promise.all(
      testIds.map((testId) =>
        this.prisma.labOrder.create({
          data: {
            patientId,
            testId,
            doctorId,
            status: LabStatus.PENDING,
            clinicalNotes,
          },
          include: {
            test: true,
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
            patient: {
              select: {
                id: true,
                name: true,
                token: true,
              },
            },
          },
        }),
      ),
    );

    console.log(
      `✅ Created ${orders.length} lab orders for patient ${patient.name}`,
    );

    return {
      orders,
      totalCost,
      summary: {
        patientId,
        patientName: patient.name,
        testCount: orders.length,
        totalCost,
        urgency: urgency || 'ROUTINE',
      },
    };
  }

  /**
   * Update lab order (results, status)
   */
  async updateLabOrder(orderId: string, updateDto: UpdateLabOrderDto) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: {
        ...updateDto,
        completedAt:
          updateDto.status === LabStatus.COMPLETED ? new Date() : undefined,
      },
      include: {
        test: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Get lab order by ID
   */
  async getLabOrderById(orderId: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        test: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    return order;
  }

  /**
   * Get all lab orders for a patient
   */
  async getPatientLabOrders(patientId: string) {
    return this.prisma.labOrder.findMany({
      where: { patientId },
      include: {
        test: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get pending lab orders (for lab technicians)
   */
  async getPendingLabOrders() {
    return this.prisma.labOrder.findMany({
      where: {
        status: LabStatus.PENDING,
      },
      include: {
        test: true,
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // FIFO
      },
    });
  }

  /**
   * Get in-progress lab orders
   */
  async getInProgressLabOrders() {
    return this.prisma.labOrder.findMany({
      where: {
        status: LabStatus.IN_PROGRESS,
      },
      include: {
        test: true,
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get completed lab orders for doctor review
   */
  async getCompletedLabOrders(doctorId?: string) {
    const where = doctorId
      ? {
          status: LabStatus.COMPLETED,
          doctorId,
        }
      : {
          status: LabStatus.COMPLETED,
        };

    return this.prisma.labOrder.findMany({
      where,
      include: {
        test: true,
        patient: {
          select: {
            id: true,
            name: true,
            token: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
  }

  /**
   * Create new lab test (admin only)
   */
  async createLabTest(data: {
    name: string;
    description?: string;
    price: number;
    turnaroundTime?: string;
  }) {
    return this.prisma.labTest.create({
      data,
    });
  }
}
