export class Sound{
  constructor(){this.context=null;this.muted=false;this.barkCount=0;this.barkRecording=null;this.barkSampleFailed=false}
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

  // Grabación CC0 de Edo.pt2 publicada en Wikimedia Commons.
  // https://commons.wikimedia.org/wiki/File:Ladrido_perro.ogg
  // Para Safari se reproduce la versión MP3 y se mantiene un respaldo sintético.
  playBark(){
    if(this.muted)return false;
    this.unlock();
    if(!this.barkSampleFailed){
      try{
        if(!this.barkRecording){
          this.barkRecording=new Audio('https://upload.wikimedia.org/wikipedia/commons/transcoded/f/fd/Ladrido_perro.ogg/Ladrido_perro.ogg.mp3');
          this.barkRecording.preload='auto';
          this.barkRecording.volume=.78;
          // El tono más agudo sugiere un perro de tamaño pequeño.
          this.barkRecording.playbackRate=1.32;
        }
        this.barkRecording.pause();
        this.barkRecording.currentTime=0;
        const playing=this.barkRecording.play();
        if(playing?.catch)playing.catch(()=>{
          this.barkSampleFailed=true;
          if(!this.muted)this.playSyntheticBark();
        });
      }catch{
        this.barkSampleFailed=true;
        this.playSyntheticBark();
      }
    }else this.playSyntheticBark();
    this.barkCount++;
    return true;
  }

  // Alternativa local para fallos de red o restricciones de reproducción.
  playSyntheticBark(){
    if(this.muted)return;
    this.unlock();
    const c=this.context;
    if(!c)return false;
    const now=c.currentTime+.015;
    const yip=(when,duration,pitch)=>{
      const noise=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);
      const samples=noise.getChannelData(0);
      let rough=0;
      for(let i=0;i<samples.length;i++){
        rough=rough*.66+(Math.random()*2-1)*.34;
        samples[i]=rough;
      }
      const breath=c.createBufferSource();breath.buffer=noise;
      const band=c.createBiquadFilter();band.type='bandpass';band.Q.value=.8;
      band.frequency.setValueAtTime(pitch*2.65,when);
      band.frequency.exponentialRampToValueAtTime(pitch*1.55,when+duration);
      const breathGain=c.createGain();
      breathGain.gain.setValueAtTime(.0001,when);
      breathGain.gain.linearRampToValueAtTime(.21,when+.016);
      breathGain.gain.exponentialRampToValueAtTime(.045,when+duration*.60);
      breathGain.gain.exponentialRampToValueAtTime(.0001,when+duration);
      breath.connect(band);band.connect(breathGain);breathGain.connect(c.destination);
      breath.start(when);breath.stop(when+duration);
      breath.onended=()=>{breath.disconnect();band.disconnect();breathGain.disconnect()};

      const voice=c.createOscillator(),throat=c.createBiquadFilter(),voiceGain=c.createGain();
      voice.type='sawtooth';
      voice.frequency.setValueAtTime(pitch,when);
      voice.frequency.exponentialRampToValueAtTime(pitch*.56,when+duration);
      throat.type='lowpass';
      throat.frequency.setValueAtTime(pitch*3.3,when);
      throat.frequency.exponentialRampToValueAtTime(pitch*1.25,when+duration);
      voiceGain.gain.setValueAtTime(.0001,when);
      voiceGain.gain.linearRampToValueAtTime(.075,when+.014);
      voiceGain.gain.exponentialRampToValueAtTime(.0001,when+duration);
      voice.connect(throat);throat.connect(voiceGain);voiceGain.connect(c.destination);
      voice.start(when);voice.stop(when+duration);
      voice.onended=()=>{voice.disconnect();throat.disconnect();voiceGain.disconnect()};
    };
    yip(now,.145,480);
    yip(now+.19,.12,550);
  }
  toggle(){
    this.muted=!this.muted;
    if(this.muted)this.barkRecording?.pause();
    return this.muted;
  }
}
