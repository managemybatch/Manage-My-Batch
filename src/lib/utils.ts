import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
}

export function formatWhatsAppPhone(phone: string) {
  const clean = phone.replace(/[^0-9]/g, '');
  // Bangladesh standard: 01xxxxxxxxx (11 digits)
  if (clean.length === 11 && clean.startsWith('0')) {
    return `88${clean}`;
  }
  return clean;
}
