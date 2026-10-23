export const browserMode=import.meta.env.MODE==='pages';
let clientTask;
function client(){return clientTask??=(import('./copernicus-browser.js').then(m=>m.browserClient));}
export async function request(url,body){if(browserMode)return(await client()).request(url,body);const r=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),...(url==='/api/connect'?{signal:AbortSignal.timeout(40000)}:{})}:{});const j=await r.json();if(!r.ok)throw Error(j.error||'Falha na consulta.');return j;}
export async function imageResponse(id,mode,signal){if(browserMode)return(await client()).imageResponse(id,mode,signal);return fetch(`/api/image/${id}?mode=${mode}`,{signal});}
