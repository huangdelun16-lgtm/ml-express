import { adminAuthLock, adminSupabaseAuthOptions } from './adminSupabaseAuth';

describe('adminSupabaseAuthOptions', () => {
  it('does not persist or auto-refresh a Supabase Auth session', () => {
    expect(adminSupabaseAuthOptions.persistSession).toBe(false);
    expect(adminSupabaseAuthOptions.autoRefreshToken).toBe(false);
    expect(adminSupabaseAuthOptions.detectSessionInUrl).toBe(false);
    expect(adminSupabaseAuthOptions.storageKey).toBe('sb-admin-anon-unused');
  });

  it('lock helper just runs the callback so Navigator LockManager cannot reject', async () => {
    await expect(adminAuthLock('sb-admin-market-link-express-auth-token', 0, async () => 7)).resolves.toBe(
      7,
    );
  });
});
