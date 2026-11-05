const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {load, valid} = require('../scripts/cisa-kev-chart.js');
const months=end=>Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(2026,end-12+i,1));return {month:d.toISOString().slice(0,7),count:i}});
const old={schemaVersion:1,catalogVersion:'2026.10.01',catalogReleased:'2026-10-01T00:00:00Z',catalogCount:100,months:months(10)};
const fresh={...old,catalogVersion:'2026.11.04',catalogReleased:'2026-11-04T20:00:05.774Z',catalogCount:101,months:months(11)};
test('loads a valid newer snapshot from GitHub',async()=>{let requested;const result=await load(async url=>{requested=url;return {ok:true,json:async()=>fresh}},old);assert.equal(result.data,fresh);assert.match(requested,/raw\.githubusercontent\.com/);assert.match(result.status,/release date/)});
test('network failure and older or invalid data preserve the backup',async()=>{for(const value of [null,{...old,catalogReleased:'2025-01-01T00:00:00Z'},{...fresh,months:[]}]){const result=await load(async()=>value?{ok:true,json:async()=>value}:Promise.reject(Error('offline')),old);assert.equal(result.data,old);assert.match(result.status,/backup/)} });
test('reports unavailable when neither snapshot is valid',async()=>{const result=await load(async()=>{throw Error('offline')},null);assert.equal(result.data,null);assert.match(result.status,/unavailable/)});
test('rejects repeated months, inconsistent totals and invalid dates',()=>{assert.equal(valid({...old,months:Array(12).fill({month:'2026-01',count:1})}),false);assert.equal(valid({...old,catalogCount:1}),false);assert.equal(valid({...old,catalogReleased:'2026-02-31T00:00:00Z'}),false)});

// Exercise the real chart with a delayed network response so a visitor can
// select a month while the refresh is in flight.
function setupChart(fallback) {
  const doc = {activeElement:null};
  class Node {
    constructor(tag) {this.tag=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.listeners={};this.textContent='';}
    append(...nodes){this.children.push(...nodes)}
    replaceChildren(...nodes){this.children=nodes}
    setAttribute(key,value){this.attributes[key]=String(value)}
    addEventListener(type,callback){this.listeners[type]=callback}
    contains(node){return node===this || this.children.some(child=>child.contains(node))}
    focus(){doc.activeElement=this}
  }
  const root=new Node('div'); doc.getElementById=()=>root; doc.createElement=tag=>new Node(tag);
  let resolveFetch, rejectFetch;
  const waiting=new Promise((resolve,reject)=>{resolveFetch=resolve;rejectFetch=reject});
  const win={KEV_FALLBACK_DATA:fallback,fetch:()=>waiting};
  const code=fs.readFileSync(path.join(__dirname,'../scripts/cisa-kev-chart.js'),'utf8');
  vm.runInNewContext(code,{document:doc,window:win,AbortController,setTimeout,clearTimeout,Date,Number,Math,JSON,Promise});
  const all=node=>[node,...node.children.flatMap(all)];
  const bars=()=>all(root).filter(node=>node.className==='kev-bar');
  return {bars,doc,resolveFetch,rejectFetch};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('failed refresh keeps the selected button and its focus',async()=>{
  const view=setupChart(fresh), original=view.bars(), target=original[3];
  target.focus();target.listeners.click();view.rejectFetch(Error('offline'));await flush();
  assert.equal(view.bars()[3],target);assert.equal(target.attributes['aria-pressed'],'true');assert.equal(view.doc.activeElement,target);
});
test('a newer snapshot preserves selected month and keyboard focus',async()=>{
  const view=setupChart(fresh), original=view.bars(), target=original[10];
  target.focus();target.listeners.click();
  const next={...fresh,catalogVersion:'2026.12.01',catalogReleased:'2026-12-01T00:00:00Z',months:months(12)};
  view.resolveFetch({ok:true,json:async()=>next});await flush();
  const replacement=view.bars().find(button=>button.dataset.month===target.dataset.month);
  assert.notEqual(replacement,target);assert.equal(replacement.attributes['aria-pressed'],'true');assert.equal(view.doc.activeElement,replacement);
});
