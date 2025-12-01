import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getStockIndicator(status: string): { emoji: string; color: string; label: string } {
  switch (status) {
    case 'IN_STOCK':
      return { emoji: '🟢', color: 'text-green-600', label: 'In Stock' };
    case 'LOW_STOCK':
      return { emoji: '🟡', color: 'text-yellow-600', label: 'Low Stock' };
    case 'OUT_OF_STOCK':
      return { emoji: '🔴', color: 'text-red-600', label: 'Out of Stock' };
    default:
      return { emoji: '⚪', color: 'text-gray-600', label: 'Unknown' };
  }
}
