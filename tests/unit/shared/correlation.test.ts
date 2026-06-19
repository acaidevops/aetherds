import { describe, expect, it, vi } from 'vitest';

import {
  CORRELATION_HEADER,
  isValidCorrelationId,
  log,
  newCorrelationId,
  resolveCorrelationId,
} from '@/shared/observability';

const VALID = 'corr_00000000-0000-4000-8000-000000000000';
const BARE_UUID = '00000000-0000-4000-8000-000000000000';

describe('correlation', () => {
  it('exposes the contract header name', () => {
    expect(CORRELATION_HEADER).toBe('x-correlation-id');
  });

  describe('newCorrelationId', () => {
    it('mints a corr_-prefixed uuid', () => {
      const id = newCorrelationId();
      expect(id.startsWith('corr_')).toBe(true);
      expect(isValidCorrelationId(id)).toBe(true);
    });

    it('is unique across calls', () => {
      expect(newCorrelationId()).not.toBe(newCorrelationId());
    });
  });

  describe('isValidCorrelationId', () => {
    it('accepts the corr_ uuid form', () => {
      expect(isValidCorrelationId(VALID)).toBe(true);
    });

    it('accepts a bare uuid for resilience', () => {
      expect(isValidCorrelationId(BARE_UUID)).toBe(true);
    });

    it('rejects malformed values', () => {
      expect(isValidCorrelationId('not-a-corr-id')).toBe(false);
      expect(isValidCorrelationId('')).toBe(false);
      expect(isValidCorrelationId('corr_not-a-uuid')).toBe(false);
    });
  });

  describe('resolveCorrelationId', () => {
    it('passes through a valid header value', () => {
      expect(resolveCorrelationId(VALID)).toBe(VALID);
    });

    it('mints a new id when the header is invalid', () => {
      const resolved = resolveCorrelationId('garbage');
      expect(resolved).not.toBe('garbage');
      expect(isValidCorrelationId(resolved)).toBe(true);
    });

    it('mints a new id when the header is absent', () => {
      expect(isValidCorrelationId(resolveCorrelationId(null))).toBe(true);
      expect(isValidCorrelationId(resolveCorrelationId(undefined))).toBe(true);
    });
  });
});

describe('log', () => {
  // tests/setup.ts pins LOG_LEVEL to 'warn'.

  it('drops entries below the configured level', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    log({ level: 'debug', message: 'noisy' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('emits entries at or above the configured level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    log({ level: 'error', message: 'boom' });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
