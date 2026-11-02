import "server-only";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type AttemptWindow = { count: number; resetAt: number };

// Propre a chaque instance serverless : remis a zero au demarrage d'une nouvelle instance.
const attempts = new Map<string, AttemptWindow>();

function removeExpired(now: number) {
  for (const [ip, attempt] of attempts) {
    if (attempt.resetAt <= now) attempts.delete(ip);
  }
}

// Compte la tentative avant la verification du mot de passe : des requetes
// paralleles ne peuvent pas passer entre le controle et l'enregistrement de l'echec.
export function registerLoginAttempt(ip: string) {
  const now = Date.now();
  removeExpired(now);

  const attempt = attempts.get(ip);
  if (!attempt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((attempt.resetAt - now) / 1000) };
  }
  attempt.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginAttempts(ip: string) {
  attempts.delete(ip);
}
