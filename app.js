
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const viewer=document.querySelector('#viewer');
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x090b0e,0.025);

const camera=new THREE.PerspectiveCamera(38,1,0.1,100);
camera.position.set(9,7,11);

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
viewer.prepend(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.target.set(0,.3,0);
controls.minDistance=5;
controls.maxDistance=28;

scene.add(new THREE.HemisphereLight(0xdde7ff,0x24201c,2.1));
const key=new THREE.DirectionalLight(0xffffff,4.0);key.position.set(6,10,8);scene.add(key);
const rim=new THREE.DirectionalLight(0xb9c7ff,2.2);rim.position.set(-8,4,-7);scene.add(rim);
const warm=new THREE.DirectionalLight(0xffd1aa,1.2);warm.position.set(3,-1,-5);scene.add(warm);

const grid=new THREE.GridHelper(26,26,0x2c3138,0x171a1f);grid.position.y=-2.2;scene.add(grid);

let parts=[], selected=null, explode=0, wireframe=false;
const objectById=new Map();
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();

function materialFor(color){
  return new THREE.MeshStandardMaterial({color:new THREE.Color(color),roughness:.46,metalness:.58});
}
function rounded(size,mat){
  return new THREE.Mesh(new RoundedBoxGeometry(size[0],size[1],size[2],4,.12),mat);
}
function cylinder(size,mat){
  const r=Math.max(size[0],size[2])*.5,h=size[1];
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.88,h,28),mat);return m;
}
function pipe(size,mat){
  const length=size[0],r=Math.max(.07,size[1]*.48);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,20),mat);
  m.rotation.z=Math.PI/2;return m;
}
function turbo(size,mat){
  const g=new THREE.Group();
  const tor=new THREE.Mesh(new THREE.TorusGeometry(.52,.23,18,38),mat);tor.rotation.y=Math.PI/2;g.add(tor);
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.72,24),mat);core.rotation.z=Math.PI/2;g.add(core);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.17,.22,.7,18),mat);neck.position.set(.55,.08,.25);neck.rotation.z=Math.PI/2.4;g.add(neck);
  g.scale.setScalar(size[0]);return g;
}
function manifold(size,mat){
  const g=new THREE.Group();
  const rail=new THREE.Mesh(new RoundedBoxGeometry(.55,1.5,.55,3,.15),mat);g.add(rail);
  for(let i=0;i<4;i++){const p=new THREE.Mesh(new THREE.TorusGeometry(.42,.1,12,24,Math.PI*.78),mat);p.rotation.x=Math.PI/2;p.rotation.z=Math.PI/2;p.position.set(.2,.56-i*.38,.25);g.add(p)}
  g.scale.set(size[0],size[1]*.7,size[2]);return g;
}
function cooler(size,mat){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new RoundedBoxGeometry(size[0],size[1],size[2],4,.06),mat);g.add(body);
  for(let i=-3;i<=3;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(size[0]*.84,.025,size[2]*.92),new THREE.MeshStandardMaterial({color:0x6e7479,metalness:.8,roughness:.35}));fin.position.y=i*.07;g.add(fin)}
  const p1=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.5,16),mat);p1.rotation.z=Math.PI/2;p1.position.x=size[0]*.62;g.add(p1);
  const p2=p1.clone();p2.position.x=-size[0]*.62;g.add(p2);return g;
}
function createMesh(p){
  const mat=materialFor(p.color); let o;
  if(p.shape==='rounded')o=rounded(p.size,mat);
  else if(p.shape==='cylinder')o=cylinder(p.size,mat);
  else if(p.shape==='pipe')o=pipe(p.size,mat);
  else if(p.shape==='turbo')o=turbo(p.size,mat);
  else if(p.shape==='manifold')o=manifold(p.size,mat);
  else if(p.shape==='cooler')o=cooler(p.size,mat);
  else o=new THREE.Mesh(new THREE.BoxGeometry(...p.size),mat);
  o.position.fromArray(p.position);
  o.userData={partId:p.id,base:new THREE.Vector3(...p.position),explode:new THREE.Vector3(...p.explode)};
  o.traverse(c=>{if(c.isMesh){c.castShadow=true;c.receiveShadow=true;c.userData.partId=p.id}});
  scene.add(o);objectById.set(p.id,o);return o;
}

