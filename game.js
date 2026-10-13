const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.querySelector('#start');
const gameScreen = document.querySelector('#game');
const scoreEl = document.querySelector('#score');
const hitsEl = document.querySelector('#hits');
const clawHitsEl = document.querySelector('#claw-hits');
const livesEl = document.querySelector('#lives');
const messageEl = document.querySelector('#message');
const overEl = document.querySelector('#game-over');
const finalScoreEl = document.querySelector('#final-score');
const keys = new Set();

/* Se conservan las teclas del computador y se añaden botones multitáctiles. */
const touchPointers=new Map();
function isPressed(direction){
  if(keys.has(direction))return true;
  for(const active of touchPointers.values())if(active.direction===direction)return true;
  return false;
}
function releaseTouchPointer(event){
  const active=touchPointers.get(event.pointerId);
  if(!active)return;
  touchPointers.delete(event.pointerId);
  for(const other of touchPointers.values())if(other.button===active.button)return;
  active.button.classList.remove('is-pressed');
  active.button.setAttribute('aria-pressed','false');
}
function clearTouchControls(){
  touchPointers.clear();
  document.querySelectorAll('.direction-button').forEach(button=>{
    button.classList.remove('is-pressed');
    button.setAttribute('aria-pressed','false');
  });
}
document.querySelectorAll('.direction-button').forEach(button=>{
  button.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse' && event.button!==0)return;
    event.preventDefault();
    touchPointers.set(event.pointerId,{direction:button.dataset.direction,button});
    button.classList.add('is-pressed');
    button.setAttribute('aria-pressed','true');
    if(button.setPointerCapture)button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointerup',releaseTouchPointer);
  button.addEventListener('pointercancel',releaseTouchPointer);
  button.addEventListener('lostpointercapture',releaseTouchPointer);
  button.addEventListener('contextmenu',event=>event.preventDefault());
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){keys.clear();clearTouchControls()}
});
const W = canvas.width, H = canvas.height;
const WORLD_W = 3600;
const cooper = {x:140,y:455,r:30,face:1};
const crab = {x:720,y:410,dir:-1};
let score=0, hits=0, clawHits=0, lives=3, playing=false, last=0, elapsed=0, safeUntil=0, messageUntil=0, animation=0;
let cameraX=0, nextCrabTurn=12, nextEscapeTurn=0;
let audioContext;

function playSound(notes){
  if(!audioContext)return;
  if(audioContext.state==='suspended')audioContext.resume();
  const start=audioContext.currentTime;
  notes.forEach(([frequency,delay,duration])=>{
    const oscillator=audioContext.createOscillator();
    const gain=audioContext.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start+delay);
    gain.gain.setValueAtTime(0.0001,start+delay);
    gain.gain.exponentialRampToValueAtTime(0.16,start+delay+0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+delay+duration);
    oscillator.connect(gain);gain.connect(audioContext.destination);
    oscillator.start(start+delay);oscillator.stop(start+delay+duration);
  });
}
function victorySound(){playSound([[523,0,.11],[659,.1,.11],[784,.2,.2]])}
function errorSound(){playSound([[330,0,.16],[220,.14,.26]])}

const cooperSprite = new Image();
cooperSprite.src = 'Assets/Cooper.png';

