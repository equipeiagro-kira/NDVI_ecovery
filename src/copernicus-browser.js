import {validateArea,period,quality,bestMonthly,evalscript} from '../server/core.js';
import {visualRequest,renderGrid} from '../server/render-spec.js';

const AUTH='https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const SERVICE='https://sh.dataspace.copernicus.eu/';

async function decodePng(buffer){
  const bitmap=await createImageBitmap(new Blob([buffer],{type:'image/png'}));
  try {const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height);}finally{bitmap.close();}
}
async function encodePng(png){
  const canvas=document.createElement('canvas');canvas.width=png.width;canvas.height=png.height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(png.data),png.width,png.height),0,0);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Não foi possível exportar o PNG.')),'image/png'));
}
function qualityRequest(geometry,datetime){const t=new Date(datetime).getTime();return {input:{bounds:{geometry,properties:{crs:'http://www.opengis.net/def/crs/OGC/1.3/CRS84'}},data:[{type:'sentinel-2-l2a',dataFilter:{timeRange:{from:new Date(t-1000).toISOString(),to:new Date(t+1000).toISOString()},mosaickingOrder:'leastCC'},processing:{upsampling:'NEAREST',downsampling:'NEAREST'}}]},output:{width:128,height:128,responses:[{identifier:'default',format:{type:'image/png'}}]},evalscript:evalscript('quality')};}

