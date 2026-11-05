// A fast integration check: execute the browser controller with the real WASM
// and a small fake page. A real browser test is still required for layout.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
class Element {
  constructor() { this.handlers={}; this.disabled=false; this.textContent=''; this.dataset={}; this.focused=false; }
  addEventListener(name,fn) { this.handlers[name]=fn; }
  trigger(name,event={}) { if (this.handlers[name]) this.handlers[name](event); }
  focus() { this.focused=true; }
  getContext() { return {fillRect(){},strokeRect(){},fillText(){}}; }
}
test('browser controller loads the real game, starts, pauses and asks parent to exit', async () => {
  const ids={}; for(const id of ['board','next','score','status','start','pause','exit']) ids[id]=new Element();
  ids.start.disabled=true; ids.pause.disabled=true;
  const control=new Element(); control.dataset.command='5';
  const doc={hidden:false,handlers:{},getElementById:id=>ids[id],querySelectorAll:()=>[control],addEventListener(name,fn){this.handlers[name]=fn}};
  const messages=[]; const window={location:{origin:'https://example.test'},parent:{postMessage(...args){messages.push(args)}}};
  let timer=0; const timers=new Map();
  const bytes=fs.readFileSync(path.join(__dirname,'game.wasm'));
  const page={document:doc,window,WebAssembly,Math,Object,Number,String,
    fetch:async()=>({ok:true,arrayBuffer:async()=>bytes}),
    setTimeout:fn=>{timers.set(++timer,fn); return timer;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'game.js'),'utf8'),page);
  // Wait for the asynchronous WebAssembly compilation promise.
  for(let i=0;i<50 && ids.start.disabled;i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(ids.start.disabled,false); assert.match(ids.status.textContent,/Ready/);
  ids.start.trigger('click'); assert.equal(ids.pause.disabled,false); assert.equal(ids.score.textContent,'0'); assert.ok(ids.board.focused);
  let prevented=false; ids.board.trigger('keydown',{key:'ArrowLeft',preventDefault(){prevented=true}}); assert.ok(prevented);
  ids.pause.trigger('click'); assert.equal(ids.pause.textContent,'Resume'); assert.equal(timers.size,0);
  ids.pause.trigger('click'); assert.equal(ids.pause.textContent,'Pause'); assert.equal(timers.size,1);
  control.trigger('click'); assert.equal(timers.size,1);
  ids.exit.trigger('click'); assert.equal(timers.size,0); assert.equal(messages[0][0].type,'color-columns:exit'); assert.equal(messages[0][1],'https://example.test');
});
