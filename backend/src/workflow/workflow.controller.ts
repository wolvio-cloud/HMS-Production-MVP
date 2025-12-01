import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, PatientStage } from '@prisma/client';

@Controller('workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * ⭐ Auto-route patient after consultation
   * POST /api/workflow/patients/:id/auto-route
   */
  @Post('patients/:id/auto-route')
  @Roles(UserRole.DOCTOR)
  async autoRoute(@Param('id') patientId: string, @CurrentUser() user: any) {
    return this.workflowService.autoRouteAfterConsultation(patientId, user.id);
  }

  /**
   * Manually transition patient to next stage
   * POST /api/workflow/patients/:id/transition
   */
  @Post('patients/:id/transition')
  @Roles(UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN)
  async transitionPatient(
    @Param('id') patientId: string,
    @Body('toStage') toStage: PatientStage,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.transitionPatient(
      patientId,
      toStage,
      user.id,
      reason,
    );
  }

  /**
   * Complete vitals and send to doctor queue
   * POST /api/workflow/patients/:id/complete-vitals
   */
  @Post('patients/:id/complete-vitals')
  @Roles(UserRole.NURSE, UserRole.ADMIN)
  async completeVitals(
    @Param('id') patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.completeVitals(patientId, user.id);
  }

  /**
   * Complete lab work
   * POST /api/workflow/patients/:id/complete-lab
   */
  @Post('patients/:id/complete-lab')
  @Roles(UserRole.LAB_TECH, UserRole.ADMIN)
  async completeLabWork(
    @Param('id') patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.completeLabWork(patientId, user.id);
  }

  /**
   * Complete pharmacy dispensing
   * POST /api/workflow/patients/:id/complete-pharmacy
   */
  @Post('patients/:id/complete-pharmacy')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  async completePharmacy(
    @Param('id') patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.completePharmacy(patientId, user.id);
  }

  /**
   * Complete billing and checkout
   * POST /api/workflow/patients/:id/complete-billing
   */
  @Post('patients/:id/complete-billing')
  @Roles(UserRole.BILLING, UserRole.ADMIN)
  async completeBilling(
    @Param('id') patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.completeBilling(patientId, user.id);
  }

  /**
   * Get patient workflow history
   * GET /api/workflow/patients/:id/history
   */
  @Get('patients/:id/history')
  async getWorkflowHistory(@Param('id') patientId: string) {
    return this.workflowService.getPatientWorkflowHistory(patientId);
  }

  /**
   * Get stage statistics
   * GET /api/workflow/stats/stages
   */
  @Get('stats/stages')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  async getStageStats() {
    return this.workflowService.getStageStatistics();
  }

  /**
   * Get bottleneck analysis
   * GET /api/workflow/stats/bottlenecks
   */
  @Get('stats/bottlenecks')
  @Roles(UserRole.ADMIN)
  async getBottlenecks() {
    return this.workflowService.getBottleneckAnalysis();
  }
}
