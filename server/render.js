import {PNG} from 'pngjs';
import {validateArea,evalscript} from './core.js';

export const NDVI_RAMP=[[-1,[.23,.28,.4]],[0,[.75,.25,.2]],[.2,[.94,.65,.22]],[.4,[.9,.84,.25]],[.6,[.55,.74,.27]],[.8,[.22,.57,.27]],[1,[.06,.32,.22]]];
export function ndviColor(value){const n=Math.max(-1,Math.min(1,value));for(let i=1;i<NDVI_RAMP.length;i++){const [hi,b]=NDVI_RAMP[i],[lo,a]=NDVI_RAMP[i-1];if(n<=hi){const t=(n-lo)/(hi-lo);return a.map((v,j)=>v+(b[j]-v)*t);}}return NDVI_RAMP.at(-1)[1];}
const R=6378137;
export function project([lon,lat]){return [R*lon*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];}
export function renderGrid(geometry){const b=validateArea(geometry),sw=project([b[0],b[1]]),ne=project([b[2],b[3]]),dx=ne[0]-sw[0],dy=ne[1]-sw[1];const cosine=Math.cos((b[1]+b[3])/2*Math.PI/180);const step=Math.max(5/cosine,dx/2500,dy/2500);const width=Math.max(1,Math.min(2500,Math.ceil(dx/step))),height=Math.max(1,Math.min(2500,Math.ceil(dy/step)));return {bbox:[...sw,...ne],width,height,displayPixelMeters:Math.max(dx/width,dy/height)*cosine,sourcePixelMeters:10};}
export function visualEvalscript(mode){
 const header='//VERSION=3\nfunction setup(){return {input:["B02","B03","B04","B08","dataMask"],output:{bands:4}}}';
 if(mode==='natural')return header+'\nfunction evaluatePixel(s){return [2.5*s.B04,2.5*s.B03,2.5*s.B02,s.dataMask]}';
 return header+`\nconst ramp=${JSON.stringify(NDVI_RAMP)};\nconst color=${ndviColor.toString().replaceAll('NDVI_RAMP','ramp')};\nfunction evaluatePixel(s){const d=s.B08+s.B04;if(!d)return [0,0,0,0];return [...color((s.B08-s.B04)/d),s.dataMask]}`;
}
export function visualRequest(geometry,datetime,mode,mask=false){const grid=renderGrid(geometry),time=new Date(datetime).getTime();return {input:{bounds:{geometry:{type:'Polygon',coordinates:geometry.coordinates.map(r=>r.map(project))},properties:{crs:'http://www.opengis.net/def/crs/EPSG/0/3857'}},data:[{type:'sentinel-2-l2a',dataFilter:{timeRange:{from:new Date(time-1000).toISOString(),to:new Date(time+1000).toISOString()},mosaickingOrder:'leastCC'},processing:{upsampling:mask?'NEAREST':'BILINEAR',downsampling:mask?'NEAREST':'BILINEAR'}}]},output:{width:grid.width,height:grid.height,responses:[{identifier:'default',format:{type:'image/png'}}]},evalscript:mask?evalscript('quality'):visualEvalscript(mode)};}
export function applyMask(visual,mask){const png=PNG.sync.read(visual),scl=PNG.sync.read(mask);if(png.width!==scl.width||png.height!==scl.height)throw Error('A imagem e a máscara retornaram dimensões diferentes.');for(let i=0;i<png.data.length;i+=4){if(!scl.data[i]||!scl.data[i+1])png.data[i+3]=0;}return PNG.sync.write(png);}
