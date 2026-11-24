import { requireSupabase } from './supabaseClient';

export const authService = {
  async signIn(email: string, password: string) {
    const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error('Sign-in failed. Check your credentials and try again.');
  },

  async signOut(scope: 'local' | 'global' = 'local') {
    const { error } = await requireSupabase().auth.signOut({ scope });
    if (error) throw error;
  },

  async requestPasswordReset(email: string, redirectTo: string) {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) throw new Error('Unable to request a password link. Try again later.');
  },
};
