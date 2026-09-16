import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  new Function('exports', 'require', outputText)(exports, name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return exports;
}

const { createTabWindowDrag } = load('../src/lib/tabWindowDrag.ts');
let checks = 0;
function test(name, run) { run(); checks++; console.log(`✓ ${name}`); }
function fixture() {
  const calls = [];
  const captured = new Set();
  const target = {
    setPointerCapture: id => captured.add(id),
    hasPointerCapture: id => captured.has(id),
    releasePointerCapture: id => captured.delete(id),
  };
  const drag = createTabWindowDrag({
    beginDrag: () => calls.push('begin'),
    moveDrag: () => calls.push('move'),
    endDrag: () => calls.push('end'),
  });
  const pointer = (overrides = {}) => ({ currentTarget: target, pointerId: 1, isPrimary: true, button: 0, buttons: 1, screenX: 100, screenY: 100, ...overrides });
  const click = (detail = 1) => ({ detail, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  return { drag, calls, captured, pointer, click };
}

test('clicks and small pointer jitter select without moving the window', () => {
  const { drag, calls, captured, pointer, click } = fixture();
  drag.start(pointer());
  drag.move(pointer({ screenX: 102, screenY: 102 }));
  drag.finish(pointer({ buttons: 0 }));
  assert.equal(drag.allowClick(click()), true);
  assert.deepEqual(calls, ['begin', 'end']);
  assert.equal(captured.size, 0);
});

test('dragging suppresses selection even when the pointer returns to its origin', () => {
  const { drag, calls, pointer, click } = fixture();
  drag.start(pointer());
  drag.move(pointer({ screenX: 130 }));
  drag.move(pointer());
  drag.finish(pointer({ buttons: 0 }));
  const releaseClick = click();
  assert.equal(drag.allowClick(releaseClick), false);
  assert.equal(releaseClick.prevented, true);
  assert.equal(releaseClick.stopped, true);
  assert.deepEqual(calls, ['begin', 'move', 'move', 'end']);
  assert.equal(drag.allowClick(click(0)), true, 'keyboard activation still works');
  drag.start(pointer());
  drag.finish(pointer({ buttons: 0 }));
  assert.equal(drag.allowClick(click()), true, 'next ordinary click still works');
});

test('middle/right buttons and secondary pointers do not drag', () => {
  const { drag, calls, pointer } = fixture();
  drag.start(pointer({ button: 1 }));
  drag.start(pointer({ button: 2 }));
  drag.start(pointer({ isPrimary: false }));
  assert.deepEqual(calls, []);
  drag.start(pointer());
  drag.move(pointer({ pointerId: 2, screenX: 150 }));
  drag.finish(pointer({ pointerId: 2 }));
  assert.deepEqual(calls, ['begin']);
});

test('blur, capture loss, cancellation and missing mouse-up terminate gestures', () => {
  for (const cancel of [drag => drag.cancel(), (drag, pointer) => drag.move(pointer({ buttons: 0 }))]) {
    const { drag, calls, captured, pointer, click } = fixture();
    drag.start(pointer());
    cancel(drag, pointer);
    drag.cancel();
    drag.move(pointer({ screenX: 150 }));
    assert.deepEqual(calls, ['begin', 'end']);
    assert.equal(captured.size, 0);
    assert.equal(drag.allowClick(click()), false);
  }
});

const ipcMain = new EventEmitter();
const sender = new EventEmitter();
sender.mainFrame = {};
const win = new EventEmitter();
let position = [200, 300];
let cursor = { x: 500, y: 400 };
let maximized = false;
let fullscreen = false;
win.getPosition = () => position;
win.setPosition = (x, y) => { position = [x, y]; };
win.isMaximized = () => maximized;
win.isFullScreen = () => fullscreen;
load('../electron/main/ipc-handlers/window.ts', {
  electron: { ipcMain, BrowserWindow: { fromWebContents: s => s === sender ? win : null }, screen: { getCursorScreenPoint: () => ({ ...cursor }) } },
}).default();
const send = action => ipcMain.emit(`window-drag-${action}`, { sender, senderFrame: sender.mainFrame });

test('window tracks screen movement from its original position, including negative coordinates', () => {
  send('begin');
  cursor = { x: 540, y: 420 };
  send('move');
  assert.deepEqual(position, [240, 320]);
  send('move');
  assert.deepEqual(position, [240, 320], 'stationary cursor cannot cause window drift');
  cursor = { x: -50, y: 410 };
  send('move');
  assert.deepEqual(position, [-350, 310]);
  send('end');
  cursor.x = 0;
  send('move');
  assert.deepEqual(position, [-350, 310]);
});

test('native drag sessions clean up on release, blur, navigation, crash and window close', () => {
  for (const stop of [() => send('end'), () => win.emit('blur'), () => sender.emit('did-start-navigation'), () => sender.emit('render-process-gone'), () => win.emit('closed')]) {
    send('begin');
    send('begin');
    assert.equal(win.listenerCount('blur'), 1, 'restarting does not leak listeners');
    const before = [...position];
    stop();
    cursor.x += 10;
    send('move');
    assert.deepEqual(position, before);
    assert.equal(win.listenerCount('blur'), 0);
    assert.equal(win.listenerCount('closed'), 0);
    assert.equal(sender.listenerCount('did-start-navigation'), 0);
    assert.equal(sender.listenerCount('render-process-gone'), 0);
  }
});

test('fullscreen/maximized windows and subframes cannot start repositioning', () => {
  const before = [...position];
  maximized = true;
  send('begin');
  maximized = false;
  fullscreen = true;
  send('begin');
  fullscreen = false;
  ipcMain.emit('window-drag-begin', { sender, senderFrame: {} });
  cursor.x += 20;
  send('move');
  assert.deepEqual(position, before);
});

console.log(`${checks} titlebar drag checks passed.`);
