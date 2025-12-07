import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: PrismaService;

  // Mock data
  const mockVisit = {
    id: 'visit-1',
    patientId: 'patient-1',
    visitType: 'OPD',
    arrivedAt: new Date('2024-01-15'),
    patient: {
      id: 'patient-1',
      name: 'John Doe',
      prescriptions: [
        {
          id: 'rx-1',
          doctorId: 'doctor-1',
          items: [
            {
              id: 'rx-item-1',
              medicineId: 'med-1',
              quantity: 15,
              dispensed: true,
              medicine: {
                id: 'med-1',
                name: 'Paracetamol',
                strength: '500mg',
                mrp: 100,
              },
            },
          ],
        },
      ],
      labOrders: [
        {
          id: 'lab-1',
          testId: 'test-1',
          status: 'COMPLETED',
          test: {
            id: 'test-1',
            name: 'CBC Test',
            price: 500,
          },
        },
      ],
    },
  };

  const mockBill = {
    id: 'bill-1',
    visitId: 'visit-1',
    billNumber: 'HMS/2024/0001',
    subtotal: 2139.35,
    taxAmount: 304.65,
    discount: 0,
    total: 2444,
    balance: 2444,
    status: 'PENDING',
    generatedAt: new Date('2024-01-15'),
    items: [
      {
        id: 'item-1',
        itemType: 'CONSULTATION',
        description: 'Doctor Consultation Fee',
        quantity: 1,
        unitPrice: 300,
        amount: 300,
        isTaxInclusive: false,
        taxRate: 0.18,
        taxAmount: 54,
        total: 354,
      },
      {
        id: 'item-2',
        itemType: 'MEDICINE',
        description: 'Paracetamol 500mg',
        quantity: 15,
        unitPrice: 100,
        amount: 1500,
        isTaxInclusive: true,
        taxRate: 0.12,
        taxAmount: 160.71,
        total: 1500,
      },
      {
        id: 'item-3',
        itemType: 'LAB_TEST',
        description: 'CBC Test',
        quantity: 1,
        unitPrice: 500,
        amount: 500,
        isTaxInclusive: false,
        taxRate: 0.18,
        taxAmount: 90,
        total: 590,
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: {
            visit: {
              findUnique: jest.fn(),
            },
            billing: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateBill', () => {
    it('should generate a bill with consultation, medicines, and lab tests', async () => {
      // Mock visit exists
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(mockVisit as any);

      // Mock no existing bill
      jest.spyOn(prisma.billing, 'findFirst').mockResolvedValue(null);

      // Mock bill creation
      jest.spyOn(prisma.billing, 'create').mockResolvedValue(mockBill as any);

      const result = await service.generateBill({
        visitId: 'visit-1',
        generatedBy: 'user-1',
      });

      // Verify bill was created with correct structure
      expect(result.billNumber).toMatch(/HMS\/\d{4}\/\d{4}/);
      expect(result.items).toHaveLength(3);
      expect(result.total).toBeGreaterThan(0);

      // Verify consultation fee (18% GST, exclusive)
      const consultationItem = result.items.find((i) => i.itemType === 'CONSULTATION');
      expect(consultationItem).toBeDefined();
      expect(consultationItem?.isTaxInclusive).toBe(false);
      expect(consultationItem?.taxRate).toBe(0.18);

      // Verify medicine (12% GST, inclusive)
      const medicineItem = result.items.find((i) => i.itemType === 'MEDICINE');
      expect(medicineItem).toBeDefined();
      expect(medicineItem?.isTaxInclusive).toBe(true);
      expect(medicineItem?.taxRate).toBe(0.12);

      // Verify lab test (18% GST, exclusive)
      const labItem = result.items.find((i) => i.itemType === 'LAB_TEST');
      expect(labItem).toBeDefined();
      expect(labItem?.isTaxInclusive).toBe(false);
      expect(labItem?.taxRate).toBe(0.18);
    });

    it('should throw NotFoundException if visit does not exist', async () => {
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(null);

      await expect(
        service.generateBill({
          visitId: 'invalid-visit',
          generatedBy: 'user-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if bill already exists for visit', async () => {
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(mockVisit as any);
      jest.spyOn(prisma.billing, 'findFirst').mockResolvedValue(mockBill as any);

      await expect(
        service.generateBill({
          visitId: 'visit-1',
          generatedBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no unbilled items found', async () => {
      const emptyVisit = {
        ...mockVisit,
        patient: {
          ...mockVisit.patient,
          prescriptions: [],
          labOrders: [],
        },
      };

      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(emptyVisit as any);
      jest.spyOn(prisma.billing, 'findFirst').mockResolvedValue(null);

      await expect(
        service.generateBill({
          visitId: 'visit-1',
          generatedBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('previewBill', () => {
    it('should return bill preview without creating a record', async () => {
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(mockVisit as any);

      const preview = await service.previewBill('visit-1');

      expect(preview.items.length).toBeGreaterThan(0);
      expect(preview.subtotal).toBeGreaterThan(0);
      expect(preview.taxAmount).toBeGreaterThan(0);
      expect(preview.total).toBeGreaterThan(0);

      // Ensure no bill was created
      expect(prisma.billing.create).not.toHaveBeenCalled();
    });

    it('should return empty preview if no unbilled items', async () => {
      const emptyVisit = {
        ...mockVisit,
        patient: {
          ...mockVisit.patient,
          prescriptions: [],
          labOrders: [],
        },
      };

      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(emptyVisit as any);

      const preview = await service.previewBill('visit-1');

      expect(preview.items).toHaveLength(0);
      expect(preview.subtotal).toBe(0);
      expect(preview.taxAmount).toBe(0);
      expect(preview.total).toBe(0);
    });
  });

  describe('getBill', () => {
    it('should return bill by ID', async () => {
      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      const result = await service.getBill('bill-1');

      expect(result.id).toBe('bill-1');
      expect(result.billNumber).toBe('HMS/2024/0001');
    });

    it('should throw NotFoundException if bill not found', async () => {
      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(null);

      await expect(service.getBill('invalid-bill')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBillByNumber', () => {
    it('should return bill by bill number', async () => {
      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      const result = await service.getBillByNumber('HMS/2024/0001');

      expect(result.billNumber).toBe('HMS/2024/0001');
    });

    it('should throw NotFoundException if bill not found', async () => {
      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(null);

      await expect(service.getBillByNumber('HMS/2024/9999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getBillsForVisit', () => {
    it('should return all bills for a visit', async () => {
      jest.spyOn(prisma.billing, 'findMany').mockResolvedValue([mockBill] as any);

      const result = await service.getBillsForVisit('visit-1');

      expect(result).toHaveLength(1);
      expect(result[0].visitId).toBe('visit-1');
    });

    it('should return empty array if no bills found', async () => {
      jest.spyOn(prisma.billing, 'findMany').mockResolvedValue([]);

      const result = await service.getBillsForVisit('visit-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('Bill Number Generation', () => {
    it('should generate bill number with correct format', async () => {
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(mockVisit as any);
      jest.spyOn(prisma.billing, 'findFirst').mockResolvedValue(null);

      const mockCreatedBill = {
        ...mockBill,
        billNumber: 'HMS/2024/0001',
      };
      jest.spyOn(prisma.billing, 'create').mockResolvedValue(mockCreatedBill as any);

      const result = await service.generateBill({
        visitId: 'visit-1',
        generatedBy: 'user-1',
      });

      expect(result.billNumber).toMatch(/HMS\/\d{4}\/\d{4}/);
    });

    it('should increment bill number correctly', async () => {
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(mockVisit as any);

      // Mock findFirst calls in order:
      // 1st call: Check if bill exists for this visit → null (no existing bill)
      // 2nd call: Get latest bill number → HMS/2024/0005
      jest
        .spyOn(prisma.billing, 'findFirst')
        .mockResolvedValueOnce(null) // No existing bill for this visit
        .mockResolvedValueOnce({
          ...mockBill,
          billNumber: 'HMS/2024/0005',
        } as any); // Latest bill number is 0005

      const mockCreatedBill = {
        ...mockBill,
        billNumber: 'HMS/2024/0006',
      };
      jest.spyOn(prisma.billing, 'create').mockResolvedValue(mockCreatedBill as any);

      const result = await service.generateBill({
        visitId: 'visit-1',
        generatedBy: 'user-1',
      });

      // Next bill should be 0006
      expect(result.billNumber).toContain('0006');
    });
  });

  describe('Tax Calculation Integration', () => {
    it('should correctly calculate totals using TaxCalculator', async () => {
      jest.spyOn(prisma.visit, 'findUnique').mockResolvedValue(mockVisit as any);
      jest.spyOn(prisma.billing, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.billing, 'create').mockResolvedValue(mockBill as any);

      const result = await service.generateBill({
        visitId: 'visit-1',
        generatedBy: 'user-1',
      });

      // Verify totals are correctly calculated
      expect(result.subtotal).toBeGreaterThan(0);
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.total).toBe(result.subtotal + result.taxAmount - result.discount);

      // Verify balance initially equals total
      expect(result.balance).toBe(result.total);
    });
  });
});
