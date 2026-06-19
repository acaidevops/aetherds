import { randomUUID } from 'node:crypto';

/**
 * Domain event contract (ADR 0004).
 *
 * Modules communicate through application-service interfaces and domain events,
 * not direct cross-module table mutations. An event is a value object naming a
 * business fact; it carries tenant scope + correlation for observability.
 */

export interface DomainEvent<TType extends string = string> {
  readonly id: string;
  readonly type: TType;
  readonly occurredAt: string; // UTC ISO-8601
  readonly restaurantId: string;
  readonly locationId: string;
  readonly correlationId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface DomainEventEnvelope<TType extends string = string> {
  readonly id: string;
  readonly type: TType;
  readonly occurredAt: string;
  readonly restaurantId: string;
  readonly locationId: string;
  readonly correlationId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export function createDomainEvent<TType extends string>(input: {
  readonly type: TType;
  readonly restaurantId: string;
  readonly locationId: string;
  readonly correlationId: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}): DomainEvent<TType> {
  return {
    id: `evt_${randomUUID()}`,
    type: input.type,
    occurredAt: new Date().toISOString(),
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    correlationId: input.correlationId,
    payload: input.payload ?? {},
  };
}

/**
 * Typed in-process event bus for the modular monolith. Real distribution uses
 * Supabase Realtime invalidation + outbox jobs; this bus is the application-
 * layer seam so modules don't import each other directly.
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void> | void;
  subscribe<TType extends string>(
    type: TType,
    handler: (event: DomainEvent<TType>) => Promise<void> | void,
  ): () => void;
}

export function createInMemoryEventBus(): EventBus {
  const handlers = new Map<string, Set<(event: DomainEvent) => void>>();

  return {
    async publish(event) {
      const set = handlers.get(event.type);
      if (!set) return;
      await Promise.all([...set].map((h) => h(event)));
    },
    subscribe(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler as (event: DomainEvent) => void);
      return () => {
        set?.delete(handler as (event: DomainEvent) => void);
      };
    },
  };
}
