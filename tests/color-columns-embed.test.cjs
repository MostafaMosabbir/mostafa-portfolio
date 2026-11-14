const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../scripts/color-columns-embed.js'), 'utf8');

function element(id, dataset = {}) {
  return {
    id, dataset, hidden: true, textContent: '', handlers: {},
    addEventListener(type, callback) { this.handlers[type] = callback; },
    dispatch(type, data = {}) { this.handlers[type]?.(data); },
    focus() { this.focused = true; },
  };
}

function setup() {
  const ids = {};
  for (const id of ['columns-play', 'columns-close', 'columns-frame-container', 'columns-status', 'featured', 'panel-overview', 'professional-view']) ids[id] = element(id);
  ids['panel-overview'].hidden = false;
  ids['professional-view'].hidden = false;
  const selectors = [element('select-analyzer', {featureSelect:'analyzer'}), element('select-columns', {featureSelect:'columns'})];
  const tabs = [element('tab-overview'), element('tab-process'), element('tab-evidence')];
  const documentHandlers = {}, windowHandlers = {}, observers = {};
  let created = 0, lastFrame;
  ids['columns-frame-container'].appendChild = (frame) => { frame.attached = true; lastFrame = frame; };
  const document = {
    getElementById: id => ids[id],
    querySelectorAll: selector => selector === '[data-feature-select]' ? selectors : tabs,
    addEventListener: (type, callback) => { documentHandlers[type] = callback; },
    createElement: tag => {
      assert.equal(tag, 'iframe'); created++;
      return {contentWindow: {}, remove() { this.attached = false; }};
    },
  };
  const window = {location:{origin:'https://mostafam.com'},addEventListener:(type,cb)=>{windowHandlers[type]=cb;}};
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe(target) { observers[target.id] = this.callback; }
  }
  vm.runInNewContext(source, {document, window, MutationObserver});
  return {ids, selectors, tabs, documentHandlers, windowHandlers, observers, getFrame:()=>lastFrame, created:()=>created};
}

test('does not load a game before Play and closes it with focus restored', () => {
  const s = setup();
  assert.equal(s.created(), 0);
  assert.equal(s.ids['columns-play'].hidden, false);
  s.ids['columns-play'].dispatch('click');
  assert.equal(s.created(), 1);
  assert.equal(s.getFrame().src, 'projects/color-columns/play/index.html');
  assert.equal(s.getFrame().attached, true);
  assert.equal(s.ids['columns-close'].hidden, false);
  s.ids['columns-close'].dispatch('click');
  assert.equal(s.getFrame().attached, false);
  assert.equal(s.ids['columns-play'].focused, true);
  assert.match(s.ids['columns-status'].textContent, /session has ended/);
});

test('stops hidden games on a different tab or project and does not react to untrusted messages', () => {
  const s = setup();
  s.ids['columns-play'].dispatch('click');
  const frame = s.getFrame();
  s.windowHandlers.message({origin:'https://example.com',source:frame.contentWindow,data:{type:'color-columns:exit'}});
  s.windowHandlers.message({origin:'https://mostafam.com',source:{},data:{type:'color-columns:exit'}});
  assert.equal(frame.attached, true);
  s.tabs[1].dispatch('click');
  assert.equal(frame.attached, false);
  s.ids['columns-play'].dispatch('click');
  const second = s.getFrame();
  s.selectors[0].dispatch('click');
  assert.equal(second.attached, false);
});

test('accepts an exit request only from the live same-origin game frame', () => {
  const s = setup();
  s.ids['columns-play'].dispatch('click');
  const frame = s.getFrame();
  s.windowHandlers.message({origin:'https://mostafam.com',source:frame.contentWindow,data:{type:'color-columns:exit'}});
  assert.equal(frame.attached, false);
  assert.equal(s.ids['columns-play'].focused, true);
});

test('keyboard tab navigation unloads the game after Brief is hidden', () => {
  const s = setup();
  s.ids['columns-play'].dispatch('click');
  const frame = s.getFrame();
  s.ids['panel-overview'].hidden = true;
  s.documentHandlers.keydown({key:'ArrowRight'});
  assert.equal(frame.attached, false);
});

test('switching to After Hours unloads the game without moving focus to the hidden Workbench', () => {
  const s = setup();
  s.ids['columns-play'].dispatch('click');
  const frame = s.getFrame();
  s.ids['professional-view'].hidden = true;
  s.observers['professional-view']();
  assert.equal(frame.attached, false);
  assert.equal(s.ids['columns-play'].focused, undefined);
  assert.equal(s.ids['columns-play'].hidden, false);
  assert.match(s.ids['columns-status'].textContent, /After Hours/);
});
