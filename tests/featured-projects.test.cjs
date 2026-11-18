const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../scripts/featured-projects.js'),'utf8');
function setup(reduced=false){
 const keys=['portfolio','assistant','analyzer','security','columns','kev','theater','algorithm','assembly','securebank','office','zoom-phone','migration'];
 const groups=keys.flatMap(key=>Array.from({length:4},()=>({dataset:{featureProject:key},hidden:true})));
 const buttons=keys.map(key=>({dataset:{featureSelect:key},hidden:true,attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.click=fn}}));
 const ids={};
 const tabClicks=[];
 for(const id of ['featured','featured-title','featured-number','featured-badge','featured-meta','feature-tabs','tab-overview','tab-evidence','tab-articles','tab-what-changed','featured-status']) ids[id]={dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true},click(){tabClicks.push(id)},scrollIntoView(o){this.scrolled=o}};
 ids.featured.querySelectorAll=()=>groups;
 vm.runInNewContext(source,{document:{getElementById:id=>ids[id],querySelectorAll:()=>buttons},window:{matchMedia:()=>({matches:reduced})}});
 return {groups,buttons,ids,tabClicks};
}
test('starts on Project 007 Findings without moving focus or scrolling',()=>{
 const s=setup();assert.equal(s.ids.featured.dataset.project,'kev');
 assert.equal(s.groups.filter(g=>!g.hidden).length,4);
 assert.deepEqual(s.tabClicks,['tab-evidence']);
 assert.equal(s.ids['featured-title'].textContent,'CISA Vulnerability Explorer');
 assert.equal(s.ids['featured-title'].focused,undefined);
 assert.equal(s.ids.featured.scrolled,undefined);
});
test('all projects can be highlighted from Case Files and return to the analyzer',()=>{
 const s=setup();const original=s.groups.slice();
 for(const b of s.buttons){b.click();
  assert.equal(s.ids.featured.dataset.project,b.dataset.featureSelect);
  assert.ok(s.groups.every(g=>g.hidden===(g.dataset.featureProject!==b.dataset.featureSelect)));
  assert.equal(s.buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);
  assert.equal(b.attrs['aria-label'],`Featured above, ${s.ids['featured-title'].textContent}`);
  const tab = ['kev','migration'].includes(b.dataset.featureSelect) ? 'tab-evidence' : 'tab-overview';
  assert.equal(s.tabClicks.at(-1),tab);
 }
 s.buttons.find(b=>b.dataset.featureSelect==='analyzer').click();
 assert.ok(s.groups.every((g,i)=>g===original[i]));
 assert.equal(s.ids['featured-title'].textContent,'Python IT Ticket Analyzer');
});
test('activating the already featured card leaves the current tab and focus alone',()=>{
 const s=setup();
 s.buttons.find(b=>b.dataset.featureSelect==='kev').click();
 assert.deepEqual(s.tabClicks,['tab-evidence']);
 assert.equal(s.ids['featured-title'].focused,undefined);
});
test('Project 009 selects TheaterCorp and does not show an article placeholder',()=>{
 const s=setup();s.buttons.find(b=>b.dataset.featureSelect==='theater').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 009 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'TheaterCorp');
 assert.match(s.ids['featured-meta'].textContent,/Java.*JavaScript browser demo/);
 assert.equal(s.ids['tab-articles'].hidden,true);
 assert.ok(s.groups.every(g=>g.hidden===(g.dataset.featureProject!=='theater')));
});
test('Project 007 shows explorer metadata and its article placeholder',()=>{
 const s=setup();
 s.buttons.find(b=>b.dataset.featureSelect==='analyzer').click();
 s.buttons.find(b=>b.dataset.featureSelect==='kev').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 007 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'CISA Vulnerability Explorer');
 assert.match(s.ids['featured-meta'].textContent,/Cybersecurity.*R.*CISA/);
 assert.equal(s.ids['tab-articles'].hidden,false);
 assert.equal(s.tabClicks.at(-1),'tab-evidence');
});
test('Project 006 shows browser adaptation details and its article placeholder',()=>{
 const s=setup();
 s.buttons.find(b=>b.dataset.featureSelect==='columns').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 006 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'Color Columns');
 assert.match(s.ids['featured-meta'].textContent,/WebAssembly.*Browser adaptation/);
 assert.equal(s.ids['tab-articles'].hidden,false);
 s.buttons.find(b=>b.dataset.featureSelect==='analyzer').click();
 assert.equal(s.ids['tab-articles'].hidden,true);
});
test('Project 004 has its own metadata, focus announcement and reduced-motion scroll',()=>{
 const s=setup(true);s.buttons.find(b=>b.dataset.featureSelect==='security').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 004 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'Security Proposal Workspace');
 assert.equal(s.ids['featured-title'].focused,true);
 assert.equal(s.ids.featured.scrolled.behavior,'instant');
 assert.match(s.ids['featured-status'].textContent,/004/);
});
test('Algorithm Explorer and SecureBank expose What Changed',()=>{
 const s=setup();
 assert.equal(s.ids['tab-what-changed'].hidden,true);
 const select=key=>s.buttons.find(b=>b.dataset.featureSelect===key).click();
 select('securebank');
 assert.equal(s.ids['tab-articles'].hidden,false);
 assert.equal(s.ids['tab-what-changed'].hidden,false);
 select('algorithm');
 assert.equal(s.ids['tab-articles'].hidden,true);
 assert.equal(s.ids['tab-what-changed'].hidden,false);
 select('security');
 assert.equal(s.ids['tab-articles'].hidden,false);
 assert.equal(s.ids['tab-what-changed'].hidden,true);
 select('assembly');
 assert.equal(s.ids['tab-articles'].hidden,true);
 assert.equal(s.ids['tab-what-changed'].hidden,true);
});
test('Office IT Buildout opens as Project 013 with the standard case study tabs',()=>{
 const s=setup();
 s.buttons.find(b=>b.dataset.featureSelect==='office').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 013 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'Office IT Buildout');
 assert.equal(s.ids['featured-badge'].textContent,'Case study');
 assert.equal(s.ids['tab-articles'].hidden,true);
 assert.equal(s.ids['tab-what-changed'].hidden,true);
});
test('Zoom Phone Migration opens as a separate Project 014 case study',()=>{
 const s=setup();
 s.buttons.find(b=>b.dataset.featureSelect==='zoom-phone').click();
 assert.equal(s.ids['featured-number'].textContent,'Project 014 / Featured project');
 assert.equal(s.ids['featured-title'].textContent,'Zoom Phone Migration');
 assert.equal(s.ids['featured-badge'].textContent,'Case study');
 assert.equal(s.ids['tab-articles'].hidden,true);
 assert.equal(s.ids['tab-what-changed'].hidden,true);
});

test('Microsoft 365 Migration opens completed Project 017 on Findings', () => {
  const s = setup();
  s.buttons.find(button => button.dataset.featureSelect === 'migration').click();
  assert.equal(s.ids['featured-number'].textContent, 'Project 017 / Featured project');
  assert.equal(s.ids['featured-title'].textContent, 'Microsoft 365 Migration');
  assert.equal(s.ids['featured-badge'].textContent, 'Complete');
  assert.deepEqual(s.tabClicks, ['tab-evidence', 'tab-evidence']);
  assert.equal(s.ids['tab-articles'].hidden, true);
  assert.equal(s.ids['tab-what-changed'].hidden, true);
});
