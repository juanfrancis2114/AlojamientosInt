const {chromium,expect}=require('@playwright/test');
const {spawn}=require('node:child_process');const fs=require('node:fs');const {randomUUID}=require('node:crypto');const {setTimeout:delay}=require('node:timers/promises');
const base='http://127.0.0.1:3103',file='data/gallery-browser-'+randomUUID()+'.sqlite';let server,browser;
(async()=>{
 server=spawn(process.execPath,['dist/main.js'],{env:{...process.env,PORT:'3103',DATABASE_URL:'',DATABASE_SSL:'',VERCEL:'',APPLY_DEMO_UPGRADE:'',DATA_FILE:file,ADMIN_EMAIL:'admin@booking.local',ADMIN_PASSWORD:'AdminDemo2026!',SEED_DEMO:'true'},stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await fetch(base+'/api/v1/health')).ok)break;}catch{}await delay(300);if(i===59)throw Error('Servidor de prueba no inició');}
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('.hotel-card').first().getByRole('button').click();await expect(page.locator('.gallery-thumbnails button')).toHaveCount(4);
 const first=await page.locator('.stay-gallery-main img').getAttribute('src');await page.locator('.gallery-thumbnails button').nth(2).click();await expect(page.locator('.gallery-counter')).toHaveText('3 / 4');expect(await page.locator('.stay-gallery-main img').getAttribute('src')).not.toBe(first);
 await page.getByRole('button',{name:'Imagen siguiente',exact:true}).click();await expect(page.locator('.gallery-counter')).toHaveText('4 / 4');
 fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/gallery-desktop.png'});
 const box=await page.locator('#modal').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,1100);
 await expect.poll(()=>page.locator('#modal').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await page.locator('#availability').click();await expect(page.locator('#availability-result')).toContainText('total');await page.locator('#close-modal').click();
 await page.locator('#account').click();await page.locator('#login-form input[name=email]').fill('admin@booking.local');await page.locator('#login-form input[name=password]').fill('AdminDemo2026!');await page.locator('#login-form .primary').click();await expect(page).toHaveURL(base+'/admin');await page.locator('[data-tab=properties]').click();await page.locator('[data-gallery]').first().click();await expect(page.locator('.gallery-edit-image')).toHaveCount(4);
 const previous=(await(await page.request.get(base+'/api/v1/admin/accommodations/1/gallery')).json());
 await page.locator('.gallery-edit-image').first().getByRole('button',{name:'Mover abajo',exact:true}).click();await expect(page.locator('input[name=url_0]')).toHaveValue(previous[1].url);
 await page.locator('#gallery-form').getByRole('button',{name:'Guardar cuatro imágenes'}).click();await expect(page.locator('#modal')).toBeHidden();const changed=await(await page.request.get(base+'/api/v1/catalog/1/gallery')).json();expect(changed[0].url).toBe(previous[1].url);
 const imagenes=previous.map(({url,descripcion,autor,licencia,fuente,licencia_url})=>({url,descripcion,autor,licencia,fuente,licencia_url}));expect((await page.request.put(base+'/api/v1/admin/accommodations/1/gallery',{data:{imagenes}})).status()).toBe(200);
 await page.goto(base);await page.setViewportSize({width:390,height:844});await page.locator('.hotel-card').first().getByRole('button').click();await expect(page.locator('.gallery-thumbnails button')).toHaveCount(4);expect(await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.screenshot({path:'artifacts/gallery-mobile.png'});expect(errors).toEqual([]);
 console.log('Galerías: cuatro imágenes, miniaturas, navegación, scroll de reserva, edición/orden persistido y móvil verificados en Chrome.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server&&server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});if(fs.existsSync(file))fs.unlinkSync(file);});
