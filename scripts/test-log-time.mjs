// No test-runner dependency: transpile the small TS module graph with the
// compiler already used by the app, then exercise it with Node assertions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ref, nextTick } from 'vue';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = new Map();
function moduleUrl(path) {
  if (modules.has(path)) return modules.get(path);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  });
  const code = outputText.replace(/from ['"]([^'"]+)['"]/g, (_, specifier) => {
    const url = specifier.startsWith('@/') ? moduleUrl(resolve(root, 'src', specifier.slice(2)) + '.ts')
      : specifier.startsWith('.') ? moduleUrl(resolve(dirname(path), specifier) + '.ts')
      : import.meta.resolve(specifier);
    return `from '${url}'`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  modules.set(path, url);
  return url;
}
const { normalizeTime, clockMillis, entryClockMillis, summarizeLogTimes, selectionBounds, matchesTime } = await import(moduleUrl(resolve(root, 'src/lib/logTimeFilter.ts')));
const { useLogFilters } = await import(moduleUrl(resolve(root, 'src/composables/useLogFilters.ts')));
const entry = (timestamp, severity = 'INFO', text = 'job ran') => ({ timestamp, severity, text, environment: 'test' });
const around = { mode: 'around', day: '2026-09-12', time: '6am', radius: 15, endDay: '2026-09-12', endTime: '7am' };
let tests = 0;
async function test(name, run) { await run(); tests++; console.log(`✓ ${name}`); }

await test('human time input and invalid values', () => {
  for (const [input, expected] of [['6am', '06:00'], ['6 AM', '06:00'], ['6', '06:00'], ['630', '06:30'], ['0630', '06:30'], ['6:30pm', '18:30'], ['18:00', '18:00'], ['12am', '00:00'], ['12pm', '12:00']]) assert.equal(normalizeTime(input), expected);
  for (const input of ['', '24:00', '13pm', '0am', '6:60', '6:3', '6 nope', '-1']) assert.equal(normalizeTime(input), null);
});
await test('6am includes the entire final minute, without leaking into the next', () => {
  const bounds = selectionBounds(around);
  for (const stamp of ['05:45:00', '06:00:00', '06:15:59.999']) assert.equal(matchesTime(entry(`2026-09-12 ${stamp}`), bounds, 'server'), true);
  for (const stamp of ['05:44:59.999', '06:16:00']) assert.equal(matchesTime(entry(`2026-09-12 ${stamp}`), bounds, 'server'), false);
});
await test('around midnight crosses days; reversed ranges require an explicit end date', () => {
  const bounds = selectionBounds({ ...around, time: '12am' });
  assert.equal(matchesTime(entry('2026-09-11 23:50:00'), bounds, 'server'), true);
  assert.equal(selectionBounds({ ...around, mode: 'range', time: '23:00', endTime: '01:00' }), null);
  assert.ok(selectionBounds({ ...around, mode: 'range', time: '23:00', endDay: '2026-09-13', endTime: '01:00' }));
  assert.equal(selectionBounds({ ...around, day: '2026-02-30' }), null);
});
await test('whole day includes its last second, excludes the next day', () => {
  const bounds = selectionBounds({ ...around, mode: 'range', time: '00:00', endTime: '23:59' });
  assert.equal(matchesTime(entry('2026-09-12 23:59:59.999'), bounds, 'server'), true);
  assert.equal(matchesTime(entry('2026-09-13 00:00:00'), bounds, 'server'), false);
});
await test('all loaded entries determine dates and histogram, even when unsorted', () => {
  const list = [entry('2026-09-12 06:20:00'), entry('2026-09-12 05:00:00'), entry('invalid')];
  assert.deepEqual(summarizeLogTimes(list, 'server').days.map(d => [d.date, d.count]), [['2026-09-12', 2]]);
  list.splice(1, 0, entry('2026-09-11 12:00:00'));
  const summary = summarizeLogTimes(list, 'server');
  assert.equal(summary.days.length, 2);
  assert.equal(summary.days[1].hours[6], 1);
  assert.equal(summary.first, '2026-09-11T12:00');
  assert.equal(summary.last, '2026-09-12T06:20');
  assert.deepEqual(summarizeLogTimes([], 'server'), { days: [], first: '', last: '' });
});
await test('server time follows each displayed offset; bare times survive reader DST', () => {
  const oldZone = process.env.TZ;
  process.env.TZ = 'Europe/London';
  try {
    assert.equal(entryClockMillis(entry('2026-03-29 01:30:00'), 'server'), clockMillis('2026-03-29T01:30'));
    assert.equal(entryClockMillis(entry('2026-09-12 06:00:00+02:00'), 'server'), clockMillis('2026-09-12T06:00'));
    assert.equal(entryClockMillis(entry('2026-09-12 06:00:00+01:00'), 'server'), clockMillis('2026-09-12T06:00'));
    const zoned = entry('2026-09-12 00:30:00+02:00');
    assert.equal(summarizeLogTimes([zoned], 'local').days[0].date, '2026-09-11');
  } finally { if (oldZone === undefined) delete process.env.TZ; else process.env.TZ = oldZone; }
});
await test('preview combines search and severity; refresh preserves an applied window', async () => {
  const entries = ref([entry('2026-09-12 06:00:00', 'ERROR', 'payment'), entry('2026-09-12 06:02:00'), entry('2026-09-12 09:00:00', 'ERROR', 'payment')]);
  const filters = useLogFilters(entries);
  filters.selectedSeverity.value = 'ERROR';
  filters.activeSearch.value = 'payment';
  assert.equal(filters.previewCount(around), 1);
  filters.setSelection(around);
  assert.equal(filters.filtered.value.length, 1);
  entries.value = [entry('2026-09-13 06:00:00', 'ERROR', 'payment'), ...entries.value];
  await nextTick();
  assert.equal(filters.timeSummary.value.days.length, 2);
  assert.equal(filters.filtered.value.length, 1);
  filters.clearRange();
  assert.equal(filters.filtered.value.length, 3);
});
console.log(`${tests} time-filter checks passed.`);
