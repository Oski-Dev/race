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
let perimeter = 0; // total track length
let gates = []; // gate positions (indices along trackPoints)

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
  // shrink scale to ensure track fits entirely in viewport
  if(rect.width > rect.height){
    scaleX = 0.8; scaleY = 0.6;
  } else {
    scaleX = 0.6; scaleY = 0.8;
  }
}

function seededNoise(x){
  // deterministic pseudo-noise for consistent track
  return (Math.sin(x*12.9898) * 43758.5453) % 1;
}

function generateTrack(samples=360){
  // simplified rounded rectangle track
  trackPoints = [];
  const rect = canvas.getBoundingClientRect();
  const w = rect.width * 0.7;
  const h = rect.height * 0.7;
  const halfW = w / 2;
  const halfH = h / 2;
  const cornerRadius = Math.min(halfW, halfH) * 0.25;

  // build track points going clockwise
  // top straight
  for(let i=0; i<=50; i++){
    const x = center.x - halfW + cornerRadius + (i/50) * (halfW * 2 - cornerRadius * 2);
    const y = center.y - halfH;
    trackPoints.push({x, y, a: 0});
  }
  // top-right corner
  for(let i=0; i<=40; i++){
    const t = i/40;
    const a = -Math.PI/2 + t * Math.PI/2;
    const x = center.x + halfW - cornerRadius + Math.cos(a) * cornerRadius;
    const y = center.y - halfH + cornerRadius + Math.sin(a) * cornerRadius;
    trackPoints.push({x, y, a: a + Math.PI/2});
  }
  // right straight
  for(let i=0; i<=50; i++){
    const x = center.x + halfW;
    const y = center.y - halfH + cornerRadius + (i/50) * (halfH * 2 - cornerRadius * 2);
    trackPoints.push({x, y, a: Math.PI/2});
  }
  // bottom-right corner
  for(let i=0; i<=40; i++){
    const t = i/40;
    const a = 0 + t * Math.PI/2;
    const x = center.x + halfW - cornerRadius + Math.cos(a) * cornerRadius;
    const y = center.y + halfH - cornerRadius + Math.sin(a) * cornerRadius;
    trackPoints.push({x, y, a: a + Math.PI/2});
  }
  // bottom straight
  for(let i=0; i<=50; i++){
    const x = center.x + halfW - cornerRadius - (i/50) * (halfW * 2 - cornerRadius * 2);
    const y = center.y + halfH;
    trackPoints.push({x, y, a: Math.PI});
  }
  // bottom-left corner
  for(let i=0; i<=40; i++){
    const t = i/40;
    const a = Math.PI/2 + t * Math.PI/2;
    const x = center.x - halfW + cornerRadius + Math.cos(a) * cornerRadius;
    const y = center.y + halfH - cornerRadius + Math.sin(a) * cornerRadius;
    trackPoints.push({x, y, a: a + Math.PI/2});
  }
  // left straight
  for(let i=0; i<=50; i++){
    const x = center.x - halfW;
    const y = center.y + halfH - cornerRadius - (i/50) * (halfH * 2 - cornerRadius * 2);
    trackPoints.push({x, y, a: -Math.PI/2});
  }
  // top-left corner
  for(let i=0; i<=40; i++){
    const t = i/40;
    const a = Math.PI + t * Math.PI/2;
    const x = center.x - halfW + cornerRadius + Math.cos(a) * cornerRadius;
    const y = center.y - halfH + cornerRadius + Math.sin(a) * cornerRadius;
    trackPoints.push({x, y, a: a + Math.PI/2});
  }
  
  perimeter = trackPoints.length;
  if(trackPoints.length>0) startAngle = trackPoints[0].a;
  
  // place gates evenly around track (4 gates)
  gates = [];
  const gateCount = 4;
  for(let i=0;i<gateCount;i++){
    const gateIdx = Math.round((i / gateCount) * trackPoints.length) % trackPoints.length;
    gates.push({idx: gateIdx, passed: false});
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
  drawGates();
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

function drawGates(){
  // draw gate markers at each gate position
  for(const gate of gates){
    const p = trackPoints[gate.idx];
    const next = trackPoints[(gate.idx+1) % trackPoints.length];
    const tx = next.x - p.x, ty = next.y - p.y;
    const len = Math.hypot(tx,ty) || 1;
    const nx = -ty/len, ny = tx/len;
    // draw a vertical line across track
    const half = trackWidth*0.45;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * half, p.y + ny * half);
    ctx.lineTo(p.x - nx * half, p.y - ny * half);
    ctx.lineWidth = 3;
    ctx.strokeStyle = gate.passed ? '#22c55e' : '#f97316'; // green if passed, orange if not
    ctx.stroke();
  }
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

function isOnTrack(x, y){
  // find distance to centerline
  let minDist = 1e9;
  for(const pt of trackPoints){
    const dx = pt.x - x, dy = pt.y - y;
    const dist = Math.hypot(dx, dy);
    minDist = Math.min(minDist, dist);
  }
  // on track if within trackWidth/2
  return minDist <= trackWidth/2 + 5; // small margin
}

function lineSegmentCross(x1,y1, x2,y2, x3,y3, x4,y4){
  // check if line segment (x1,y1)-(x2,y2) crosses line segment (x3,y3)-(x4,y4)
  const ccw = (ax,ay, bx,by, cx,cy) => (cy-ay)*(bx-ax) > (by-ay)*(cx-ax);
  return ccw(x1,y1,x3,y3,x4,y4) !== ccw(x2,y2,x3,y3,x4,y4) && 
         ccw(x1,y1,x2,y2,x3,y3) !== ccw(x1,y1,x2,y2,x4,y4);
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
    this.onTrack = true;
    this.gatesPassed = 0; // number of gates passed
    this.lastCrossedStartLine = false; // did we cross start in last frame?
  }
  resetTo(point, offset, angle){
    const nx = Math.cos(angle + Math.PI/2);
    const ny = Math.sin(angle + Math.PI/2);
    this.x = point.x + nx * offset;
    this.y = point.y + ny * offset;
    this.angle = angle;
    this.speed = 0;
    this.gatesPassed = 0;
    this.lastCrossedStartLine = false;
  }
  update(dt, input){
    // check if on track
    this.onTrack = isOnTrack(this.x, this.y);
    
    // acceleration with speed penalty if off-track
    const currentMaxSpeed = this.onTrack ? this.maxSpeed : this.maxSpeed * 0.5;
    if(input && input.up){
      this.speed += this.accel * dt;
      if(this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
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
    vv.gatesPassed = 0;
    vv.lastCrossedStartLine = false;
    vehicles.push(vv);
  }
  // reset gates
  for(const gate of gates) gate.passed = false;
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
  if(vehicles[0]){
    vehicles[0].update(dt, controls);
    checkGatePassing(vehicles[0], 0); // player 1
  }
  // player 2 has no input for now (idle)
  if(vehicles[1]){
    vehicles[1].update(dt, null);
    checkGatePassing(vehicles[1], 1); // player 2
  }
  // redraw
  drawTrack();
  requestAnimationFrame(loop);
}

function checkGatePassing(vehicle, playerIdx){
  if(!vehicle.prevX) { vehicle.prevX = vehicle.x; vehicle.prevY = vehicle.y; }
  
  // check each gate for line crossing
  for(let g=0; g<gates.length; g++){
    const gate = gates[g];
    const gp = trackPoints[gate.idx];
    const next = trackPoints[(gate.idx+1) % trackPoints.length];
    const tx = next.x - gp.x, ty = next.y - gp.y;
    const len = Math.hypot(tx,ty) || 1;
    const nx = -ty/len, ny = tx/len;
    
    // gate posts
    const half = trackWidth*0.45;
    const g1x = gp.x + nx * half, g1y = gp.y + ny * half;
    const g2x = gp.x - nx * half, g2y = gp.y - ny * half;
    
    // check if vehicle crossed from prev to current position
    if(!gate.passed && lineSegmentCross(vehicle.prevX, vehicle.prevY, vehicle.x, vehicle.y, g1x, g1y, g2x, g2y)){
      gate.passed = true;
      vehicle.gatesPassed++;
    }
  }
  
  vehicle.prevX = vehicle.x;
  vehicle.prevY = vehicle.y;
  
  // check for lap completion: all gates passed + crossing start line again
  if(vehicle.gatesPassed >= gates.length){
    const startPt = trackPoints[0];
    const distToStart = Math.hypot(vehicle.x - startPt.x, vehicle.y - startPt.y);
    if(distToStart < trackWidth*0.8 && !vehicle.lastCrossedStartLine){
      // completed a lap!
      vehicle.lastCrossedStartLine = true;
      const laps = parseInt(document.getElementById(playerIdx === 0 ? 'p1score' : 'p2score').textContent) + 1;
      document.getElementById(playerIdx === 0 ? 'p1score' : 'p2score').textContent = String(laps);
      // reset gates
      for(const g of gates) g.passed = false;
      vehicle.gatesPassed = 0;
    } else if(distToStart >= trackWidth && vehicle.lastCrossedStartLine){
      vehicle.lastCrossedStartLine = false;
    }
  }
}
init();
