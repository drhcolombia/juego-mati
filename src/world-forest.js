import * as T from '../vendor/three.module.js';
import {mat,orb,block,segment} from './models.js';
import {batchMeshes} from './batch.js';

// Segundo mundo independiente del patio: toda la geometría es original,
// de bajo costo y se dibuja únicamente cuando el bosque está seleccionado.
export function createForestWorld(scene){
  scene.background=new T.Color('#9fd6c6');
  scene.fog=new T.Fog('#9fd6c6',37,83);
  const ambient=new T.HemisphereLight('#dbfff3','#58764c',2.4);
  scene.add(ambient);
  const sun=new T.DirectionalLight('#ffe6ac',2.7);
  sun.position.set(-11,23,-6);
  sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:1,far:65});
  sun.shadow.bias=-.0006;
  sun.shadow.normalBias=.07;
  scene.add(sun);

  // Llanura del bosque: orillas separadas por un riachuelo.
  const ground=new T.Mesh(new T.BoxGeometry(32,.38,32),mat('#77b87a',1));
  ground.position.set(0,-.23,0);
  ground.receiveShadow=true;
  scene.add(ground);
  for(const z of [-11,-7,-4,4,7,11]){
    const patch=new T.Mesh(new T.CircleGeometry(2.0,24),new T.MeshStandardMaterial({color:z%2?'#90c17b':'#97cd85',roughness:1}));
    patch.rotation.x=-Math.PI/2;
    patch.position.set(Math.sin(z)*6,.018,z);
    scene.add(patch);
  }
  // El río es decorativo, pero las barreras del nivel obligan a usar el puente.
  block(scene,'#bcba94',[0,-.12,0],[30,.14,3.45]);
  const waterUniforms={time:{value:0}};
  const water=new T.Mesh(new T.PlaneGeometry(30,2.6),new T.ShaderMaterial({
    uniforms:waterUniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float time; varying vec2 vUv;
      void main(){vec2 uv=vUv*vec2(18.,3.);float a=sin(uv.x*1.6+time*1.15);
      float b=sin(uv.x*.9-uv.y*3.+time*.7);
      float sparkle=pow(max(0.,.6+.4*sin(uv.x*2.+uv.y*4.-time)),8.);
      vec3 color=mix(vec3(.17,.62,.72),vec3(.38,.84,.83),.5+.22*a+.15*b);
      gl_FragColor=vec4(color+sparkle*.10,.94);}`
  }));
  water.rotation.x=-Math.PI/2;
  water.position.set(0,.025,0);
  scene.add(water);

  // Puente de madera anchísimo para el joystick de Mati, con barandas.
  block(scene,'#8c5a3e',[0,.22,0],[4.85,.34,5.5]);
  for(let z=-2.35;z<=2.35;z+=.52)block(scene,(Math.round(z*10)%2)?'#dfb072':'#d4a36e',[0,.43,z],[4.65,.19,.46]);
  for(const x of [-2.33,2.33]){
    for(const z of [-2.55,0,2.55])block(scene,'#81573b',[x,.82,z],[.20,1.5,.22]);
    block(scene,'#c38b56',[x,1.40,0],[.17,.15,5.4]);
  }
  // Camino de piedras hacia el puente desde ambos extremos.
  for(const side of [-1,1])for(let i=0;i<9;i++){
    const z=side*(3.15+i*1.05),x=Math.sin(i*.8)*.42;
    orb(scene,i%2?'#e6dcac':'#d2c8a0',[x,.045,z],[.75,.075,.43]);
  }

  function pine(x,z,height,tone){
    const root=new T.Group();root.position.set(x,0,z);scene.add(root);
    const trunkHeight=height*.42;
    const trunk=new T.Mesh(new T.CylinderGeometry(.19,.27,trunkHeight,7),mat('#88634b'));
    trunk.position.y=trunkHeight/2;
    trunk.castShadow=true;root.add(trunk);
    for(let i=0;i<3;i++){
      const crown=new T.Mesh(new T.ConeGeometry(height*(.27-i*.047),height*.54,8),
        mat([tone,'#34886c','#4e9a68'][i]));
      crown.position.y=height*.49+i*height*.22;
      crown.castShadow=true;root.add(crown);
    }
    const star=orb(root,'#bce3a0',[0,height*1.08,0],[.12,.18,.12]);
    star.castShadow=false;
    return root;
  }
  const treePositions=[
    [-12.8,-12.5,8.5],[-10,-9.7,6.4],[-12,-4.2,7.6],[-9,-1.9,5.3],
    [12.6,-12,8],[9.5,-9.4,6.5],[12.2,-5.2,7.7],[9,-2.6,4.9],
    [-13,12.2,8.4],[-10.5,8.7,6.7],[-13,4.2,7.5],[-8,1.9,4.9],
    [13,12.6,8.7],[10.7,8.9,6.1],[13,4.4,7.3],[8,2.1,5.1],
    [-6,-13.6,5.5],[5.8,-13.6,5.1],[-6,13.3,5.0],[6,13.5,4.8]
  ];
  const trees=treePositions.map(([x,z,h],i)=>pine(x,z,h,['#276d58','#2f8060','#397c63'][i%3]));
  // Hongos gigantes, cristales y flores convierten el bosque en un lugar mágico.
  const capGeo=new T.SphereGeometry(1,12,9);
  function mushroom(x,z,size,color){
    const stalk=new T.Mesh(new T.CylinderGeometry(size*.12,size*.22,size*.8,8),mat('#fff3dc'));
    stalk.position.set(x,size*.38,z);scene.add(stalk);
    const cap=new T.Mesh(capGeo,mat(color));
    cap.position.set(x,size*.85,z);cap.scale.set(size*.65,size*.30,size*.65);
    cap.castShadow=true;scene.add(cap);
    for(let i=0;i<5;i++){
      const angle=i*2.4,spot=orb(scene,'#fff4d3',
        [x+Math.cos(angle)*size*.40,size*.99,z+Math.sin(angle)*size*.35],
        [size*.065,size*.025,size*.065]);
      spot.castShadow=false;
    }
  }
  for(const [x,z,s,c] of [
    [-11,4.9,1.55,'#f17c9f'],[-8.5,-6,1.2,'#efb655'],
    [9,5.2,1.6,'#e68ecb'],[11,-5.7,1.25,'#fb8c75'],
    [-6.3,10.5,.8,'#e8a0c9'],[6.5,-11,.95,'#efba70']
  ])mushroom(x,z,s,c);
  const crystalColors=['#a2f9e5','#c0b8fa','#f8d7a6'];
  for(const [x,z] of [[-11,1.8],[11,2.2],[-8,-12],[9,12]]){
    for(let i=0;i<5;i++){
      const shard=new T.Mesh(new T.OctahedronGeometry(.3+i%3*.12),new T.MeshStandardMaterial({
        color:crystalColors[i%3],emissive:crystalColors[i%3],emissiveIntensity:.33,roughness:.30
      }));
      shard.position.set(x+Math.cos(i*2.35)*.55,.26+i%3*.14,z+Math.sin(i*2.35)*.45);
      shard.scale.y=1.25+i%3*.45;
      scene.add(shard);
    }
  }
  for(let i=0;i<55;i++){
    const x=-13+(i*7.37)%26, z=-13+(i*9.91)%26;
    if(Math.abs(z)<2||Math.abs(x)<3&&Math.abs(z)<8)continue;
    segment(scene,[x,0,z],[x,.26,z],.016,'#638c59');
    orb(scene,['#f5c0dd','#fcdf8a','#d1c9ff'][i%3],[x,.30,z],[.085,.07,.085]);
  }

  // Luciérnagas instanciadas: un solo draw call incluso en iPad.
  const glow=new T.InstancedMesh(new T.SphereGeometry(.11,6,5),
    new T.MeshBasicMaterial({color:'#fff0a1',transparent:true,opacity:.86,depthWrite:false}),28);
  glow.frustumCulled=false;scene.add(glow);
  const stars=Array.from({length:28},(_,i)=>({
    x:-12+(i*8.31)%24,z:-12+(i*10.71)%24,
    y:1+(i%5)*.35,phase:i*1.79
  }));
  const dummy=new T.Object3D();
  batchMeshes(scene,new Set([water,glow]));
  return {animate(t){
    waterUniforms.time.value=t;
    for(let i=0;i<stars.length;i++){
      const star=stars[i];dummy.position.set(star.x+Math.sin(t*.6+star.phase)*.25,
        star.y+Math.sin(t*1.5+star.phase)*.38,
        star.z+Math.cos(t*.65+star.phase)*.27);
      const s=.65+.25*Math.sin(t*2.1+star.phase);
      dummy.scale.setScalar(s);dummy.rotation.set(0,0,0);dummy.updateMatrix();
      glow.setMatrixAt(i,dummy.matrix);
    }
    glow.instanceMatrix.needsUpdate=true;
  }};
}
