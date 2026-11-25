"""Package a movie in a single offline HTML5 player. No media requests or remote fonts."""
import base64
from html import escape
import json
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def data(mime, payload):
    return f'data:{mime};base64,' + base64.b64encode(payload).decode('ascii')


def stamp(seconds):
    s, ms = divmod(round(seconds * 1000), 1000)
    return f'{s//3600:02}:{s//60%60:02}:{s%60:02}.{ms:03}'


def render(work, archive, meta, movie, poster):
    if archive.resolve() == ROOT/'CITY-TANKS.zip':
        raise ValueError('The game archive is not a trailer output')
    seconds = meta['seconds']
    cc = meta.get('cc', [])
    cues = ['WEBVTT\n']
    last = 0
    for i, (start, end, line) in enumerate(cc):
        assert last <= start < end <= seconds, (i, start, end, last)
        cues.append(f'{stamp(start)} --> {stamp(end)}\n{escape(line)}\n')
        last = end
    track = '<track kind="captions" srclang="ru" label="Русские субтитры" src="' + data('text/vtt', '\n'.join(cues).encode()) + '">' if cc else ''
    trailer = []
    for start, title in meta['chapters']:
        limit = next((n for n, _ in meta['chapters'] if n > start), seconds)
        lines = [line for t, _, line in cc if start <= t < limit]
        if lines:
            trailer.append(f'<p><b>{escape(title)}.</b> {escape(" ".join(lines))}</p>')
    trailer.extend('<p>'+escape(s)+'</p>' for s in meta.get('description', []))
    trailer.append('<p>Видео, музыка и плеер встроены в этот файл. Для просмотра не нужны игра, установка или интернет.</p>')
    cta = hotspot = ''
    if 'telegram' in meta:
        link = meta['telegram']; assert link == 'https://t.me/blitz_legacy'
        hotspot = f'<div id="linkplane" class="linkplane" data-start="{float(meta["link_start"]):g}" hidden><a aria-label="Открыть Telegram @blitz_legacy" title="Открыть Telegram @blitz_legacy" href="{link}" target="_blank" rel="noopener noreferrer external"></a></div>'
        cta = f'<aside class="community" aria-label="Сообщество игры"><span>Telegram игры</span><a href="{link}" target="_blank" rel="noopener noreferrer external">@blitz_legacy ↗</a></aside>'
    values = {'TITLE':escape(meta['title']),'ACCENT':meta['accent'],'KIND':meta['kind'], 'EDITION':escape(meta['edition']), 'MARK':escape(meta['mark']),
              'DURATION':str(seconds),'RUNTIME':f'{seconds//60}:{seconds%60:02d}','TAG':escape(meta['tag']), 'TOP':escape(meta['cover'][0]),'BOTTOM':escape(meta['cover'][1]),
              'SUBTITLE':escape(meta['subtitle']),'NCH':f'{len(meta["chapters"]):02}', 'SCENES':json.dumps(meta['chapters'], ensure_ascii=False).replace('<','\\u003c'),
              'CTA':cta,'HOTSPOT':hotspot,'TRACK':track,'DESCRIPTION':'\n'.join(trailer),'FONTLICENSE':(HERE/'fonts/OFL.txt').read_text(encoding='utf8'),
              'FONT':data('font/ttf',(HERE/'fonts/Oswald.ttf').read_bytes()),'POSTER':data('image/webp',poster.read_bytes()),'MOVIE':data('video/mp4',movie.read_bytes())}
    src=(HERE/'player.html.in').read_text(encoding='utf8');token=re.compile('@([A-Z]+)@');assert set(token.findall(src))==values.keys()
    html=token.sub(lambda m:values[m[1]],src).encode('utf8')
    release=work/'release';release.mkdir(exist_ok=True,parents=True);(release/'index.html').write_bytes(html)
    entry=ZipInfo('index.html',date_time=(1980,1,1,0,0,0));entry.create_system=3;entry.external_attr=0o100644<<16
    tmp=archive.with_suffix('.zip.part')
    try:
        with ZipFile(tmp,'w') as z:z.writestr(entry,html,compress_type=ZIP_DEFLATED,compresslevel=8)
        with ZipFile(tmp) as z:assert z.namelist()==['index.html'] and z.read('index.html')==html
        tmp.replace(archive)
    finally:tmp.unlink(missing_ok=True)
    print(f'{archive.name}: {archive.stat().st_size:,} bytes / {seconds}s / {len(cc)} cues',flush=True)
