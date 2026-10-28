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
  let scrollTop = 0, heroBottom = 650, rainBounds = null;
  const GLOW_RADIUS = 55;
  const REACH = 210; // Cursor influence extends beyond the small visible glow.
  const motion = Array.from({length: 9}, () => ({x: 0, y: 0}));

  // Cache layout on scroll/resize rather than measuring it every animation frame.
  function measure() {
    scrollTop = window.scrollY || 0;
    const hero = document.getElementById('home');
    const rain = document.getElementById('matrix-rain');
    if (hero) heroBottom = hero.getBoundingClientRect().bottom + scrollTop;
    const box = rain?.getBoundingClientRect();
    rainBounds = box && box.width && box.height && document.body.dataset.side !== 'creative'
      ? {left:box.left-16, right:box.right+16, top:box.top-16, bottom:box.bottom+16} : null;
  }

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
  // The first three shapes occupy the left margin. All others begin below
  // the hero, leaving the Matrix code its own dedicated visual space.
  const placements = [[.018,190,24],[.02,375,23],[.016,555,25],
    [.95,100,34],[.04,320,32],[.92,560,30],[.05,780,29],[.93,1000,30],[.06,1240,33]];

  function paused() { return reduced.matches || pause.getAttribute('aria-pressed') === 'true'; }
  function rotate(v, a, b) {
    const x = v[0] * Math.cos(a) + v[2] * Math.sin(a);
    const z = -v[0] * Math.sin(a) + v[2] * Math.cos(a);
    return [x, v[1] * Math.cos(b) - z * Math.sin(b), v[1] * Math.sin(b) + z * Math.cos(b)];
  }
  function draw(dt = 0) {
    ctx.clearRect(0,0,width,height);
    const red = document.body.dataset.side === 'creative';
    const color = red ? '255,166,173' : '77,191,145';
    // Low opacity under content avoids competing with text and project cards.
    models.forEach((model,index) => {
      if (width < 700 && ![0,2,4,6,8].includes(index)) return;
      const [px,py,size] = placements[index];
      const baseX = width * px;
      const baseY = (index < 3 ? py : heroBottom + py) - scrollTop + Math.sin(phase*.7 + index)*9;
      const scale = width < 700 ? size*.65 : size;
      let targetX = 0, targetY = 0;
      if (mouse && mouseAge < 1.8 && !paused() && pointer.matches) {
        const dx = baseX - mouse.x, dy = baseY - mouse.y;
        const distance = Math.hypot(dx,dy);
        const force = Math.max(0,1-distance/REACH) * 56 * (1-mouseAge/1.8);
        targetX = (distance ? dx/distance : 1) * force;
        targetY = (distance ? dy/distance : 0) * force;
      }
      // Exponential easing is independent of frame rate: a soft nudge followed
      // by a smooth return, not a jump or an accumulating particle trail.
      const ease = 1-Math.exp(-dt*7);
      motion[index].x += (targetX-motion[index].x)*ease;
      motion[index].y += (targetY-motion[index].y)*ease;
      const radius = scale*1.9;
      let cx = baseX + motion[index].x, cy = baseY + motion[index].y;
      // A cursor nudge must never push a solid back into the Matrix region.
      if (rainBounds && cy+radius > rainBounds.top && cy-radius < rainBounds.bottom &&
          cx+radius > rainBounds.left && cx-radius < rainBounds.right) {
        cx = rainBounds.left-radius-8;
      }
      if (cy+radius < 0 || cy-radius > height) return;
      const vertices = model.vertices.map(v => rotate(v,phase + index*.8 + motion[index].x*.012,phase*.6 + index*.4 + motion[index].y*.012));
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
    const glow = ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,GLOW_RADIUS);
    glow.addColorStop(0,`rgba(${color},${.085*fade})`);glow.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=glow;ctx.fillRect(mouse.x-GLOW_RADIUS,mouse.y-GLOW_RADIUS,GLOW_RADIUS*2,GLOW_RADIUS*2);
    ctx.font='10px Consolas, monospace';ctx.fillStyle=`rgba(${color},${.32*fade})`;
    ['01','<>'].forEach((symbol,i)=>ctx.fillText(symbol,mouse.x+14+i*17,mouse.y-16+Math.sin(i+phase)*4));
    // Background solids respond directly; no separate cursor-following shapes.

  }
  function frame(time) {
    frameId=null;
    if (paused() || document.hidden) return;
    if (!last) last=time;
    const elapsed=time-last;
    if (elapsed>=33) { const dt=Math.min(elapsed/1000,.1);phase+=dt*SPEED;mouseAge+=dt;draw(dt);last=time; }
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
    measure();draw();
    if (!paused() && !document.hidden) frameId=requestAnimationFrame(frame);
  }
  function resize() {
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);measure();draw();
  }
  window.addEventListener('pointermove',event=>{
    if (event.pointerType==='touch' || !pointer.matches || paused()) return;
    mouse={x:event.clientX,y:event.clientY};mouseAge=0;
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{mouse=null;draw();});
  window.addEventListener('blur',()=>{mouse=null;draw();});
  window.addEventListener('resize',resize);
  window.addEventListener('scroll',()=>{measure();if(paused()) draw();},{passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(()=>{measure();draw();}).observe(document.getElementById('home') || canvas);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  pointer.addEventListener('change',()=>{mouse=null;draw();});
  // Matrix remains the single owner of the pause state. Both views share it.
  creativePause?.addEventListener('click',()=>pause.click());
  new MutationObserver(sync).observe(pause,{attributes:true,attributeFilter:['aria-pressed']});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-side']});
  resize();sync();
})();
