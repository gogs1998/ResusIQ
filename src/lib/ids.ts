// Stable unique-id generation that also works on insecure origins.
//
// crypto.randomUUID() only exists in a secure context (https or localhost). The
// CLAUDE.md-documented `npx vite --host` LAN phone-testing flow serves over an
// INSECURE origin (http://192.168.x.x), where crypto.randomUUID is undefined —
// so calling it threw inside startEmergency on the very first tile tap. newId()
// prefers the native API and otherwise builds an RFC 4122 v4 UUID from
// crypto.getRandomValues, which IS present on insecure origins in every browser
// we target.
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return (
    `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-` +
    `${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`
  );
}
