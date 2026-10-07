// Fotografías ilustrativas con atribución: ningún establecimiento real se ofrece como ficticio.
const fs=require('node:fs');
const queries=[['habitacion','hotel bedroom'],['habitacion','hotel room interior'],['hotel','hotel facade'],['hotel','boutique hotel exterior'],['cabana','chalet cottage exterior'],['lodge','lodge guest house'],['apartamento','apartment interior living room'],['hotel','resort hotel swimming pool'],['hotel','hotel lobby'],['cabana','wooden cabin mountain']];
const plain=v=>String(v||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
(async()=>{
 const results=[];fs.mkdirSync('data',{recursive:true});const cacheFile='data/commons-cache.json';const cache=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
 for(const [kind,query] of queries){try{const value=await(async()=>{
  if(cache[query])return cache[query];
  const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query+' filetype:bitmap',gsrnamespace:'6',gsrlimit:'100',prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'960'});
  let response;for(let attempt=0;attempt<4;attempt++){response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{'User-Agent':'KawsayEstanciasAcademic/1.0'},signal:AbortSignal.timeout(45000)});if(response.status!==429)break;await new Promise(resolve=>setTimeout(resolve,10000));}
  if(!response.ok)throw new Error('Commons HTTP '+response.status);
  const data=await response.json();
  return Object.values(data.query?.pages||{}).flatMap(page=>{
   const image=page.imageinfo?.[0],meta=image?.extmetadata||{};const license=plain(meta.LicenseShortName?.value);
   if(!image?.thumburl||image.width<640||image.height<350||image.width/image.height<1||image.width/image.height>2.5||!/^(CC BY(?:-SA)? [\d.]+|CC0|Public domain)$/i.test(license))return [];
   return [{title:page.title,url:image.thumburl.split('?')[0],original:image.url.split('?')[0],source:image.descriptionurl,author:plain(meta.Artist?.value).slice(0,400),license,licenseUrl:meta.LicenseUrl?.value||image.descriptionurl,kind}];
  });
 })();cache[query]=value;fs.writeFileSync(cacheFile,JSON.stringify(cache));results.push({status:'fulfilled',value});console.log(query+': '+value.length);await new Promise(resolve=>setTimeout(resolve,1500));}catch(reason){results.push({status:'rejected',reason});}}
 const unique=new Map();for(const result of results){if(result.status==='fulfilled')for(const image of result.value)unique.set(image.original,image);else console.log('Consulta no disponible:',result.reason.message);}
 const photos=[...unique.values()];if(photos.length<270)throw new Error('Solo '+photos.length+' fotografías válidas; se requieren 270');
 fs.writeFileSync('resources/fotos-alojamientos.json',JSON.stringify(photos,null,2));console.log('Fotografías diferentes y licenciadas:',photos.length);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
