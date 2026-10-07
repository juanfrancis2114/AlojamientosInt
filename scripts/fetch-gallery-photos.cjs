const fs=require('node:fs');
const suitable=require('./photo-is-suitable.cjs');
const plain=v=>String(v||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
const searches=[['habitacion','hotel bedroom'],['habitacion','hotel room interior'],['area','hotel lobby'],['area','hotel swimming pool'],['area','hotel garden'],['area','hotel restaurant'],['hotel','hotel exterior'],['lodge','guest house lodge'],['cabana','cottage interior'],['cabana','chalet exterior'],['apartamento','apartment interior'],['hotel','resort hotel'],['habitacion','hotel suite']];
(async()=>{
 fs.mkdirSync('data',{recursive:true});const cacheFile='data/gallery-photo-cache.json';const cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
 const unique=new Map(JSON.parse(fs.readFileSync('resources/fotos-alojamientos.json','utf8')).filter(suitable).map(p=>[p.original,p]));
 for(const offset of [0,100,200,300]){for(const [kind,query] of searches){const key=query+'#'+offset;let photos=cache[key];
  if(!photos){const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'100',gsroffset:String(offset),prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'960'});let response;
   for(let attempt=0;attempt<4;attempt++){response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'KawsayEstanciasAcademic/1.0'},signal:AbortSignal.timeout(45000)});if(response.status!==429)break;await new Promise(r=>setTimeout(r,10000));}
   if(!response.ok)throw new Error('Commons HTTP '+response.status);
   const data=await response.json();photos=Object.values(data.query?.pages||{}).flatMap(page=>{const info=page.imageinfo?.[0],meta=info?.extmetadata||{},license=plain(meta.LicenseShortName?.value);if(!info?.thumburl||info.width<640||info.height<350||info.width/info.height<1||info.width/info.height>2.5||!/^(CC BY(?:-SA)? [\d.]+|CC0|Public domain)$/i.test(license))return [];const photo={title:page.title,url:info.thumburl.split('?')[0],original:info.url.split('?')[0],source:info.descriptionurl,author:plain(meta.Artist?.value).slice(0,400),license,licenseUrl:meta.LicenseUrl?.value||info.descriptionurl,kind};return suitable(photo)?[photo]:[];});cache[key]=photos;fs.writeFileSync(cacheFile,JSON.stringify(cache));
   await new Promise(r=>setTimeout(r,1800));
  }
  for(const photo of photos)if(!unique.has(photo.original))unique.set(photo.original,photo);
  console.log(query+' ['+offset+']: '+unique.size+' fotos distintas');
  fs.writeFileSync('resources/fotos-galeria.json',JSON.stringify([...unique.values()],null,2));
  if(unique.size>=1150)return;
 }}throw new Error('Solo '+unique.size+' fotos distintas disponibles');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
