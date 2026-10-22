export function validateArea(geometry) {
  if (geometry?.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length) throw Error('Importe um limite de talhão em KML ou GeoJSON Polygon.');
  const ring = geometry.coordinates[0];
  for(const boundary of geometry.coordinates) {
    if (!Array.isArray(boundary) || boundary.length < 4 || boundary.length > 20000 || boundary.some(p => !Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 85)) throw Error('Coordenadas inválidas ou limite com mais de 20.000 pontos. Use longitude e latitude em WGS84.');
    if (boundary[0][0] !== boundary.at(-1)[0] || boundary[0][1] !== boundary.at(-1)[1]) throw Error('O polígono precisa estar fechado.');
  }
  const xs = ring.map(p=>p[0]), ys=ring.map(p=>p[1]);
  const bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  if (bbox[2]<=bbox[0] || bbox[3]<=bbox[1] || (bbox[2]-bbox[0]) * (bbox[3]-bbox[1]) > .25) throw Error('Selecione uma área menor, com até aproximadamente 3.000 km².');
  return bbox;
}
export function period(now=new Date()) { const start=new Date(now); start.setUTCFullYear(start.getUTCFullYear()-3); return [start.toISOString(),now.toISOString()]; }
export function inside(x,y,ring) { let c=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++) {const a=ring[i],b=ring[j]; if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) c=!c;} return c; }
export function quality(png,bbox,geometry) {
 let total=0,covered=0,clear=0;
 for(let y=0;y<png.height;y++) for(let x=0;x<png.width;x++) {
  const lon=bbox[0]+(x+.5)/png.width*(bbox[2]-bbox[0]); const lat=bbox[3]-(y+.5)/png.height*(bbox[3]-bbox[1]);
  if(!inside(lon,lat,geometry.coordinates[0]) || geometry.coordinates.slice(1).some(r=>inside(lon,lat,r))) continue;
  total++; const i=(y*png.width+x)*4; if(png.data[i+1]>0) covered++; if(png.data[i]>0 && png.data[i+1]>0) clear++;
 }
 if(!total) throw Error('Área pequena demais para avaliar.');
 return {visibility:100*clear/total,coverage:100*covered/total};
}
export function bestMonthly(scenes) { const months=new Map(); for(const s of scenes) {const m=s.datetime.slice(0,7),prev=months.get(m); if(!prev || s.visibility>prev.visibility || (s.visibility===prev.visibility && s.cloud<prev.cloud)) months.set(m,s);} return [...months.values()].sort((a,b)=>b.datetime.localeCompare(a.datetime)); }
export function evalscript(mode) {
 const header='//VERSION=3\nfunction setup(){return {input:["B02","B03","B04","B08","SCL","dataMask"],output:{bands:4}}}';
 const clear='s.dataMask && [4,5,6].includes(s.SCL)';
 if(mode==='quality') return header+`\nfunction evaluatePixel(s){return [(${clear})?1:0,s.dataMask,0,1]}`;
 if(mode==='natural') return header+`\nfunction evaluatePixel(s){return [2.5*s.B04,2.5*s.B03,2.5*s.B02,(${clear})?1:0]}`;
 return header+`\nfunction evaluatePixel(s){let d=s.B08+s.B04; if(!d)return [0,0,0,0];let n=(s.B08-s.B04)/d;let c=n<0?[.23,.28,.4]:n<.2?[.75,.25,.2]:n<.4?[.94,.65,.22]:n<.6?[.63,.76,.28]:n<.8?[.22,.57,.27]:[.06,.32,.22];return [...c,(${clear})?1:0]}`;
}
