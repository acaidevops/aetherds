import { describe, expect, it } from 'vitest';

import { Money } from '@/shared/money';

describe('Money', () => {
  describe('fromMinor', () => {
    it('constructs from non-negative integer minor units', () => {
      const m = Money.fromMinor({ amountMinor: 1234, currency: 'USD' });
      expect(m.amountMinor).toBe(1234);
      expect(m.currency).toBe('USD');
    });

    it('rejects non-integer amounts', () => {
      expect(() => Money.fromMinor({ amountMinor: 12.5, currency: 'USD' })).toThrow(RangeError);
    });

    it('rejects negative amounts', () => {
      expect(() => Money.fromMinor({ amountMinor: -1, currency: 'USD' })).toThrow(RangeError);
    });
  });

  describe('fromDecimal', () => {
    it('converts a decimal string to minor units', () => {
      expect(Money.fromDecimal('12.34', 'USD').amountMinor).toBe(1234);
      expect(Money.fromDecimal('99.99', 'USD').amountMinor).toBe(9999);
    });

    it('rounds half-up without binary floating-point error', () => {
      // 1.005 must round to 101, not 100 (Number('1.005') * 100 gives 100.4999...).
      expect(Money.fromDecimal('1.005', 'USD').amountMinor).toBe(101);
      expect(Money.fromDecimal('12.345', 'USD').amountMinor).toBe(1235);
      expect(Money.fromDecimal('12.344', 'USD').amountMinor).toBe(1234);
    });

    it('accepts a number', () => {
      expect(Money.fromDecimal(10, 'USD').amountMinor).toBe(1000);
    });

    it('rejects non-finite values', () => {
      expect(() => Money.fromDecimal('abc', 'USD')).toThrow(RangeError);
      expect(() => Money.fromDecimal(Number.NaN, 'USD')).toThrow(RangeError);
    });
  });

  it('zero is zero minor units', () => {
    expect(Money.zero('USD').amountMinor).toBe(0);
  });

  describe('arithmetic', () => {
    it('adds same-currency values', () => {
      const total = Money.fromMinor({ amountMinor: 100, currency: 'USD' }).add(
        Money.fromMinor({ amountMinor: 50, currency: 'USD' }),
      );
      expect(total.amountMinor).toBe(150);
    });

    it('subtracts and never goes negative-safe via fromMinor validation', () => {
      const diff = Money.fromMinor({ amountMinor: 100, currency: 'USD' }).subtract(
        Money.fromMinor({ amountMinor: 30, currency: 'USD' }),
      );
      expect(diff.amountMinor).toBe(70);
    });

    it('multiplies by a non-negative integer quantity', () => {
      expect(Money.fromMinor({ amountMinor: 250, currency: 'USD' }).multiply(4).amountMinor).toBe(
        1000,
      );
    });

    it('rejects negative or non-integer quantities', () => {
      expect(() => Money.fromMinor({ amountMinor: 1, currency: 'USD' }).multiply(-1)).toThrow(
        RangeError,
      );
      expect(() => Money.fromMinor({ amountMinor: 1, currency: 'USD' }).multiply(1.5)).toThrow(
        RangeError,
      );
    });

    it('compares by amount and currency', () => {
      const a = Money.fromMinor({ amountMinor: 1, currency: 'USD' });
      expect(a.equals(Money.fromMinor({ amountMinor: 1, currency: 'USD' }))).toBe(true);
      expect(a.equals(Money.fromMinor({ amountMinor: 2, currency: 'USD' }))).toBe(false);
    });
  });

  describe('sum', () => {
    it('sums a same-currency list', () => {
      const total = Money.sum(
        [
          Money.fromMinor({ amountMinor: 100, currency: 'USD' }),
          Money.fromMinor({ amountMinor: 200, currency: 'USD' }),
        ],
        'USD',
      );
      expect(total.amountMinor).toBe(300);
    });

    it('empty list yields zero', () => {
      expect(Money.sum([], 'USD').amountMinor).toBe(0);
    });
  });

  it('serializes to the contract shape', () => {
    expect(Money.fromMinor({ amountMinor: 5, currency: 'USD' }).toJSON()).toEqual({
      amountMinor: 5,
      currency: 'USD',
    });
  });
});
