import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, PatientStage } from '@prisma/client';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  // ⭐ Get doctor's queue
  @Get('queue/my-queue')
  @Roles(UserRole.DOCTOR)
  async getMyQueue(@CurrentUser() user: any) {
    return this.patientsService.getQueueForDoctor(
      user.id,
      user.specialty,
    );
  }

  // Get patient details
  @Get(':id')
  async getPatient(@Param('id') id: string) {
    return this.patientsService.getPatientById(id);
  }

  // Get all patients (admin)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  async getAllPatients(
    @Query('stage') stage?: PatientStage,
    @Query('status') status?: string,
  ) {
    return this.patientsService.getAllPatients({
      stage,
      status: status as any,
    });
  }

  // Lock patient to doctor
  @Patch(':id/lock')
  @Roles(UserRole.DOCTOR)
  async lockPatient(
    @Param('id') patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.lockPatientToDoctor(patientId, user.id);
  }

  // Update patient stage
  @Patch(':id/stage')
  async updateStage(
    @Param('id') patientId: string,
    @Body('stage') stage: PatientStage,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    return this.patientsService.updatePatientStage(
      patientId,
      stage,
      user?.id,
      reason,
    );
  }

  // Get queue statistics
  @Get('stats/queue')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  async getQueueStats() {
    return this.patientsService.getQueueStats();
  }
}
