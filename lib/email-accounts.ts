import "server-only";

export const IMAP_HOST = "ssl0.ovh.net";
export const IMAP_PORT = 993;
export const SMTP_HOST = "ssl0.ovh.net";
export const SMTP_PORT = 465;

const EMAIL_ACCOUNTS = [
  { id: "webmail", label: "Webmail", email: "webmail@snaac-group.com", passwordEnv: "SNAAC_EMAIL_WEBMAIL_PASS" },
  { id: "direction", label: "Direction", email: "direction@snaac-group.com", passwordEnv: "SNAAC_EMAIL_DIRECTION_PASS" },
  { id: "fournisseur", label: "Fournisseur", email: "fournisseur@snaac-group.com", passwordEnv: "SNAAC_EMAIL_FOURNISSEUR_PASS" },
  { id: "contact", label: "Contact", email: "contact@snaac-group.com", passwordEnv: "SNAAC_EMAIL_CONTACT_PASS" },
] as const;

export type EmailAccountInfo = { id: string; label: string; email: string };
export type EmailAccount = EmailAccountInfo & { pass: string };

// Version sans secret, seule forme autorisee a passer cote client.
export function listEmailAccounts(): EmailAccountInfo[] {
  return EMAIL_ACCOUNTS.map(({ id, label, email }) => ({ id, label, email }));
}

export function getEmailAccount(id: unknown): EmailAccount | null {
  const account = EMAIL_ACCOUNTS.find((candidate) => candidate.id === id);
  const pass = account && process.env[account.passwordEnv];
  if (!account || !pass) {
    return null;
  }
  return { id: account.id, label: account.label, email: account.email, pass };
}
