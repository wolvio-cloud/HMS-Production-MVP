import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;

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
    payments: [],
  };

  const mockPayment = {
    id: 'payment-1',
    billingId: 'bill-1',
    amount: 1000,
    mode: 'CASH',
    status: 'SUCCESS',
    transactionId: null,
    upiId: null,
    cardLast4: null,
    razorpayOrderId: null,
    razorpayPaymentId: null,
    razorpaySignature: null,
    recordedBy: 'user-1',
    recordedAt: new Date('2024-01-15'),
    remarks: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: {
            billing: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            payment: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            outstandingBill: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('should record full payment and update bill status to PAID', async () => {
      const fullPaymentDto = {
        billingId: 'bill-1',
        amount: 2444,
        mode: 'CASH' as any,
        recordedBy: 'user-1',
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue(mockPayment as any);
      jest.spyOn(prisma.billing, 'update').mockResolvedValue({
        ...mockBill,
        balance: 0,
        status: 'PAID',
        paidAt: new Date(),
      } as any);
      jest.spyOn(prisma.outstandingBill, 'updateMany').mockResolvedValue({ count: 1 } as any);

      const result = await service.recordPayment(fullPaymentDto);

      expect(result.billStatus.balance).toBe(0);
      expect(result.billStatus.status).toBe('PAID');
      expect(result.billStatus.paidAmount).toBe(2444);
      expect(prisma.outstandingBill.updateMany).toHaveBeenCalledWith({
        where: { billingId: 'bill-1' },
        data: expect.objectContaining({ status: 'SETTLED' }),
      });
    });

    it('should record partial payment and update bill status to PARTIAL', async () => {
      const partialPaymentDto = {
        billingId: 'bill-1',
        amount: 1000,
        mode: 'CASH' as any,
        recordedBy: 'user-1',
      };

      const billWithVisit = {
        ...mockBill,
        visit: { patientId: 'patient-1' },
      };

      // Mock findUnique to return bill with visit info
      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(billWithVisit as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue(mockPayment as any);
      jest.spyOn(prisma.billing, 'update').mockResolvedValue({
        ...mockBill,
        balance: 1444,
        status: 'PARTIAL',
      } as any);
      jest.spyOn(prisma.outstandingBill, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.outstandingBill, 'create').mockResolvedValue({} as any);

      const result = await service.recordPayment(partialPaymentDto);

      expect(result.billStatus.balance).toBe(1444);
      expect(result.billStatus.status).toBe('PARTIAL');
      expect(result.billStatus.paidAmount).toBe(1000);
    });

    it('should throw NotFoundException if bill does not exist', async () => {
      const paymentDto = {
        billingId: 'invalid-bill',
        amount: 1000,
        mode: 'CASH' as any,
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(null);

      await expect(service.recordPayment(paymentDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for negative payment amount', async () => {
      const invalidDto = {
        billingId: 'bill-1',
        amount: -100,
        mode: 'CASH' as any,
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      await expect(service.recordPayment(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overpayment', async () => {
      const overpaymentDto = {
        billingId: 'bill-1',
        amount: 3000,
        mode: 'CASH' as any,
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      await expect(service.recordPayment(overpaymentDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.recordPayment(overpaymentDto)).rejects.toThrow(
        /exceeds outstanding balance/,
      );
    });

    it('should validate UPI payment requires transaction ID', async () => {
      const upiDto = {
        billingId: 'bill-1',
        amount: 1000,
        mode: 'UPI' as any,
        // Missing transactionId
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      await expect(service.recordPayment(upiDto)).rejects.toThrow(BadRequestException);
      await expect(service.recordPayment(upiDto)).rejects.toThrow(
        /Transaction ID is required for UPI/,
      );
    });

    it('should validate CARD payment requires transaction ID', async () => {
      const cardDto = {
        billingId: 'bill-1',
        amount: 1000,
        mode: 'CARD' as any,
        // Missing transactionId
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      await expect(service.recordPayment(cardDto)).rejects.toThrow(BadRequestException);
      await expect(service.recordPayment(cardDto)).rejects.toThrow(
        /Transaction ID is required for card/,
      );
    });

    it('should validate RAZORPAY_LINK payment requires order and payment IDs', async () => {
      const razorpayDto = {
        billingId: 'bill-1',
        amount: 1000,
        mode: 'RAZORPAY_LINK' as any,
        // Missing razorpayOrderId and razorpayPaymentId
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(mockBill as any);

      await expect(service.recordPayment(razorpayDto)).rejects.toThrow(BadRequestException);
      await expect(service.recordPayment(razorpayDto)).rejects.toThrow(
        /Razorpay order ID and payment ID are required/,
      );
    });

    it('should record UPI payment with transaction details', async () => {
      const upiDto = {
        billingId: 'bill-1',
        amount: 1000,
        mode: 'UPI' as any,
        transactionId: 'TXN123456',
        upiId: 'user@paytm',
        recordedBy: 'user-1',
      };

      const billWithVisit = {
        ...mockBill,
        visit: { patientId: 'patient-1' },
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(billWithVisit as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...mockPayment,
        mode: 'UPI',
        transactionId: 'TXN123456',
        upiId: 'user@paytm',
      } as any);
      jest.spyOn(prisma.billing, 'update').mockResolvedValue({
        ...mockBill,
        balance: 1444,
        status: 'PARTIAL',
      } as any);
      jest.spyOn(prisma.outstandingBill, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.outstandingBill, 'create').mockResolvedValue({} as any);

      const result = await service.recordPayment(upiDto);

      expect(result.payment.mode).toBe('UPI');
      expect(result.payment.transactionId).toBe('TXN123456');
      expect(result.payment.upiId).toBe('user@paytm');
    });

    it('should record CARD payment with card details', async () => {
      const cardDto = {
        billingId: 'bill-1',
        amount: 1000,
        mode: 'CARD' as any,
        transactionId: 'CARD123456',
        cardLast4: '1234',
        recordedBy: 'user-1',
      };

      const billWithVisit = {
        ...mockBill,
        visit: { patientId: 'patient-1' },
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(billWithVisit as any);
      jest.spyOn(prisma.payment, 'create').mockResolvedValue({
        ...mockPayment,
        mode: 'CARD',
        transactionId: 'CARD123456',
        cardLast4: '1234',
      } as any);
      jest.spyOn(prisma.billing, 'update').mockResolvedValue({
        ...mockBill,
        balance: 1444,
        status: 'PARTIAL',
      } as any);
      jest.spyOn(prisma.outstandingBill, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.outstandingBill, 'create').mockResolvedValue({} as any);

      const result = await service.recordPayment(cardDto);

      expect(result.payment.mode).toBe('CARD');
      expect(result.payment.cardLast4).toBe('1234');
    });
  });

  describe('getPaymentSummary', () => {
    it('should return payment summary with all payments', async () => {
      const billWithPayments = {
        ...mockBill,
        payments: [mockPayment],
      };

      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(billWithPayments as any);

      const result = await service.getPaymentSummary('bill-1');

      expect(result.billNumber).toBe('HMS/2024/0001');
      expect(result.billTotal).toBe(2444);
      expect(result.paidAmount).toBe(1000);
      expect(result.balance).toBe(2444);
      expect(result.payments).toHaveLength(1);
    });

    it('should throw NotFoundException if bill not found', async () => {
      jest.spyOn(prisma.billing, 'findUnique').mockResolvedValue(null);

      await expect(service.getPaymentSummary('invalid-bill')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPaymentsForBill', () => {
    it('should return all payments for a bill', async () => {
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([mockPayment] as any);

      const result = await service.getPaymentsForBill('bill-1');

      expect(result).toHaveLength(1);
      expect(result[0].billingId).toBe('bill-1');
    });

    it('should return empty array if no payments', async () => {
      jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([]);

      const result = await service.getPaymentsForBill('bill-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      jest.spyOn(prisma.payment, 'findUnique').mockResolvedValue(mockPayment as any);

      const result = await service.getPayment('payment-1');

      expect(result.id).toBe('payment-1');
      expect(result.amount).toBe(1000);
    });

    it('should throw NotFoundException if payment not found', async () => {
      jest.spyOn(prisma.payment, 'findUnique').mockResolvedValue(null);

      await expect(service.getPayment('invalid-payment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOutstandingBills', () => {
    it('should return all outstanding bills with patient details', async () => {
      const mockOutstanding = [
        {
          id: 'ob-1',
          billingId: 'bill-1',
          patientId: 'patient-1',
          outstandingAmount: 1444,
          dueDate: null,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-15'),
          billing: {
            id: 'bill-1',
            billNumber: 'HMS/2024/0001',
            visit: {
              patient: {
                name: 'John Doe',
                mobile: '9876543210',
              },
            },
          },
        },
      ];

      jest.spyOn(prisma.outstandingBill, 'findMany').mockResolvedValue(mockOutstanding as any);

      const result = await service.getOutstandingBills();

      expect(result).toHaveLength(1);
      expect(result[0].billNumber).toBe('HMS/2024/0001');
      expect(result[0].patientName).toBe('John Doe');
      expect(result[0].outstandingAmount).toBe(1444);
    });

    it('should return empty array if no outstanding bills', async () => {
      jest.spyOn(prisma.outstandingBill, 'findMany').mockResolvedValue([]);

      const result = await service.getOutstandingBills();

      expect(result).toHaveLength(0);
    });
  });
});
