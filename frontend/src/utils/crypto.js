/**
 * Document ID encryption & decryption utility for AdyaGo.
 * Produces URL-safe encrypted tokens for document IDs (e.g. /create-pr?documentID=xxx).
 */

const SECRET = 'FactoryHub_iDempiere_PR_SecKey_2026';

// FNV-1a 32-bit hash for tamper verification
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// RC4 symmetric stream cipher
function rc4(key, str) {
  const s = [];
  for (let i = 0; i < 256; i++) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    [s[i], s[j]] = [s[j], s[i]];
  }
  let i = 0;
  j = 0;
  let res = '';
  for (let k = 0; k < str.length; k++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    const byte = str.charCodeAt(k) ^ s[(s[i] + s[j]) % 256];
    res += String.fromCharCode(byte);
  }
  return res;
}

// URL-safe Base64 encoder
function toBase64Url(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// URL-safe Base64 decoder
function fromBase64Url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Encrypt a numeric or string ID into a URL-safe token.
 * E.g. 1000123 -> "qX7zK9aB1mP"
 */
export function encryptDocumentId(id) {
  if (id === null || id === undefined || id === '') return '';
  if (String(id).toLowerCase() === 'new') return 'new';

  const idStr = String(id).trim();
  const salt = Math.random().toString(36).substring(2, 6);
  const checksum = fnv1a(`${salt}:${idStr}:${SECRET}`).substring(0, 6);
  const plaintext = `${salt}:${idStr}:${checksum}`;

  const cipher = rc4(SECRET, plaintext);
  return toBase64Url(cipher);
}

/**
 * Decrypt a URL-safe token back to an integer ID or 'new'.
 * Returns null if invalid or tampered.
 */
export function decryptDocumentId(token) {
  if (!token) return null;
  const trimmed = String(token).trim();
  if (trimmed.toLowerCase() === 'new') return 'new';

  // Support direct numeric ID as fallback
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  try {
    const raw = fromBase64Url(trimmed);
    const decrypted = rc4(SECRET, raw);
    const parts = decrypted.split(':');
    if (parts.length !== 3) return null;

    const [salt, idStr, checksum] = parts;
    const expectedChecksum = fnv1a(`${salt}:${idStr}:${SECRET}`).substring(0, 6);

    if (checksum !== expectedChecksum) {
      console.warn('Checksum mismatch in decryptDocumentId');
      return null;
    }

    const num = parseInt(idStr, 10);
    return isNaN(num) ? null : num;
  } catch (err) {
    console.error('Failed to decrypt documentID:', err);
    return null;
  }
}

