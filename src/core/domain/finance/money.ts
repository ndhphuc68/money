const VND_SUFFIX = ' ₫';
const THOUSANDS_SEPARATOR_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Formats an integer VND amount deterministically as "1.234.567 ₫".
 * VND has no fractional subunit in everyday use, so only integers are accepted.
 */
export function formatVnd(amount: number): string {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    throw new Error('formatVnd requires an integer amount');
  }

  const isNegative = amount < 0;
  const digits = Math.abs(amount).toString();
  const grouped = digits.replace(THOUSANDS_SEPARATOR_PATTERN, '.');

  return `${isNegative ? '-' : ''}${grouped}${VND_SUFFIX}`;
}

/**
 * Parses free-form VND input (e.g. "1.234.567 ₫", "1,234,567", "50000") into
 * an integer number of VND. Returns null when no digits are present.
 * Never performs floating-point arithmetic: the result is built from the
 * digit characters directly.
 */
export function parseVndInput(value: string): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const isNegative = trimmed.startsWith('-');
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');
  if (digitsOnly === '') {
    return null;
  }

  const normalizedDigits = digitsOnly.replace(/^0+(?=\d)/, '');
  const magnitude = Number.parseInt(normalizedDigits, 10);
  if (!Number.isSafeInteger(magnitude)) {
    return null;
  }

  return isNegative ? -magnitude : magnitude;
}
