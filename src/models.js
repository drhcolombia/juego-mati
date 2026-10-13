import * as T from '../vendor/three.module.js';
import {batchMeshes} from './batch.js';
const materials=new Map();
export function mat(color,roughness=.75){const key=color+':'+roughness;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness}));return materials.get(key)}
const sphere=new T.SphereGeometry(1,20,14),box=new T.BoxGeometry(1,1,1);
export function orb(parent,color,position,scale){const m=new T.Mesh(sphere,mat(color));m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function block(parent,color,position,scale){const m=new T.Mesh(box,mat(color));m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
export function segment(parent,a,b,r,color,endR=r){const av=new T.Vector3(...a),bv=new T.Vector3(...b);const m=new T.Mesh(new T.CylinderGeometry(endR,r,av.distanceTo(bv),8),mat(color));m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());m.castShadow=true;parent.add(m);return m}
const furGeometry=new T.LatheGeometry([[0,-.5],[.20,-.45],[.30,-.15],[.25,.1],[.12,.36],[0,.5]].map(p=>new T.Vector2(...p)),8);
function tuft(parent,pos,size,color,lean=0){const m=new T.Mesh(furGeometry,mat(color));m.position.set(...pos);m.scale.set(size,size,size*.75);m.rotation.z=Math.PI+lean;parent.add(m);return m}
function ear(parent,x){
  const shape=new T.Shape();shape.moveTo(-.25,0);shape.quadraticCurveTo(-.20,.35,0,.60);shape.quadraticCurveTo(.29,.34,.27,0);shape.closePath();
  const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.055,bevelThickness:.045}),mat('#ad713a'));
  m.position.set(x,.30,-.12);m.rotation.z=x>0?-.16:.16;parent.add(m);
  const inner=m.clone();inner.geometry=m.geometry;inner.material=mat('#593f3a');inner.scale.set(.6,.72,.4);inner.position.set(x,.35,.03);parent.add(inner);
  return m;
}
export function createCooper(){
  const root=new T.Group(),body=new T.Group();root.add(body);
  orb(body,'#303c4b',[0,.94,-.18],[.51,.46,.82]);
  orb(body,'#637180',[0,1.21,-.28],[.40,.16,.65]);
  orb(body,'#bb7b3e',[0,.85,.43],[.42,.49,.4]);
  // Layered, tapered fur follows the body silhouette instead of a flat texture.
  for(let i=0;i<10;i++)for(const side of [-1,1]){
    const z=-.84+i*.155;tuft(body,[side*(.39+.04*Math.sin(i)),.79,z],.49+(i%3)*.035,i%2?'#49596b':'#303c4b',side*-.12);
  }
  const legs=[];
  for(const [x,z] of [[-.35,-.66],[.35,-.66],[-.36,.48],[.36,.48]]){
    const pivot=new T.Group();pivot.position.set(x,.72,z);body.add(pivot);
    orb(pivot,'#bd7e3d',[0,-.24,0],[.16,.36,.18]);orb(pivot,'#dda450',[0,-.55,.10],[.21,.14,.28]);
    for(let i=0;i<3;i++)tuft(pivot,[-.1+i*.10,-.30,.13],.28,'#e2b060',.1);
    for(let i=0;i<3;i++)orb(pivot,'#885c36',[-.10+i*.1,-.57,.32],[.02,.03,.025]);legs.push(pivot);
  }
  const tail=new T.Group();tail.position.set(0,1.13,-.88);body.add(tail);
  segment(tail,[0,0,0],[0,.46,-.25],.12,'#435265',.075);orb(tail,'#627184',[0,.4,-.24],[.14,.20,.13]);
  const head=new T.Group();head.position.set(0,1.55,.61);body.add(head);
  orb(head,'#c58b46',[0,0,0],[.58,.53,.50]);
  const ears=[ear(head,-.37),ear(head,.37)];
  orb(head,'#697580',[0,.34,-.04],[.27,.20,.37]);
  for(let i=0;i<9;i++){const x=-.48+i*.12;tuft(head,[x,-.27,.37],.55+(i%3)*.06,i%2?'#e9b55e':'#c78a3d',x*.6)}
  for(const side of [-1,1]){
    orb(head,'#edbb6b',[side*.35,-.1,.21],[.29,.33,.34]);
    orb(head,'#f4d69b',[side*.21,.015,.438],[.19,.23,.09]);
    orb(head,'#251e22',[side*.22,.035,.50],[.13,.16,.08]);
    orb(head,'#fff7df',[side*.22-.035,.085,.57],[.04,.048,.022]);
    const brow=orb(head,'#dba457',[side*.22,.25,.42],[.20,.085,.12]);brow.rotation.z=-side*.20;
    for(let i=0;i<4;i++)tuft(head,[side*(.43+i*.022),-.04-i*.07,.22-i*.015],.32,'#e1a750',side*-.4);
  }
  orb(head,'#f0c880',[0,-.19,.49],[.31,.20,.25]);
  orb(head,'#27202a',[0,-.23,.684],[.19,.10,.025]);
  orb(head,'#ed7d86',[.015,-.31,.687],[.095,.125,.025]);
  orb(head,'#252532',[0,-.04,.705],[.15,.10,.10]);orb(head,'#83858e',[-.04,-.015,.79],[.048,.025,.009]);
  for(let i=0;i<5;i++)tuft(body,[-.28+i*.14,.73,.71],.42,'#e2ab58');
  const band=new T.Mesh(new T.TorusGeometry(.38,.065,7,24),mat('#259fc5'));band.rotation.x=Math.PI/2;band.position.set(0,1.16,.55);body.add(band);
  orb(body,'#ffda58',[0,1.02,.92],[.09,.11,.04]);
  batchMeshes(body,new Set([head,tail,...legs]));batchMeshes(head,new Set(ears));batchMeshes(tail);legs.forEach(l=>batchMeshes(l));
  return {root,animate(t,speed,mood){
    const run=Math.min(1,speed/4.5),step=t*13;body.position.y=Math.abs(Math.sin(step))*run*.08+(mood==='happy'?Math.abs(Math.sin(t*9))*.30:0);
    body.rotation.z=mood==='hurt'?Math.sin(t*28)*.07:Math.sin(step/2)*run*.025;
    legs.forEach((leg,i)=>leg.rotation.x=Math.sin(step+(i===0||i===3?0:Math.PI))*run*.45);
    tail.rotation.z=Math.sin(t*(run?12:5))*.32;head.rotation.z=Math.sin(t*2)*.035;
    ears.forEach((e,i)=>e.rotation.x=Math.sin(step+i)*run*.05);
  }};
}
function claw(parent,x,size,color){
  const pivot=new T.Group();pivot.position.set(x,.87,.25);parent.add(pivot);
  segment(pivot,[0,0,0],[x>0?.35:-.35,.10,.22],.10,color);
  const hand=new T.Group();hand.position.set(x>0?.38:-.38,.17,.35);pivot.add(hand);
  orb(hand,color,[0,0,0],[.29*size,.30*size,.26*size]);
  for(const side of [-1,1]){
    const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(side*.5,.15,side*.55,.55,side*.12,.74);shape.quadraticCurveTo(side*.27,.42,0,.30);shape.closePath();
    const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:true,bevelSize:.055,bevelThickness:.06,bevelSegments:2,steps:1}),mat(color));m.scale.setScalar(size);m.position.set(0,.05,-.08);hand.add(m);
  }
  return pivot;
}
export function createCrab(){
  const root=new T.Group(),body=new T.Group();root.add(body);
  orb(body,'#3489a4',[0,.69,0],[.68,.39,.48]);orb(body,'#a0d4d5',[0,.57,.28],[.51,.22,.23]);
  orb(body,'#60b9c6',[-.1,.93,-.07],[.44,.10,.30]);
  const legs=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const leg=new T.Group();leg.position.set(side*.45,.59,-.28+i*.28);body.add(leg);
    segment(leg,[0,0,0],[side*.48,-.13,.03],.085,'#317c97');segment(leg,[side*.48,-.13,.03],[side*.61,-.48,.13],.07,'#eead58',.025);legs.push(leg);
  }
  for(const x of [-.26,.26]){
    segment(body,[x,.89,.15],[x*1.15,1.22,.17],.07,'#2d6d89');
    orb(body,'#fff3d4',[x*1.15,1.28,.2],[.20,.24,.18]);orb(body,'#243544',[x*1.15,1.29,.35],[.09,.125,.045]);orb(body,'#fff', [x*1.15-.025,1.34,.386],[.028,.033,.015]);
  }
  const smile=new T.Mesh(new T.TorusGeometry(.19,.025,6,18,Math.PI),mat('#244861'));smile.position.set(0,.64,.497);smile.rotation.z=Math.PI;body.add(smile);
  claw(body,-.55,.50,'#4391ab');const big=claw(body,.6,1.05,'#df9660');
  for(let i=0;i<5;i++)orb(body,'#8ecbd0',[-.35+i*.17,.94,0],[.035,.025,.035]);
  batchMeshes(body,new Set([big,...legs]));batchMeshes(big);legs.forEach(l=>batchMeshes(l));
  return {root,animate(t,moving,phase){
    body.position.y=Math.sin(t*12)*.035*(moving?1:.25);legs.forEach((leg,i)=>leg.rotation.z=Math.sin(t*13+i)*.18*(moving?1:.2));
    big.rotation.z=phase==='warning'?-.65+Math.sin(t*22)*.06:phase==='attack'?.55:Math.sin(t*2)*.06;
    big.rotation.x=phase==='attack'?-.65:0;
  }};
}
export function createPrize(type){
  const g=new T.Group();
  if(type==='ball'){
    orb(g,'#ee9275',[0,0,0],[.29,.29,.29]);
    const ring=new T.Mesh(new T.TorusGeometry(.29,.038,6,20),mat('#fff0b5'));g.add(ring);
  }else if(type==='bone'){
    segment(g,[-.3,0,0],[.3,0,0],.105,'#fff0ce');
    for(const x of [-.32,.32])for(const y of [-.08,.08])orb(g,'#fff0ce',[x,y,0],[.15,.13,.12]);g.rotation.z=.4;
  }else{
    const shape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.18:.4;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r)}shape.closePath();
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,steps:1}),mat('#ffce50',.4));g.add(mesh);
  }
  return g;
}
