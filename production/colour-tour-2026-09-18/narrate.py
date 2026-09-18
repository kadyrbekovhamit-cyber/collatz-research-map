"""Sequential edge-tts synthesis; file output only, never playback."""
import asyncio
import hashlib
import importlib.metadata
import json
import math
import re
import socket
import subprocess
from pathlib import Path
import aiohttp
import edge_tts

ROOT = Path(__file__).resolve().parent
VOICE, RATE, FPS = 'en-US-JennyNeural', '-3%', 24
OUT = ROOT / 'public' / 'narration'
OUT.mkdir(parents=True, exist_ok=True)

def duration(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(p)], text=True).strip())

async def main():
    scenes = json.loads((ROOT/'story.json').read_text())
    all_caps, cursor = [], 0
    for scene in scenes:
        p = OUT/scene['id']
        digest = hashlib.sha256((VOICE+RATE+scene['voice']).encode()).hexdigest()
        cache = p.with_suffix('.meta.json')
        if not (cache.exists() and json.loads(cache.read_text()).get('sha256') == digest):
            events = []
            tts = edge_tts.Communicate(scene['voice'], VOICE, rate=RATE, boundary='WordBoundary', connector=aiohttp.TCPConnector(family=socket.AF_INET), connect_timeout=20, receive_timeout=45)
            with p.with_suffix('.partial.mp3').open('wb') as audio:
                async for item in tts.stream():
                    if item['type'] == 'audio': audio.write(item['data'])
                    elif item['type'] == 'WordBoundary': events.append(item)
            if not events: raise RuntimeError('Missing timing events: '+scene['id'])
            p.with_suffix('.partial.mp3').replace(p.with_suffix('.mp3'))
            p.with_suffix('.events.json').write_text(json.dumps(events, ensure_ascii=False, indent=2))
            cache.write_text(json.dumps({'sha256':digest, 'voice':VOICE, 'rate':RATE, 'edge_tts':importlib.metadata.version('edge-tts')}, indent=2))
        events = json.loads(p.with_suffix('.events.json').read_text())
        audio_duration = duration(p.with_suffix('.mp3'))
        scene['audioSeconds'] = audio_duration
        scene['durationInFrames'] = math.ceil((audio_duration+0.9)*FPS)
        scene['startFrame'] = cursor
        scene['audioOffsetFrames'] = 8
        # Restore script punctuation without changing the service's word timings.
        positions=[i for i,c in enumerate(scene['voice']) if c.isascii() and c.isalnum()]
        letter_cursor=0
        display_words=[]
        for e in events:
            letters=len(re.sub(r'[^a-z0-9]','',e['text'].lower()))
            start=positions[letter_cursor]
            letter_cursor+=letters
            stop=positions[letter_cursor] if letter_cursor<len(positions) else len(scene['voice'])
            display_words.append(scene['voice'][start:stop].strip())
        scene['captions'] = [{'text': ' '+w, 'startMs':e['offset']/10000, 'endMs':(e['offset']+e['duration'])/10000, 'timestampMs':e['offset']/10000, 'confidence':None} for e,w in zip(events,display_words)]
        for c in scene['captions']:
            offset = (cursor+8)/FPS*1000
            all_caps.append({**c, 'startMs':c['startMs']+offset, 'endMs':c['endMs']+offset, 'timestampMs':c['timestampMs']+offset})
        cursor += scene['durationInFrames']
        print(scene['id'], round(audio_duration,2), 'seconds', len(events), 'timed words', flush=True)
    (ROOT/'timing.json').write_text(json.dumps({'fps':FPS,'durationInFrames':cursor,'scenes':scenes},ensure_ascii=False,indent=2))
    (ROOT/'captions.json').write_text(json.dumps(all_caps,ensure_ascii=False,indent=2))
    (ROOT/'transcript.txt').write_text('\n\n'.join(s['title']+'\n'+s['voice'] for s in scenes)+'\n')
    def stamp(t):
        t=round(t); return f'{t//3600000:02d}:{t//60000%60:02d}:{t//1000%60:02d},{t%1000:03d}'
    chunks=[]
    group=[]
    for c in all_caps:
        if group and (len(''.join(x['text'] for x in group))+len(c['text'])>78 or c['startMs']-group[-1]['endMs']>700):
            chunks.append(group); group=[]
        group.append(c)
        if c['text'].rstrip().endswith(('.', '?', '!')): chunks.append(group); group=[]
    if group: chunks.append(group)
    srt='\n\n'.join(f"{i+1}\n{stamp(a[0]['startMs'])} --> {stamp(a[-1]['endMs'])}\n{''.join(x['text'] for x in a).strip()}" for i,a in enumerate(chunks))+'\n'
    (ROOT/'captions.en.srt').write_text(srt)
    (ROOT/'caption-pages.json').write_text(json.dumps([{'text':''.join(x['text'] for x in a).strip(),'startMs':a[0]['startMs'],'endMs':a[-1]['endMs']} for a in chunks],indent=2))
    print('Total', cursor/FPS, 'seconds; no playback', flush=True)

asyncio.run(main())
