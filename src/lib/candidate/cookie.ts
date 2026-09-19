import { cookies } from "next/headers";

function cookieName(slug: string) {
  return `oe_attempt_${slug}`;
}

function cookieOptions(slug: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: `/e/${slug}`,
  };
}

export async function getAttemptToken(slug: string) {
  const store = await cookies();
  return store.get(cookieName(slug))?.value ?? null;
}

export async function setAttemptToken(
  slug: string,
  token: string,
  maxAgeSeconds: number,
) {
  const store = await cookies();
  store.set(cookieName(slug), token, {
    ...cookieOptions(slug),
    maxAge: maxAgeSeconds,
  });
}

export async function clearAttemptToken(slug: string) {
  const store = await cookies();
  store.set(cookieName(slug), "", {
    ...cookieOptions(slug),
    maxAge: 0,
  });
}
