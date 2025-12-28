const canvas = document.getElementById('trackCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const playersSelect = document.getElementById('players');
const player2row = document.getElementById('player2row');

let DPR = window.devicePixelRatio || 1;
let trackPoints = [];
let center = {x:0,y:0};
let trackWidth = 140; // px (węższe->szersze wymóg)
let startAngle = -Math.PI/2; // top
let scaleX = 1, scaleY = 1;

function resizeCanvas(){
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * DPR);
  canvas.height = Math.round(rect.height * DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  center.x = rect.width/2;
  center.y = rect.height/2;
  // determine scale so track stretches with window orientation
  if(rect.width > rect.height){
    scaleX = 1.15; scaleY = 0.9;
  } else {
    scaleX = 0.9; scaleY = 1.05;
  }
}

function seededNoise(x){
  // deterministic pseudo-noise for consistent track
  return (Math.sin(x*12.9898) * 43758.5453) % 1;
}

function generateTrack(samples=360){
  trackPoints = [];
  const rect = canvas.getBoundingClientRect();
  const w = rect.width; const h = rect.height;
  // choose base radius so track (with width) fits in canvas after scaling
  const maxR_x = (w/2 - trackWidth/2) / scaleX;
  const maxR_y = (h/2 - trackWidth/2) / scaleY;
  const baseR = Math.min(maxR_x, maxR_y) * 0.88;
  for(let i=0;i<samples;i++){
    const a = (i/samples) * Math.PI * 2;
    const rVariation = Math.sin(a*3)* (baseR*0.12) + Math.cos(a*5)*(baseR*0.07) + (Math.sin(a*7)*20);
    const r = baseR + rVariation;
    const x = center.x + Math.cos(a)*r*scaleX;
    const y = center.y + Math.sin(a)*r*scaleY;
    trackPoints.push({x,y,a});
  }
}

function drawTrack(){
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0,0,rect.width,rect.height);
  // draw infield shadow
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,rect.width,rect.height);

  if(trackPoints.length===0) return;

  // track as wide stroke around center path
  ctx.beginPath();
  ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
  for(let i=1;i<trackPoints.length;i++){
    const p = trackPoints[i];
    ctx.lineTo(p.x,p.y);
  }
  ctx.closePath();
  ctx.lineWidth = trackWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b7280';
  ctx.stroke();

  // cover center with infield color to create ribbon effect (center fill)
  ctx.beginPath();
  ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
  for(let i=1;i<trackPoints.length;i++) ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
  ctx.closePath();
  ctx.fillStyle = '#0f1720';
  ctx.fill();

  drawStartLine();
  drawVehicles(parseInt(playersSelect.value,10));
}

function drawStartLine(){
  // find nearest track point to startAngle
  let best = 0; let bestDiff = 1e9;
  for(let i=0;i<trackPoints.length;i++){
    const d = Math.abs(normalizeAngle(trackPoints[i].a - startAngle));
    if(d < bestDiff){ bestDiff = d; best = i; }
  }
  const p = trackPoints[best];
  const next = trackPoints[(best+1)%trackPoints.length];
  const tx = next.x - p.x; const ty = next.y - p.y;
  const len = Math.hypot(tx,ty) || 1;
  const nx = -ty/len; const ny = tx/len; // normal
  // draw start line across the track only (from outer edge to inner edge)
  const inset = 4; // leave a small margin so line stays inside track
  const half = (trackWidth/2) - inset;
  const innerX = p.x + nx * half;
  const innerY = p.y + ny * half;
  const outerX = p.x - nx * half;
  const outerY = p.y - ny * half;
  ctx.beginPath();
  ctx.moveTo(innerX, innerY);
  ctx.lineTo(outerX, outerY);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

function normalizeAngle(a){
  while(a>Math.PI) a -= Math.PI*2;
  while(a<-Math.PI) a += Math.PI*2;
  return a;
}

function pointAtAngle(angle){
  // find closest point
  let best = 0; let bestDiff = 1e9;
  for(let i=0;i<trackPoints.length;i++){
    const d = Math.abs(normalizeAngle(trackPoints[i].a - angle));
    if(d < bestDiff){ bestDiff = d; best = i; }
  }
  return trackPoints[best];
}

function drawVehicles(num){
  const p = pointAtAngle(startAngle);
  const idx = trackPoints.indexOf(p);
  const next = trackPoints[(idx+1) % trackPoints.length];
  const tx = next.x - p.x; const ty = next.y - p.y;
  const len = Math.hypot(tx,ty) || 1;
  const nx = -ty/len; const ny = tx/len; // normal

  const offsets = num===1 ? [0] : [-20,20];
  const colors = ['#ef4444','#3b82f6'];
  for(let i=0;i<num;i++){
    const off = offsets[i] || 0;
    const cx = p.x + nx * off;
    const cy = p.y + ny * off;
    // vehicle body
    ctx.beginPath();
    ctx.fillStyle = colors[i%colors.length];
    ctx.arc(cx,cy,12,0,Math.PI*2);
    ctx.fill();
    // small windshield
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.arc(cx + (tx/len)*6, cy + (ty/len)*6,4,0,Math.PI*2);
    ctx.fill();
  }
}

function init(){
  resizeCanvas();
  generateTrack(360);
  drawTrack();
}


window.addEventListener('resize', ()=>{ resizeCanvas(); generateTrack(360); drawTrack(); });

// players toggle handling
const playersToggle = document.getElementById('playersToggle');
playersToggle.addEventListener('click', ()=>{
  const pressed = playersToggle.getAttribute('aria-pressed') === 'true';
  const next = !pressed;
  playersToggle.setAttribute('aria-pressed', String(next));
  playersToggle.textContent = next ? '2' : '1';
  player2row.style.display = next ? '' : 'none';
  drawTrack();
});

startBtn.addEventListener('click', ()=>{
  // reset scores and redraw
  document.getElementById('p1score').textContent = '0';
  document.getElementById('p2score').textContent = '0';
  drawTrack();
});

init();
