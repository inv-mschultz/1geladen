import { cookies } from 'next/headers'

export const VIEW_AS_COOKIE = '1geladen-viewas'

/** True when an admin has switched to "view as guest" (bugfixing preview). */
export async function getViewAsGuest(): Promise<boolean> {
  const store = await cookies()
  return store.get(VIEW_AS_COOKIE)?.value === 'guest'
}
