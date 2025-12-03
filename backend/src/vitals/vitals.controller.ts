import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { VitalsService } from './vitals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vitals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VitalsController {
  constructor(private vitalsService: VitalsService) {}

  /**
   * Create or update vitals for a patient
   * POST /vitals
   */
  @Post()
  @Roles(UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN)
  async createOrUpdateVitals(@Body() body: any) {
    return this.vitalsService.createOrUpdateVitals(body);
  }

  /**
   * Get vitals by patient ID
   * GET /vitals/:patientId
   */
  @Get(':patientId')
  @Roles(UserRole.NURSE, UserRole.DOCTOR, UserRole.ADMIN)
  async getVitalsByPatientId(@Param('patientId') patientId: string) {
    return this.vitalsService.getVitalsByPatientId(patientId);
  }

  /**
   * Get vitals queue (patients waiting for vitals)
   * GET /vitals/queue/pending
   */
  @Get('queue/pending')
  @Roles(UserRole.NURSE, UserRole.ADMIN)
  async getVitalsQueue() {
    return this.vitalsService.getVitalsQueue();
  }
}
