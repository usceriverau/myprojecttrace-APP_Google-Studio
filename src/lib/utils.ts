/**
 * MyProjectTrace Utility Functions
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || isNaN(ratio)) {
    return '0.0%';
  }
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function generateId(prefix: string = 'id'): string {
  const randomStr = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${randomStr}`;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
