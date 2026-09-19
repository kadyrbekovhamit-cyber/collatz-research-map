/* On-demand 3D projection; no physics simulation, workers, WebGL or idle loop. */
(() => {
'use strict';
const data=window.COLLATZ_ATLAS,$=id=>document.getElementById(id),canvas=$('atlas'),ctx=canvas.getContext('2d');
const colors={tao:[21,143,100],project:[32,99,183],other:[204,86,75]};
const domains={
 tao:{name:'Tao · almost all orbits',owner:'tao',c:[-154,91,1],r:[78,77,56],phase:.15},
 literature:{name:'Published foundations',owner:'other',c:[-152,-90,-38],r:[106,60,47],phase:1.5},
 dynamics:{name:'Dynamics & descent',owner:'project',c:[20,120,-29],r:[92,65,62],phase:.7},
 energy:{name:'Defects & energy',owner:'project',c:[136,50,30],r:[81,87,65],phase:1.9},
 coding:{name:'Codes & 2-adic structure',owner:'project',c:[-24,-29,83],r:[89,108,42],phase:2.7},
 arithmetic:{name:'Arithmetic certificates',owner:'project',c:[130,-114,-29],r:[100,64,53],phase:3.6}
};
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),norm=a=>{const l=Math.hypot(...a)||1;return mul(a,1/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const byId=new Map(data.nodes.map(n=>[n.id,n])),adj=new Map(data.nodes.map(n=>[n.id,[]]));
for(const e of data.edges){adj.get(e.from).push(e);adj.get(e.to).push(e)}
function curve(d,t){const a=2*Math.PI*t,p=d.phase;return [d.c[0]+d.r[0]*Math.cos(a)+19*Math.sin(3*a+p),d.c[1]+d.r[1]*Math.sin(a)+16*Math.sin(3*a),d.c[2]+d.r[2]*Math.sin(2*a+p)+11*Math.cos(3*a)]}
const ribbons=[];
for(const [key,d] of Object.entries(domains)){
 const members=data.nodes.filter(n=>n.domain===key);d.members=members;
 members.forEach((n,i)=>{n.position=curve(d,(i+.35)/members.length);n.index=i});
 const count=128;
 for(let j=0;j<count;j++){
  const ts=[j/count,(j+1)/count],verts=[];let normal;
  for(const t of ts){const p=curve(d,t),tangent=norm(sub(curve(d,t+.001),curve(d,t-.001))),a=t*Math.PI*5+d.phase;
   const side=norm(cross(tangent,[Math.cos(a)*.55,Math.sin(a)*.55,1]));
   const section=(t*4)%1,wide=section>.1&&section<.72;
   const width=wide?(section>.57?21*(.72-section)/.15:19):3.8;
   verts.push(add(p,mul(side,width)),add(p,mul(side,-width)));normal=norm(cross(tangent,side));
  }
  ribbons.push({domain:key,owner:d.owner,verts:[verts[0],verts[1],verts[3],verts[2]],normal,t:(j+.5)/count});
 }
}
if(byId.has('Full'))byId.get('Full').position=[3,2,8];
let yaw=-.3,pitch=.22,distance=790,target=[0,0,0],filter='all',selected='LitTao',inside=false,cut=0,xray=false,allLinks=false;
let ribbonHits=[];let projected=[],width=0,height=0,scheduled=false,hover=null,animation=0,tourIndex=-1,renderCount=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const labels=$('map-labels'),labelEls={};
for(const [key,d] of Object.entries(domains)){const el=document.createElement('div');el.className='domain-label';el.textContent=d.name;labels.append(el);labelEls[key]=el}
function rotate(p){const [a,b,c]=sub(p,target),x=a*Math.cos(yaw)+c*Math.sin(yaw),z=-a*Math.sin(yaw)+c*Math.cos(yaw);return [x,b*Math.cos(pitch)-z*Math.sin(pitch),b*Math.sin(pitch)+z*Math.cos(pitch)]}
function project(p){const [x,y,z]=rotate(p),depth=distance-z,f=Math.min(width,height)*1.54;if(depth<28)return null;const s=f/depth;return {x:width/2+x*s,y:height/2-y*s,z,depth,s}}
function shown(n){return filter==='all'||filter==='open'&&n.status==='open'||n.owner===filter}
function domainShown(d){return filter==='all'||filter==='open'||d.owner===filter}
function rgba(rgb,a){return `rgba(${rgb.map(Math.round).join(',')},${a})`}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw()})}
function draw(){
 const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=Math.min(devicePixelRatio||1,1.6);
 if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr)}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 const near=new Set([selected,...adj.get(selected).flatMap(e=>[e.from,e.to])]);
 const zClip=cut?260-cut*4.8:Infinity;
 const commands=[];ribbonHits=[];
 for(const ribbon of ribbons){if(!domainShown(domains[ribbon.domain]))continue;
  const points=ribbon.verts.map(project);if(points.some(p=>!p))continue;const z=points.reduce((s,p)=>s+p.z,0)/4;if(z>zClip)continue;
  if(points.every(p=>p.x<-100||p.x>width+100||p.y<-100||p.y>height+100))continue;
  const nr=rotate(add(target,ribbon.normal));const lighting=.65+.35*Math.abs(nr[2]);
  const base=colors[ribbon.owner],rgb=base.map(v=>v*lighting+35*(1-lighting));
  const opacity=xray?.19:filter==='open'?.13:inside&&ribbon.domain!==byId.get(selected).domain?.13:.91;
  commands.push({kind:'ribbon',domain:ribbon.domain,z,points,rgb,opacity});
 }
 projected=data.nodes.filter(shown).map(n=>{const p=project(n.position);return p?{...p,n,r:Math.max(n.status==='open'?2.6:1.55,Math.min(12,(n.owner==='tao'||n.id.startsWith('Lit')?5:2.35)*p.s))}:null}).filter(p=>p&&p.z<=zClip&&p.x>-30&&p.x<width+30&&p.y>-30&&p.y<height+30);
 const lookup=new Map(projected.map(p=>[p.n.id,p]));
 for(const e of data.edges){if(!allLinks&&e.from!==selected&&e.to!==selected)continue;const a=lookup.get(e.from),b=lookup.get(e.to);if(!a||!b)continue;
  commands.push({kind:'edge',z:(a.z+b.z)/2-1,a,b,e,active:e.from===selected||e.to===selected});
 }
 for(const p of projected)commands.push({kind:'node',z:p.z+2,p});
 commands.sort((a,b)=>a.z-b.z);
 for(const cmd of commands){
  if(cmd.kind==='ribbon'){ribbonHits.push(cmd);ctx.beginPath();cmd.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=rgba(cmd.rgb,cmd.opacity);ctx.fill();ctx.lineWidth=.45;ctx.strokeStyle=rgba(cmd.rgb.map(v=>Math.min(255,v+42)),cmd.opacity*.75);ctx.stroke();}
  if(cmd.kind==='edge'){ctx.beginPath();ctx.moveTo(cmd.a.x,cmd.a.y);ctx.lineTo(cmd.b.x,cmd.b.y);ctx.lineWidth=cmd.active?1.05:.45;ctx.strokeStyle=cmd.active?'#829ca8b8':'#8ca5b91c';ctx.setLineDash(cmd.e.dashed?[3,4]:[]);ctx.stroke();ctx.setLineDash([]);}
  if(cmd.kind==='node'){const p=cmd.p,n=p.n,active=n.id===selected,nearby=near.has(n.id),rgb=colors[n.owner];const r=active?Math.max(7,p.r+3):p.r;
   ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=n.status==='open'?'#fcfdfa':rgba(rgb,nearby||n.id.startsWith('Lit')?1:.6);ctx.fill();
   ctx.lineWidth=active?2.2:n.status==='open'?1.1:.45;ctx.strokeStyle=active?rgba(rgb,1):n.status==='open'?'#7b929ebb':'#ffffff99';ctx.setLineDash(n.status==='draft'?[2,2]:[]);ctx.stroke();ctx.setLineDash([]);
   if(active){ctx.beginPath();ctx.arc(p.x,p.y,r+5,0,Math.PI*2);ctx.strokeStyle=rgba(rgb,.2);ctx.lineWidth=3;ctx.stroke()}
  }
 }
 for(const [key,d] of Object.entries(domains)){
  const anchor=add(d.c,[0,d.r[1]+29,0]),p=project(anchor),el=labelEls[key];
  const visible=!inside&&domainShown(d)&&p&&p.x>65&&p.x<width-65&&p.y>40&&p.y<height-100;
  el.hidden=!visible;if(visible){el.style.left=p.x+'px';el.style.top=p.y+'px'}
 }
 if(inside){const p=lookup.get(selected);if(p){ctx.font='600 11px -apple-system, sans-serif';ctx.fillStyle='#244d68';const text=byId.get(selected).title.slice(0,44);const tw=ctx.measureText(text).width;const x=Math.max(10,Math.min(width-tw-12,p.x+13)),y=Math.max(36,Math.min(height-125,p.y-15));ctx.fillStyle='#ffffffed';ctx.fillRect(x-5,y-14,tw+10,22);ctx.fillStyle='#244d68';ctx.fillText(text,x,y)}}
 canvas.dataset.renderCount=String(++renderCount);canvas.dataset.visibleNodes=String(projected.length);canvas.dataset.distance=String(Math.round(distance));canvas.dataset.yaw=yaw.toFixed(3);canvas.dataset.mode=inside?'inside':'overview';
}
function moveCamera(nextTarget,nextDistance){cancelAnimationFrame(animation);const start=performance.now(),oldTarget=target.slice(),oldDistance=distance,duration=reduced?0:340;
 function frame(now){const t=duration?Math.min(1,(now-start)/duration):1,e=1-(1-t)**3;target=oldTarget.map((x,i)=>x+(nextTarget[i]-x)*e);distance=oldDistance+(nextDistance-oldDistance)*e;schedule();if(t<1)animation=requestAnimationFrame(frame)}
 animation=requestAnimationFrame(frame);
}
function overview(){inside=false;cut=0;$('cut').value='0';$('cut-label').textContent='surface';$('back').hidden=true;$('crumb').textContent=' / overview';moveCamera([0,0,0],width<600?960:790)}
function enter(){inside=true;const n=byId.get(selected);$('crumb').textContent=' / '+domains[n.domain].name+' / '+n.id;$('back').hidden=false;cut=0;$('cut').value='0';$('cut-label').textContent='surface';moveCamera(n.position,210);if(innerWidth<740)$('stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})}
const statuses={published:'Published result / method',internal:'Internal record · hypotheses apply',open:'Open obligation · not established',draft:'Draft · manual audits, not registered'};
function choose(id,focus=false){if(!byId.has(id))return;selected=id;const n=byId.get(id);if(!shown(n)){filter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')))}const owner=$('owner');owner.replaceChildren();const dot=document.createElement('i');owner.append(dot,document.createTextNode(n.author));owner.style.color=rgba(colors[n.owner],1);$('status').textContent=statuses[n.status];$('node-title').textContent=n.title;$('node-date').textContent=n.date;$('node-summary').textContent=n.summary;$('original-box').hidden=!n.original;$('node-original').textContent=n.original;$('source').href=n.source;$('source').textContent=n.sourceLabel+' ↗';
 const edges=adj.get(id),related=$('related');related.replaceChildren();$('connection-count').textContent=edges.length;
 for(const e of edges){const out=e.from===id,to=byId.get(out?e.to:e.from),b=document.createElement('button');b.className='related-node';const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent=out?'→':'←';const txt=document.createElement('span');txt.textContent=to.title;const small=document.createElement('small');small.textContent=e.label||(e.dashed?'Qualified or open connection':'Recorded connection');txt.append(small);b.append(arrow,txt);b.onclick=()=>{choose(to.id,inside)};related.append(b)}
 if(!edges.length){const p=document.createElement('p');p.className='muted';p.textContent='No dependency links are recorded for this entry.';related.append(p)}
 $('search-results').hidden=true;history.replaceState(null,'','#'+encodeURIComponent(id));if(focus)enter();schedule();
}
function setFilter(f){filter=f;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===f)));if(f!=='all'&&!shown(byId.get(selected))){const n=data.nodes.find(n=>shown(n));if(n)choose(n.id)}overview();schedule()}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>setFilter(b.dataset.filter));
document.querySelector('.brand').onclick=e=>{e.preventDefault();setFilter('all');overview()};$('enter').onclick=enter;$('back').onclick=overview;$('overview').onclick=()=>{setFilter('all');overview()};$('fit').onclick=()=>{yaw=-.3;pitch=.22;overview()};
for(const [id,delta] of [['rotate-left',-.22],['rotate-right',.22]])$(id).onclick=()=>{yaw+=delta;schedule()};
function zoom(factor){cancelAnimationFrame(animation);distance=Math.max(45,Math.min(2200,distance*factor));schedule()}
$('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);
$('cut').oninput=e=>{cut=Number(e.target.value);$('cut-label').textContent=cut?cut+'% cut':'surface';schedule()};
$('xray').onchange=e=>{xray=e.target.checked;schedule()};$('links').onchange=e=>{allLinks=e.target.checked;schedule()};
const search=$('search');search.oninput=()=>{let term=search.value.trim().toLowerCase();if(term==='тао')term='tao';const box=$('search-results');box.replaceChildren();if(!term){box.hidden=true;return}const found=data.nodes.filter(n=>(n.id+' '+n.title+' '+n.original+' '+n.author).toLowerCase().includes(term));box.hidden=false;
 for(const n of found.slice(0,40)){const b=document.createElement('button');b.textContent=n.title;const s=document.createElement('small');s.textContent=n.id+' · '+statuses[n.status];b.append(s);b.onclick=()=>{filter='all';document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.filter==='all')));choose(n.id,true);search.value=''};box.append(b)}
 if(!found.length){const p=document.createElement('div');p.className='empty';p.textContent='No matching argument.';box.append(p)}
};search.onkeydown=e=>{if(e.key==='Escape')$('search-results').hidden=true};
const pointer=new Map();let dragStart=null,previous=null;
function gesture(){const p=[...pointer.values()];return p.length===2?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,spread:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:p[0]}
function hit(x,y){
 const direct=projected.slice().sort((a,b)=>b.z-a.z).find(p=>Math.hypot(p.x-x,p.y-y)<Math.max(8,p.r+4));if(direct)return direct;
 for(const face of ribbonHits.slice().reverse()){let insideFace=false;const ps=face.points;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if(((a.y>y)!==(b.y>y))&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)insideFace=!insideFace}if(insideFace)return projected.filter(p=>p.n.domain===face.domain).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0]}
 return null;
}
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});dragStart={x:e.clientX,y:e.clientY};previous=gesture();canvas.setPointerCapture(e.pointerId);$('tooltip').hidden=true;cancelAnimationFrame(animation)});
canvas.addEventListener('pointermove',e=>{if(pointer.has(e.pointerId)){pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=gesture();if(previous){yaw+=(p.x-previous.x)*.006;pitch=Math.max(-1.55,Math.min(1.55,pitch+(p.y-previous.y)*.006));if(p.spread&&previous.spread)distance=Math.max(45,Math.min(2200,distance*previous.spread/p.spread))}previous=p;schedule();return}
 const r=canvas.getBoundingClientRect(),p=hit(e.clientX-r.left,e.clientY-r.top),tip=$('tooltip');hover=p?.n.id||null;tip.hidden=!p;if(p){tip.textContent=p.n.title+' · '+statuses[p.n.status];tip.style.left=Math.max(8,Math.min(width-280,p.x+15))+'px';tip.style.top=Math.max(8,Math.min(height-95,p.y+14))+'px';canvas.style.cursor='pointer'}else canvas.style.cursor='grab';
});
canvas.addEventListener('pointerup',e=>{if(pointer.size===1&&dragStart&&Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)<6){const r=canvas.getBoundingClientRect(),p=hit(e.clientX-r.left,e.clientY-r.top);if(p)choose(p.n.id)}pointer.delete(e.pointerId);previous=gesture();dragStart=null});
canvas.addEventListener('pointercancel',e=>{pointer.delete(e.pointerId);previous=null;dragStart=null});canvas.addEventListener('pointerleave',()=>{$('tooltip').hidden=true});
canvas.addEventListener('dblclick',()=>{if(hover){choose(hover);enter()}});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-120,Math.min(120,e.deltaY))*.0018))},{passive:false});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Escape','Enter'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=.15;if(e.key==='ArrowRight')yaw+=.15;if(e.key==='ArrowUp')pitch-=.15;if(e.key==='ArrowDown')pitch+=.15;if(e.key==='+'||e.key==='=')zoom(.8);if(e.key==='-')zoom(1.25);if(e.key==='Escape')overview();if(e.key==='Enter')enter();schedule()}});
const tour=['LitTao','LitConjugacy','LocalWeightedFibers','Full'];$('tour').onclick=()=>{tourIndex=(tourIndex+1)%tour.length;filter='all';document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.filter==='all')));choose(tour[tourIndex],true);$('tour').textContent=tourIndex===3?'Restart the tour ↗':'Next · '+(tourIndex+1)+' / 4 →'};
$('inventory').textContent=data.archiveCount+' archive nodes · '+data.literatureCount+' literature entries · '+data.draftCount+' new drafts';
new ResizeObserver(schedule).observe($('stage'));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
choose(decodeURIComponent(location.hash.slice(1))||'LitTao');if(innerWidth<740)distance=960;schedule();
})();
