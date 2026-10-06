/** Pool creation + the current user's pools list. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { draftToInsert, type PoolDraft } from './draft';
import type { PoolRow } from './usePools';

export interface CreatedPool {
  id: string;
  invite_code: string;
  name: string;
}

function isAuthError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42501' || /jwt|token|row-level security|not authenticated/i.test(error.message ?? '');
}

export function useCreatePool() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: PoolDraft): Promise<CreatedPool> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) throw new Error('not authenticated');

      // Create via the SECURITY DEFINER RPC — inserts + returns the invite
      // code without an RLS select-back (which the creator can't pass on an
      // uncommitted row). See migration 0012.
      const call = () => supabase.rpc('create_pool', { p: draftToInsert(draft, uid) });

      let { data, error } = await call();
      if (isAuthError(error)) {
        await supabase.auth.refreshSession();
        ({ data, error } = await call());
      }
      if (error) throw error;
      return data as CreatedPool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pools', userId] });
    },
  });
}

export type { PoolRow };
