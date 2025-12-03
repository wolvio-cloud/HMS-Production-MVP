import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LabService } from './lab.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { UpdateLabOrderDto } from './dto/update-lab-order.dto';

@Controller('lab')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabController {
  constructor(private readonly labService: LabService) { }

  /**
   * Get all available lab tests
   * GET /api/lab/tests
   */
  @Get('tests')
  async getAllTests() {
    return this.labService.getAllTests();
  }

  /**
   * Search lab tests by name
   * GET /api/lab/tests/search?q=blood
   */
  @Get('tests/search')
  async searchTests(@Query('q') query: string) {
    return this.labService.searchTests(query);
  }

  /**
   * Get lab test by ID
   * GET /api/lab/tests/:id
   */
  @Get('tests/:id')
  async getTest(@Param('id') testId: string) {
    return this.labService.getTestById(testId);
  }

  /**
   * ⭐ Create lab order for patient
   * POST /api/lab/orders
   */
  @Post('orders')
  @Roles(UserRole.DOCTOR)
  async createLabOrder(
    @Body() createDto: CreateLabOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.labService.createLabOrder(createDto, user.id);
  }

  /**
   * Get lab order by ID
   * GET /api/lab/orders/:id
   */
  @Get('orders/:id')
  async getLabOrder(@Param('id') orderId: string) {
    return this.labService.getLabOrderById(orderId);
  }

  /**
   * Get all lab orders for a patient
   * GET /api/lab/orders/patient/:patientId
   */
  @Get('orders/patient/:patientId')
  async getPatientLabOrders(@Param('patientId') patientId: string) {
    return this.labService.getPatientLabOrders(patientId);
  }

  /**
   * Get pending lab orders (for lab technicians)
   * GET /api/lab/orders/queue/pending
   */
  @Get('orders/queue/pending')
  @Roles(UserRole.LAB_TECH, UserRole.ADMIN)
  async getPendingOrders() {
    return this.labService.getPendingLabOrders();
  }

  /**
   * Get in-progress lab orders
   * GET /api/lab/orders/queue/in-progress
   */
  @Get('orders/queue/in-progress')
  @Roles(UserRole.LAB_TECH, UserRole.ADMIN)
  async getInProgressOrders() {
    return this.labService.getInProgressLabOrders();
  }

  /**
   * Get completed lab orders for review
   * GET /api/lab/orders/queue/completed
   */
  @Get('orders/queue/completed')
  @Roles(UserRole.DOCTOR, UserRole.LAB_TECH, UserRole.ADMIN)
  async getCompletedOrders(@CurrentUser() user: any) {
    const doctorId = user.role === UserRole.DOCTOR ? user.id : undefined;
    return this.labService.getCompletedLabOrders(doctorId);
  }

  /**
   * Update lab order (status, results)
   * PATCH /api/lab/orders/:id
   */
  @Patch('orders/:id')
  @Roles(UserRole.LAB_TECH, UserRole.ADMIN)
  async updateLabOrder(
    @Param('id') orderId: string,
    @Body() updateDto: UpdateLabOrderDto,
  ) {
    return this.labService.updateLabOrder(orderId, updateDto);
  }

  /**
   * Create new lab test (admin only)
   * POST /api/lab/tests
   */
  @Post('tests')
  @Roles(UserRole.ADMIN)
  async createLabTest(
    @Body()
    data: {
      name: string;
      description?: string;
      price: number;
      category: string;     // REQUIRED
      sampleType: string;   // REQUIRED
      tat: number;          // REQUIRED
    },
  ) {
    return this.labService.createLabTest(data);
  }

}
