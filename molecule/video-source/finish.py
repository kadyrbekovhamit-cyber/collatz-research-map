"""Package timed translations and verify the authored movie without playback."""
from pathlib import Path
import json,re,hashlib,subprocess,math,textwrap
ROOT=Path(__file__).resolve().parent
d=json.loads((ROOT/'timing.json').read_text())
translations=[
 ['Вот задача, в которую можно включиться за десять секунд.','Возьмём шесть.','Чётное число делим на два.','Нечётное умножаем на три и прибавляем один.','Шесть превращается в три.','Что дальше?'],
 ['Десять!','Затем пять, шестнадцать, восемь, четыре, два, один.','Мы проверили одно начальное число.','Гипотеза Коллатца утверждает: любое положительное целое число в итоге достигнет единицы.','После ролика попробуйте семь.','Правила просты.','Но путь бывает неожиданно сложным.'],
 ['Представьте огромную толпу проверенных чисел.','Все вернулись к единице.','Но непроверенных стартов всё ещё бесконечно много.','Доказательство должно исключить и бесконечное убегание, и другой цикл.','Для опровержения хватило бы одного исключения.'],
 ['Теперь войдём в нашу карту исследований.','Эти извивающиеся ленты вдохновлены изображениями белков.','Форма помогает изучать идеи, но не предсказывает решение.','Вращайте карту, выбирайте аргументы, следуйте по связям.','Цвет обозначает авторство.','Пустые узлы — открытые шаги.'],
 ['Зелёная ветвь посвящена Теренсу Тао.','Его теорема: почти все старты достигают значений ниже любой границы, стремящейся к бесконечности, сколь угодно медленно.','«Почти все» имеет точный смысл: логарифмическая плотность.','Это крупный результат.','Но исключения остаются возможными: достижение единицы для каждого старта не доказано.'],
 ['Красная ветвь отмечает других исследователей.','Рихо Террас и К. Дж. Эверетт доказали спуск ниже старта почти всюду.','Бернштейн и Лагариас разработали точное два-адическое описание динамики.','Это разные инструменты для разных частей задачи.','Наша подборка — лишь небольшая часть литературы.'],
 ['Синий рабочий архив: точные тождества, ограниченные леммы, проверки и неудачные направления.','Проект ведут Khamit Kadyrbekov и Daniyal Kadirbekov с помощью ИИ.','Новые черновики о взвешенных слоях выделяют остаточную часть, которую ещё нужно контролировать.','Синий цвет означает запись проекта, а не новизну каждого элемента.','Внутренние проверки не заменяют внешнего рецензирования.'],
 ['Вот один путь к завершению доказательства.','Нужно показать: каждое нечётное число больше единицы когда-нибудь опускается ниже себя.','Тогда сильная индукция приведёт все старты к единице.','Этого общего шага у нас пока нет.','Размер архива не показывает процент готовности и не позволяет назвать дату решения.'],
 ['Подход Ingenium: малый пример, прогноз, проверка рассуждения, настоящий исследовательский вопрос.','Откройте карту из описания.','Вращайте её.','Входите в ветви.','Читайте первоисточники.','Какого именно утверждения не хватает для доказательства, охватывающего каждое число?']
]
def stamp(ms):
    ms=round(ms);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
ru=[]
for s,rus in zip(d['scenes'],translations):
    sentences=[];group=[]
    for c in s['captions']:
        group.append(c)
        if re.search(r'[.!?]\s*$',c['text']) and c['text'].strip() not in {'C.','J.'}:
            sentences.append(group);group=[]
    if group:sentences.append(group)
    assert len(sentences)==len(rus),(s['id'],len(sentences),len(rus))
    for words,translation in zip(sentences,rus):
        # Translate authored English sentences. Subdivision uses actual service
        # word boundaries within each corresponding English sentence.
        chunks=textwrap.wrap(translation,width=78,break_long_words=False,break_on_hyphens=False)
        for i,chunk in enumerate(chunks):
            a=words[math.floor(i*len(words)/len(chunks))]
            b=words[math.floor((i+1)*len(words)/len(chunks))-1]
            off=(s['startFrame']+s['audioOffsetFrames'])/d['fps']*1000
            ru.append({'startMs':a['startMs']+off,'endMs':b['endMs']+off,'text':chunk})
(ROOT/'captions.ru.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["startMs"])} --> {stamp(c["endMs"])}\n{c["text"]}' for i,c in enumerate(ru))+'\n')
for lang in ['en','ru']:
    srt=(ROOT/f'captions.{lang}.srt').read_text()
    vtt='WEBVTT\n\n'+re.sub(r'(\d{2}:\d{2}:\d{2}),(\d{3})',r'\1.\2',srt)
    (ROOT/f'captions.{lang}.vtt').write_text(vtt)
movie=ROOT/'output/collatz-inside-the-map-en.mp4'
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(movie)],text=True))
v=next(s for s in meta['streams'] if s['codec_type']=='video');a=next(s for s in meta['streams'] if s['codec_type']=='audio')
assert(v['width'],v['height'])==(1280,720)
duration=float(meta['format']['duration']);assert abs(duration-d['durationInFrames']/d['fps'])<.2
assert int(v['nb_frames'])==d['durationInFrames']
r=subprocess.run(['ffmpeg','-hide_banner','-v','info','-threads','1','-filter_threads','1','-filter_complex_threads','1','-i',str(movie),'-af','volumedetect','-f','null','-'],capture_output=True,text=True)
(ROOT/'qa/full-decode.log').write_text(r.stderr)
assert r.returncode==0
mean=float(re.search(r'mean_volume: ([\-\d.]+) dB',r.stderr).group(1));assert -40<mean<-5
cap=json.loads((ROOT/'captions.json').read_text())
assert all(0<=c['startMs']<c['endMs']<duration*1000 for c in cap+ru)
assert all(x['endMs']<=y['startMs'] for x,y in zip(cap,cap[1:]))
result={'duration_seconds':duration,'size_bytes':movie.stat().st_size,'sha256':hashlib.sha256(movie.read_bytes()).hexdigest(),'resolution':[1280,720],'frames':int(v['nb_frames']),'fps':v['r_frame_rate'],'audio_codec':a['codec_name'],'mean_volume_db':mean,'complete_silent_decode':True,'word_timings':len(cap),'russian_cues':len(ru),'russian_timing':'authored sentence translations segmented at actual corresponding English word boundaries','contact_sheet_review':'nine scenes read; no text clipping; correct number path and attribution','audio_playback':False,'independent_asr':False,'scope':'Editorial/technical QA; not a mathematical proof audit.'}
(ROOT/'qa/verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
