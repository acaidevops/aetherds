import { describe, expect, it, vi } from 'vitest';

import { createDomainEvent, createInMemoryEventBus, type DomainEvent } from '@/shared/events';

describe('createDomainEvent', () => {
  it('builds a tenant-scoped, correlated event value object', () => {
    const event = createDomainEvent({
      type: 'cart.item.added',
      restaurantId: 'r1',
      locationId: 'l1',
      correlationId: 'corr_1',
      payload: { itemId: 'i1' },
    });

    expect(event.id.startsWith('evt_')).toBe(true);
    expect(event.type).toBe('cart.item.added');
    expect(event.restaurantId).toBe('r1');
    expect(event.locationId).toBe('l1');
    expect(event.correlationId).toBe('corr_1');
    expect(event.payload).toEqual({ itemId: 'i1' });
    expect(Number.isNaN(new Date(event.occurredAt).getTime())).toBe(false);
  });

  it('defaults payload to an empty record', () => {
    const event = createDomainEvent({
      type: 't',
      restaurantId: 'r1',
      locationId: 'l1',
      correlationId: 'corr_1',
    });
    expect(event.payload).toEqual({});
  });
});

describe('in-memory event bus', () => {
  it('delivers a published event to subscribed handlers', async () => {
    const bus = createInMemoryEventBus();
    const handler = vi.fn();

    bus.subscribe('cart.item.added', handler);
    const event: DomainEvent<'cart.item.added'> = {
      id: 'evt_1',
      type: 'cart.item.added',
      occurredAt: '2026-01-01T00:00:00.000Z',
      restaurantId: 'r1',
      locationId: 'l1',
      correlationId: 'corr_1',
      payload: {},
    };
    await bus.publish(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it('does not deliver events of an unrelated type', async () => {
    const bus = createInMemoryEventBus();
    const handler = vi.fn();

    bus.subscribe('cart.item.added', handler);
    await bus.publish({
      id: 'evt_2',
      type: 'session.closed',
      occurredAt: '2026-01-01T00:00:00.000Z',
      restaurantId: 'r1',
      locationId: 'l1',
      correlationId: 'corr_1',
      payload: {},
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('unsubscribe stops further delivery', async () => {
    const bus = createInMemoryEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe('cart.item.added', handler);
    unsubscribe();

    await bus.publish({
      id: 'evt_3',
      type: 'cart.item.added',
      occurredAt: '2026-01-01T00:00:00.000Z',
      restaurantId: 'r1',
      locationId: 'l1',
      correlationId: 'corr_1',
      payload: {},
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('publishing with no subscribers is a no-op', async () => {
    const bus = createInMemoryEventBus();
    await expect(
      bus.publish({
        id: 'evt_4',
        type: 'unhandled',
        occurredAt: '2026-01-01T00:00:00.000Z',
        restaurantId: 'r1',
        locationId: 'l1',
        correlationId: 'corr_1',
        payload: {},
      }),
    ).resolves.toBeUndefined();
  });
});
