import {test,expect} from '@playwright/test';
test('landscape: resources, keyboard, pool, pause, prizes, captures, win, reset and audio',async({page})=>{
  // Simular el recurso externo para no depender de Wikimedia durante las pruebas.
  await page.route('https://upload.wikimedia.org/**',route=>route.fulfill({status:200,contentType:'audio/mpeg',body:''}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));const bad=[];page.on('response',r=>{if(r.status()>=400)bad.push(r.url())});
  await page.setViewportSize({width:1180,height:820});await page.goto('?test=1');await expect(page.locator('#intro')).toBeVisible();
  await page.screenshot({path:'test-results/01-patio-inicio.png'});await page.locator('#play').click();
  const initial=await page.evaluate(()=>window.__cooperTest.player);await page.keyboard.down('w');
  await expect.poll(async()=> (await page.evaluate(()=>window.__cooperTest.player)).z,
    {timeout:12000,intervals:[300,600,900,1200]}).toBeLessThan(initial.z-1);
  await page.keyboard.up('w');
  expect((await page.evaluate(()=>window.__cooperTest.player)).z).toBeLessThan(initial.z-1);
  await page.evaluate(()=>window.__cooperTest.place(-8.4,6));await page.keyboard.down('d');await page.waitForTimeout(500);await page.keyboard.up('d');expect((await page.evaluate(()=>window.__cooperTest.player)).x).toBeLessThanOrEqual(-8.29);
  await page.locator('#pause').click();const paused=await page.evaluate(()=>window.__cooperTest.player);await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');expect(await page.evaluate(()=>window.__cooperTest.player)).toEqual(paused);await page.locator('#resume').click();
  await page.evaluate(()=>window.__cooperTest.place(0,-3));await page.waitForTimeout(500);await page.screenshot({path:'test-results/02-patio-jugable.png'});
  for(const [x,z] of [[-10,-2],[-8,-10],[0,-12],[9,-9],[11,0]]){await page.evaluate(([x,z])=>window.__cooperTest.place(x,z),[x,z]);await page.waitForTimeout(100)}
  expect((await page.evaluate(()=>window.__cooperTest.state)).prizes).toBe(5);
  for(let i=0;i<5;i++){await page.evaluate(()=>{window.__cooperTest.place(0,-5);window.__cooperTest.enemyAt(0,-5)});await page.waitForTimeout(100)}
  await expect(page.locator('#result-title')).toHaveText('¡LO LOGRASTE, MATI!');expect((await page.evaluate(()=>window.__cooperTest.audio)).state).toBe('running');
  await page.screenshot({path:'test-results/03-victoria.png'});await page.locator('#result .restart').click();expect((await page.evaluate(()=>window.__cooperTest.state)).captures).toBe(0);
  await expect(page.locator('#bark')).toBeVisible();
  await page.locator('#bark').click();
  expect((await page.evaluate(()=>window.__cooperTest.audio)).barks).toBe(1);
  await page.waitForTimeout(460);
  await page.locator('#mute').click();
  await page.locator('#bark').click();
  expect((await page.evaluate(()=>window.__cooperTest.audio)).barks).toBe(1);
  expect((await page.evaluate(()=>window.__cooperTest.audio)).muted).toBe(true);
  expect(errors).toEqual([]);expect(bad).toEqual([]);
});
test('portrait: real touch joystick, second finger, cancellation, damage and Game Over',async({browser})=>{
  const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('?test=1');await page.locator('#play').click();
  const cdp=await context.newCDPSession(page),box=await page.locator('#joystick').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+30,y:y-30,id:1}]});await page.waitForTimeout(250);
  const input=await page.evaluate(()=>window.__cooperTest.input);expect(input.x).toBeGreaterThan(.3);expect(input.z).toBeLessThan(-.3);
  const mute=await page.locator('#mute').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+30,y:y-30,id:1},{x:mute.x+20,y:mute.y+20,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:mute.x+20,y:mute.y+20,id:2}]});expect((await page.evaluate(()=>window.__cooperTest.audio)).muted).toBe(true);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});expect(await page.evaluate(()=>window.__cooperTest.input)).toEqual({x:0,z:0});
  await page.evaluate(()=>window.__cooperTest.place(1,-5));await page.waitForTimeout(600);await page.screenshot({path:'test-results/04-ipad-vertical.png'});
  for(let i=0;i<3;i++){
    const expectedLives=2-i;
    await page.evaluate(()=>{window.__cooperTest.place(.95,-4.35);window.__cooperTest.attackAt(0,-5)});
    await expect.poll(async()=> (await page.evaluate(()=>window.__cooperTest.state)).lives,
      {timeout:12000,intervals:[200,400,800]}).toBe(expectedLives);
  }
  expect((await page.evaluate(()=>window.__cooperTest.state)).lives).toBe(0);await expect(page.locator('#result')).toBeVisible();
  await context.close();
});

