const canvas = document.getElementById('trackCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const playersSelect = document.getElementById('players');
const player2row = document.getElementById('player2row');

let DPR = window.devicePixelRatio || 1;
let trackPoints = [];
let center = {x:0,y:0};
let trackWidth = 100; // px
let startAngle = -Math.PI/2; // top

function resizeCanvas(){
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * DPR);
  canvas.height = Math.round(rect.height * DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  center.x = rect.width/2;
  center.y = rect.height/2;
}

function seededNoise(x){
  // deterministic pseudo-noise for consistent track
  return (Math.sin(x*12.9898) * 43758.5453) % 1;
}

function generateTrack(samples=360){
  trackPoints = [];
  const rect = canvas.getBoundingClientRect();
  const w = rect.width; const h = rect.height;
  const baseR = Math.min(w,h) * 0.36;
  for(let i=0;i<samples;i++){
    const a = (i/samples) * Math.PI * 2;
    const rVariation = Math.sin(a*3)* (baseR*0.12) + Math.cos(a*5)*(baseR*0.07) + (Math.sin(a*7)*20);
    const r = baseR + rVariation;
    const x = center.x + Math.cos(a)*r;
    const y = center.y + Math.sin(a)*r;
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

  // inner infield slightly darker (draw center path filled with darker color on top of stroke)
  ctx.beginPath();
  ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
  for(let i=1;i<trackPoints.length;i++) ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
  ctx.closePath();
  ctx.fillStyle = '#0f1720';
  ctx.fill('evenodd');

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

  const lineLen = 140;
  const x1 = p.x + nx * lineLen/2;
  const y1 = p.y + ny * lineLen/2;
  const x2 = p.x - nx * lineLen/2;
  const y2 = p.y - ny * lineLen/2;

  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.lineWidth = 3;
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
  const next = trackPoints[(trackPoints.indexOf(p)+1) % trackPoints.length];
  const tx = next.x - p.x; const ty = next.y - p.y;
  const len = Math.hypot(tx,ty) || 1;
  const nx = -ty/len; const ny = tx/len; // normal

  const offsets = num===1 ? [0] : [-18,18];
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

playersSelect.addEventListener('change',(e)=>{
  const v = parseInt(e.target.value,10);
  player2row.style.display = v===2 ? '' : 'none';
  drawTrack();
});

startBtn.addEventListener('click', ()=>{
  // for now: reset scores and redraw and show where cars start
  document.getElementById('p1score').textContent = '0';
  document.getElementById('p2score').textContent = '0';
  drawTrack();
});

init();
