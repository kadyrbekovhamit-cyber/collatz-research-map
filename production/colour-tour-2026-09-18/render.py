"""Single-worker, real 3D projection of the public graph; no media playback."""
import argparse, bisect, json, math, os, subprocess, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent
W,H,FPS=1280,720,24
BG=(8,14,28); INK=(237,245,255); DIM=(160,178,204)
COL={'checked':(98,138,255),'reference':(81,217,208),'open':(255,197,101),'correction':(255,129,142)}
FONT='/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
fonts={}
def font(size,bold=False):
 key=(size,bold)
 if key not in fonts:fonts[key]=ImageFont.truetype(BOLD if bold else FONT,size)
 return fonts[key]
def colour(n):return 'correction' if n['id']=='PowerBarrier' else 'reference' if n['id'] in ('CZKnown','NishiokaKnown') else 'checked' if n['state']=='checked' else 'open'
def blend(c,a,b=BG):return tuple(round(x*a+y*(1-a)) for x,y in zip(c,b))
def wrap(text,size,width,bold=False):
 lines=[];line=''
 for word in text.split():
  trial=(line+' '+word).strip()
  if font(size,bold).getlength(trial)>width and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 return lines

g=json.loads((ROOT/'tour/graph.json').read_text());nodes=g['nodes'];idx={n['id']:i for i,n in enumerate(nodes)}
edges=[(idx[e['from']],idx[e['to']]) for e in g['edges']]
timing=json.loads((ROOT/'timing.json').read_text());scenes=timing['scenes'];caps=json.loads((ROOT/'caption-pages.json').read_text());cap_starts=[c['startMs'] for c in caps]
scene_starts=[s['startFrame'] for s in scenes]

def base(s,i):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 # Subtle concentric depth field and a clean editorial frame.
 for r in range(330,0,-5):
  a=(1-r/330)*.12;d.ellipse((900-r,330-r,900+r,330+r),fill=blend((65,100,162),a))
 d.text((42,33),'GERO  /  COLLATZ RESEARCH ATLAS',font=font(14,True),fill=COL['reference'])
 d.text((42,84),s['kicker'],font=font(13,True),fill=DIM)
 y=115
 for line in wrap(s['title'],42,470,True):d.text((40,y),line,font=font(42,True),fill=INK);y+=48
 y+=23
 for line in s['lines']:
  for v in wrap(line,21,450):d.text((42,y),v,font=font(21),fill=DIM);y+=28
  y+=10
 if s['id']=='intro':
  d.text((42,y+13),'A father-and-son project',font=font(20,True),fill=INK)
  d.text((42,y+43),'Several months of work with AI assistance',font=font(16),fill=DIM)
 if s['id']=='history':
  d.text((42,y+20),'EVEN: n / 2       ODD: 3n + 1',font=font(22,True),fill=COL['reference'])
 if s['id']=='correction':
  d.text((42,y+18),'CORAL / PowerBarrier',font=font(18,True),fill=COL['correction'])
 if s['id']=='review':
  d.text((42,y+15),'Khamit Kadyrbekov',font=font(24,True),fill=INK)
  d.text((42,y+48),'& his son Daniyal Kadirbekov',font=font(22,True),fill=INK)
  d.text((42,y+83),'Sources and discussion links below the video',font=font(15),fill=DIM)
 y=447
 for key,label in [('checked','Internally checked in stated scope'),('reference','Selected published references'),('open','Open / unproved obligation'),('correction','Documented correction')]:
  c=COL[key]
  if key=='open':d.polygon([(48,y+1),(54,y+7),(48,y+13),(42,y+7)],outline=c)
  else:d.ellipse((42,y+1,54,y+13),fill=c)
  d.text((64,y-2),label,font=font(15),fill=DIM);y+=27
 d.rounded_rectangle((950,28,1240,61),radius=16,fill=(38,31,23),outline=(111,84,43))
 d.text((968,36),'FULL CONJECTURE REMAINS OPEN',font=font(13,True),fill=COL['open'])
 d.text((740,575),'356 nodes / 532 relationships  ·  Snapshot 16 Sep 2026',font=font(13),fill=DIM)
 d.line((40,674,1240,674),fill=(39,57,83),width=1)
 d.text((42,688),'Khamit Kadyrbekov & Daniyal Kadirbekov  /  AI-assisted research',font=font(13),fill=DIM)
 d.text((938,688),f'{i+1:02d} / {len(scenes):02d}    GERO.UZ',font=font(13,True),fill=COL['reference'])
 return im

