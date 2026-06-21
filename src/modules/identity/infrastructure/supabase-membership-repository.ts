import 'server-only';

import { getServerSupabaseClient, type ServerSupabaseClient } from '@/shared/db';
import type { TenantScope } from '@/shared/auth';

import type { Membership, StaffRole, AccountStatus } from '../domain/membership';
import type { MembershipRepository } from '../application/ports';

/**
 * Supabase-backed MembershipRepository.
 *
 * The server client uses the service-role identity, which BYPASSES RLS, so this
 * repository filters explicitly by user and scope and only ever reads `active`
 * rows. Database RLS (ADR 0010) remains the defense-in-depth backstop for the
 * authenticated-client path; server services additionally never widen scope
 * from client input because the scope arrives from an already-resolved
 * principal.
 */
interface MembershipRow {
  readonly id: string;
  readonly user_id: string;
  readonly restaurant_id: string;
  readonly location_id: string;
  readonly role: StaffRole;
  readonly status: AccountStatus;
}

function toMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    locationId: row.location_id,
    role: row.role,
    status: row.status,
  };
}

export class SupabaseMembershipRepository implements MembershipRepository {
  private readonly client: ServerSupabaseClient;

  constructor(client: ServerSupabaseClient = getServerSupabaseClient()) {
    this.client = client;
  }

  async findActiveMembership(userId: string, scope: TenantScope): Promise<Membership | null> {
    const { data, error } = await this.client
      .from('memberships')
      .select('id, user_id, restaurant_id, location_id, role, status')
      .eq('user_id', userId)
      .eq('restaurant_id', scope.restaurantId)
      .eq('location_id', scope.locationId)
      .eq('status', 'active')
      .maybeSingle<MembershipRow>();

    if (error) {
      throw new Error(`Failed to load membership: ${error.message}`);
    }
    return data ? toMembership(data) : null;
  }

  async listActiveMemberships(userId: string): Promise<readonly Membership[]> {
    const { data, error } = await this.client
      .from('memberships')
      .select('id, user_id, restaurant_id, location_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .returns<MembershipRow[]>();

    if (error) {
      throw new Error(`Failed to list memberships: ${error.message}`);
    }
    return (data ?? []).map(toMembership);
  }
}
