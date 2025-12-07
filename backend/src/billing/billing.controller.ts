import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { BillResponse, BillPreview } from './dto/bill-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * BillingController - Session 2B
 *
 * Endpoints:
 * - POST /api/billing/generate - Generate bill from visit
 * - GET /api/billing/preview/:visitId - Preview bill without creating
 * - GET /api/billing/:billId - Get bill by ID
 * - GET /api/billing/number/:billNumber - Get bill by bill number
 * - GET /api/billing/visit/:visitId - Get all bills for a visit
 */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Generate bill from a visit
   * POST /api/billing/generate
   *
   * Body:
   * {
   *   "visitId": "visit-123"
   * }
   *
   * Response:
   * {
   *   "id": "bill-1",
   *   "billNumber": "HMS/2024/0001",
   *   "subtotal": 2139.35,
   *   "taxAmount": 304.65,
   *   "total": 2444,
   *   "balance": 2444,
   *   "status": "PENDING",
   *   "items": [...]
   * }
   */
  @Post('generate')
  @Roles('BILLING', 'ADMIN')
  async generateBill(
    @Body() dto: GenerateBillDto,
    @Request() req: any,
  ): Promise<BillResponse> {
    // Auto-fill generatedBy from authenticated user
    dto.generatedBy = dto.generatedBy || req.user.userId;
    return this.billingService.generateBill(dto);
  }

  /**
   * Preview bill without creating it
   * GET /api/billing/preview/:visitId
   *
   * Response:
   * {
   *   "items": [...],
   *   "subtotal": 2139.35,
   *   "taxAmount": 304.65,
   *   "total": 2444
   * }
   */
  @Get('preview/:visitId')
  @Roles('BILLING', 'ADMIN', 'DOCTOR')
  async previewBill(@Param('visitId') visitId: string): Promise<BillPreview> {
    return this.billingService.previewBill(visitId);
  }

  /**
   * Get bill by ID
   * GET /api/billing/:billId
   */
  @Get(':billId')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getBill(@Param('billId') billId: string): Promise<BillResponse> {
    return this.billingService.getBill(billId);
  }

  /**
   * Get bill by bill number
   * GET /api/billing/number/:billNumber
   *
   * Example: GET /api/billing/number/HMS/2024/0001
   */
  @Get('number/:billNumber')
  @Roles('BILLING', 'ADMIN', 'RECEPTIONIST')
  async getBillByNumber(@Param('billNumber') billNumber: string): Promise<BillResponse> {
    return this.billingService.getBillByNumber(billNumber);
  }

  /**
   * Get all bills for a visit
   * GET /api/billing/visit/:visitId
   */
  @Get('visit/:visitId')
  @Roles('BILLING', 'ADMIN', 'DOCTOR', 'RECEPTIONIST')
  async getBillsForVisit(@Param('visitId') visitId: string): Promise<BillResponse[]> {
    return this.billingService.getBillsForVisit(visitId);
  }
}
