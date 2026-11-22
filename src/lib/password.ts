const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

function pick(chars: string, count: number) {
  const bytes = new Uint32Array(count);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function randomPassword() {
  return pick(LETTERS, 4) + pick(DIGITS, 4);
}