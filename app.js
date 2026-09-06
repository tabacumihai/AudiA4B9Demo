
let PARTS=[], selected=null, system='Toate', zoom=1, labelsOn=false;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const POS={engine:[300,345],front:[250,390],cabin:[615,345],center:[620,420],rear:[930,360],underbody:[620,435]};
const jitter=[[-58,-28],[-25,12],[18,-18],[52,16],[0,38],[-72,20],[72,-8],[32,44],[-35,48]];

async function boot(){
  PARTS=await fetch('data/parts.json').then(r=>r.json());
  renderFilters(); renderParts(); bind();
}
function renderFilters(){
  const counts=PARTS.reduce((a,p)=>(a[p.system]=(a[p.system]||0)+1,a),{});
  const systems=['Toate',...Object.keys(counts).sort()];
  $('#systemFilters').innerHTML=systems.map(s=>`<button class="filter ${s===system?'active':''}" data-system="${s}"><span>${s}</span><span>${s==='Toate'?PARTS.length:counts[s]}</span></button>`).join('');
}
function filtered(){
  const q=$('#search').value.trim().toLowerCase();
  return PARTS.filter(p=>(system==='Toate'||p.system===system)&&(!q||JSON.stringify(p).toLowerCase().includes(q)));
}
function renderParts(){
  const list=filtered(), groups={};
  list.forEach(p=>(groups[p.zone]??=[]).push(p));
  const hs=$('#hotspots'), lb=$('#labels'); hs.innerHTML=''; lb.innerHTML='';
  list.forEach((p,idx)=>{
    const base=POS[p.zone]||POS.center, arr=groups[p.zone], local=arr.indexOf(p), j=jitter[local%jitter.length], ring=Math.floor(local/jitter.length);
    const x=base[0]+j[0]*(1+ring*.45), y=base[1]+j[1]-ring*30;
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','hotspot'+(selected?.id===p.id?' active':''));
    g.setAttribute('data-id',p.id); g.setAttribute('transform',`translate(${x} ${y})`);
    g.innerHTML=`<circle class="outer" r="${p.level===1?12:p.level===2?9:7}"/><circle class="inner" r="${p.level===1?3.6:2.7}"/>`;
    g.addEventListener('click',()=>selectPart(p.id)); hs.appendChild(g);
    const d=document.createElement('div'); d.className='part-label'; d.dataset.id=p.id; d.textContent=p.name;
    d.style.left=(x/12)+'%'; d.style.top=(y/6.2)+'%'; lb.appendChild(d);
  });
  $('#resultCount').textContent=list.length; $('#visibleParts').textContent=PARTS.length;
  $('#stageTitle').textContent=system==='Toate'?'Toate sistemele':system;
  $$('.zone').forEach(z=>z.style.stroke=(system==='Toate'||list.some(p=>p.zone===z.dataset.zone))?'#39414d':'#171b21');
}
function selectPart(id){
  selected=PARTS.find(p=>p.id===id); renderParts();
  const rel=(selected.related||[]).map(id=>PARTS.find(p=>p.id===id)).filter(Boolean);
  $('#detailContent').className='';
  $('#detailContent').innerHTML=`<div class="part-kicker">${selected.system} · nivel ${selected.level}</div>
    <h3 class="part-title">${selected.name}</h3><div class="part-code">${selected.id} · OEM: ${selected.oem}</div>
    <p class="part-copy">${selected.summary}</p>
    <div class="detail-section"><h4>Simptome asociate</h4><div class="chips">${selected.symptoms.map(x=>`<span class="chip search-chip">${x}</span>`).join('')}</div></div>
    <div class="detail-section"><h4>Componente legate</h4><div class="chips">${rel.map(x=>`<span class="chip rel-chip" data-id="${x.id}">${x.name}</span>`).join('')||'<span class="part-code">—</span>'}</div></div>
    <button class="ask-part" id="askPart">Explică această piesă cu Astra →</button>`;
  $('#detail').classList.add('open');
  $$('.rel-chip').forEach(x=>x.onclick=()=>selectPart(x.dataset.id));
  $$('.search-chip').forEach(x=>x.onclick=()=>{$('#search').value=x.textContent;system='Toate';renderFilters();renderParts()});
  $('#askPart').onclick=()=>openAI(`Explică în detaliu ${selected.name}: rol, moduri tipice de defectare, simptome, verificări și relația cu piesele din jur.`);
}
function bind(){
  $('#search').addEventListener('input',renderParts);
  $('#systemFilters').addEventListener('click',e=>{const b=e.target.closest('.filter');if(!b)return;system=b.dataset.system;renderFilters();renderParts()});
  $('#toggleLabels').onclick=()=>{labelsOn=!labelsOn;$('#labels').classList.toggle('show',labelsOn)};
  $('#zoomIn').onclick=()=>setZoom(Math.min(1.5,zoom+.1)); $('#zoomOut').onclick=()=>setZoom(Math.max(.7,zoom-.1));
  $('#detailClose').onclick=()=>$('#detail').classList.remove('open');
  $('#aiOpen').onclick=()=>openAI();
  $('#aiClose').onclick=()=>$('#aiModal').classList.add('hidden');
  $('#aiModal').addEventListener('click',e=>{if(e.target.id==='aiModal')$('#aiModal').classList.add('hidden')});
  $('#aiForm').addEventListener('submit',askAI);
}
function setZoom(v){zoom=v;$('#canvas').style.transform=`scale(${zoom})`;$('#zoomLabel').textContent=Math.round(zoom*100)+'%'}
function openAI(prefill=''){
  $('#aiModal').classList.remove('hidden'); $('#aiContext').textContent=`Context: Audi A4 B9 · ${selected?selected.name:(system==='Toate'?'toate sistemele':system)}`;
  if(prefill) $('#aiInput').value=prefill; $('#aiInput').focus();
}
async function askAI(e){
  e.preventDefault(); const input=$('#aiInput'), q=input.value.trim(); if(!q)return;
  $('#chat').insertAdjacentHTML('beforeend',`<div class="user-msg">${escapeHTML(q)}</div>`); input.value='';
  const thinking=document.createElement('div'); thinking.className='assistant-msg'; thinking.textContent='Analizez contextul…'; $('#chat').appendChild(thinking); $('#chat').scrollTop=99999;
  try{
    const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,vehicle:{generation:'A4 B9 / 8W',engine:$('#engineSelect').value,drive:$('#driveSelect').value},selectedPart:selected})});
    if(!r.ok) throw 0; const data=await r.json(); thinking.textContent=data.answer;
  }catch{
    thinking.textContent='Demo local: endpoint-ul AI nu este pornit. Rulează server.mjs cu OPENAI_API_KEY pentru răspunsuri Astra. UI-ul și atlasul funcționează și fără AI.';
  }
}
function escapeHTML(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
boot();