test('Mundo 2: elegir bosque, cruzar puente, ganar y regresar al patio',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1180,height:820});
  await page.goto('?test=1');
  await expect(page.locator('#intro')).toBeVisible();
  await page.locator('[data-world="forest"]').click();
  await expect(page.locator('#intro-subtitle')).toHaveText('y el Bosque Encantado');
  expect(await page.evaluate(()=>window.__cooperTest.selectedWorld)).toBe('forest');
  await page.screenshot({path:'test-results/05-bosque-portada.png'});
  await page.locator('#play').click();
  await expect(page.locator('#level-name')).toHaveText('El Bosque Encantado');
  const spawn=await page.evaluate(()=>window.__cooperTest.player);
  expect(spawn).toMatchObject({x:0,z:9});
  await page.evaluate(()=>{window.__cooperTest.place(9,4);window.__cooperTest.teleport(9,-5)});
  expect((await page.evaluate(()=>window.__cooperTest.player)).z).toBeGreaterThan(1.6);
  await page.evaluate(()=>{window.__cooperTest.place(0,4);window.__cooperTest.teleport(0,-5)});
  expect((await page.evaluate(()=>window.__cooperTest.player)).z).toBeLessThan(-4.8);
  await page.screenshot({path:'test-results/06-bosque-jugable.png'});
  for(const [x,z] of [[-8,8],[-8,-9],[0,-10],[9,-9],[8,9]]){
    await page.evaluate(([x,z])=>window.__cooperTest.place(x,z),[x,z]);
    await page.waitForTimeout(110);
  }
  expect((await page.evaluate(()=>window.__cooperTest.state)).prizes).toBe(5);
  for(let i=0;i<5;i++){
    await page.evaluate(()=>{window.__cooperTest.place(0,-5);window.__cooperTest.enemyAt(0,-5)});
    await page.waitForTimeout(120);
  }
  await expect(page.locator('#result-title')).toHaveText('¡LO LOGRASTE, MATI!');
  await expect(page.locator('#next-world')).toBeHidden();
  await page.locator('#result .restart').click();
  expect(await page.evaluate(()=>window.__cooperTest.selectedWorld)).toBe('forest');
  expect((await page.evaluate(()=>window.__cooperTest.state)).captures).toBe(0);
  expect(errors).toEqual([]);
});
test('Mundo 1: pantalla de victoria permite descubrir Mundo 2',async({page})=>{
  await page.goto('?test=1');await page.locator('#play').click();
  for(const [x,z] of [[-10,-2],[-8,-10],[0,-12],[9,-9],[11,0]]){
    await page.evaluate(([x,z])=>window.__cooperTest.place(x,z),[x,z]);
    await page.waitForTimeout(110);
  }
  for(let i=0;i<5;i++){
    await page.evaluate(()=>{window.__cooperTest.place(0,-5);window.__cooperTest.enemyAt(0,-5)});
    await page.waitForTimeout(120);
  }
  await expect(page.locator('#next-world')).toBeVisible();
  await page.locator('#next-world').click();
  expect(await page.evaluate(()=>window.__cooperTest.selectedWorld)).toBe('forest');
  await expect(page.locator('#level-name')).toHaveText('El Bosque Encantado');
  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#joystick')).toBeVisible();
});

test('El Patio carga aunque el recurso del Bosque no esté disponible',async({page})=>{
  const requests=[];
  await page.route('**/src/world-forest.js*',route=>{
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('?test=1');
  await expect(page.locator('#intro')).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.locator('#play').click();
  await expect(page.locator('#joystick')).toBeVisible();
  await expect(page.locator('#bark')).toBeVisible();
  expect(requests).toHaveLength(0);
});
