// Small DOM stand-in exercises navigation guarantees without a browser.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/side-switch.js'), 'utf8');
function setup({reduced = false, failure = false, supported = true, hold = false, artwork = false, brokenImage = false} = {}) {
  const nodes = {}, effects = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  for (const id of ['side-switch','pixel-switch','switch-label','professional-view','creative-view','professional-nav','burn-curtain','side-status','.robot-eyes','.eye-charge','.eye-beam','.heat-wash','.heat-particles']) {
    nodes[id] = { hidden: true, dataset: {}, attrs: {}, style: {setProperty(k,v){this[k]=v;}},
      setAttribute(k,v){this.attrs[k]=v;}, addEventListener(k,fn){this.click=fn;}, focus(){this.focused=true;},
      getBoundingClientRect(){return {left:72,top:24,width:6,height:2};}, querySelector:s=>nodes[s] };
    if (supported) nodes[id].animate = (frames,options) => {
      const effect = { frames, options, cancelled: false, cancel(){this.cancelled=true;},
        finished: failure ? Promise.reject(new Error('animation unavailable')) : hold ? gate : Promise.resolve() };
      effects.push(effect); return effect;
    };
  }
  if (artwork) {
    for (const selector of ['.robot-idle', '.robot-firing']) {
      nodes[selector] = { complete: true, naturalWidth: brokenImage ? 0 : 320,
        decode: () => Promise.resolve(), animate: nodes['.eye-charge'].animate };
    }
  }
  const body = {dataset:{}};
  vm.runInNewContext(source,{document:{body,getElementById:id=>nodes[id],querySelector:s=>nodes[s]},
    window:{matchMedia:()=>({matches:reduced}),location:{hash:''},scrollTo(){}},innerWidth:390,innerHeight:844,console:{warn(){}}});
  return {nodes,body,effects,release,click:id=>nodes[id].click({currentTarget:nodes[id]})};
}
test('both controls switch sides and restore focus, cleaning up all effects',async()=>{
  const s=setup(); await s.click('pixel-switch');
  assert.equal(s.body.dataset.side,'creative');
  assert.equal(s.nodes['professional-view'].hidden,true);
  assert.equal(s.nodes['creative-view'].hidden,false);
  assert.equal(s.nodes['pixel-switch'].attrs['aria-label'],'Open The Workbench');
  await s.click('side-switch');
  assert.equal(s.body.dataset.side,'professional');
  assert.equal(s.nodes['side-switch'].focused,true);
  assert.equal(s.nodes['burn-curtain'].hidden,true);
  assert.ok(s.effects.length>0 && s.effects.every(e=>e.cancelled));
  assert.equal(s.body.dataset.transition,undefined);
});
for (const mode of [{reduced:true},{supported:false},{failure:true}]) {
  test(`side remains accessible with ${JSON.stringify(mode)}`,async()=>{
    const s=setup(mode); await s.click('pixel-switch');
    assert.equal(s.body.dataset.side,'creative');
    assert.equal(s.nodes['pixel-switch'].disabled,false);
    assert.equal(s.nodes['side-switch'].disabled,false);
    assert.equal(s.nodes['burn-curtain'].hidden,true);
    if(!mode.failure) assert.equal(s.effects.length,0);
  });
}
test('rapid duplicate activation cannot start a second transition',async()=>{
  const s=setup({hold:true}); const first=s.click('pixel-switch'); await Promise.resolve(); await Promise.resolve();
  assert.equal(s.nodes['side-switch'].disabled,true);
  await s.click('side-switch'); assert.equal(s.effects.length,1);
  s.release(); await first; assert.equal(s.body.dataset.side,'creative');
});

test('articulated frames brace, recover, and release all animation effects', async()=>{
  const s=setup({artwork:true}); await s.click('pixel-switch');
  assert.equal(s.body.dataset.side,'creative');
  assert.equal(s.effects[0].frames[1].opacity,0);
  assert.equal(s.effects[1].frames[1].opacity,1);
  assert.equal(s.effects.at(-2).frames[1].opacity,1);
  assert.equal(s.effects.at(-1).frames[1].opacity,0);
  assert.ok(s.effects.every(e=>e.cancelled));
});
test('missing firing artwork keeps navigation usable without hiding idle robot', async()=>{
  const s=setup({artwork:true,brokenImage:true}); await s.click('pixel-switch');
  assert.equal(s.body.dataset.side,'creative');
  assert.equal(s.effects.length,0);
  assert.equal(s.nodes['pixel-switch'].disabled,false);
});
