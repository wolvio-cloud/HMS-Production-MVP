import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { AddPrescriptionItemDto } from './dto/add-item.dto';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  /**
   * ⭐ Create prescription with auto-calculated quantities
   * POST /api/prescriptions
   */
  @Post()
  @Roles(UserRole.DOCTOR)
  async createPrescription(
    @Body() createDto: CreatePrescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.createPrescription(createDto, user.id);
  }

  /**
   * Add item to existing prescription
   * POST /api/prescriptions/:id/items
   */
  @Post(':id/items')
  @Roles(UserRole.DOCTOR)
  async addItem(
    @Param('id') prescriptionId: string,
    @Body() addItemDto: AddPrescriptionItemDto,
  ) {
    return this.prescriptionsService.addPrescriptionItem(
      prescriptionId,
      addItemDto,
    );
  }

  /**
   * Remove item from prescription
   * DELETE /api/prescriptions/items/:id
   */
  @Delete('items/:id')
  @Roles(UserRole.DOCTOR)
  async removeItem(@Param('id') itemId: string) {
    return this.prescriptionsService.removePrescriptionItem(itemId);
  }

  /**
   * Get prescription by ID
   * GET /api/prescriptions/:id
   */
  @Get(':id')
  async getPrescription(@Param('id') prescriptionId: string) {
    return this.prescriptionsService.getPrescriptionById(prescriptionId);
  }

  /**
   * Get all prescriptions for a patient
   * GET /api/prescriptions/patient/:patientId
   */
  @Get('patient/:patientId')
  async getPatientPrescriptions(@Param('patientId') patientId: string) {
    return this.prescriptionsService.getPatientPrescriptions(patientId);
  }

  /**
   * Get all prescriptions created by logged-in doctor
   * GET /api/prescriptions/doctor/my-prescriptions
   */
  @Get('doctor/my-prescriptions')
  @Roles(UserRole.DOCTOR)
  async getMyPrescriptions(@CurrentUser() user: any) {
    return this.prescriptionsService.getDoctorPrescriptions(user.id);
  }

  /**
   * ⭐ Repeat previous prescription (one-click)
   * POST /api/prescriptions/:id/repeat
   */
  @Post(':id/repeat')
  @Roles(UserRole.DOCTOR)
  async repeatPrescription(
    @Param('id') prescriptionId: string,
    @CurrentUser() user: any,
  ) {
    return this.prescriptionsService.repeatPrescription(prescriptionId, user.id);
  }
}
