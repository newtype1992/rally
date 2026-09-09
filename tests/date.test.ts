import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatWeekRange } from '../src/lib/date';

test('week labels work when the runtime has no Intl.formatRange', () => {
  const prototype = Intl.DateTimeFormat.prototype;
  const original = Object.getOwnPropertyDescriptor(prototype, 'formatRange');
  Object.defineProperty(prototype, 'formatRange', { configurable: true, value: undefined });
  try {
    assert.equal(formatWeekRange('2026-09-06'), 'Sep 6–12');
    assert.equal(formatWeekRange('2026-08-30'), 'Aug 30–Sep 5');
    assert.equal(formatWeekRange('2026-12-27'), 'Dec 27, 2026–Jan 2, 2027');
    assert.equal(formatWeekRange('2024-02-25'), 'Feb 25–Mar 2');
    assert.equal(formatWeekRange('2026-03-08'), 'Mar 8–14');
  } finally {
    if (original) Object.defineProperty(prototype, 'formatRange', original);
    else Reflect.deleteProperty(prototype, 'formatRange');
  }
});
