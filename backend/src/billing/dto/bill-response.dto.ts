/**
 * Response DTOs for billing operations
 */

export class BillItemResponse {
  id: string;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isTaxInclusive: boolean;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export class BillResponse {
  id: string;
  visitId: string;
  billNumber: string;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  balance: number;
  status: string;
  generatedAt: Date;
  items: BillItemResponse[];
}

export class UnbilledItem {
  itemType: 'CONSULTATION' | 'MEDICINE' | 'LAB_TEST';
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  isTaxInclusive: boolean;
  taxRate: number;
}

export class BillPreview {
  items: UnbilledItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
}
