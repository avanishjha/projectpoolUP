/** Account deletion RPCs (migration 0010). */
import { supabase } from '../../lib/supabase';

export async function fetchActivePoolCount(): Promise<number> {
  const { data, error } = await supabase.rpc('my_active_pool_count');
  if (error) throw error;
  return (data as number) ?? 0;
}

/** Soft-deletes the caller's account. Returns how many active pools persist. */
export async function requestAccountDeletion(): Promise<{ activePools: number }> {
  const { data, error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
  const result = data as { deleted: boolean; active_pools: number };
  return { activePools: result.active_pools ?? 0 };
}
