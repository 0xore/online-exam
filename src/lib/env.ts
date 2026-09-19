import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
});

const serverEnvSchema = publicEnvSchema.extend({
  // Unused by the app. Kept so operators are not tempted to invent a second name.
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    ...getPublicEnv(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });
}

export function isSupabaseConfigured() {
  const env = getPublicEnv();
  return (
    env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://") &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}

export function requirePublicSupabaseEnv() {
  const env = getPublicEnv();

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local or in Vercel → Settings → Environment Variables.",
    );
  }

  return env;
}
