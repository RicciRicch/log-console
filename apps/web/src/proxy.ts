import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

// Next.js 16: proxy.ts (ranije middleware.ts). Zaštita ruta dolazi u feat/F01-login.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
