/* FLOATING GEOMETRY
   Small 3D models are projected onto a decorative canvas. No library, tracking,
   or network request is needed. Change placements and SPEED to tune the scene. */
(() => {
  'use strict';
  const canvas = document.getElementById('geometry-field');
  const pause = document.getElementById('matrix-toggle');
  const creativePause = document.getElementById('geometry-toggle');
  const ctx = canvas?.getContext('2d');
  if (!ctx || !pause) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const SPEED = .12; // Radians per second: a full turn takes roughly a minute.
  let width = 0, height = 0, frameId = null, last = 0, phase = 0;
  let mouse = null, mouseAge = 3;

  // Edges join vertex indexes. Curved solids use sparse latitude/longitude
  // rings, keeping them recognizable without a dense mesh of tiny lines.
  function nearestEdges(vertices) {
    let shortest = Infinity;
    const pairs = [];
    vertices.forEach((a, i) => vertices.slice(i + 1).forEach((b, j) => {
      const distance = Math.hypot(...a.map((v, k) => v - b[k]));
      shortest = Math.min(shortest, distance); pairs.push([i, i + j + 1, distance]);
    }));
    return pairs.filter(p => p[2] < shortest * 1.01).map(p => p.slice(0, 2));
  }
  function poly(vertices) { return { vertices, edges: nearestEdges(vertices) }; }
  function prism(sides) {
    const vertices = [], edges = [];
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < sides; i++) {
      const a = i * Math.PI * 2 / sides;
      vertices.push([Math.cos(a), layer ? .8 : -.8, Math.sin(a)]);
      edges.push([layer * sides + i, layer * sides + (i + 1) % sides]);
      if (!layer) edges.push([i, i + sides]);
    }
    return { vertices, edges };
  }
  function curved(torus) {
    const vertices = [], edges = [], rows = torus ? 6 : 7, cols = 12;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = i * Math.PI * 2 / cols, b = torus ? j * Math.PI * 2 / rows : j * Math.PI / (rows - 1);
      const r = torus ? .8 + .28 * Math.cos(b) : Math.sin(b);
      vertices.push([r * Math.cos(a), torus ? .28 * Math.sin(b) : Math.cos(b), r * Math.sin(a)]);
      edges.push([j * cols + i, j * cols + (i + 1) % cols]);
      if (j < rows - 1 || torus) edges.push([j * cols + i, ((j + 1) % rows) * cols + i]);
    }
    return { vertices, edges };
  }
  const phi = (1 + Math.sqrt(5)) / 2;
  const cube = [];
  for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) cube.push([x,y,z]);
  const ico = [], dodeca = cube.map(v => v.map(n => n * .65));
  for (const a of [-1,1]) for (const b of [-1,1]) {
    ico.push([0,a/phi,b],[a/phi,b,0],[b,0,a/phi]);
    dodeca.push([0,a/phi*.65,b*phi*.65],[a/phi*.65,b*phi*.65,0],[b*phi*.65,0,a/phi*.65]);
  }
  const models = [poly(cube.map(v=>v.map(n=>n*.65))), poly([[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(v=>v.map(n=>n*.65))),
    poly([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]), poly(ico), poly(dodeca), prism(3), prism(6), curved(false), curved(true)];
  const placements = [[.92,.22,32],[.69,.34,33],[.81,.52,44],[.82,.19,35],[.94,.86,38],[.68,.81,31],[.96,.43,29],[.55,.18,30],[.91,.69,34]];

  function paused() { return reduced.matches || pause.getAttribute('aria-pressed') === 'true'; }
  function rotate(v, a, b) {
    const x = v[0] * Math.cos(a) + v[2] * Math.sin(a);
    const z = -v[0] * Math.sin(a) + v[2] * Math.cos(a);
    return [x, v[1] * Math.cos(b) - z * Math.sin(b), v[1] * Math.sin(b) + z * Math.cos(b)];
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    const red = document.body.dataset.side === 'creative';
    const color = red ? '255,166,173' : '77,191,145';
    // Low opacity under content avoids competing with text and project cards.
    models.forEach((model,index) => {
      if (width < 700 && ![0,2,8].includes(index)) return;
      const [px,py,size] = placements[index];
      const cx = width < 700 ? width * .91 : width * px;
      const cy = height * py + Math.sin(phase*.7 + index)*9;
      const scale = width < 700 ? size*.65 : size;
      const vertices = model.vertices.map(v => rotate(v,phase + index*.8,phase*.6 + index*.4));
      const points = vertices.map(v => [cx + v[0]*scale*3/(3+v[2]*.25), cy + v[1]*scale*3/(3+v[2]*.25)]);
      ctx.lineWidth = .8;
      for (const [a,b] of model.edges) {
        const depth = (vertices[a][2]+vertices[b][2])/2;
        ctx.strokeStyle = `rgba(${color},${.16 + (depth+1.7)*.055})`;
        ctx.beginPath();ctx.moveTo(...points[a]);ctx.lineTo(...points[b]);ctx.stroke();
      }
    });
    if (!mouse || mouseAge > 1.8 || paused() || !pointer.matches) return;
    const fade = Math.max(0,1-mouseAge/1.8);
    const glow = ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,160);
    glow.addColorStop(0,`rgba(${color},${.085*fade})`);glow.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=glow;ctx.fillRect(mouse.x-160,mouse.y-160,320,320);
    ctx.font='10px Consolas, monospace';ctx.fillStyle=`rgba(${color},${.32*fade})`;
    ['01','<>','{}'].forEach((s,i)=>ctx.fillText(s,mouse.x+30+i*23,mouse.y-25+Math.sin(i+phase)*12));
    // A small orbiting diamond and corner brackets accompany the code.
    ctx.strokeStyle=`rgba(${color},${.32*fade})`;ctx.lineWidth=.8;
    ctx.beginPath();ctx.moveTo(mouse.x-25,mouse.y-12);ctx.lineTo(mouse.x-18,mouse.y-5);ctx.lineTo(mouse.x-25,mouse.y+2);ctx.lineTo(mouse.x-32,mouse.y-5);ctx.closePath();ctx.stroke();
    ctx.strokeRect(mouse.x+42,mouse.y+22,10,10);
  }
  function frame(time) {
    frameId=null;
    if (paused() || document.hidden) return;
    if (!last) last=time;
    const elapsed=time-last;
    if (elapsed>=33) { const dt=Math.min(elapsed/1000,.1);phase+=dt*SPEED;mouseAge+=dt;draw();last=time; }
    frameId=requestAnimationFrame(frame);
  }
  function sync() {
    if (frameId!==null) cancelAnimationFrame(frameId);
    frameId=null;last=0;
    if (paused() || document.hidden) { mouse=null; }
    if (creativePause) {
      creativePause.hidden=false;
      creativePause.textContent=pause.textContent;
      creativePause.disabled=reduced.matches;
      creativePause.setAttribute('aria-pressed',String(paused()));
    }
    draw();
    if (!paused() && !document.hidden) frameId=requestAnimationFrame(frame);
  }
  function resize() {
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);draw();
  }
  window.addEventListener('pointermove',event=>{
    if (event.pointerType==='touch' || !pointer.matches || paused()) return;
    mouse={x:event.clientX,y:event.clientY};mouseAge=0;
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{mouse=null;draw();});
  window.addEventListener('blur',()=>{mouse=null;draw();});
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  pointer.addEventListener('change',()=>{mouse=null;draw();});
  // Matrix remains the single owner of the pause state. Both views share it.
  creativePause?.addEventListener('click',()=>pause.click());
  new MutationObserver(sync).observe(pause,{attributes:true,attributeFilter:['aria-pressed']});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-side']});
  resize();sync();
})();