function reset(){
  if(!audioContext){const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(AudioContextClass)audioContext=new AudioContextClass()}
  if(audioContext&&audioContext.state==='suspended')audioContext.resume();
  keys.clear();clearTouchControls();
  score=0;hits=0;clawHits=0;lives=3;elapsed=0;safeUntil=0;messageUntil=0;
  cooper.x=140;cooper.y=455;crab.x=720;crab.y=410;crab.dir=-1;cameraX=0;nextCrabTurn=12;nextEscapeTurn=0;
  scoreEl.textContent=score;hitsEl.textContent=hits;clawHitsEl.textContent=clawHits;livesEl.textContent=lives;
  messageEl.classList.remove('show');overEl.classList.add('hidden');
  startScreen.classList.add('hidden');gameScreen.classList.remove('hidden');
  playing=true;last=performance.now();cancelAnimationFrame(animation);animation=requestAnimationFrame(frame);
}
document.querySelector('#play').addEventListener('click',reset);
document.querySelector('#restart').addEventListener('click',reset);
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();keys.add(k)}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{keys.clear();clearTouchControls()});
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function circle(x,y,r,fill,stroke,width=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function ellipse(x,y,rx,ry,fill,stroke,width=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function showMessage(text){messageEl.textContent=text;messageEl.classList.add('show');messageUntil=elapsed+1.25}
function respawn(){crab.x=clamp(cooper.x+(Math.random()<.5?-1:1)*(250+Math.random()*450),120,WORLD_W-150);crab.y=345+Math.random()*150;crab.dir=Math.random()<.5?-1:1;safeUntil=elapsed+.65}
function update(dt){
  elapsed+=dt;
  let dx=Number(isPressed('arrowright')||isPressed('d'))-Number(isPressed('arrowleft')||isPressed('a'));
  let dy=Number(isPressed('arrowdown')||isPressed('s'))-Number(isPressed('arrowup')||isPressed('w'));
  const length=Math.hypot(dx,dy)||1;
  cooper.x=clamp(cooper.x+dx/length*250*dt,45,WORLD_W-45);
  cooper.y=clamp(cooper.y+dy/length*250*dt,305,H-48);
  if(dx)cooper.face=Math.sign(dx);
  const cameraTarget=clamp(cooper.x-W*.5,0,WORLD_W-W);
  cameraX+=(cameraTarget-cameraX)*(1-Math.exp(-6*dt));
  const speed=100+Math.floor(score/5)*20;
  if(Math.abs(crab.x-cooper.x)<250&&elapsed>=nextEscapeTurn){crab.dir=Math.sign(crab.x-cooper.x)||crab.dir;nextEscapeTurn=elapsed+2.5}
  if(elapsed>=nextCrabTurn){if(Math.random()<.35)crab.dir*=-1;nextCrabTurn=elapsed+12}
  crab.x+=crab.dir*speed*dt;
  if(crab.x<95){crab.x=95;crab.dir=1}
  if(crab.x>WORLD_W-150){crab.x=WORLD_W-150;crab.dir=-1}
  if(elapsed>=safeUntil){
    const cooperHitX=cooper.x, cooperHitY=cooper.y-45;
    // The claw has priority where its hit area meets the body.
    const clawX=crab.x+crab.dir*91, clawY=crab.y-10;
    if(Math.hypot(cooperHitX-clawX,cooperHitY-clawY)<cooper.r+31){
      clawHits++;clawHitsEl.textContent=clawHits;lives--;livesEl.textContent=lives;showMessage('¡Cuidado con la tenaza!');errorSound();
      if(lives===0){playing=false;finalScoreEl.textContent=score;overEl.classList.remove('hidden')}
      else respawn();
    }else if(Math.hypot(cooperHitX-crab.x,cooperHitY-crab.y)<cooper.r+37){
      score++;hits++;scoreEl.textContent=score;hitsEl.textContent=hits;showMessage('¡Cooper lo atrapó!');victorySound();respawn();
    }
  }
  if(elapsed>messageUntil)messageEl.classList.remove('show');
}
function background(){
  const sky=ctx.createLinearGradient(0,0,0,350);sky.addColorStop(0,'#159ce8');sky.addColorStop(1,'#b5f2ff');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  circle(790-cameraX*.06,86,54,'#ffe65c');
  for(let i=0;i<17;i++){
    const x=i*250+80-cameraX*.18;
    ellipse(x,92+(i%3)*28,75,22,'#ffffffa8');
    ellipse(x+38,83+(i%3)*28,50,27,'#ffffffa8');
  }
  ctx.fillStyle='#4cb3d5';ctx.fillRect(0,260,W,90);
  ctx.fillStyle='#147fac';ctx.fillRect(0,292,W,62);
  for(let i=0;i<28;i++)ellipse(i*145-cameraX*.45,310+(i%3)*11,48,3,'#c7f8ff');
  // Far coastal greenery moves more slowly than the foreground.
  for(let i=0;i<20;i++){
    const x=i*205-cameraX*.45;
    ellipse(x,327,91,29,i%2?'#478d66':'#398e79');
  }
  ctx.save();ctx.translate(-cameraX,0);
  ctx.fillStyle='#edcf8e';ctx.fillRect(0,344,WORLD_W,H-344);
  ctx.fillStyle='#f9e4ab';for(let i=0;i<31;i++)ellipse(i*125,386+(i%3)*19,92,31,'#f9e4ab');
  ctx.strokeStyle='#e4b56c';ctx.lineWidth=3;
  for(let y=455;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y+9);ctx.stroke()}
  // A few repeated landmarks, spaced far enough to leave the route open.
  for(let i=0;i<6;i++){
    const base=i*620;
    for(const x of [base+75,base+525]){
      ctx.fillStyle='#85522f';ctx.beginPath();ctx.moveTo(x-8,346);ctx.quadraticCurveTo(x+14,245,x-3,171);ctx.lineTo(x+9,171);ctx.quadraticCurveTo(x+28,242,x+5,346);ctx.fill();
      for(let j=0;j<6;j++){
        const angle=j*Math.PI/3;
        ctx.save();ctx.translate(x+3,172);ctx.rotate(angle);
        ellipse(37,0,47,10,j%2?'#188c46':'#32ad55');ctx.restore();
      }
    }
    for(const x of [base+290,base+370]){
      circle(x,355,21,'#268e4b');circle(x+14,350,18,'#39af50');
      circle(x+8,336,5,'#f26896');
    }
    for(const x of [base+180,base+460]){
      ellipse(x,489,19,9,'#b7a37d');ellipse(x+8,485,8,4,'#d0c3a0');
    }
    for(const x of [base+245,base+555]){
      ctx.strokeStyle='#e9a666';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,526,10,.2,Math.PI*1.9);ctx.stroke();
    }
    for(let j=0;j<4;j++){
      const x=base+110+j*105,y=461+(j%2)*75;
      circle(x,y,4,'#ce9e63');circle(x+10,y-4,3,'#ce9e63');circle(x+19,y,4,'#ce9e63');
    }
    circle(base+410,545,16,'#1684c2','#f8f4dc',3);
    circle(base+417,539,4,'#f8f4dc');
  }
  // The house and patio are distinct from the longer beach section.
  ctx.fillStyle='#e9dbc2';ctx.fillRect(0,363,720,45);
  for(let row=0;row<3;row++)for(let col=0;col<8;col++){
    const x=16+col*88+(row%2)*30,y=417+row*62;
    ctx.fillStyle=(row+col)%2?'#e5c99b':'#f2d7a5';
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+77,y+3);ctx.lineTo(x+69,y+48);ctx.lineTo(x-4,y+45);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='#ffffff';ctx.fillRect(85,215,157,143);
  ctx.fillStyle='#d97843';ctx.beginPath();ctx.moveTo(65,219);ctx.lineTo(163,155);ctx.lineTo(260,219);ctx.fill();
  ctx.fillStyle='#328dbb';ctx.fillRect(126,256,58,102);ctx.fillRect(199,249,30,34);
  ctx.fillStyle='#ae6d39';ctx.fillRect(1030,250,11,99);ctx.fillRect(1110,250,11,99);ctx.fillRect(1008,235,132,40);
  ctx.fillStyle='#fff5c7';ctx.font='bold 22px Trebuchet MS';ctx.fillText('PLAYA →',1017,261);
  // A few unique landmarks break up the repeated beach scenery.
  for(const [x,y] of [[1450,535],[2630,492],[3180,545]]){
    ctx.fillStyle='#e9b77b';ctx.beginPath();
    for(let tip=0;tip<10;tip++){
      const a=tip*Math.PI/5, radius=tip%2?9:22;
      const px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;
      if(tip)ctx.lineTo(px,py);else ctx.moveTo(px,py);
    }
    ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='#d8b17b';ctx.beginPath();ctx.moveTo(1860,505);ctx.quadraticCurveTo(1880,475,1903,503);ctx.quadraticCurveTo(1880,516,1860,505);ctx.fill();
  ctx.strokeStyle='#f8e6bd';ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(1881,501);ctx.lineTo(1867+i*9,494);ctx.stroke()}
  ctx.fillStyle='#146bba';ctx.fillRect(2910,514,77,11);circle(2916,528,9,'#304b61');circle(2980,528,9,'#304b61');
  ctx.restore();
}
function drawCooper(){
  if(!cooperSprite.complete||!cooperSprite.naturalWidth)return;
  const walking=isPressed('arrowleft')||isPressed('arrowright')||isPressed('arrowup')||isPressed('arrowdown')||isPressed('a')||isPressed('d')||isPressed('w')||isPressed('s');
  const trot=walking?Math.sin(elapsed*17):0;
  const bob=walking?Math.abs(trot)*4:Math.sin(elapsed*2)*.7;
  ctx.save();
  ctx.translate(cooper.x,cooper.y-bob);
  ctx.scale(cooper.face,1);
  ctx.rotate(walking?trot*.025:0);
  ctx.scale(1+(walking?Math.abs(trot)*.012:0),1-(walking?Math.abs(trot)*.009:0));
  ctx.drawImage(cooperSprite,-102,-159,204,202);
  ctx.restore();
}
function drawCrab(){
  const x=crab.x,y=crab.y,d=crab.dir;
  ctx.save();ctx.translate(x,y);ctx.scale(d,1);
  ctx.strokeStyle='#526a78';ctx.lineWidth=10;ctx.lineCap='round';
  for(const side of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(side*27,8+i*7);ctx.lineTo(side*(55+i*5),22+i*8);ctx.lineTo(side*(63+i*7),39+i*5);ctx.stroke()}
  // Small left claw and oversized right claw.
  ctx.beginPath();ctx.moveTo(-25,-10);ctx.lineTo(-65,-34);ctx.stroke();ellipse(-70,-37,18,15,'#8298a7','#405665',4);
  ctx.beginPath();ctx.moveTo(31,-13);ctx.lineTo(72,-17);ctx.stroke();
  ellipse(91,-10,36,33,'#90a8b8','#405665',5);
  ctx.fillStyle='#edcf8e';ctx.beginPath();ctx.moveTo(99,-10);ctx.lineTo(126,-29);ctx.lineTo(124,2);ctx.closePath();ctx.fill();
  ellipse(0,0,42,34,'#7d98a9','#425b6c',4);ellipse(0,13,30,14,'#abc1c5');
  ctx.strokeStyle='#405665';ctx.lineWidth=5;for(const px of [-16,17]){ctx.beginPath();ctx.moveTo(px,-24);ctx.lineTo(px,-49);ctx.stroke();circle(px,-52,12,'#fff','#405665',3);circle(px+3,-52,5,'#172b39')}
  ctx.beginPath();ctx.arc(2,2,15,.18,Math.PI-.18);ctx.strokeStyle='#405665';ctx.lineWidth=3;ctx.stroke();
  ctx.restore();
}
function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(playing)update(dt);
  background();ctx.save();ctx.translate(-cameraX,0);drawCrab();drawCooper();ctx.restore();
  if(playing)animation=requestAnimationFrame(frame);
}
