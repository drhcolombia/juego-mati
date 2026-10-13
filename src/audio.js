export class Sound{
  constructor(){this.context=null;this.muted=false}
  unlock(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume().catch(()=>{})}catch{}}
  play(kind){
    if(this.muted||!this.context||this.context.state!=='running')return;
    const tunes={step:[[110,0,.04,.018]],prize:[[700,0,.10,.07],[1046,.09,.2,.06]],capture:[[523,0,.1,.07],[659,.09,.1,.07],[784,.18,.24,.07]],attack:[[220,0,.16,.06],[164,.12,.24,.06]],win:[[523,0,.18,.07],[659,.15,.18,.07],[784,.3,.18,.07],[1046,.45,.5,.08]]};
    for(const [frequency,delay,duration,volume] of tunes[kind]||[]){
      const o=this.context.createOscillator(),g=this.context.createGain(),t=this.context.currentTime+delay;
      o.type=kind==='step'?'triangle':'sine';o.frequency.setValueAtTime(frequency,t);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(g);g.connect(this.context.destination);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect()};
    }
  }
  toggle(){this.muted=!this.muted;return this.muted}
}
