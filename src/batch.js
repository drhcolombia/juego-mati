import * as T from '../vendor/three.module.js';
// Combine fixed scenery by material. Animated roots and instanced meshes stay separate.
export function batchMeshes(root,excluded=new Set()){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map(),meshes=[];
  function visit(node){if(excluded.has(node)||node.isInstancedMesh)return;if(node.isMesh&&!Array.isArray(node.material))meshes.push(node);for(const child of node.children)visit(child)}
  for(const child of root.children)visit(child);
  for(const m of meshes){
    const key=m.material.uuid+':'+m.castShadow+':'+m.receiveShadow;
    if(!groups.has(key))groups.set(key,{material:m.material,cast:m.castShadow,receive:m.receiveShadow,geometries:[]});
    const transformed=m.geometry.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld));
    const geometry=transformed.index?transformed.toNonIndexed():transformed;
    if(geometry!==transformed)transformed.dispose();groups.get(key).geometries.push(geometry);m.removeFromParent();
  }
  for(const group of groups.values()){
    const geometry=new T.BufferGeometry();
    for(const name of ['position','normal','uv']){
      const size=name==='uv'?2:3,total=group.geometries.reduce((n,g)=>n+g.getAttribute('position').count*size,0),array=new Float32Array(total);let offset=0;
      for(const g of group.geometries){const attribute=g.getAttribute(name);if(attribute)array.set(attribute.array,offset);offset+=g.getAttribute('position').count*size}
      geometry.setAttribute(name,new T.BufferAttribute(array,size));
    }
    for(const g of group.geometries)g.dispose();const mesh=new T.Mesh(geometry,group.material);mesh.castShadow=group.cast;mesh.receiveShadow=group.receive;root.add(mesh);
  }
}
