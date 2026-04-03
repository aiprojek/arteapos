import test from 'node:test';
import assert from 'node:assert/strict';

import { generateScopedUniqueId } from '../services/idService.ts';
import { baseUser } from './helpers/testData.ts';

test('generateScopedUniqueId sanitizes store id and includes prefix and user suffix', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.123456;

  try {
    const result = generateScopedUniqueId({
      storeId: 'STORE-01/A',
      user: baseUser,
      prefix: 'EXP',
      now: new Date('2026-04-02T10:00:00.000Z'),
    });

    assert.ok(result.startsWith('STORE01A-EXP'));
    assert.match(result, /-123[A-Z0-9]{3}$/);
  } finally {
    Math.random = originalRandom;
  }
});
