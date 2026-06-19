/**
 * Money value object.
 *
 * Per ADR (domain-model.md §5) and the engineering coding standards:
 * "Never use floating point for money." Money is stored as integer minor units
 * (cents) plus an ISO 4217 currency code. All arithmetic stays in minor units.
 */

export type CurrencyCode = 'USD';

export interface MoneyInput {
  /** Non-negative integer minor units (e.g. cents). */
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export interface MoneyShape {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

const CURRENCY_DECIMALS: Readonly<Record<CurrencyCode, number>> = {
  USD: 2,
};

/**
 * Guard arithmetic results against silent loss of precision. Once a minor-unit
 * total exceeds Number.MAX_SAFE_INTEGER, integer math stops being exact and
 * money would corrupt without throwing. Fail loudly instead.
 */
function assertSafeMinor(amountMinor: number, op: string): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(`Money ${op} overflowed the safe integer range (got ${amountMinor}).`);
  }
  return amountMinor;
}

/**
 * Convert a decimal value to integer minor units WITHOUT binary floating-point
 * rounding error. Strings are parsed digit-by-digit; numbers are routed through
 * their string form first. Rounds half-up on the first digit beyond the
 * currency precision and rejects non-numeric or unsafe-integer results.
 *
 * This avoids the classic 1.005 → 100 trap: `Number('1.005') * 100` is
 * 100.49999... and `Math.round` yields 100 instead of the correct 101.
 */
function decimalToMinorUnits(value: number | string, decimals: number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RangeError(`Cannot create Money from non-finite value: ${value}`);
    }
    return decimalToMinorUnits(String(value), decimals);
  }

  const trimmed = value.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') {
    throw new RangeError(`Cannot create Money from invalid decimal: '${value}'`);
  }

  const dot = trimmed.indexOf('.');
  const intPart = (dot === -1 ? trimmed : trimmed.slice(0, dot)) || '0';
  const fracPart = dot === -1 ? '' : trimmed.slice(dot + 1);

  const intUnits = Number.parseInt(intPart, 10) * 10 ** decimals;
  const keptFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  const fracUnits = Number.parseInt(keptFrac, 10) || 0;
  const firstDropped = fracPart.charAt(decimals);

  let amountMinor = intUnits + fracUnits;
  if (firstDropped >= '5') {
    amountMinor += 1;
  }

  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError(`Decimal '${value}' is out of safe integer minor-unit range.`);
  }
  return amountMinor;
}

/**
 * Immutable money value object. Construct via {@link Money.fromMinor} or
 * {@link Money.fromDecimal}. Combine via {@link Money.add} / {@link Money.sum}.
 */
export class Money implements MoneyShape {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;

  private constructor(amountMinor: number, currency: CurrencyCode) {
    this.amountMinor = amountMinor;
    this.currency = currency;
  }

  /** Create from integer minor units. Validates the amount is a safe integer. */
  static fromMinor(input: MoneyInput): Money {
    if (!Number.isInteger(input.amountMinor)) {
      throw new RangeError(
        `amountMinor must be an integer (got ${input.amountMinor}). Money never uses floating point.`,
      );
    }
    if (input.amountMinor < 0) {
      throw new RangeError(`amountMinor must be non-negative (got ${input.amountMinor}).`);
    }
    return new Money(input.amountMinor, input.currency);
  }

  /**
   * Create from a decimal string/number (e.g. "12.34"). Rounds half-up to the
   * currency's minor-unit precision and validates the result is integer-safe.
   */
  static fromDecimal(value: number | string, currency: CurrencyCode): Money {
    const amountMinor = decimalToMinorUnits(value, CURRENCY_DECIMALS[currency]);
    return Money.fromMinor({ amountMinor, currency });
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(assertSafeMinor(this.amountMinor + other.amountMinor, 'add'), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor({
      amountMinor: this.amountMinor - other.amountMinor,
      currency: this.currency,
    });
  }

  multiply(quantity: number): Money {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new RangeError(`multiply expects a non-negative integer quantity (got ${quantity}).`);
    }
    return new Money(assertSafeMinor(this.amountMinor * quantity, 'multiply'), this.currency);
  }

  equals(other: Money): boolean {
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  /** Sum a list of same-currency money values. Empty list yields zero. */
  static sum(values: readonly Money[], currency: CurrencyCode): Money {
    return values.reduce<Money>((acc, m) => {
      if (m.currency !== currency) {
        throw new TypeError(`Currency mismatch in sum: expected ${currency}, got ${m.currency}.`);
      }
      return acc.add(m);
    }, Money.zero(currency));
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new TypeError(`Currency mismatch: ${this.currency} vs ${other.currency}.`);
    }
  }

  toJSON(): MoneyShape {
    return { amountMinor: this.amountMinor, currency: this.currency };
  }
}
