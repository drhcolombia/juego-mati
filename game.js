import * as T from './vendor/three.module.js';
import {LEVELS,PRIZES,clamp,move,freshState,award} from './src/level.js';
import {createWorld} from './src/world.js';
import {createForestWorld} from './src/world-forest.js';
import {createCooper,createCrab,createPrize,mat} from './src/models.js';
import {Controls} from './src/input.js';
import {Sound} from './src/audio.js?v=2.2';

const $=id=>document.getElementById(id),canvas=$('world');
let renderer;
try{
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
}catch{
  $('loading').innerHTML='<strong>Este navegador no pudo abrir el patio 3D.</strong><span>Prueba con una versión reciente de Safari o Chrome.</span>';
  throw new Error('WebGL2 unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
let scene=new T.Scene();
const camera=new T.PerspectiveCamera(46,1,.1,100);
let world=createWorld(scene);
const dog=createCooper(),crab=createCrab();
scene.add(dog.root,crab.root);
const worlds={patio:{scene,world}};
let selectedWorld='patio',activeLevel=LEVELS.patio;
const controls=new Controls($('joystick')),sound=new Sound();
let state={...freshState(),mode:'intro'},player={...activeLevel.spawn},enemy={...activeLevel.crabSpawn},target={x:7,z:-8};
let heading=Math.PI,enemyHeading=0,aiTimer=0,attackTimer=0,phase='roam',captureGrace=0,stepTimer=0,moodUntil=0,mood='idle',t=0,toastUntil=0;
const look=new T.Vector3(0,0,0),desired=new T.Vector3(),clock=new T.Clock();
const prizes=PRIZES.map((p,i)=>{
  const root=new T.Group();root.position.set(p.x,.9,p.z);const item=createPrize(p.type);root.add(item);scene.add(root);
  const ring=new T.Mesh(new T.RingGeometry(.42,.49,24),new T.MeshBasicMaterial({color:'#ffe79d',side:T.DoubleSide,transparent:true,opacity:.65}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.025,p.z);scene.add(ring);
  return {root,ring,item,id:i};
});
const warning=new T.Mesh(new T.RingGeometry(1.50,1.63,48),new T.MeshBasicMaterial({color:'#efb85b',transparent:true,opacity:.85,side:T.DoubleSide}));warning.rotation.x=-Math.PI/2;warning.visible=false;scene.add(warning);
const particleGeometry=new T.OctahedronGeometry(.07),particles=[];

// El selector conserva las escenas para que cambiar de mundo no requiera
// descargar recursos ni volver a construir el mundo anterior.
function chooseWorld(key){
  if(!LEVELS[key])return;
  if(key!==selectedWorld){
    if(!worlds[key]){
      const nextScene=new T.Scene();
      worlds[key]={scene:nextScene,world:createForestWorld(nextScene)};
    }
    for(const particle of particles)particle.m.parent?.remove(particle.m);
    particles.length=0;
    ({scene,world}=worlds[key]);
    scene.add(dog.root,crab.root,warning);
    prizes.forEach(p=>scene.add(p.root,p.ring));
  }
  selectedWorld=key;
  activeLevel=LEVELS[key];
  player={...activeLevel.spawn};enemy={...activeLevel.crabSpawn};
  dog.root.position.set(player.x,0,player.z);
  crab.root.position.set(enemy.x,0,enemy.z);
  const forest=key==='forest';
  $('level-badge').textContent=forest?'MUNDO 2':'MUNDO 1';
  $('level-name').textContent=forest?'El Bosque Encantado':'El patio de Cooper';
  $('intro-subtitle').textContent=forest?'y el Bosque Encantado':'y el patio de los tesoros';
  $('intro-description').textContent=forest?'¡Cruza el puente y encuentra los tesoros mágicos!':'Un jardín conocido. ¡Una aventura nueva!';
  $('scene-caption').textContent=forest?'✨ MUNDO 2 · EL BOSQUE ENCANTADO':'☀ MUNDO 1 · EL PATIO DE COOPER';
  document.querySelectorAll('[data-world]').forEach(button=>{
    const selected=button.dataset.world===key;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  prizes.forEach((p,i)=>{
    const pos=activeLevel.prizes[i];
    p.root.position.set(pos.x,.9,pos.z);
    p.ring.position.set(pos.x,.025,pos.z);
    p.root.visible=p.ring.visible=true;
  });
  if(forest)renderer.compile(scene,camera);
}

function burst(x,z,color){for(let i=0;i<18;i++){const m=new T.Mesh(particleGeometry,mat(color));m.position.set(x,.8,z);scene.add(m);particles.push({m,v:new T.Vector3((Math.random()-.5)*3,2+Math.random()*2,(Math.random()-.5)*3),life:.8+Math.random()*.4})}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=t+2.8}
function ui(){
  $('captures').textContent=`${state.captures} / 5`;$('prizes').textContent=`${state.prizes} / 5`;
  $('hearts').textContent='♥ '.repeat(state.lives)+'♡ '.repeat(3-state.lives);$('hearts').setAttribute('aria-label',`${state.lives} vidas`);
}
function restart(){
  sound.unlock();controls.clear();state=freshState();player={...activeLevel.spawn};enemy={...activeLevel.crabSpawn};heading=Math.PI;enemyHeading=0;aiTimer=0;phase='roam';captureGrace=0;attackTimer=0;stepTimer=0;moodUntil=0;warning.visible=false;
  prizes.forEach(p=>{p.root.visible=true;p.ring.visible=true});
  for(const id of ['intro','pause-screen','result'])$(id).hidden=true;
  $('hud').hidden=false;$('controls').hidden=false;$('bark').hidden=false;$('confetti').replaceChildren();ui();
  look.set(player.x,1,player.z);camera.position.set(player.x,12,player.z+14);
  toast(selectedWorld==='forest'?'¡Mati, cruza el puente y busca los tesoros mágicos!':'¡Vamos, Mati! Busca al cangrejo y los 5 premios.');
}
function pause(){if(state.mode!=='playing')return;state.mode='paused';controls.clear();$('pause-screen').hidden=false;$('controls').hidden=true;$('bark').hidden=true}
function resume(){if(state.mode!=='paused')return;state.mode='playing';sound.unlock();controls.clear();$('pause-screen').hidden=true;$('controls').hidden=false;$('bark').hidden=false;clock.getDelta()}
// A non-primary finger may not generate a click on mobile browsers.
function onPress(button,action){
  let lastTouch=-1000;
  button.addEventListener('pointerup',e=>{if(e.pointerType==='touch'){e.preventDefault();lastTouch=performance.now();action()}});
  button.addEventListener('click',()=>{if(performance.now()-lastTouch>500)action()});
}
onPress($('play'),restart);
document.querySelectorAll('[data-world]').forEach(button=>onPress(button,()=>{
  if(state.mode==='intro')chooseWorld(button.dataset.world);
}));
document.querySelectorAll('.restart').forEach(b=>onPress(b,restart));
onPress($('next-world'),()=>{
  if(state.mode==='won'&&selectedWorld==='patio'){
    chooseWorld('forest');
    restart();
  }
});
onPress($('pause'),pause);onPress($('resume'),resume);
let lastBarkAt=-Infinity;
onPress($('bark'),()=>{
  if(state.mode!=='playing')return;
  const now=performance.now();
  if(now-lastBarkAt<420)return;
  if(!sound.playBark())return;
  lastBarkAt=now;
  mood='bark';moodUntil=t+.36;
  const button=$('bark');
  button.classList.remove('barking');
  // Reiniciar la animación visual después de cada ladrido.
  void button.offsetWidth;
  button.classList.add('barking');
});
$('bark').addEventListener('animationend',()=> $('bark').classList.remove('barking'));
onPress($('mute'),()=>{sound.unlock();const muted=sound.toggle();$('mute').textContent=muted?'♪̸':'♫';$('mute').setAttribute('aria-label',muted?'Activar sonido':'Silenciar');$('mute').setAttribute('aria-pressed',String(muted))});
addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
addEventListener('keydown',e=>{if(e.key==='Escape'){state.mode==='paused'?resume():pause()}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();toast('El navegador pausó la imagen. Recarga para volver al patio.');});
function finish(){
  controls.clear();$('controls').hidden=true;$('bark').hidden=true;$('result').hidden=false;
  const win=state.mode==='won';$('next-world').hidden=!(win&&selectedWorld==='patio');$('result-title').textContent=win?'¡LO LOGRASTE, MATI!':'¡Vamos otra vez!';$('result-copy').textContent=win?'Encontraste los 5 premios y atrapaste 5 veces a Mr. Cangrejo. ¡Cooper está feliz!':'Cooper necesita un descanso. ¡Prueba a rodear la tenaza cuando el cangrejo la levante!';$('result-stars').textContent=win?'★ ★ ★':'🐾';
  if(win){sound.play('win');for(let i=0;i<50;i++){const piece=document.createElement('i');piece.className='confetto';piece.style.left=`${Math.random()*100}%`;piece.style.background=['#ffd66b','#75b8a6','#ef9b83','#fff5ca'][i%4];piece.style.animationDelay=`${Math.random()*1.2}s`;$('confetti').append(piece)}}
}
function teleportEnemy(){
  const options=activeLevel.teleports.filter(p=>Math.hypot(p.x-player.x,p.z-player.z)>6);
  enemy={...options[Math.floor(Math.random()*options.length)]};captureGrace=1.6;phase='roam';aiTimer=0;attackTimer=2;warning.visible=false;
}
function angleToward(current,target,dt){return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*(1-Math.exp(-12*dt))}
function step(dt){
  state.time+=dt;state.invulnerable=Math.max(0,state.invulnerable-dt);captureGrace=Math.max(0,captureGrace-dt);attackTimer-=dt;
  const input=controls.read(),speed=Math.hypot(input.x,input.z)*4.8;
  player=move(player,input.x*4.8*dt,input.z*4.8*dt,activeLevel);
  if(speed>.05){heading=angleToward(heading,Math.atan2(input.x,input.z),dt);stepTimer-=dt;if(stepTimer<=0){sound.play('step');stepTimer=.26}}
  const distance=Math.hypot(enemy.x-player.x,enemy.z-player.z);
  aiTimer-=dt;
  if(phase==='roam'){
    if(distance<3.2&&attackTimer<=0&&captureGrace<=0){phase='warning';aiTimer=.85;enemyHeading=Math.atan2(player.x-enemy.x,player.z-enemy.z);toast('¡Mira la tenaza! Rodéala.');}
    else{
      if(aiTimer<=0||Math.hypot(target.x-enemy.x,target.z-enemy.z)<.35){
        const fleeing=distance<6;
        target={x:clamp(enemy.x+(fleeing?(enemy.x-player.x)*1.4:(Math.random()-.5)*10),-11,11),z:clamp(enemy.z+(fleeing?(enemy.z-player.z)*1.4:(Math.random()-.5)*8),-12,-.7)};aiTimer=2.2;
      }
      let dx=target.x-enemy.x,dz=target.z-enemy.z,len=Math.hypot(dx,dz)||1;
      const pace=1.55+state.captures*.10;enemy.x+=dx/len*pace*dt;enemy.z+=dz/len*pace*dt;
      // Sideways travel: the crab faces across its travel direction.
      enemyHeading=angleToward(enemyHeading,Math.atan2(dx,dz)-Math.PI/2,dt);
    }
  }else if(phase==='warning'&&aiTimer<=0){phase='attack';aiTimer=.30;sound.play('attack')}
  else if(phase==='attack'&&aiTimer<=0){phase='recover';aiTimer=1.1;attackTimer=3.2}
  else if(phase==='recover'&&aiTimer<=0){phase='roam';aiTimer=0}
  warning.visible=phase==='warning'||phase==='attack';warning.position.set(enemy.x,.035,enemy.z);warning.material.opacity=.45+Math.sin(t*14)*.25;
  const claw={x:enemy.x+Math.cos(enemyHeading)*.95+Math.sin(enemyHeading)*.65,z:enemy.z-Math.sin(enemyHeading)*.95+Math.cos(enemyHeading)*.65};
  if(phase==='attack'&&Math.hypot(player.x-claw.x,player.z-claw.z)<1.28){
    if(award(state,'hit',undefined,activeLevel)){mood='hurt';moodUntil=t+.65;toast('¡Cuidado con la tenaza!');burst(player.x,player.z,'#eea58b');ui();if(state.mode==='lost')finish()}
  }else if(captureGrace<=0&&distance<1.15&&phase!=='attack'&&state.captures<5){
    if(award(state,'capture',undefined,activeLevel)){sound.play('capture');mood='happy';moodUntil=t+.8;burst(enemy.x,enemy.z,'#ffe18b');toast('¡Cooper lo atrapó!');teleportEnemy();ui();if(state.mode==='won')finish()}
  }
  prizes.forEach(p=>{if(p.root.visible&&Math.hypot(player.x-p.root.position.x,player.z-p.root.position.z)<.95){
    if(award(state,'prize',p.id,activeLevel)){p.root.visible=p.ring.visible=false;sound.play('prize');burst(player.x,player.z,'#ffe18b');mood='happy';moodUntil=t+.55;toast('¡Un premio para Cooper!');ui();if(state.mode==='won')finish()}
  }});
  return speed;
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?55:46;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
function render(){
  requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.04);const paused=state.mode==='paused';if(!paused)t+=dt;
  let speed=0;if(state.mode==='playing')speed=step(dt);
  dog.root.position.set(player.x,0,player.z);dog.root.rotation.y=heading;crab.root.position.set(enemy.x,0,enemy.z);crab.root.rotation.y=enemyHeading;
  if(!paused){
    dog.animate(t,speed,state.mode==='won'?'happy':t<moodUntil?mood:'idle');crab.animate(t,phase==='roam'&&state.mode==='playing',phase);world.animate(t);
    dog.root.visible=!(state.mode==='playing'&&state.invulnerable>0&&state.invulnerable<2&&Math.sin(t*25)<-.5);
    prizes.forEach((p,i)=>{p.root.position.y=.95+Math.sin(t*2+i)*.14;p.root.rotation.y=t*.9;p.ring.material.opacity=.4+Math.sin(t*2+i)*.15});
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.v.y-=5*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*4;if(p.life<=0){scene.remove(p.m);particles.splice(i,1)}}
  }
  if(state.mode==='intro'){
    const portrait=camera.aspect<1;camera.position.set(portrait?20:27,portrait?31:26,portrait?30:32);camera.lookAt(portrait?0:1,0,0);
  }else{
    const extra=camera.aspect<1?3:0;desired.set(clamp(player.x,-9,9),1,clamp(player.z,-10,10));look.lerp(desired,1-Math.exp(-5*dt));desired.set(look.x,12+extra,look.z+14+extra);camera.position.lerp(desired,1-Math.exp(-5*dt));camera.lookAt(look);
  }
  if(t>toastUntil)$('toast').classList.remove('visible');renderer.render(scene,camera);
}
renderer.compile(scene,camera);$('loading').hidden=true;$('intro').hidden=false;render();
// Test hooks exist only for local automated testing and are absent during normal play.
if(new URLSearchParams(location.search).has('test'))window.__cooperTest={
  get state(){return {...state,collected:[...state.collected]}},get player(){return {...player}},get enemy(){return {...enemy}},get input(){return controls.read()},get audio(){return {state:sound.context?.state,muted:sound.muted,barks:sound.barkCount}},get stats(){return renderer.info},
  get selectedWorld(){return selectedWorld},switchWorld:chooseWorld,teleport(x,z){player=move(player,x-player.x,z-player.z,activeLevel)},place(x,z){player={x,z}},enemyAt(x,z){enemy={x,z};captureGrace=0;phase='recover';aiTimer=10},attackAt(x,z){enemy={x,z};phase='warning';aiTimer=.2;enemyHeading=0;state.invulnerable=0},restart,pause,resume,
};
