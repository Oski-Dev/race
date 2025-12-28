const canvas = document.getElementById('trackCanvas');
const ctx = canvas.getContext('2d');

let DPR = window.devicePixelRatio || 1;
let center = {x:0,y:0};
let vehicle = null;
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
}

// Vehicle class
class Vehicle{
  constructor(x,y,angle,color){
    this.x = x; this.y = y; this.angle = angle; this.color = color;
    this.speed = 0; // px/s
    this.maxSpeed = 240; // px/s
    this.accel = 600; // px/s^2
    this.decel = 260; // px/s^2
    this.turnRate = 3.5; // rad/s
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

function draw(){
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0,0,rect.width,rect.height);
  // draw background
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,rect.width,rect.height);
  
  // draw vehicle
  if(vehicle) vehicle.draw(ctx);
}

function init(){
  resizeCanvas();
  const rect = canvas.getBoundingClientRect();
  vehicle = new Vehicle(rect.width/2, rect.height/2, 0, '#ef4444');
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

window.addEventListener('resize', ()=>{ resizeCanvas(); draw(); });

// keyboard controls
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

function loop(ts){
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  lastTime = ts;
  
  // update vehicle
  if(vehicle) vehicle.update(dt, controls);
  
  // redraw
  draw();
  requestAnimationFrame(loop);
}

init();

function resizeCanvas(){
  DPR = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * DPR);
  canvas.height = Math.round(rect.height * DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  center.x = rect.width/2;
  center.y = rect.height/2;
}

// Vehicle class
class Vehicle{
  constructor(x,y,angle,color){
    this.x = x; this.y = y; this.angle = angle; this.color = color;
    this.speed = 0; // px/s
    this.maxSpeed = 240; // px/s
    this.accel = 600; // px/s^2
    this.decel = 260; // px/s^2
    this.turnRate = 3.5; // rad/s
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

function draw(){
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0,0,rect.width,rect.height);
  // draw background
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,rect.width,rect.height);
  
  // draw vehicle
  if(vehicle) vehicle.draw(ctx);
}

function init(){
  resizeCanvas();
  const rect = canvas.getBoundingClientRect();
  vehicle = new Vehicle(rect.width/2, rect.height/2, 0, '#ef4444');
  lastTime = performance.now();
  requestAnimationFrame(loop);
}


window.addEventListener('resize', ()=>{ resizeCanvas(); draw(); });

// keyboard controls
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

function loop(ts){
  const dt = Math.min(0.05, (ts - lastTime)/1000);
  lastTime = ts;
  
  // update vehicle
  if(vehicle) vehicle.update(dt, controls);
  
  // redraw
  draw();
  requestAnimationFrame(loop);
}

init();
