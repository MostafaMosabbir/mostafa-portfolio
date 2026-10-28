const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname,'../scripts/geometry.js'),'utf8');
function scene({reduced=false,fine=true}={}) {
  const queue=new Map(), observers=[],events={};let next=0,glows=0;const points=[],radii=[];
  const ctx=new Proxy({moveTo(x,y){points.push([x,y]);},createRadialGradient(...args){glows++;radii.push(args[5]);return {addColorStop(){}};}},{get:(o,k)=>o[k]||(()=>{})});
  const canvas={getContext:()=>ctx};
  const pause={textContent:'Pause background',value:'false',getAttribute(){return this.value;},click(){this.value=this.value==='true'?'false':'true';observers[0]();}};
  const creative={setAttribute(k,v){this[k]=v;},addEventListener(k,f){this[k]=f;}};
  const doc={body:{dataset:{}},hidden:false,documentElement:{addEventListener(){}},getElementById:id=>({'geometry-field':canvas,'matrix-toggle':pause,'geometry-toggle':creative}[id]),addEventListener(k,f){events[k]=f;}};
  const context={document:doc,window:{addEventListener(k,f){events[k]=f;}},innerWidth:1200,innerHeight:800,devicePixelRatio:2,
    matchMedia:q=>({matches:q.includes('reduce')?reduced:fine,addEventListener(){}}),
    MutationObserver:class{constructor(f){observers.push(f);}observe(){}},
    requestAnimationFrame:f=>{queue.set(++next,f);return next;},cancelAnimationFrame:id=>queue.delete(id)};
  vm.runInNewContext(code,context);
  return {queue,pause,creative,events,doc,points,radii,glows:()=>glows,tick(t){const jobs=[...queue.values()];queue.clear();jobs.forEach(f=>f(t));}};
}
test('pause stops the loop and creative control resumes the same state',()=>{
  const s=scene();assert.equal(s.queue.size,1);s.pause.click();assert.equal(s.queue.size,0);
  assert.equal(s.creative['aria-pressed'],'true');s.creative.click();assert.equal(s.queue.size,1);
  s.doc.hidden=true;s.events.visibilitychange();assert.equal(s.queue.size,0);
});
test('reduced motion draws a static scene with no animation or pointer glow',()=>{
  const s=scene({reduced:true});assert.equal(s.queue.size,0);assert.equal(s.creative.disabled,true);
  s.events.pointermove({pointerType:'mouse',clientX:30,clientY:40});s.tick(100);assert.equal(s.glows(),0);
});
test('mouse glow fades, and touch input never creates it',()=>{
  const s=scene();s.events.pointermove({pointerType:'mouse',clientX:30,clientY:40});s.tick(100);s.tick(140);assert.ok(s.glows()>0);
  for(let t=180;t<2400;t+=40)s.tick(t);const before=s.glows();s.tick(2440);assert.equal(s.glows(),before);
  const touch=scene({fine:false});touch.events.pointermove({pointerType:'touch',clientX:30,clientY:40});touch.tick(100);touch.tick(140);assert.equal(touch.glows(),0);
});

test('nearby cursor moves the background vertices with a smaller glow',()=>{
  const resting=scene(), nudged=scene();
  nudged.events.pointermove({pointerType:'mouse',clientX:45,clientY:190});
  resting.tick(100);nudged.tick(100);
  resting.points.length=0;nudged.points.length=0;
  resting.tick(140);nudged.tick(140);
  assert.notDeepEqual(nudged.points[0],resting.points[0]);
  assert.ok(nudged.radii.length>0);
  assert.ok(nudged.radii.every(radius=>radius===55));
  nudged.pause.click();nudged.points.length=0;
  nudged.events.pointermove({pointerType:'mouse',clientX:55,clientY:200});
  nudged.tick(180);assert.equal(nudged.points.length,0);
});