async function init(){
  parts=await fetch('/data/engine-parts.json').then(r=>r.json());
  parts.forEach(createMesh);
  renderTree();
  updateLabels();
  document.querySelector('#loading').style.display='none';
}
function systems(){
  return [...new Set(parts.map(p=>p.system))];
}
function renderTree(){
  const q=document.querySelector('#searchInput').value.trim().toLowerCase();
  const root=document.querySelector('#systemTree');
  root.innerHTML='';
  systems().forEach(s=>{
    const subset=parts.filter(p=>p.system===s && (!q||(`${p.name} ${p.description} ${p.symptoms.join(' ')}`).toLowerCase().includes(q)));
    if(!subset.length)return;
    const wrap=document.createElement('div');
    const sb=document.createElement('button');sb.className='system-btn';sb.type='button';sb.innerHTML=`<span>${s}</span><span>${subset.length}</span>`;
    const list=document.createElement('div');list.className='part-list';
    subset.forEach(p=>{
      const b=document.createElement('button');b.type='button';b.className='part-btn'+(selected?.id===p.id?' active':'');b.textContent=p.name;b.addEventListener('click',()=>selectPart(p.id));list.appendChild(b)
    });
    sb.addEventListener('click',()=>{list.hidden=!list.hidden;sb.classList.toggle('active',!list.hidden)});
    wrap.append(sb,list);root.appendChild(wrap);
  });
}
function rootObjectForHit(obj){
  let cur=obj;while(cur && !cur.userData.partId)cur=cur.parent;
  const id=cur?.userData?.partId || obj.userData.partId;return id?objectById.get(id):null;
}
function selectPart(id){
  if(selected){const prev=objectById.get(selected.id);prev?.traverse(c=>{if(c.isMesh&&c.material)c.material.emissive?.setHex(0x000000)})}
  selected=parts.find(p=>p.id===id);if(!selected)return;
  const obj=objectById.get(id);obj?.traverse(c=>{if(c.isMesh&&c.material)c.material.emissive?.setHex(0x4a0b08)});
  document.querySelector('#emptyDetail').classList.add('hidden');
  document.querySelector('#partDetail').classList.remove('hidden');
  document.querySelector('.right-panel').classList.add('open');
  document.querySelector('#detailSystem').textContent=selected.system;
  document.querySelector('#detailName').textContent=selected.name;
  document.querySelector('#detailId').textContent=`component_id: ${selected.id}`;
  document.querySelector('#detailDescription').textContent=selected.description;
  document.querySelector('#detailSymptoms').innerHTML=selected.symptoms.map(x=>`<span class="chip">${x}</span>`).join('');
  document.querySelector('#detailLevel').textContent=selected.level;
  document.querySelector('#assemblyTitle').textContent=selected.system;
  renderTree();updateLabels();
}
function focusSelected(){
  if(!selected)return;const obj=objectById.get(selected.id);if(!obj)return;
  const wp=new THREE.Vector3();obj.getWorldPosition(wp);controls.target.copy(wp);
  const dir=new THREE.Vector3(1,.65,1).normalize();camera.position.copy(wp.clone().add(dir.multiplyScalar(6)));controls.update();
}
function applyExplode(){
  objectById.forEach(o=>{
    const b=o.userData.base,e=o.userData.explode;
    o.position.lerpVectors(b,e,explode);
  });
  document.querySelector('#explodeValue').textContent=Math.round(explode*100)+'%';
}
function updateLabels(){
  const layer=document.querySelector('#labels');if(!document.querySelector('#labelsToggle').checked){layer.innerHTML='';return}
  layer.innerHTML='';
  parts.forEach(p=>{
    if(p.level===3 && !selected && explode<.55)return;
    const obj=objectById.get(p.id);if(!obj)return;
    const pos=new THREE.Vector3();obj.getWorldPosition(pos);pos.project(camera);
    if(pos.z>1)return;
    const x=(pos.x*.5+.5)*viewer.clientWidth,y=(-pos.y*.5+.5)*viewer.clientHeight;
    const d=document.createElement('div');d.className='label'+(selected?.id===p.id?' selected':'');d.textContent=p.name;d.style.left=x+'px';d.style.top=y+'px';layer.appendChild(d)
  });
}
function resize(){
  const w=viewer.clientWidth,h=viewer.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
renderer.domElement.addEventListener('pointerdown',e=>{
  const r=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;
  raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects([...objectById.values()],true);if(hits.length){const id=hits[0].object.userData.partId; if(id)selectPart(id)}
});
document.querySelector('#explodeSlider').addEventListener('input',e=>{explode=Number(e.target.value)/100;applyExplode();updateLabels()});
document.querySelector('#explodePreset').addEventListener('click',()=>{explode=explode>.95?0:1;document.querySelector('#explodeSlider').value=explode*100;applyExplode();updateLabels()});
document.querySelector('#wireframeToggle').addEventListener('change',e=>{wireframe=e.target.checked;objectById.forEach(o=>o.traverse(c=>{if(c.isMesh)c.material.wireframe=wireframe}))});
document.querySelector('#labelsToggle').addEventListener('change',updateLabels);
document.querySelector('#searchInput').addEventListener('input',renderTree);
document.querySelector('#resetView').addEventListener('click',()=>{camera.position.set(9,7,11);controls.target.set(0,.3,0);controls.update()});
document.querySelector('#focusPart').addEventListener('click',focusSelected);

const dlg=document.querySelector('#aiDialog');
function openAI(prefill=''){document.querySelector('#aiContext').textContent=`Context: Audi A4 B9 · ${selected?selected.name:'motor complet'}`;dlg.showModal();if(prefill)document.querySelector('#aiInput').value=prefill;document.querySelector('#aiInput').focus()}
document.querySelector('#askAi').addEventListener('click',()=>openAI());
document.querySelector('#askPartAi').addEventListener('click',()=>openAI(`Explică tehnic ${selected?.name}: rol, moduri de defectare, simptome și ordine de diagnostic.`));
document.querySelector('#closeDialog').addEventListener('click',()=>dlg.close());
document.querySelector('#aiForm').addEventListener('submit',async e=>{
  e.preventDefault();const input=document.querySelector('#aiInput');const q=input.value.trim();if(!q)return;
  const chat=document.querySelector('#chat');chat.insertAdjacentHTML('beforeend',`<div class="user-msg">${q.replace(/[<>&]/g,'')}</div>`);input.value='';
  const msg=document.createElement('div');msg.className='ai-msg';msg.textContent='Analizez…';chat.appendChild(msg);chat.scrollTop=99999;
  try{
    const r=await fetch('/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q,selectedPart:selected,vehicle:{model:'Audi A4 B9 / 8W'}})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||'AI error');msg.textContent=data.answer;
  }catch(err){msg.textContent='Endpoint-ul AI nu a răspuns. Verifică OPENAI_API_KEY în Vercel.'}
});
window.addEventListener('resize',resize);
const ro=new ResizeObserver(()=>resize());ro.observe(viewer);
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);updateLabels()}
resize();init();animate();
