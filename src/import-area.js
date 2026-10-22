import {validateArea} from '../server/core.js';

function ringFromText(value) {
  if (!value?.trim()) throw Error('O polígono não contém coordenadas.');
  return value.trim().split(/\s+/).map(point => point.split(',').slice(0,2).map(Number));
}
function closeRing(ring) {
  const points=ring.map(p=>p.slice(0,2));
  if(points.length && (points[0][0]!==points.at(-1)[0] || points[0][1]!==points.at(-1)[1])) points.push([...points[0]]);
  return points;
}
export function polygons(text,name) {
  const list=[];
  function add(geometry,title) {
    if(geometry?.type==='MultiPolygon') {geometry.coordinates.forEach((c,i)=>add({type:'Polygon',coordinates:c},`${title} · parte ${i+1}`));return;}
    if(geometry?.type==='GeometryCollection') {geometry.geometries.forEach(g=>add(g,title));return;}
    if(geometry?.type!=='Polygon') return;
    const normalized={type:'Polygon',coordinates:geometry.coordinates.map(closeRing)};
    validateArea(normalized);
    list.push({name:title,geometry:normalized});
  }
  if(name.toLowerCase().endsWith('.kml')) {
    const xml=new DOMParser().parseFromString(text,'application/xml');
    if(xml.getElementsByTagName('parsererror').length) throw Error('O KML está inválido ou incompleto. Exporte o arquivo novamente.');
    const placemarks=[...xml.getElementsByTagNameNS('*','Placemark')];
    const containers=placemarks.length?placemarks:[xml.documentElement];
    for(const placemark of containers) {
      const title=placemark.getElementsByTagNameNS('*','name')[0]?.textContent?.trim()||`Talhão ${list.length+1}`;
      for(const polygon of placemark.getElementsByTagNameNS('*','Polygon')) {
        const outer=polygon.getElementsByTagNameNS('*','outerBoundaryIs')[0];
        const exterior=outer?.getElementsByTagNameNS('*','coordinates')[0]?.textContent;
        const holes=[...polygon.getElementsByTagNameNS('*','innerBoundaryIs')].map(h=>ringFromText(h.getElementsByTagNameNS('*','coordinates')[0]?.textContent));
        add({type:'Polygon',coordinates:[ringFromText(exterior),...holes]},title);
      }
    }
  } else {
    const json=JSON.parse(text);
    const features=json.type==='FeatureCollection'?json.features:[json.type==='Feature'?json:{geometry:json}];
    for(const [i,f] of features.entries()) add(f.geometry,f.properties?.name||`Talhão ${i+1}`);
  }
  if(!list.length) throw Error('Nenhum limite de talhão encontrado. O arquivo precisa conter polígonos; pontos, linhas e links de rede não definem uma área.');
  return list;
}
