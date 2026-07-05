// cryptoPolyfill.js
/*
  FILE: cryptoPolyfill.js
  LAYMAN (Tropang Ex): Sa plain HTTP (hindi HTTPS o localhost), may ilang browser API na
    "naka-lock" — kasama na dito ang crypto.randomUUID(). Kapag may library na tumawag nito
    sa ganung setup, nag-crash ang buong app ("crypto.randomUUID is not a function" sa
    bundled all.js). Itong file na 'to naglalagay ng pamalit (polyfill) para hindi na
    mag-crash kahit HTTP lang ang deployment (gaya ng CCSCloud VM natin).
  TECHNICAL: Side-effecting module (import for effect only — walang export). Installs an
    RFC-4122 v4 crypto.randomUUID onto the global crypto object ONLY when the engine exposes
    crypto.getRandomValues but not crypto.randomUUID (the insecure-origin case in some
    browsers). Native implementations are left untouched. MUST be imported FIRST in
    src/index.js so it runs before any dependency that may call crypto.randomUUID.
  OUTLINE:
    POLYFILL
      - (self-installing IIFE on import; no exports)
*/

(function installRandomUUIDPolyfill() {
  const c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
  if (!c || typeof c.getRandomValues !== 'function') return; // no CSPRNG to build on — bail
  if (typeof c.randomUUID === 'function') return;             // native impl present — leave it

  // Precompute 00..ff hex pairs so the hot path is just array lookups.
  const byteToHex = [];
  for (let i = 0; i < 256; i++) byteToHex.push((i + 0x100).toString(16).slice(1));

  c.randomUUID = function randomUUID() {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    // RFC 4122 §4.4: force version (4) and variant (10xx) bits.
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    return (
      byteToHex[b[0]] + byteToHex[b[1]] + byteToHex[b[2]] + byteToHex[b[3]] + '-' +
      byteToHex[b[4]] + byteToHex[b[5]] + '-' +
      byteToHex[b[6]] + byteToHex[b[7]] + '-' +
      byteToHex[b[8]] + byteToHex[b[9]] + '-' +
      byteToHex[b[10]] + byteToHex[b[11]] + byteToHex[b[12]] + byteToHex[b[13]] + byteToHex[b[14]] + byteToHex[b[15]]
    );
  };
})();
