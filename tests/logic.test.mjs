import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL,constrain,move,freshState,award} from '../src/level.js';
test('pool blocks all four approaches and large movement steps',()=>{
  for(const [p,dx,dz] of [[{x:-10,z:7},15,0],[{x:10,z:7},-15,0],[{x:0,z:0},0,8],[{x:0,z:14},0,-8]]){
    const q=move(p,dx,dz),b=LEVEL.pool;assert(!(q.x>b.minX-.5&&q.x<b.maxX+.5&&q.z>b.minZ-.5&&q.z<b.maxZ+.5));
  }
  assert.deepEqual(constrain({x:100,z:-100}),{x:13.5,z:-13.5});
});
test('five captures AND five unique prizes required for victory',()=>{
  const s=freshState();for(let i=0;i<5;i++)award(s,'capture');assert.equal(s.mode,'playing');
  for(let i=0;i<4;i++)award(s,'prize',i);assert.equal(award(s,'prize',0),false);assert.equal(s.prizes,4);
  award(s,'prize',4);assert.equal(s.mode,'won');assert.equal(award(s,'hit'),false);
});
test('invulnerability prevents repeated damage; third hit loses; reset clears progress',()=>{
  const s=freshState();assert.equal(award(s,'hit'),false);
  for(let i=0;i<3;i++){s.invulnerable=0;assert(award(s,'hit'));assert.equal(award(s,'hit'),false)}
  assert.equal(s.lives,0);assert.equal(s.clawHits,3);assert.equal(s.mode,'lost');assert.equal(freshState().lives,3);
});
