const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../scripts/featured-projects.js'),'utf8');
function setup(reduced=false){
 const keys=['portfolio','assistant','analyzer','security'];
 const groups=keys.flatMap(key=>Array.from({length:4},()=>({dataset:{featureProject:key},hidden:true})));
 const buttons=keys.flatMap(key=>[false,true].map(card=>({dataset:{featureSelect:key},hidden:true,attrs:{},classList:{contains:()=>card},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.click=fn}})));
 const ids={};
 for(const id of ['featured','featured-title','featured-number','featured-badge','featured-meta','feature-tabs','tab-overview','featured-status','featured-picker']) ids[id]={dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true},click(){this.clicked=true},scrollIntoView(o){this.scrolled=o}};
 ids.featured.querySelectorAll=()=>groups;
 vm.runInNewContext(source,{document:{getElementById:id=>ids[id],querySelectorAll:()=>buttons},window:{matchMedia:()=>({matches:reduced})}});
 return {groups,buttons,ids};
}
test('starts on Project 003 without moving focus or changing the default tab',()=>{
 const s=setup();assert.equal(s.ids.featured.dataset.project,'analyzer');
 assert.equal(s.groups.filter(g=>!g.hidden).length,4);
 assert.equal(s.ids['tab-overview'].clicked,undefined);
 assert.equal(s.ids['featured-title'].focused,undefined);
});
test('all four projects can be selected from either control and return to the analyzer',()=>{
 const s=setup();const original=s.groups.slice();
 for(const b of s.buttons){b.click();
  assert.equal(s.ids.featured.dataset.project,b.dataset.featureSelect);
  assert.ok(s.groups.every(g=>g.hidden===(g.dataset.featureProject!==b.dataset.featureSelect)));
  assert.equal(s.buttons.filter(b=>b.attrs['aria-pressed']==='true').length,2);
  assert.equal(s.ids['tab-overview'].clicked,true);
 }
 s.buttons.find(b=>b.dataset.featureSelect==='analyzer').click();
 assert.ok(s.groups.every((g,i)=>g===original[i]));
 assert.equal(s.ids['featured-title'].textContent,'Python IT Ticket Analyzer');
});
test('Project 004 has its own metadata, focus announcement and reduced-motion scroll',()=>{
 const s=setup(true);s.buttons.find(b=>b.dataset.featureSelect==='security').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 004 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'Security Proposal Workspace');
 assert.equal(s.ids['featured-title'].focused,true);
 assert.equal(s.ids.featured.scrolled.behavior,'instant');
 assert.match(s.ids['featured-status'].textContent,/004/);
});
