import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  archiveHabitCommand,
  createHabitCommand,
  deleteHabitCommand,
  markHabitDoneCommand,
  projectHabitForSystem,
  undoHabitCompletionCommand,
  type ActionContext,
  type HabitCommandTransport,
} from '../src/lib/habit-commands';
import { invalidateHabitQueries } from '../src/lib/habit-query-invalidation';
import type { HabitSummary } from '../src/types/rally';

const habit: HabitSummary = {
  habit_id: '01000000-0000-4000-8000-000000000001',
  name: 'Private journal habit',
  weekly_target: 3,
  completed_this_week: 1,
  progress_percentage: 33,
  done_today: true,
  today_completion_id: '02000000-0000-4000-8000-000000000001',
};
const uiContext: ActionContext = { source: 'ui', localDate: '2026-06-22', timeZone: 'America/Toronto' };

function transport(overrides: Partial<HabitCommandTransport> = {}): HabitCommandTransport {
  return {
    createHabit: async () => ({ habit }),
    markHabitDoneToday: async () => ({ habit, outcome: 'completed' }),
    undoTodayCompletion: async () => ({ habit: { ...habit, done_today: false }, outcome: 'removed' }),
    archiveHabit: async ({ habit_id }) => ({ habit_id, status: 'archived', outcome: 'archived' }),
    deleteHabit: async ({ habit_id }) => ({ habit_id, status: 'deleted', outcome: 'deleted' }),
    ...overrides,
  };
}

describe('habit application commands', () => {
  test('UI and system mark invocations produce the same domain result', async () => {
    const api = transport();
    const ui = await markHabitDoneCommand({ habitId: habit.habit_id }, uiContext, api);
    const system = await markHabitDoneCommand({ habitId: habit.habit_id }, { ...uiContext, source: 'system' }, api);
    assert.deepEqual(system, ui);
  });

  test('missing date or time zone fails before transport', async () => {
    let calls = 0;
    const api = transport({ markHabitDoneToday: async () => { calls += 1; return { habit }; } });
    const noDate = await markHabitDoneCommand({ habitId: habit.habit_id }, { ...uiContext, localDate: '' }, api);
    const noZone = await markHabitDoneCommand({ habitId: habit.habit_id }, { ...uiContext, timeZone: '' }, api);
    assert.equal(noDate.ok, false);
    assert.equal(noZone.ok, false);
    assert.equal(calls, 0);
  });

  test('authentication, authorization, and offline failures remain structured', async () => {
    for (const error of [
      { code: 'unauthenticated' as const, message: 'Expired.', recovery: 'login' as const, retryable: false },
      { code: 'not_found' as const, message: 'Habit was not found.', recovery: 'none' as const, retryable: false },
      { code: 'offline_unavailable' as const, message: 'Offline.', recovery: 'retry' as const, retryable: true },
    ]) {
      const api = transport({ markHabitDoneToday: async () => { throw Object.assign(new Error(error.message), { error }); } });
      const result = await markHabitDoneCommand({ habitId: habit.habit_id }, uiContext, api);
      assert.deepEqual(result, { ok: false, error });
    }
  });

  test('duplicate mark and undo expose convergent success outcomes', async () => {
    const api = transport({
      markHabitDoneToday: async () => ({ habit, outcome: 'already_complete' }),
      undoTodayCompletion: async () => ({ habit: { ...habit, done_today: false }, outcome: 'already_absent' }),
    });
    const mark = await markHabitDoneCommand({ habitId: habit.habit_id }, uiContext, api);
    const undo = await undoHabitCompletionCommand({ habitId: habit.habit_id }, uiContext, api);
    assert.equal(mark.ok && mark.outcome, 'already_complete');
    assert.equal(undo.ok && undo.outcome, 'already_absent');
  });

  test('archive and delete require explicit confirmation before transport', async () => {
    let calls = 0;
    const api = transport({
      archiveHabit: async ({ habit_id }) => { calls += 1; return { habit_id, status: 'archived' }; },
      deleteHabit: async ({ habit_id }) => { calls += 1; return { habit_id, status: 'deleted' }; },
    });
    const archive = await archiveHabitCommand({ habitId: habit.habit_id }, uiContext, api);
    const remove = await deleteHabitCommand({ habitId: habit.habit_id }, uiContext, api);
    assert.equal(archive.ok, false);
    assert.equal(remove.ok, false);
    assert.equal(calls, 0);
  });

  test('repeated archive and delete calls remain successful', async () => {
    const confirmed = { ...uiContext, confirmation: 'explicit' as const };
    const api = transport({
      archiveHabit: async ({ habit_id }) => ({ habit_id, status: 'archived', outcome: 'already_archived' }),
      deleteHabit: async ({ habit_id }) => ({ habit_id, status: 'deleted', outcome: 'already_deleted' }),
    });
    const archive = await archiveHabitCommand({ habitId: habit.habit_id }, confirmed, api);
    const remove = await deleteHabitCommand({ habitId: habit.habit_id }, confirmed, api);
    assert.equal(archive.ok && archive.outcome, 'already_archived');
    assert.equal(remove.ok && remove.outcome, 'already_deleted');
  });

  test('creation is non-idempotent and unavailable to system invocation', async () => {
    let calls = 0;
    const api = transport({ createHabit: async () => { calls += 1; return { habit }; } });
    const result = await createHabitCommand(
      { name: habit.name, weeklyTarget: habit.weekly_target },
      { ...uiContext, source: 'system' },
      api,
    );
    assert.equal(result.ok, false);
    assert.equal(calls, 0);
  });

  test('system projection returns only the stable identifier', () => {
    assert.deepEqual(projectHabitForSystem(habit), { id: habit.habit_id });
  });

  test('successful mutations invalidate list, progress, and matching detail queries', () => {
    const keys: (readonly unknown[])[] = [];
    invalidateHabitQueries({ invalidateQueries: ({ queryKey }) => keys.push(queryKey) }, habit.habit_id);
    assert.deepEqual(keys, [['habits'], ['weekly-progress'], ['habit-detail', habit.habit_id]]);
  });
});