bases=[base(s,i) for i,s in enumerate(scenes)]
def render(frame):
 i=max(0,bisect.bisect_right(scene_starts,frame)-1);s=scenes[i];im=bases[i].copy();d=ImageDraw.Draw(im)
 t=frame/FPS;yaw=.6+t*.105;pitch=.16+math.sin(t*.043)*.16;cy,sy,cp,sp=math.cos(yaw),math.sin(yaw),math.cos(pitch),math.sin(pitch)
 pts=[];focus={idx[k] for k in s['focus']};dim=s['id'] not in ('intro','colours','history')
 for n in nodes:
  x,y,z=n['position'];a=x*cy+z*sy;b=-x*sy+z*cy;yy=y*cp-b*sp;zz=y*sp+b*cp;scale=228*3.8/(3.8-zz)
  pts.append((900+a*scale,323-yy*scale,zz))
 for a,b in edges:
  active=a in focus or b in focus;p,q=pts[a],pts[b];col=COL[colour(nodes[b])]
  d.line((p[0],p[1],q[0],q[1]),fill=blend(col,.61 if active else .075 if dim else .16),width=2 if active else 1)
 for k in sorted(range(len(nodes)),key=lambda k:pts[k][2]):
  x,y,z=pts[k];cat=colour(nodes[k]);c=COL[cat];f=k in focus;r=(4 if cat=='open' else 2.5)+(z+1)*1.2+(3 if f else 0);a=1 if f else .35 if dim else .72+(z+1)*.13
  if f:d.ellipse((x-r-5,y-r-5,x+r+5,y+r+5),outline=blend(c,.7),width=1)
  if cat=='open':d.polygon([(x,y-r),(x+r,y),(x,y+r),(x-r,y)],outline=blend(c,a),width=2)
  else:
   d.ellipse((x-r,y-r,x+r,y+r),fill=blend(c,a));d.ellipse((x-r*.45,y-r*.65,x+r*.1,y-r*.1),fill=blend((235,249,255),a*.75))
 # Selected IDs are intentionally bounded and never cover narration captions.
 for j,k in enumerate(sorted(focus)):
  x,y,z=pts[k];label=nodes[k]['id'];size=13;tw=font(size,True).getlength(label);lx=min(1230-tw,max(535,x+13));ly=max(90,min(555,y-9))
  if len(focus)>3:
   lx=1000;ly=380+j*29
   d.line((x,y,lx-8,ly+7),fill=blend(COL[colour(nodes[k])],.5),width=1)
  d.rounded_rectangle((lx-5,ly-4,lx+tw+5,ly+19),radius=4,fill=BG)
  d.text((lx,ly),label,font=font(size,True),fill=COL[colour(nodes[k])])
 ms=t*1000;ci=bisect.bisect_right(cap_starts,ms)-1
 if ci>=0 and ms<=caps[ci]['endMs']+80:
  lines=wrap(caps[ci]['text'],25,1140);boxh=31*len(lines)+12;by=660-boxh
  d.rounded_rectangle((45,by,1235,660),radius=8,fill=(3,8,17))
  for j,line in enumerate(lines):tw=font(25).getlength(line);d.text(((W-tw)/2,by+6+j*31),line,font=font(25),fill=INK)
 # Quiet progress rule, not a proof-completion percentage.
 d.line((40,670,40+1200*frame/timing['durationInFrames'],670),fill=COL['checked'],width=2)
 return im

def main():
 p=argparse.ArgumentParser();p.add_argument('--stills',action='store_true');a=p.parse_args();out=ROOT/'output';out.mkdir(exist_ok=True)
 shots=[]
 for i,s in enumerate(scenes):
  f=s['startFrame']+min(8*FPS,s['durationInFrames']//2);im=render(f);im.save(out/f'frame-{i+1:02d}.jpg',quality=93);shots.append(im.resize((480,270)))
 sheet=Image.new('RGB',(960,270*4),BG)
 for i,im in enumerate(shots):sheet.paste(im,((i%2)*480,(i//2)*270))
 sheet.save(out/'contact-sheet.jpg',quality=95)
 render(4*FPS).save(ROOT/'tour/poster.jpg',quality=95)
 if a.stills:return
 # Assemble audio sequentially with real TTS scene durations, never stretching it.
 wavs=[]
 for s in scenes:
  wav=out/(s['id']+'.wav');wavs.append(wav)
  subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-i',str(ROOT/'public/narration'/f"{s['id']}.mp3"),'-af',f"adelay={round(s['audioOffsetFrames']/FPS*1000)}:all=1,apad",'-t',str(s['durationInFrames']/FPS),'-ar','48000','-ac','1',str(wav)],check=True)
 concat=out/'audio-list.txt';concat.write_text(''.join("file '"+str(p)+"'\n" for p in wavs))
 subprocess.run(['ffmpeg','-v','error','-y','-threads','1','-f','concat','-safe','0','-i',str(concat),'-c','copy',str(out/'narration.wav')],check=True)
 target=ROOT/'tour/collatz-colour-tour.mp4'
 cmd=['ffmpeg','-v','warning','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(out/'narration.wav'),'-c:v','libx264','-threads','1','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(target)]
 with subprocess.Popen(cmd,stdin=subprocess.PIPE) as proc:
  for f in range(timing['durationInFrames']):
   proc.stdin.write(render(f).tobytes())
   if f%(FPS*20)==0:print(f'Rendered {f/FPS:.0f}/{timing["durationInFrames"]/FPS:.1f}s',flush=True)
  proc.stdin.close();code=proc.wait()
  if code:raise RuntimeError(code)
 print(str(target),target.stat().st_size,'bytes',flush=True)

if __name__=='__main__':main()
