import { TaxCalculator, TaxBreakdown } from './tax-calculator';

describe('TaxCalculator', () => {
  let calculator: TaxCalculator;

  beforeEach(() => {
    calculator = new TaxCalculator();
  });

  describe('calculateInclusiveTax (Pharmacy MRP)', () => {
    it('should calculate tax from MRP that includes 12% GST', () => {
      // Test Case: Paracetamol 500mg MRP = ₹100
      // Expected: Base = ₹89.29, Tax = ₹10.71
      const mrp = 100;
      const taxRate = 0.12; // 12% GST for medicines

      const result = calculator.calculateInclusiveTax(mrp, taxRate);

      expect(result.baseAmount).toBeCloseTo(89.29, 2);
      expect(result.taxAmount).toBeCloseTo(10.71, 2);
      expect(result.total).toBe(mrp);
      expect(result.isTaxInclusive).toBe(true);
    });

    it('should calculate tax from MRP that includes 5% GST (essential medicines)', () => {
      // Test Case: Essential medicine MRP = ₹200
      // Expected: Base = ₹190.48, Tax = ₹9.52
      const mrp = 200;
      const taxRate = 0.05; // 5% GST for essential medicines

      const result = calculator.calculateInclusiveTax(mrp, taxRate);

      expect(result.baseAmount).toBeCloseTo(190.48, 2);
      expect(result.taxAmount).toBeCloseTo(9.52, 2);
      expect(result.total).toBe(mrp);
    });

    it('should handle zero tax rate (exempted items)', () => {
      const mrp = 150;
      const taxRate = 0;

      const result = calculator.calculateInclusiveTax(mrp, taxRate);

      expect(result.baseAmount).toBe(150);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(150);
    });
  });

  describe('calculateExclusiveTax (Lab Tests & Consultation)', () => {
    it('should calculate tax added on top of service price (18% GST)', () => {
      // Test Case: CBC Test price = ₹500
      // Expected: Base = ₹500, Tax = ₹90, Total = ₹590
      const price = 500;
      const taxRate = 0.18; // 18% GST for services

      const result = calculator.calculateExclusiveTax(price, taxRate);

      expect(result.baseAmount).toBe(500);
      expect(result.taxAmount).toBe(90);
      expect(result.total).toBe(590);
      expect(result.isTaxInclusive).toBe(false);
    });

    it('should calculate tax for consultation fee (18% GST)', () => {
      // Test Case: Doctor consultation = ₹300
      // Expected: Base = ₹300, Tax = ₹54, Total = ₹354
      const price = 300;
      const taxRate = 0.18;

      const result = calculator.calculateExclusiveTax(price, taxRate);

      expect(result.baseAmount).toBe(300);
      expect(result.taxAmount).toBe(54);
      expect(result.total).toBe(354);
    });

    it('should handle zero tax rate for exempted services', () => {
      const price = 1000;
      const taxRate = 0;

      const result = calculator.calculateExclusiveTax(price, taxRate);

      expect(result.baseAmount).toBe(1000);
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(1000);
    });
  });

  describe('generateTaxBreakdown (Mixed Bill)', () => {
    it('should generate correct breakdown for mixed items (medicines + lab tests)', () => {
      const items = [
        {
          description: 'Paracetamol 500mg',
          quantity: 15,
          unitPrice: 100, // MRP
          taxRate: 0.12,
          isTaxInclusive: true,
        },
        {
          description: 'CBC Test',
          quantity: 1,
          unitPrice: 500,
          taxRate: 0.18,
          isTaxInclusive: false,
        },
        {
          description: 'Consultation Fee',
          quantity: 1,
          unitPrice: 300,
          taxRate: 0.18,
          isTaxInclusive: false,
        },
      ];

      const breakdown = calculator.generateTaxBreakdown(items);

      // Paracetamol: 15 × ₹100 = ₹1500 (includes ₹160.71 tax)
      // CBC: 1 × ₹500 = ₹500 (+ ₹90 tax = ₹590)
      // Consultation: 1 × ₹300 = ₹300 (+ ₹54 tax = ₹354)

      expect(breakdown.subtotal).toBeCloseTo(2139.35, 1); // Sum of base amounts
      expect(breakdown.totalTax).toBeCloseTo(304.65, 1); // Sum of all taxes
      expect(breakdown.grandTotal).toBeCloseTo(2444, 1); // Final amount
      expect(breakdown.items).toHaveLength(3);
    });

    it('should handle bill with only medicines (all inclusive)', () => {
      const items = [
        {
          description: 'Medicine A',
          quantity: 10,
          unitPrice: 50,
          taxRate: 0.12,
          isTaxInclusive: true,
        },
        {
          description: 'Medicine B',
          quantity: 5,
          unitPrice: 200,
          taxRate: 0.12,
          isTaxInclusive: true,
        },
      ];

      const breakdown = calculator.generateTaxBreakdown(items);

      // Medicine A: 10 × ₹50 = ₹500 (includes ₹53.57 tax, base ₹446.43)
      // Medicine B: 5 × ₹200 = ₹1000 (includes ₹107.14 tax, base ₹892.86)

      expect(breakdown.subtotal).toBeCloseTo(1339.25, 1);
      expect(breakdown.totalTax).toBeCloseTo(160.75, 1);
      expect(breakdown.grandTotal).toBe(1500);
    });

    it('should handle bill with only services (all exclusive)', () => {
      const items = [
        {
          description: 'Blood Sugar Test',
          quantity: 1,
          unitPrice: 80,
          taxRate: 0.18,
          isTaxInclusive: false,
        },
        {
          description: 'Lipid Profile',
          quantity: 1,
          unitPrice: 600,
          taxRate: 0.18,
          isTaxInclusive: false,
        },
      ];

      const breakdown = calculator.generateTaxBreakdown(items);

      expect(breakdown.subtotal).toBe(680); // 80 + 600
      expect(breakdown.totalTax).toBeCloseTo(122.4, 2); // (80 + 600) × 0.18
      expect(breakdown.grandTotal).toBeCloseTo(802.4, 2);
    });
  });

  describe('splitGST (CGST + SGST)', () => {
    it('should split GST into CGST and SGST for intra-state', () => {
      const taxAmount = 100;

      const result = calculator.splitGST(taxAmount, false);

      expect(result.cgst).toBe(50);
      expect(result.sgst).toBe(50);
      expect(result.igst).toBe(0);
    });

    it('should use IGST for inter-state transactions', () => {
      const taxAmount = 100;

      const result = calculator.splitGST(taxAmount, true);

      expect(result.cgst).toBe(0);
      expect(result.sgst).toBe(0);
      expect(result.igst).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts without rounding errors', () => {
      const price = 0.5;
      const taxRate = 0.18;

      const result = calculator.calculateExclusiveTax(price, taxRate);

      expect(result.baseAmount).toBe(0.5);
      expect(result.taxAmount).toBeCloseTo(0.09, 2);
      expect(result.total).toBeCloseTo(0.59, 2);
    });

    it('should handle large amounts correctly', () => {
      const price = 100000;
      const taxRate = 0.18;

      const result = calculator.calculateExclusiveTax(price, taxRate);

      expect(result.baseAmount).toBe(100000);
      expect(result.taxAmount).toBe(18000);
      expect(result.total).toBe(118000);
    });

    it('should throw error for negative amounts', () => {
      expect(() => {
        calculator.calculateExclusiveTax(-100, 0.18);
      }).toThrow('Amount cannot be negative');
    });

    it('should throw error for invalid tax rate', () => {
      expect(() => {
        calculator.calculateExclusiveTax(100, -0.1);
      }).toThrow('Tax rate must be between 0 and 1');

      expect(() => {
        calculator.calculateExclusiveTax(100, 1.5);
      }).toThrow('Tax rate must be between 0 and 1');
    });
  });
});
