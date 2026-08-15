import { describe, it, expect } from 'vitest';
import { newId } from '../lib/ids';

// RFC 4122 v4: 8-4-4-4-12 hex, version nibble '4', variant nibble 8/9/a/b.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('produces a valid v4 UUID via the native crypto.randomUUID', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('produces a valid v4 UUID via the getRandomValues fallback (insecure origin)', () => {
    // Simulate an insecure origin: shadow the native method with `undefined`.
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
    try {
      expect(newId()).toMatch(UUID_V4);
    } finally {
      delete (globalThis.crypto as { randomUUID?: unknown }).randomUUID;
    }
  });
});
