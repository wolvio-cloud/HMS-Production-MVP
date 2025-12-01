import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, DoctorSpecialty } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all users (admin only)
   */
  async getAllUsers(role?: UserRole) {
    const where = role ? { role } : {};

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        specialty: true,
        isActive: true,
        createdAt: true,
        // Exclude password
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        specialty: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * ⭐ Get all doctors (for doctor selection in UI)
   */
  async getAllDoctors(specialty?: DoctorSpecialty) {
    const where = specialty
      ? {
          role: UserRole.DOCTOR,
          specialty,
          isActive: true,
        }
      : {
          role: UserRole.DOCTOR,
          isActive: true,
        };

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        specialty: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get general doctors (shared queue doctors)
   */
  async getGeneralDoctors() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
        specialty: DoctorSpecialty.GENERAL,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        specialty: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get specialist doctors by specialty
   */
  async getSpecialistDoctors(specialty: DoctorSpecialty) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.DOCTOR,
        specialty,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        specialty: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get doctor statistics (patient count, prescriptions count)
   */
  async getDoctorStats(doctorId: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor || doctor.role !== UserRole.DOCTOR) {
      throw new NotFoundException('Doctor not found');
    }

    const [
      totalPatientsAssigned,
      activePatientsInQueue,
      totalPrescriptions,
      totalLabOrders,
    ] = await Promise.all([
      this.prisma.patient.count({
        where: { doctorId },
      }),
      this.prisma.patient.count({
        where: {
          doctorId,
          status: 'IN_PROGRESS',
        },
      }),
      this.prisma.prescription.count({
        where: { doctorId },
      }),
      this.prisma.labOrder.count({
        where: { doctorId },
      }),
    ]);

    return {
      doctorId,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      stats: {
        totalPatientsAssigned,
        activePatientsInQueue,
        totalPrescriptions,
        totalLabOrders,
      },
    };
  }

  /**
   * Get all active staff by role
   */
  async getStaffByRole(role: UserRole) {
    return this.prisma.user.findMany({
      where: {
        role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        specialty: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    console.log(`✅ User ${user.name} (${user.username}) deactivated`);

    return user;
  }

  /**
   * Activate user
   */
  async activateUser(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    console.log(`✅ User ${user.name} (${user.username}) activated`);

    return user;
  }

  /**
   * Get user profile (for @CurrentUser)
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        specialty: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get role-specific stats
    let stats = {};

    if (user.role === UserRole.DOCTOR) {
      const doctorStats = await this.getDoctorStats(userId);
      stats = doctorStats.stats;
    }

    return {
      ...user,
      stats,
    };
  }
}
