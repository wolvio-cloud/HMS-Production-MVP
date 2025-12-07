/**
 * Tax Calculator for India GST Compliance
 *
 * Handles two types of tax calculations:
 * 1. Inclusive Tax (Pharmacy MRP) - Tax is already included in price
 * 2. Exclusive Tax (Services) - Tax is added on top of price
 *
 * GST Rates in India (Healthcare):
 * - Essential medicines: 5%
 * - General medicines: 12%
 * - Healthcare services (Lab, Consultation): 18%
 * - Some exempted items: 0%
 */

export interface TaxBreakdown {
  baseAmount: number;    // Amount before tax
  taxAmount: number;     // Tax amount
  total: number;         // Final amount (base + tax for exclusive, = MRP for inclusive)
  isTaxInclusive: boolean;
  taxRate: number;       // Tax rate as decimal (0.12 = 12%)
}

export interface BillItemInput {
  description: string;
  quantity: number;
  unitPrice: number;     // MRP for medicines, base price for services
  taxRate: number;       // 0.05, 0.12, 0.18
  isTaxInclusive: boolean;
}

export interface BillItemBreakdown extends BillItemInput {
  amount: number;        // quantity × unitPrice
  baseAmount: number;    // Taxable amount
  taxAmount: number;     // Tax on this item
  lineTotal: number;     // Final line total
}

export interface CompleteTaxBreakdown {
  items: BillItemBreakdown[];
  subtotal: number;      // Sum of all base amounts
  totalTax: number;      // Sum of all taxes
  grandTotal: number;    // Final bill amount
}

export interface GSTSplit {
  cgst: number;  // Central GST (intra-state)
  sgst: number;  // State GST (intra-state)
  igst: number;  // Integrated GST (inter-state)
}

export class TaxCalculator {
  /**
   * Calculate tax from MRP that already includes tax (Pharmacy)
   *
   * Formula: Base = MRP / (1 + taxRate)
   *          Tax = MRP - Base
   *
   * Example: MRP = ₹100, GST = 12%
   *          Base = 100 / 1.12 = ₹89.29
   *          Tax = 100 - 89.29 = ₹10.71
   */
  calculateInclusiveTax(mrp: number, taxRate: number): TaxBreakdown {
    this.validateInputs(mrp, taxRate);

    if (taxRate === 0) {
      return {
        baseAmount: mrp,
        taxAmount: 0,
        total: mrp,
        isTaxInclusive: true,
        taxRate: 0,
      };
    }

    // Reverse calculate base amount
    const baseAmount = mrp / (1 + taxRate);
    const taxAmount = mrp - baseAmount;

    return {
      baseAmount: this.roundToTwoDecimals(baseAmount),
      taxAmount: this.roundToTwoDecimals(taxAmount),
      total: mrp,
      isTaxInclusive: true,
      taxRate,
    };
  }

  /**
   * Calculate tax added on top of base price (Lab Tests, Consultation)
   *
   * Formula: Tax = basePrice × taxRate
   *          Total = basePrice + Tax
   *
   * Example: CBC Test = ₹500, GST = 18%
   *          Tax = 500 × 0.18 = ₹90
   *          Total = 500 + 90 = ₹590
   */
  calculateExclusiveTax(basePrice: number, taxRate: number): TaxBreakdown {
    this.validateInputs(basePrice, taxRate);

    const taxAmount = basePrice * taxRate;
    const total = basePrice + taxAmount;

    return {
      baseAmount: basePrice,
      taxAmount: this.roundToTwoDecimals(taxAmount),
      total: this.roundToTwoDecimals(total),
      isTaxInclusive: false,
      taxRate,
    };
  }

  /**
   * Generate complete tax breakdown for a bill with multiple items
   */
  generateTaxBreakdown(items: BillItemInput[]): CompleteTaxBreakdown {
    const processedItems: BillItemBreakdown[] = [];
    let subtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;

    for (const item of items) {
      const amount = item.quantity * item.unitPrice;

      // Calculate tax based on type
      const taxCalc = item.isTaxInclusive
        ? this.calculateInclusiveTax(item.unitPrice, item.taxRate)
        : this.calculateExclusiveTax(item.unitPrice, item.taxRate);

      // Calculate totals for this line item
      const baseAmount = taxCalc.baseAmount * item.quantity;
      const taxAmount = taxCalc.taxAmount * item.quantity;
      const lineTotal = item.isTaxInclusive
        ? amount // For inclusive, lineTotal = quantity × MRP
        : baseAmount + taxAmount; // For exclusive, lineTotal = base + tax

      processedItems.push({
        ...item,
        amount,
        baseAmount: this.roundToTwoDecimals(baseAmount),
        taxAmount: this.roundToTwoDecimals(taxAmount),
        lineTotal: this.roundToTwoDecimals(lineTotal),
      });

      subtotal += baseAmount;
      totalTax += taxAmount;
      grandTotal += lineTotal;
    }

    return {
      items: processedItems,
      subtotal: this.roundToTwoDecimals(subtotal),
      totalTax: this.roundToTwoDecimals(totalTax),
      grandTotal: this.roundToTwoDecimals(grandTotal),
    };
  }

  /**
   * Split GST into CGST + SGST (intra-state) or IGST (inter-state)
   *
   * Intra-state (same state): CGST 50% + SGST 50%
   * Inter-state (different states): IGST 100%
   */
  splitGST(taxAmount: number, isInterState: boolean): GSTSplit {
    if (isInterState) {
      // Inter-state: All tax goes to IGST
      return {
        cgst: 0,
        sgst: 0,
        igst: taxAmount,
      };
    } else {
      // Intra-state: Split 50-50 between CGST and SGST
      const halfTax = taxAmount / 2;
      return {
        cgst: this.roundToTwoDecimals(halfTax),
        sgst: this.roundToTwoDecimals(halfTax),
        igst: 0,
      };
    }
  }

  /**
   * Get standard GST rates for different item types
   */
  static getStandardGSTRate(itemType: 'ESSENTIAL_MEDICINE' | 'MEDICINE' | 'SERVICE'): number {
    switch (itemType) {
      case 'ESSENTIAL_MEDICINE':
        return 0.05; // 5% GST
      case 'MEDICINE':
        return 0.12; // 12% GST
      case 'SERVICE':
        return 0.18; // 18% GST for healthcare services
      default:
        return 0.18;
    }
  }

  // Private helper methods

  private validateInputs(amount: number, taxRate: number): void {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (taxRate < 0 || taxRate > 1) {
      throw new Error('Tax rate must be between 0 and 1');
    }
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * Utility function to format currency for India
 */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Example usage:
 *
 * const calculator = new TaxCalculator();
 *
 * // Pharmacy MRP
 * const medTax = calculator.calculateInclusiveTax(100, 0.12);
 * console.log(medTax); // { baseAmount: 89.29, taxAmount: 10.71, total: 100 }
 *
 * // Lab Test
 * const labTax = calculator.calculateExclusiveTax(500, 0.18);
 * console.log(labTax); // { baseAmount: 500, taxAmount: 90, total: 590 }
 *
 * // Mixed Bill
 * const items = [
 *   { description: 'Paracetamol', quantity: 10, unitPrice: 100, taxRate: 0.12, isTaxInclusive: true },
 *   { description: 'CBC Test', quantity: 1, unitPrice: 500, taxRate: 0.18, isTaxInclusive: false },
 * ];
 * const breakdown = calculator.generateTaxBreakdown(items);
 */
