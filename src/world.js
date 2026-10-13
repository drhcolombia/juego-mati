import * as T from '../vendor/three.module.js';
import {mat,orb,block,segment} from './models.js';
import {batchMeshes} from './batch.js';
let seed=51;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
function groundTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#77aa57';ctx.fillRect(0,0,256,256);
  for(let i=0;i<5000;i++){ctx.fillStyle=i%2?'#88b763':'#689d4d';ctx.fillRect(random()*256,random()*256,1+random()*2,2+random()*3)}
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(10,10);return texture;
}
function palm(scene,x,z,height=7){
  const root=new T.Group();root.position.set(x,0,z);scene.add(root);
  for(let i=0;i<9;i++)segment(root,[Math.sin(i*.12)*.45,i*height/9,0],[Math.sin((i+1)*.12)*.45,(i+1)*height/9,0],.21-i*.009,i%2?'#ac8255':'#bd9564',.20-i*.009);
  const crown=new T.Group();crown.position.set(.4,height,0);root.add(crown);
  for(let i=0;i<9;i++){
    const frond=new T.Group();frond.rotation.y=i*Math.PI*2/9;crown.add(frond);
    const points=[new T.Vector3(0,0,0),new T.Vector3(0,.50,1),new T.Vector3(0,.35,2.1),new T.Vector3(0,-.65,3.3)];
    const spine=new T.CatmullRomCurve3(points);const mesh=new T.Mesh(new T.TubeGeometry(spine,9,.045,4,false),mat('#728d34'));frond.add(mesh);
    for(let j=1;j<=7;j++){
      const p=spine.getPoint(j/8),width=Math.sin(j/8*Math.PI)*.78;
      for(const side of [-1,1]){
        const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*width,.12,side*width*.9,-.48);shape.quadraticCurveTo(side*width*.25,-.38,0,0);
        const material=mat(i%2?'#499953':'#64b061');material.side=T.DoubleSide;
        const leaf=new T.Mesh(new T.ShapeGeometry(shape),material);
        leaf.position.copy(p);leaf.rotation.x=-Math.PI/2+.2;leaf.castShadow=true;frond.add(leaf);
      }
    }
  }
  for(let i=0;i<3;i++)orb(crown,'#826440',[Math.sin(i*2)*.26,-.18,Math.cos(i*2)*.26],[.22,.28,.22]);
  return crown;
}
export function createWorld(scene){
  scene.background=new T.Color('#b8e2e7');scene.fog=new T.Fog('#b8e2e7',45,95);
  const hemisphere=new T.HemisphereLight('#e8f7ff','#80904f',2.3);scene.add(hemisphere);
  const sun=new T.DirectionalLight('#fff2d3',3.2);sun.position.set(-12,24,14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;sun.shadow.radius=3;scene.add(sun);
  const grassMat=new T.MeshStandardMaterial({map:groundTexture(),roughness:1});
  const lawn=new T.Mesh(new T.BoxGeometry(30,.35,18),grassMat);lawn.position.set(0,-.19,-7.5);lawn.receiveShadow=true;scene.add(lawn);
  const deckColor='#eedfbe';
  block(scene,deckColor,[0,-.17,1.15],[30,.3,1.7]);
  block(scene,deckColor,[-11.25,-.17,7.6],[7.5,.3,11.2]);block(scene,deckColor,[11.25,-.17,7.6],[7.5,.3,11.2]);block(scene,deckColor,[0,-.17,13.5],[30,.3,3.4]);
  // Pool shell, pale coping, submerged steps, and animated turquoise water.
  block(scene,'#5cbed0',[0,-.9,6.85],[15.1,.3,9.1]);
  for(const [x,z,w,d] of [[-7.65,6.85,.3,9.6],[7.65,6.85,.3,9.6],[0,2.15,15.6,.3],[0,11.55,15.6,.3]]){
    block(scene,'#98dfe5',[x,-.42,z],[w,1,d]);block(scene,'#fff1d2',[x,.10,z],[w+.25,.18,d+.20]);
  }
  for(const side of [-1,1])for(let i=0;i<4;i++)block(scene,'#e4f1de',[side*6.65,-.62+i*.16,9.25+i*.56],[1.5,.18,.62]);
  const uniforms={time:{value:0}};
  const water=new T.Mesh(new T.PlaneGeometry(15,9),new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv; uniform float time;
    void main(){ vec2 p=vUv*vec2(22.,13.);float a=sin(p.x*1.7+sin(p.y*1.4+time*.7)+time*.5);float b=sin(p.y*2.1+cos(p.x*1.2-time*.5));float lines=pow(max(0.,1.-abs(a+b)*1.4),10.);float glint=pow(max(0.,sin(p.x*.45+p.y*.32+time*.32)),18.);vec3 col=mix(vec3(.06,.65,.73),vec3(.38,.9,.89),vUv.y*.5+.25);col+=lines*.13+glint*.07;gl_FragColor=vec4(col,.65);}`
  }));water.rotation.x=-Math.PI/2;water.position.set(0,-.04,6.85);scene.add(water);
  // Joint lines only on the terrace; no grid over the garden.
  for(let x=-14;x<=14;x+=2){block(scene,'#d6c8ac',[x,.005,13.2],[.018,.01,2.6]);for(const z of [3,5,7,9,11])for(const side of [-1,1])block(scene,'#d6c8ac',[side*11.5,.005,z],[6,.01,.018])}
  // Tall clipped hedge perimeter with rounded foliage, instanced for tablet performance.
  const leafGeo=new T.IcosahedronGeometry(1,2),leafMat=mat('#ffffff');const clusters=new T.InstancedMesh(leafGeo,leafMat,260);clusters.castShadow=true;clusters.receiveShadow=false;
  const dummy=new T.Object3D();let n=0;
  for(let i=0;i<65;i++){
    let x,z;if(i<25){x=-15+i*1.25;z=-16}else{x=i<45?-15:15;z=-15+(i%20)*1.6}
    for(let layer=0;layer<4;layer++){dummy.position.set(x+(random()-.5)*.5,.7+layer*.63,z+(random()-.5)*.6);dummy.scale.set(1.1,.70,.8);dummy.rotation.set(random(),random(),0);dummy.updateMatrix();clusters.setMatrixAt(n,dummy.matrix);clusters.setColorAt(n,new T.Color(['#286742','#347a48','#3d854d','#4b9153'][Math.floor(random()*4)]));n++}
  }scene.add(clusters);
  const palms=[palm(scene,10.8,-10,8.3),palm(scene,-10.5,-10.5,5.6),palm(scene,.5,-14.5,4.6)];
  for(let i=0;i<10;i++){
    const x=-17+i*3.8,height=3.7+random()*1.4;
    segment(scene,[x,0,-19],[x,height,-19],.17,'#84774e',.10);
    for(let j=0;j<5;j++)orb(scene,j%2?'#6b9f6b':'#598f65',[x+Math.sin(j*2)*1.1,height+Math.cos(j)*.65,-19+Math.cos(j*2)*.8],[1.45,1.3,1.15]);
  }
  // House-facing terrace, no camera markings or reference photo data.
  block(scene,'#fff2d8',[0,2.3,17.8],[29,4.6,.6]);
  for(const x of [-9,0,9]){block(scene,'#739fa3',[x,2.05,17.44],[3.8,3.5,.06]);block(scene,'#e4d7b9',[x,2,17.35],[.1,3.6,.1])}
  block(scene,'#bd7958',[0,4.8,17],[31,.35,3]);
  for(const x of [-13,13])block(scene,'#fff0d0',[x,2.25,15.8],[.32,4.5,.32]);
  for(const [x,z] of [[-12,1],[12,1],[-11,-13],[12,-13]]){
    const pot=new T.Mesh(new T.CylinderGeometry(.4,.29,.62,10),mat('#e5b58b'));pot.position.set(x,.31,z);scene.add(pot);
    for(let j=0;j<5;j++){const leaf=orb(scene,j%2?'#4a9959':'#83b95e',[x+Math.cos(j)*.25,.95,z+Math.sin(j)*.25],[.17,.56,.14]);leaf.rotation.z=Math.cos(j)*.5}
  }
  // A little stepping-stone route and tiny flower beds frame the open lawn.
  for(let i=0;i<6;i++){const stone=orb(scene,'#ded3b0',[-11.5+Math.sin(i)*.35,.025,-1.5-i*1.9],[.5,.045,.38]);stone.receiveShadow=true}
  for(let i=0;i<28;i++){
    const x=-13.4+random()*26.8,z=-14.2+random()*.8;
    segment(scene,[x,0,z],[x,.35,z],.018,'#59803c');orb(scene,i%3?'#f4c67d':'#ed8ba3',[x,.39,z],[.10,.08,.10]);
  }
  // Sun loungers beside the pool.
  for(const z of [5.0,8.0]){
    const chair=new T.Group();chair.position.set(11.2,.25,z);scene.add(chair);
    block(chair,'#af885b',[0,0,0],[1.4,.12,2.1]);block(chair,'#f8f0d6',[0,.11,.25],[1.2,.12,1.6]);
    const back=block(chair,'#6caab2',[0,.55,-.86],[1.2,1,.12]);back.rotation.x=-.35;
    for(const x of [-.55,.55])for(const zz of [-.8,.8])block(chair,'#9b774f',[x,-.1,zz],[.08,.4,.08]);
  }
  batchMeshes(scene,new Set([water,clusters,...palms]));
  palms.forEach(p=>batchMeshes(p));
  return {animate(t){uniforms.time.value=t;palms.forEach((p,i)=>p.rotation.z=Math.sin(t*.65+i)*.018)}};
}
