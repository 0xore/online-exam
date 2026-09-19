import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createServerSupabaseClient() {
  // Wait for the request before reading env. Otherwise Next prerenders
  // /admin at build time and throws when Vercel env vars are not inlined yet.
  await connection();
  const cookieStore = await cookies();
  const env = requirePublicSupabaseEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. Middleware will
            // refresh the session in later stages.
          }
        },
      },
    },
  );
}
