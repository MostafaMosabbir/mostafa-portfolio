const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../scripts/baseline.js'), 'utf8');

function setup({ seen = false, reduced = false, hash = '', storageFails = false } = {}) {
  let now = 0, sequence = 0;
  const jobs = new Map();
  function node() {
    const classes = new Set();
    return { hidden: true, textContent: '', dataset: {}, events: {}, attrs: {},
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c,v){v?classes.add(c):classes.delete(c);} },
      addEventListener(k,f){this.events[k]=f;}, removeEventListener(k){delete this.events[k];},
      setAttribute(k,v){this.attrs[k]=v;}, focus(){this.focused=true;}, animate(){} };
  }
  const nodes = Object.fromEntries(['baseline-intro','baseline-skip','home','pixel-switch','side-switch'].map(id=>[id,node()]));
  const lines = [node(),node(),node()], copy = node(), atmosphere = node(), link = node(), button = node(), output = node();
  button.dataset.decode='Always changing. Always improving.'; button.querySelector=()=>output;
  copy.querySelector=()=>link;
  nodes.home.querySelector=s=>s==='.hero-copy'?copy:atmosphere;
  nodes['baseline-intro'].querySelectorAll=()=>lines;
  const document={...node(),hidden:false,activeElement:null,querySelectorAll:()=>[button],getElementById:id=>nodes[id]};
  const motion={...node(),matches:reduced}, window={...node(),matchMedia:()=>motion};
  const storage={getItem(){if(storageFails)throw Error('blocked');return seen?'seen':null;},setItem(){seen=true;}};
  function schedule(fn, delay, repeat=0){const id=++sequence;jobs.set(id,{fn,at:now+delay,repeat});return id;}
  vm.runInNewContext(source,{document,window,location:{hash},sessionStorage:storage,setTimeout:(f,d)=>schedule(f,d),clearTimeout:id=>jobs.delete(id),setInterval:(f,d)=>schedule(f,d,d),clearInterval:id=>jobs.delete(id)});
  function advance(ms){const end=now+ms;while(true){const item=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;const[id,j]=item;now=j.at;if(j.repeat)j.at+=j.repeat;else jobs.delete(id);j.fn();}now=end;}
  return {nodes,lines,copy,atmosphere,link,button,output,document,window,motion,jobs,advance};
}

test('opening types progressively, ends with three phrases, and restores the page',()=>{
  const s=setup(); assert.equal(s.nodes['baseline-intro'].hidden,false); assert.equal(s.copy.inert,true);
  assert.equal(s.lines[0].textContent,'');s.advance(500);assert.ok(s.lines[0].textContent.startsWith('And blood-black'));assert.ok(s.lines[0].textContent.length<210);
  s.advance(3600);assert.deepEqual(s.lines.map(l=>l.textContent),Array(3).fill('Within cells interlinked.'));
  s.advance(600);assert.equal(s.nodes['baseline-intro'].hidden,true);assert.equal(s.copy.inert,false);assert.equal(s.jobs.size,0);
});
test('skip cancels pending characters and restores focus from the skip control',()=>{
  const s=setup();s.advance(200);s.document.activeElement=s.nodes['baseline-skip'];s.nodes['baseline-skip'].events.click();
  const text=s.lines[0].textContent;s.advance(6000);assert.equal(s.lines[0].textContent,text);assert.equal(s.link.focused,true);assert.equal(s.jobs.size,0);
});
test('repeat visits, reduced motion, deep links and blocked storage never cover content',()=>{
  for(const options of [{seen:true},{reduced:true},{hash:'#projects'},{storageFails:true}]){const s=setup(options);assert.equal(s.nodes['baseline-intro'].hidden,true);assert.notEqual(s.copy.inert,true);assert.equal(s.jobs.size,0);}
});
test('Escape and reduced-motion changes stop an intro already in progress',()=>{
  const a=setup();a.document.events.keydown({key:'Escape'});assert.equal(a.nodes['baseline-intro'].hidden,true);
  const b=setup();b.motion.matches=true;b.motion.events.change();assert.equal(b.nodes['baseline-intro'].hidden,true);assert.equal(b.jobs.size,0);
});
test('section text decodes, supports pinning, and clears timers when concealed',()=>{
  const s=setup({seen:true});assert.ok(s.output.textContent.includes('·'));
  s.button.events.focus();s.advance(600);assert.equal(s.output.textContent,s.button.dataset.decode);
  s.button.events.click();assert.equal(s.button.attrs['aria-pressed'],'true');
  s.button.events.keydown({key:'Escape'});assert.equal(s.button.attrs['aria-pressed'],'false');assert.equal(s.jobs.size,0);assert.ok(s.output.textContent.includes('·'));
});
