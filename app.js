const canvas = document.getElementById('trackCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const playersToggle = document.getElementById('playersToggle');
const player2row = document.getElementById('player2row');

let DPR = window.devicePixelRatio || 1;
let trackPoints = [];
let center = {x:0,y:0};
let trackWidth = 240; // px — szerszy tor
let startAngle = -Math.PI/2; // will be set from track
let scaleX = 1, scaleY = 1;

let vehicles = [];
let lastTime = 0;
const controls = {up:false,left:false,right:false};

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
  // generate a rounded-rectangle centerline so the track looks classic
  trackPoints = [];
  const rect = canvas.getBoundingClientRect();
  const w = rect.width; const h = rect.height;
  // available half-sizes taking track width into account
  const availHalfW = (w/2 - trackWidth/2) / scaleX;
  const availHalfH = (h/2 - trackWidth/2) / scaleY;
  const cornerRadius = Math.max(20, Math.min(availHalfW, availHalfH) * 0.18);

  // lengths of straight segments and corner arcs
  const topStraight = (availHalfW - cornerRadius);
  const rightStraight = (availHalfH - cornerRadius) * 2;
  const bottomStraight = (availHalfW - cornerRadius) * 2;
  const leftStraight = (availHalfH - cornerRadius) * 2;
  const arcLen = 0.5 * Math.PI * cornerRadius;
  const perimeter = topStraight + arcLen + rightStraight + arcLen + bottomStraight + arcLen + leftStraight + arcLen + topStraight;

  function pointAtDistance(d){
    // start at top middle and go clockwise
    d = (d + 0) % perimeter;
    // segment A: top middle -> top-right straight (distance up to topStraight)
    if(d <= topStraight){
      const x = center.x + (cornerRadius + d) * scaleX;
      const y = center.y - availHalfH * scaleY;
      return {x,y,angle:0}; // angle roughly 0 (right)
    }
    d -= topStraight;
    // top-right corner arc (clockwise, quarter circle)
    if(d <= arcLen){
      const t = d / arcLen; // 0..1
      const theta = -Math.PI/2 + t * (Math.PI/2); // from right-facing to down-facing
      const cx = center.x + (availHalfW - cornerRadius) * scaleX;
      const cy = center.y - (availHalfH - cornerRadius) * scaleY;
      const x = cx + Math.cos(theta) * cornerRadius * scaleX;
      const y = cy + Math.sin(theta) * cornerRadius * scaleY;
      return {x,y,angle:theta + Math.PI/2};
    }
    d -= arcLen;
    // right straight (downwards)
    if(d <= rightStraight){
      const t = d;
      const x = center.x + (availHalfW) * scaleX;
      const y = center.y - (availHalfH - cornerRadius) * scaleY + t * scaleY;
      return {x,y,angle:Math.PI/2};
    }
    d -= rightStraight;
    // bottom-right corner arc
    if(d <= arcLen){
      const t = d / arcLen;
      const theta = 0 + t * (Math.PI/2); // from down-facing to left-facing
      const cx = center.x + (availHalfW - cornerRadius) * scaleX;
      const cy = center.y + (availHalfH - cornerRadius) * scaleY;
      const x = cx + Math.cos(theta) * cornerRadius * scaleX;
      const y = cy + Math.sin(theta) * cornerRadius * scaleY;
      return {x,y,angle:theta + Math.PI/2};
    }
    d -= arcLen;
    // bottom straight (leftwards)
    if(d <= bottomStraight){
      const t = d;
      const x = center.x + (availHalfW - cornerRadius) * scaleX - t * scaleX;
      const y = center.y + availHalfH * scaleY;
      return {x,y,angle:Math.PI};
    }
    d -= bottomStraight;
    // bottom-left corner arc
    if(d <= arcLen){
      const t = d / arcLen;
      const theta = Math.PI/2 + t * (Math.PI/2); // left-facing to up-facing
      const cx = center.x - (availHalfW - cornerRadius) * scaleX;
      const cy = center.y + (availHalfH - cornerRadius) * scaleY;
      const x = cx + Math.cos(theta) * cornerRadius * scaleX;
      const y = cy + Math.sin(theta) * cornerRadius * scaleY;
      return {x,y,angle:theta + Math.PI/2};
    }
    d -= arcLen;
    // left straight (upwards)
    if(d <= leftStraight){
      const t = d;
      const x = center.x - availHalfW * scaleX;
      const y = center.y + (availHalfH - cornerRadius) * scaleY - t * scaleY;
      return {x,y,angle:-Math.PI/2};
    }
    d -= leftStraight;
    // top-left corner arc (ends back at top middle)
    if(d <= arcLen + 1){
      const t = d / arcLen;
      const theta = Math.PI + t * (Math.PI/2); // up-facing to right-facing
      const cx = center.x - (availHalfW - cornerRadius) * scaleX;
      const cy = center.y - (availHalfH - cornerRadius) * scaleY;
      const x = cx + Math.cos(theta) * cornerRadius * scaleX;
      const y = cy + Math.sin(theta) * cornerRadius * scaleY;
      return {x,y,angle:theta + Math.PI/2};
    }
    return {x:center.x,y:center.y,angle:0};
  }

  // sample along perimeter
  for(let i=0;i<samples;i++){
    const d = (i/samples) * perimeter;
    const pt = pointAtDistance(d);
    trackPoints.push({x:pt.x,y:pt.y,a:pt.angle});
  }
  // set startAngle to the tangent at first point
  if(trackPoints.length>0) startAngle = trackPoints[0].a;
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
  drawVehicles();
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
// Vehicle class representing a simple car (arrow)
class Vehicle{
  constructor(x,y,angle,color){
    this.x = x; this.y = y; this.angle = angle; this.color = color;
    this.speed = 0; // px/s
    this.maxSpeed = 240; // px/s
    this.accel = 600; // px/s^2
    this.decel = 260; // px/s^2
    this.turnRate = 3.5; // rad/s
  }
  resetTo(point, offset, angle){
    const nx = Math.cos(angle + Math.PI/2);
    const ny = Math.sin(angle + Math.PI/2);
    this.x = point.x + nx * offset;
    this.y = point.y + ny * offset;
    this.angle = angle;
    this.speed = 0;
  }
  update(dt, input){
    // acceleration
    if(input && input.up){
      this.speed += this.accel * dt;
      if(this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    } else {
      // gradual slowdown
      this.speed -= this.decel * dt;
      if(this.speed < 0) this.speed = 0;
    }
    // turning
    if(input && input.left){ this.angle -= this.turnRate * dt; this.speed *= 0.92; }
    if(input && input.right){ this.angle += this.turnRate * dt; this.speed *= 0.92; }

    // move
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }
  draw(ctx){
    // draw arrow-shaped vehicle
    const len = 22;
    const w = 12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(len, 0);
    ctx.lineTo(-len*0.4, -w);
    ctx.lineTo(-len*0.4, w);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    // windshield highlight
    ctx.beginPath();
    ctx.moveTo(len*0.2, -3);
    ctx.lineTo(len*0.6, 0);
    ctx.lineTo(len*0.2, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    ctx.restore();
  }
}

function drawVehicles(){
  // draw vehicles array if present; otherwise draw placeholders at start
  if(vehicles.length>0){
    for(const v of vehicles) v.draw(ctx);
    return;
  }
  // placeholder at start
  const p = pointAtAngle(startAngle);
  const idx = trackPoints.indexOf(p);
  const next = trackPoints[(idx+1) % trackPoints.length];
  const tx = next.x - p.x; const ty = next.y - p.y;
  const len = Math.hypot(tx,ty) || 1;
  const nx = -ty/len; const ny = tx/len; // normal
  const offsets = [-trackWidth*0.12, trackWidth*0.12];
  const colors = ['#ef4444','#3b82f6'];
  for(let i=0;i<2;i++){
    const cx = p.x + nx * offsets[i];
    const cy = p.y + ny * offsets[i];
    const tmp = new Vehicle(cx,cy,Math.atan2(ty,tx),colors[i]);
    tmp.draw(ctx);
  }
}

function init(){
  resizeCanvas();
  generateTrack(360);
  drawTrack();
}


window.addEventListener('resize', ()=>{ resizeCanvas(); generateTrack(360); drawTrack(); });

// keyboard controls for player 1
window.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowUp'){ controls.up = true; e.preventDefault(); }
  if(e.key === 'ArrowLeft'){ controls.left = true; e.preventDefault(); }
  if(e.key === 'ArrowRight'){ controls.right = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e)=>{
  if(e.key === 'ArrowUp'){ controls.up = false; }
  if(e.key === 'ArrowLeft'){ controls.left = false; }
  if(e.key === 'ArrowRight'){ controls.right = false; }
});

// players toggle handling
playersToggle.addEventListener('click', ()=>{
  const pressed = playersToggle.getAttribute('aria-pressed') === 'true';
  const next = !pressed;
  playersToggle.setAttribute('aria-pressed', String(next));
  playersToggle.textContent = next ? '2' : '1';
  player2row.style.display = next ? '' : 'none';
  drawTrack();
});
// start race: place two vehicles at the start line and begin animation
function startRace(){
  const p = pointAtAngle(startAngle);
  const idx = trackPoints.indexOf(p);
  const next = trackPoints[(idx+1) % trackPoints.length];
  const tx = next.x - p.x, ty = next.y - p.y;
  const angle = Math.atan2(ty, tx);
  const len = Math.hypot(tx,ty) || 1;
  const nx = -ty/len, ny = tx/len;
  const offsets = [-trackWidth*0.12, trackWidth*0.12];
  const colors = ['#ef4444','#3b82f6'];
  vehicles = [];
  for(let i=0;i<2;i++){
    const vv = new Vehicle(p.x + nx * offsets[i], p.y + ny * offsets[i], angle, colors[i]);
    vv.speed = 0;
    vehicles.push(vv);
  }
  // reset scoreboard
  document.getElementById('p1score').textContent = '0';
  document.getElementById('p2score').textContent = '0';
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', ()=> startRace());

function loop(ts){
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  lastTime = ts;
  // update player 1 with controls
  if(vehicles[0]) vehicles[0].update(dt, controls);
  // player 2 has no input for now (idle)
  if(vehicles[1]) vehicles[1].update(dt, null);
  // redraw
  drawTrack();
  requestAnimationFrame(loop);
}

init();