// One instance per tab. Credentials, tokens, geometry and images are never persisted.
export function createBrowserClient({fetchImpl=globalThis.fetch.bind(globalThis),decode=decodePng,encode=encodePng,now=()=>Date.now()}={}){
 let credentials=null,accessToken=null,expires=0,tokenTask=null,verifiedAt=null,busy=false;
 let progress={state:'idle',message:'Nenhuma busca em andamento.',completed:0,total:0};
 const scenes=new Map(),images=new Map(),inflight=new Map();let imageBytes=0;
 function status(){return {version:'0.4.0',browserMode:true,configured:!!credentials,connected:!!verifiedAt,verifiedAt,period:period(new Date(now())),localOnly:false};}
 function disconnect(){credentials=null;accessToken=null;expires=0;verifiedAt=null;scenes.clear();images.clear();imageBytes=0;}
 async function getToken(){
  if(accessToken&&now()<expires)return accessToken;
  if(!credentials)throw Error('Conecte o Copernicus com Client ID e Client Secret.');
  if(tokenTask)return tokenTask;
  tokenTask=(async()=>{let r;try{r=await fetchImpl(AUTH,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',body:new URLSearchParams({grant_type:'client_credentials',client_id:credentials.id,client_secret:credentials.secret}),signal:AbortSignal.timeout(30000)});}catch(e){verifiedAt=null;throw Error(e.name==='TimeoutError'?'O Copernicus não respondeu em 30 segundos. Tente novamente.':`Não foi possível conectar. No painel Copernicus, habilite o OAuth Client para SPA e autorize a origem ${globalThis.location?.origin||'deste site'}. Verifique também sua internet.`);}if(!r.ok){verifiedAt=null;throw Error(`Autenticação recusada (HTTP ${r.status}). Confira Client ID, Client Secret e a validade do OAuth Client. Esses campos não usam e-mail e senha.`);}const j=await r.json();if(!j.access_token)throw Error('O Copernicus não retornou um token.');accessToken=j.access_token;expires=now()+Math.max(1,Number(j.expires_in||300)-30)*1000;verifiedAt=new Date(now()).toISOString();return accessToken;})().finally(()=>{tokenTask=null;});
  return tokenTask;
 }
 async function api(path,body,signal){const token=await getToken();let r;try{r=await fetchImpl(SERVICE+path,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});}catch(e){if(e.name==='AbortError')throw e;throw Error(e.name==='TimeoutError'?'A consulta demorou mais de 90 segundos. Tente novamente.':'Não foi possível consultar o Copernicus. Verifique sua conexão e a autorização do domínio no OAuth Client.');}if(!r.ok){if(r.status===401){accessToken=null;verifiedAt=null;}throw Error(`Copernicus retornou HTTP ${r.status}. ${r.status===429?'Cota ou limite de uso atingido. Aguarde e tente novamente.':'Não foi possível concluir a consulta.'}`);}return r;}
 async function search(body){
  if(busy)throw Error('Uma busca já está em andamento nesta aba.');
  const geometry=structuredClone(body.geometry),bbox=validateArea(geometry),maxCloud=Number(body.maxCloud??40);
  if(!Number.isFinite(maxCloud)||maxCloud<0||maxCloud>100)throw Error('Filtro de nuvens inválido.');
  if(!credentials)throw Error('Conecte o Copernicus antes de buscar imagens.');
  busy=true;progress={state:'catalog',message:'Consultando o catálogo Copernicus…',completed:0,total:0};
  try {
   const dates=period(new Date(now()));let next,all=[],pages=0;
   do{const query={collections:['sentinel-2-l2a'],intersects:geometry,datetime:dates.join('/'),limit:100,filter:`eo:cloud_cover <= ${maxCloud}`,'filter-lang':'cql2-text',...(next!==undefined?{next}:{})};const j=await(await api('catalog/v1/search',query)).json();if(!Array.isArray(j.features))throw Error('O catálogo retornou um formato inesperado.');all.push(...j.features);next=j.context?.next;pages++;if(pages>=30&&next!==undefined&&next!==null)throw Error('Consulta muito extensa. Reduza a área ou o limite de nuvens.');}while(next!==undefined&&next!==null);
   const unique=[...new Map(all.map(f=>[f.properties.datetime,f])).values()],evaluated=[];
   progress={state:'evaluating',message:`Avaliando visibilidade: 0 de ${unique.length} aquisições.`,completed:0,total:unique.length};
   for(const f of unique){const png=await decode(await(await api('process/v1',qualityRequest(geometry,f.properties.datetime))).arrayBuffer());evaluated.push({id:crypto.randomUUID(),datetime:f.properties.datetime,cloud:f.properties['eo:cloud_cover']??100,...quality(png,bbox,geometry)});progress={state:'evaluating',message:`Avaliando visibilidade: ${evaluated.length} de ${unique.length} aquisições.`,completed:evaluated.length,total:unique.length};}
   const selected=bestMonthly(evaluated);for(const s of selected)scenes.set(s.id,{...s,geometry});while(scenes.size>500)scenes.delete(scenes.keys().next().value);
   progress={...progress,state:'complete',message:selected.length?`Consulta concluída: ${selected.length} meses com imagens.`:'Nenhuma cena encontrada. Aumente o limite de nuvens e tente novamente.'};
   return {scenes:selected,evaluated:evaluated.length,period:dates,method:'Melhor aquisição por mês pela visibilidade no talhão, estimada em grade de 128 × 128.',missingMonths:'Meses sem aquisição elegível ficam sem imagem.'};
  }catch(e){progress={...progress,state:'error',message:e.message};throw e;}finally{busy=false;}
 }
 async function imageResponse(id,mode='ndvi',signal){
  const scene=scenes.get(id);if(!scene)throw Error('A cena não está disponível nesta aba. Faça uma nova busca.');
  mode=mode==='natural'?'natural':'ndvi';const key=id+':'+mode;let blob=images.get(key);
  if(!blob){let task=inflight.get(key);if(!task){task=(async()=>{const [visual,mask]=await Promise.all([false,true].map(async isMask=>decode(await(await api('process/v1',visualRequest(scene.geometry,scene.datetime,mode,isMask),signal)).arrayBuffer())));if(visual.width!==mask.width||visual.height!==mask.height)throw Error('Imagem e máscara retornaram dimensões diferentes.');for(let i=0;i<visual.data.length;i+=4)if(!mask.data[i]||!mask.data[i+1])visual.data[i+3]=0;const result=await encode(visual);while(imageBytes+result.size>64*1024*1024&&images.size){const first=images.keys().next().value;imageBytes-=images.get(first).size;images.delete(first);}if(result.size<=64*1024*1024){images.set(key,result);imageBytes+=result.size;}return result;})().finally(()=>inflight.delete(key));inflight.set(key,task);}blob=await task;}
  const grid=renderGrid(scene.geometry);return new Response(blob,{headers:{'Content-Type':'image/png','X-Source-Resolution':'10','X-Display-Resolution':grid.displayPixelMeters.toFixed(2),'X-Image-Dimensions':`${grid.width}x${grid.height}`}});
 }
 async function request(url,body){if(url==='/api/status')return status();if(url==='/api/progress')return {...progress};if(url==='/api/disconnect'){if(busy)throw Error('Aguarde a busca terminar antes de desconectar.');disconnect();return status();}if(url==='/api/connect'){if(busy)throw Error('Aguarde a busca terminar.');if(typeof body?.clientId!=='string'||typeof body?.clientSecret!=='string'||!body.clientId.trim()||!body.clientSecret.trim())throw Error('Preencha Client ID e Client Secret.');disconnect();credentials={id:body.clientId.trim(),secret:body.clientSecret.trim()};try{await getToken();return {connected:true,verifiedAt};}catch(e){disconnect();throw e;}}if(url==='/api/search')return search(body);throw Error('Operação não reconhecida.');}
 return {request,imageResponse};
}

export const browserClient=createBrowserClient();
