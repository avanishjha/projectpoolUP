/** The signed-in user's own profile row (RLS: self-read allowed on users). */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

export interface OwnProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  is_pro: boolean;
  is_creator: boolean;
  onboarded_at: string | null;
  referral_code: string;
}

export function useProfile() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<OwnProfile> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, xp, level, is_pro, is_creator, onboarded_at, referral_code')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as OwnProfile;
    },
  });
}
