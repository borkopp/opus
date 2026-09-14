// Deliberately a single account, never an organization role or client argument.
export const OWNER_EMAIL = "borko.petrevski@gmail.com";

export function isOwnerEmail(email: unknown): boolean {
  return (
    typeof email === "string" && email.trim().toLowerCase() === OWNER_EMAIL
  );
}
