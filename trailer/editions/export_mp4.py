"""Export the released trailers as ordinary MP4s without re-encoding picture or sound."""
import argparse
from base64 import b64decode
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
from zipfile import ZipFile

import imageio_ffmpeg
from cuts import MOVIES

ROOT = Path(__file__).resolve().parents[2]


def embedded(html, mime):
    prefix = b'src="data:' + mime.encode('ascii') + b';base64,'
    if html.count(prefix) != 1:
        raise ValueError(f'Expected one embedded {mime} track')
    start = html.index(prefix) + len(prefix)
    return b64decode(html[start:html.index(b'"', start)], validate=True)


def chapters(meta):
    rows = [';FFMETADATA1']
    points = meta['chapters'] + [(meta['seconds'], '')]
    for (start, title), (end, _) in zip(points, points[1:]):
        # FFMETADATA reserves these characters in tag values.
        safe = ''.join('\\' + c if c in '\\=;#\n' else c for c in title)
        rows.extend(('[CHAPTER]', 'TIMEBASE=1/1000', f'START={round(start * 1000)}',
                     f'END={round(end * 1000)}', 'title=' + safe))
    return '\n'.join(rows) + '\n'


def export(meta, dest):
    archive = ROOT / meta['file']
    target = dest / archive.with_suffix('.mp4').name
    with ZipFile(archive) as z:
        if z.namelist() != ['index.html']:
            raise ValueError(f'Not a single-page trailer: {archive.name}')
        html = z.read('index.html')
    with TemporaryDirectory(dir=dest) as tmp:
        tmp = Path(tmp)
        movie, subs, marks, result = (tmp / f for f in ('film.mp4', 'ru.vtt', 'chapters.txt', 'output.mp4'))
        movie.write_bytes(embedded(html, 'video/mp4'))
        subs.write_bytes(embedded(html, 'text/vtt'))
        marks.write_text(chapters(meta), encoding='utf-8')
        cmd = [imageio_ffmpeg.get_ffmpeg_exe(), '-nostdin', '-hide_banner', '-loglevel', 'error',
               '-i', str(movie), '-i', str(subs), '-f', 'ffmetadata', '-i', str(marks),
               '-map', '0:v:0', '-map', '0:a:0', '-map', '1:s:0', '-map_metadata', '0', '-map_chapters', '2',
               '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text', '-disposition:s:0', '0',
               '-metadata:s:a:0', 'language=rus', '-metadata:s:s:0', 'language=rus',
               '-metadata:s:s:0', 'handler_name=Русские субтитры', '-movflags', '+faststart']
        if meta.get('telegram'):
            cmd += ['-metadata', 'comment=' + meta['telegram']]
        subprocess.run(cmd + [str(result)], check=True)
        result.replace(target)
    print(f'{target.name}: {target.stat().st_size:,} bytes, {meta["seconds"]} s')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--edition', choices=MOVIES, help='Default: export both films')
    parser.add_argument('--output-dir', type=Path, default=ROOT/'trailer/dist')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for key in ([args.edition] if args.edition else MOVIES):
        export(MOVIES[key], args.output_dir)
