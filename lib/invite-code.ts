export function newInviteCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}
