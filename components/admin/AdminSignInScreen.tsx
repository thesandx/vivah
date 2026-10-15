import { cookies } from 'next/headers';

import { AdminSignIn } from '@/components/admin/AdminSignIn';
import { AppBar } from '@/components/layout/AppBar';
import { ADMIN_COOKIE_NAME } from '@/lib/admin-cookie';
import { env } from '@/lib/env';
import { hasPendingAdminSignIn } from '@/services/admin-session.service';

/**
 * What `/admin` and its sub-pages show without an admin session: the
 * two-step sign-in. A browser that already passed the Google step resumes at
 * the OTP. An async Server Component.
 */
export async function AdminSignInScreen() {
  const store = await cookies();
  const pending = await hasPendingAdminSignIn(store.get(ADMIN_COOKIE_NAME)?.value);

  return (
    <>
      <AppBar title="Admin sign-in" />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <AdminSignIn pendingPhoneE164={pending ? env.adminPhone : null} />
      </main>
    </>
  );
}
