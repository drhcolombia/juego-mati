export class Controls{
  constructor(joystick){
    this.keys=new Set();this.vector={x:0,z:0};this.pointer=null;this.pad=joystick;this.knob=joystick.querySelector('.knob');
    const valid=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
    addEventListener('keydown',e=>{if(valid.includes(e.key.toLowerCase())){e.preventDefault();this.keys.add(e.key.toLowerCase())}});
    addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    joystick.addEventListener('pointerdown',e=>{if(this.pointer!==null)return;e.preventDefault();this.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);this.updatePointer(e)});
    joystick.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();this.updatePointer(e)}});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(name,e=>{if(e.pointerId===this.pointer)this.release()});
    addEventListener('blur',()=>this.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.clear()});
  }
  updatePointer(e){
    const r=this.pad.getBoundingClientRect(),radius=r.width*.32;
    let x=(e.clientX-r.left-r.width/2)/radius,z=(e.clientY-r.top-r.height/2)/radius;
    const length=Math.hypot(x,z);if(length>1){x/=length;z/=length}
    this.vector={x:Math.abs(x)<.07?0:x,z:Math.abs(z)<.07?0:z};
    this.knob.style.transform=`translate(${x*radius}px,${z*radius}px)`;
  }
  release(){this.pointer=null;this.vector={x:0,z:0};this.knob.style.transform='translate(0,0)'}
  clear(){this.keys.clear();this.release()}
  read(){
    let x=this.vector.x,z=this.vector.z;
    x+=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft'));
    z+=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));
    const l=Math.hypot(x,z);return l>1?{x:x/l,z:z/l}:{x,z};
  }
}
