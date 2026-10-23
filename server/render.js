import {PNG} from 'pngjs';
export {NDVI_RAMP,ndviColor,project,renderGrid,visualEvalscript,visualRequest} from './render-spec.js';

export function applyMask(visual,mask){const png=PNG.sync.read(visual),scl=PNG.sync.read(mask);if(png.width!==scl.width||png.height!==scl.height)throw Error('A imagem e a máscara retornaram dimensões diferentes.');for(let i=0;i<png.data.length;i+=4){if(!scl.data[i]||!scl.data[i+1])png.data[i+3]=0;}return PNG.sync.write(png);}
