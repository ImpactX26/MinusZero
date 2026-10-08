/**
 * Safe UUID v4 generator that works in both Secure and Insecure contexts
 * (HTTP over LAN IP on physical phones, Android Chrome, mobile Safari, desktop).
 *
 * In modern web browsers, window.crypto.randomUUID is restricted to Secure Contexts (HTTPS & localhost).
 * When accessed over plain HTTP via LAN IP (e.g., http://172.16.2.56:5173), crypto.randomUUID is undefined.
 * This utility provides a secure, RFC4122 compliant fallback and global polyfill.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to getRandomValues if invocation fails
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40; // Version 4
      buf[8] = (buf[8] & 0x3f) | 0x80; // Variant 10
      const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    } catch {
      // Fall through to Math.random
    }
  }

  // Math.random fallback (RFC4122 v4 format)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Auto-polyfill window.crypto.randomUUID if absent (e.g., non-HTTPS LAN contexts)
if (typeof window !== 'undefined' && typeof window.crypto !== 'undefined') {
  if (typeof window.crypto.randomUUID !== 'function') {
    try {
      Object.defineProperty(window.crypto, 'randomUUID', {
        value: generateUUID,
        writable: true,
        configurable: true,
      });
    } catch {
      (window.crypto as any).randomUUID = generateUUID;
    }
  }
}
