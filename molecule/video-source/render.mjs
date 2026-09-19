// Original SVG export of the same illustrative 3D curves as site/app.js.
// Sequential sharp rasterization THEN single-thread FFmpeg; no browser/GPU.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const sharp=require('/Users/khamit/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
sharp.concurrency(1);sharp.cache(false);
const root=path.dirname(fileURLToPath(import.meta.url));process.chdir(root);
const timing=JSON.parse(fs.readFileSync('timing.json','utf8'));
const caps=JSON.parse(fs.readFileSync('caption-pages.json','utf8'));
const data=JSON.parse(fs.readFileSync('../site/atlas.json','utf8'));
const C={paper:'#f7f8f1',ink:'#173f4d',muted:'#587079',line:'#d6dfd9',tao:'#158f64',project:'#2063b7',other:'#cc564b'};
const domains={
 tao:{c:[-154,91,1],r:[78,77,56],phase:.15,owner:'tao'},
 literature:{c:[-152,-90,-38],r:[106,60,47],phase:1.5,owner:'other'},
 dynamics:{c:[20,120,-29],r:[92,65,62],phase:.7,owner:'project'},
 energy:{c:[136,50,30],r:[81,87,65],phase:1.9,owner:'project'},
 coding:{c:[-24,-29,83],r:[89,108,42],phase:2.7,owner:'project'},
 arithmetic:{c:[130,-114,-29],r:[100,64,53],phase:3.6,owner:'project'}
};
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),norm=a=>mul(a,1/(Math.hypot(...a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function curve(d,t){const a=2*Math.PI*t,p=d.phase;return[d.c[0]+d.r[0]*Math.cos(a)+19*Math.sin(3*a+p),d.c[1]+d.r[1]*Math.sin(a)+16*Math.sin(3*a),d.c[2]+d.r[2]*Math.sin(2*a+p)+11*Math.cos(3*a)]}
const ribbons=[];
for(const[key,d]of Object.entries(domains)){
 const members=data.nodes.filter(n=>n.domain===key);
 members.forEach((n,i)=>n.position=curve(d,(i+.35)/members.length));
 for(let j=0;j<72;j++){
  const verts=[];
  for(const t of[j/72,(j+1)/72]){
   const p=curve(d,t),tangent=norm(sub(curve(d,t+.001),curve(d,t-.001))),a=t*Math.PI*5+d.phase,side=norm(cross(tangent,[Math.cos(a)*.55,Math.sin(a)*.55,1]));
   const section=(t*4)%1,width=section>.1&&section<.72?(section>.57?21*(.72-section)/.15:19):3.8;
   verts.push(add(p,mul(side,width)),add(p,mul(side,-width)));
  }
  ribbons.push({domain:key,owner:d.owner,verts:[verts[0],verts[1],verts[3],verts[2]]});
 }
}
data.nodes.find(n=>n.id==='Full').position=[3,2,8];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,size,str,color=C.ink,weight=400,anchor='start',font='Arial')=>`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${color}">${esc(str)}</text>`;
const lines=(x,y,size,arr,color=C.ink,weight=400,leading=1.2)=>arr.map((v,i)=>text(x,y+i*size*leading,size,v,color,weight)).join('');
const circle=(x,y,r,fill,stroke='none',sw=1)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
function map(t,{focus=null,zoom=1,cx=877,cy=373,alpha=1}={}){
 const yaw=-.35+t*.025,pitch=.25+Math.sin(t*.06)*.08,target=focus?domains[focus].c:[0,0,0],dist=(focus?390:770)/zoom;
 function project(p){const[a,b,c]=sub(p,target),x=a*Math.cos(yaw)+c*Math.sin(yaw),z=-a*Math.sin(yaw)+c*Math.cos(yaw),y=b*Math.cos(pitch)-z*Math.sin(pitch),zz=b*Math.sin(pitch)+z*Math.cos(pitch),s=650/(dist-zz);return{x:cx+x*s,y:cy-y*s,z:zz,s}}
 let commands=[];
 for(const r of ribbons){if(focus&&r.domain!==focus)continue;const p=r.verts.map(project),z=p.reduce((s,v)=>s+v.z,0)/4;
  commands.push({z,s:`<polygon points="${p.map(v=>v.x.toFixed(2)+','+v.y.toFixed(2)).join(' ')}" fill="${C[r.owner]}" fill-opacity="${(.62+(z+200)/1400)*alpha}" stroke="${C[r.owner]}" stroke-width=".35"/>`});
 }
 for(const n of data.nodes){if(focus&&n.domain!==focus)continue;const p=project(n.position),open=n.status==='open',r=n.id==='Full'?14:n.owner==='tao'||n.id.startsWith('Lit')?6:2.3;
  commands.push({z:p.z+2,s:circle(p.x,p.y,Math.min(13,Math.max(open?3:1.5,r*p.s)),open?C.paper:C[n.owner],open?C.muted:'#ffffff',open?1.4:.35)});
 }
 return '<g clip-path="url(#mapclip)">'+commands.sort((a,b)=>a.z-b.z).map(x=>x.s).join('')+'</g>';
}
function wrap(str,max){let out=[],row='';for(const w of str.split(/\s+/)){if(row.length+w.length+1>max){out.push(row);row=w}else row+=(row?' ':'')+w}if(row)out.push(row);return out}
function legend(){return ['tao','project','other'].map((k,i)=>circle(76,444+i*43,6,C[k])+text(94,452+i*43,26,{tao:'Tao',project:'Our records',other:'Other authors'}[k])).join('')}
function card(title,items,color=C.ink){return lines(72,155,64,title,C.ink,600,1.08)+lines(74,343,32,items,color,400,1.42)}
function body(s,t,duration){
 const u=t/duration;
 if(s.id==='challenge'){
  const next=t>duration-3?'Your turn: 3 → ?':'6 → 3';
  return lines(72,155,66,['Can you beat','this tiny puzzle?'],C.ink,600,1.08)+lines(75,363,35,['Even: divide by 2','Odd: multiply by 3, add 1'],C.muted,400,1.55)+circle(907,344,141,'#e4eee7')+text(908,373,t>duration-3?45:73,next,C.ink,600,'middle')+text(907,549,24,'THINK BEFORE THE NEXT STEP',C.muted,400,'middle');
 }
 if(s.id==='path'){
  const nums=[6,3,10,5,16,8,4,2,1],points=[[118,360],[243,360],[368,360],[493,360],[618,360],[743,360],[868,360],[993,360],[1118,360]];
  let active=1;['ten','five','sixteen','eight','four','two','one'].forEach((w,i)=>{const cue=s.captions.find(c=>c.text.toLowerCase().replace(/[^a-z]/g,'')===w);if(cue&&t>=cue.startMs/1000+s.audioOffsetFrames/timing.fps)active=i+2});
  return lines(72,155,64,['One path reaches 1.'],C.ink,600)+text(73,232,32,'Does every starting number do the same?',C.muted)+points.map(([x,y],i)=>(i?`<path d="M${x-72} ${y}h29" stroke="${C.line}" stroke-width="4"/>`:'')+circle(x,y,43,i===active?C.project:i<active?'#dce9df':C.paper,C.line,2)+text(x,y+16,44,nums[i],i===active?'white':C.ink,600,'middle')).join('')+text(73,535,32,t>12?'YOUR NEXT CHALLENGE: start with 7.':'You have checked one example.',C.project);
 }
 if(s.id==='every'){
  const dots=Array.from({length:48},(_,i)=>circle(724+(i%8)*57,239+Math.floor(i/8)*50,10,i===47?C.paper:C.tao,i===47?C.ink:'none',2)).join('');
  return card(['The hard word','is “every”.'],['Many checked starts.','Infinitely many still left.'])+dots+text(916,563,33,'ONE EXCEPTION WOULD MATTER',C.ink,400,'middle');
 }
 if(s.id==='structure')return card(['A structure','of ideas.'],['Rotate. Select. Follow.'])+legend()+map(t)+text(850,590,21,'Illustrative geometry · not a predicted proof',C.muted,400,'middle');
 if(s.id==='tao')return card(['Tao’s green','branch.'],['Almost all starts.','Almost bounded values.','Logarithmic density.'],C.tao)+text(75,536,25,'An exceptional set remains.',C.ink)+map(t,{focus:'tao',zoom:1+u*.25})+text(850,592,21,'Tao · arXiv:1909.03562 · 2019 / 2022',C.muted,400,'middle');
 if(s.id==='others')return card(['Earlier','foundations.'],['Terras · Everett','Almost-all descent','Bernstein · Lagarias','Two-adic dynamics'],C.other)+map(t,{focus:'literature',zoom:1+u*.12})+text(850,592,21,'1976–77 / 1996 · selected sources',C.muted,400,'middle');
 if(s.id==='ours')return card(['Our working','archive.'],['618 registered records','2 new drafts','Residual control: OPEN'],C.project)+text(74,536,25,'Internal audits; hypotheses apply.',C.ink)+map(t,{focus:'energy',zoom:1+u*.14})+text(850,592,20,'Blue = project records, not novelty or proof strength',C.muted,400,'middle');
 if(s.id==='gap')return card(['What would','finish a proof?'],['Every odd n > 1','eventually falls below n.'])+circle(916,287,91,C.paper,C.ink,2)+text(916,310,68,'n',C.ink,400,'middle','Georgia')+`<path d="M916 389v53" fill="none" stroke="${C.project}" stroke-width="3" stroke-dasharray="7 8"/>`+text(916,489,58,'smaller than n',C.project,400,'middle','Georgia')+text(73,535,29,'UNIVERSAL DESCENT IS STILL OPEN',C.project)+text(916,557,24,'Then strong induction → 1',C.muted,400,'middle');
 return card(['Start small.','Think further.'],['Predict → test → explain','Open an original source.','Find the missing step.'])+map(t,{zoom:1+u*.16})+text(74,543,30,'EXPLORE THE MAP · LINK IN DESCRIPTION',C.project)+text(850,596,20,'Khamit Kadyrbekov · Daniyal Kadirbekov',C.muted,400,'middle');
}
function frame(si,local){const s=timing.scenes[si],t=local/timing.fps,global=(s.startFrame+local)/timing.fps,d=s.durationInFrames/timing.fps;
 const cap=caps.find(c=>global*1000>=c.startMs&&global*1000<c.endMs),caption=cap?wrap(cap.text,82):[];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><clipPath id="mapclip"><rect x="570" y="180" width="650" height="420"/></clipPath></defs><rect width="1280" height="720" fill="${C.paper}"/>${text(72,54,21,'INGENIUM · EXPLORE THE COLLATZ CONJECTURE',C.muted,600)}${text(1208,54,21,String(si+1).padStart(2,'0')+' / 09',C.muted,400,'end')}<path d="M72 76h1136" stroke="${C.line}"/>${body(s,t,d)}<rect x="52" y="619" width="1176" height="81" rx="12" fill="${caption.length?'#edf0e7':C.paper}"/>${caption.map((v,i)=>text(640,caption.length===1?666:651+i*32,27,v,C.ink,400,'middle')).join('')}<rect y="715" width="${1280*(s.startFrame+local)/timing.durationInFrames}" height="5" fill="${C.project}"/></svg>`;
}
fs.mkdirSync('qa',{recursive:true});fs.mkdirSync('output',{recursive:true});
const previews=[];
for(let i=0;i<timing.scenes.length;i++){const f=frame(i,Math.floor(timing.scenes[i].durationInFrames*.55)),p=`qa/scene-${i+1}.png`;await sharp(Buffer.from(f)).png().toFile(p);previews.push({input:await sharp(p).resize(640,360).png().toBuffer(),left:(i%3)*640,top:Math.floor(i/3)*360});}
await sharp({create:{width:1920,height:1080,channels:3,background:C.paper}}).composite(previews).png().toFile('qa/contact-sheet.png');
if(!process.argv.includes('--render')){console.log('Nine static QA frames complete.');process.exit(0)}
for(let si=0;si<timing.scenes.length;si++){
 const s=timing.scenes[si],out=`output/${s.id}.mp4`;if(fs.existsSync(out)){console.log('Reuse',out);continue}
 const dir=`output/frames-${s.id}`;fs.mkdirSync(dir,{recursive:true});
 for(let f=0;f<s.durationInFrames;f++)await sharp(Buffer.from(frame(si,f))).png().toFile(`${dir}/${String(f).padStart(5,'0')}.png`);
 const dur=s.durationInFrames/timing.fps;
 const args=['-hide_banner','-loglevel','error','-y','-threads','1','-filter_threads','1','-filter_complex_threads','1','-framerate',String(timing.fps),'-i',dir+'/%05d.png','-threads','1','-i',`public/narration/${s.id}.mp3`,'-af','adelay=333.333:all=1,apad','-t',String(dur),'-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-threads','1','-c:a','aac','-b:a','96k','-movflags','+faststart',out];
 const r=spawnSync('ffmpeg',args,{stdio:'inherit'});if(r.status!==0)throw Error('Encoding failed '+s.id);
 fs.rmSync(dir,{recursive:true});console.log('Rendered',s.id,dur.toFixed(2)+'s');
}
fs.writeFileSync('output/concat.txt',timing.scenes.map(s=>`file '${s.id}.mp4'`).join('\n')+'\n');
let r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-threads','1','-f','concat','-safe','0','-i','output/concat.txt','-c','copy','-movflags','+faststart','output/collatz-inside-the-map-en.mp4'],{stdio:'inherit'});if(r.status!==0)throw Error('Concat failed');
fs.writeFileSync('qa/render-settings.json',JSON.stringify({size:[1280,720],fps:timing.fps,frames:timing.durationInFrames,sharpConcurrency:1,encodingThreads:1,filterThreads:1,renderAndEncode:'sequential, not concurrent',gpu:false,playback:false,geometry:'same domain centers and curves as interactive app.js; illustrative only'},null,2));
console.log('Master ready');
