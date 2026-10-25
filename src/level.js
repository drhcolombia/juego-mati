export const LEVEL={
  id:'patio',name:'EL PATIO DE COOPER',
  bounds:{minX:-14,maxX:14,minZ:-14,maxZ:14},
  pool:{minX:-7.8,maxX:7.8,minZ:2,maxZ:11.7},
  spawn:{x:-10,z:8},crabSpawn:{x:2,z:-5},goal:5,
  prizes:[{x:-10,z:-2,type:'bone'},{x:-8,z:-10,type:'star'},{x:0,z:-12,type:'ball'},{x:9,z:-9,type:'bone'},{x:11,z:0,type:'star'}],
  teleports:[{x:-9,z:-10},{x:9,z:-9},{x:0,z:-12},{x:10,z:-1},{x:-10,z:-2}]
};
export const FOREST={
  id:'forest',name:'EL BOSQUE ENCANTADO',
  bounds:{minX:-14,maxX:14,minZ:-14,maxZ:14},
  // El río es intransitable salvo el puente central de madera.
  obstacles:[
    {minX:-14,maxX:-2.4,minZ:-1.2,maxZ:1.2},
    {minX:2.4,maxX:14,minZ:-1.2,maxZ:1.2}
  ],
  spawn:{x:0,z:9},crabSpawn:{x:4,z:-7},goal:5,
  prizes:[{x:-8,z:8,type:'bone'},{x:-8,z:-9,type:'star'},{x:0,z:-10,type:'ball'},{x:9,z:-9,type:'bone'},{x:8,z:9,type:'star'}],
  teleports:[{x:-8,z:-9},{x:8,z:-8},{x:0,z:-11},{x:10,z:-4},{x:-10,z:-5}]
};
export const LEVELS={patio:LEVEL,forest:FOREST};
export const PRIZES=LEVEL.prizes;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pushOut(x,z,radius,rectangle){
  const loX=rectangle.minX-radius,hiX=rectangle.maxX+radius;
  const loZ=rectangle.minZ-radius,hiZ=rectangle.maxZ+radius;
  if(x>loX&&x<hiX&&z>loZ&&z<hiZ){
    const distances=[x-loX,hiX-x,z-loZ,hiZ-z];
    const side=distances.indexOf(Math.min(...distances));
    if(side===0)x=loX;
    if(side===1)x=hiX;
    if(side===2)z=loZ;
    if(side===3)z=hiZ;
  }
  return {x,z};
}
export function constrain(position,radius=.5,level=LEVEL){
  const b=level.bounds;
  let p={x:clamp(position.x,b.minX+radius,b.maxX-radius),
         z:clamp(position.z,b.minZ+radius,b.maxZ-radius)};
  if(level.pool)p=pushOut(p.x,p.z,radius,level.pool);
  for(const barrier of level.obstacles||[])p=pushOut(p.x,p.z,radius,barrier);
  return p;
}
export function move(position,dx,dz,level=LEVEL){
  // Subpasos para que nadie atraviese el río, los setos o la piscina.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
  let p={...position};
  for(let i=0;i<count;i++)p=constrain({x:p.x+dx/count,z:p.z+dz/count},.5,level);
  return p;
}
export function freshState(){
  return {mode:'playing',lives:3,captures:0,prizes:0,clawHits:0,invulnerable:1.5,collected:new Set(),time:0};
}
export function award(state,kind,id,level=LEVEL){
  if(state.mode!=='playing')return false;
  if(kind==='prize'){
    if(state.collected.has(id))return false;
    state.collected.add(id);state.prizes++;
  }
  if(kind==='capture')state.captures=Math.min(level.goal,state.captures+1);
  if(kind==='hit'){
    if(state.invulnerable>0)return false;
    state.clawHits++;state.lives--;state.invulnerable=2.2;
    if(state.lives===0)state.mode='lost';
  }
  if(state.captures>=level.goal&&state.prizes>=level.goal)state.mode='won';
  return true;
}
