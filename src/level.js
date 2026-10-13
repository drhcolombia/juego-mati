export const LEVEL={name:'EL PATIO DE COOPER',bounds:{minX:-14,maxX:14,minZ:-14,maxZ:14},pool:{minX:-7.8,maxX:7.8,minZ:2,maxZ:11.7},spawn:{x:-10,z:8},crabSpawn:{x:2,z:-5},goal:5};
export const PRIZES=[{x:-10,z:-2,type:'bone'},{x:-8,z:-10,type:'star'},{x:0,z:-12,type:'ball'},{x:9,z:-9,type:'bone'},{x:11,z:0,type:'star'}];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function constrain(position,radius=.5){
  const b=LEVEL.bounds,p=LEVEL.pool;
  let x=clamp(position.x,b.minX+radius,b.maxX-radius),z=clamp(position.z,b.minZ+radius,b.maxZ-radius);
  const loX=p.minX-radius,hiX=p.maxX+radius,loZ=p.minZ-radius,hiZ=p.maxZ+radius;
  if(x>loX&&x<hiX&&z>loZ&&z<hiZ){
    const distances=[x-loX,hiX-x,z-loZ,hiZ-z],side=distances.indexOf(Math.min(...distances));
    if(side===0)x=loX;if(side===1)x=hiX;if(side===2)z=loZ;if(side===3)z=hiZ;
  }
  return {x,z};
}
export function move(position,dx,dz){
  // Substeps prevent crossing the pool even after a delayed frame.
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
  let p={...position};for(let i=0;i<count;i++)p=constrain({x:p.x+dx/count,z:p.z+dz/count});return p;
}
export function freshState(){return {mode:'playing',lives:3,captures:0,prizes:0,clawHits:0,invulnerable:1.5,collected:new Set(),time:0}}
export function award(state,kind,id){
  if(state.mode!=='playing')return false;
  if(kind==='prize'){if(state.collected.has(id))return false;state.collected.add(id);state.prizes++}
  if(kind==='capture')state.captures=Math.min(LEVEL.goal,state.captures+1);
  if(kind==='hit'){
    if(state.invulnerable>0)return false;
    state.clawHits++;state.lives--;state.invulnerable=2.2;
    if(state.lives===0)state.mode='lost';
  }
  if(state.captures>=LEVEL.goal&&state.prizes>=LEVEL.goal)state.mode='won';
  return true;
}
