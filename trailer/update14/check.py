"""Inspect the encoded MP4, not the edit project, player page or unmixed demos."""
import argparse
from pathlib import Path
import re
from runpy import run_path
import struct
import subprocess

import imageio_ffmpeg
import numpy as np
import zxingcpp

from edit import AT, CHAPTERS, CUTS, FPS, SECONDS, SPAN, TELEGRAM, TEXT, TITLE
from narration import TAKES, VOICE_ID, captions, verify_sources

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = Path(__file__).resolve().parents[2]
SR = 24000


def run(*args):
    return subprocess.check_output([FF, '-nostdin', '-v', 'error', *map(str, args)])


def audio(file, stereo=False):
    # An arithmetic stereo mean avoids the equal-power +3 dB mono downmix.
    pan = ['-af', 'pan=mono|c0=0.5*c0+0.5*c1'] if stereo else []
    return np.frombuffer(run('-i', file, '-map', '0:a:0', *pan, '-ac', '1', '-ar', SR,
                             '-f', 'f32le', 'pipe:1'), '<f4')


def time_ms(stamp):
    h, m, s, ms = map(int, re.split('[:,]', stamp))
    return ((h*60+m)*60+s)*1000+ms


def check_captions(master, index, expected):
    data = run('-i', master, '-map', f'0:s:{index}', '-c:s', 'srt', '-f', 'srt', 'pipe:1').decode()
    blocks = data.strip().split('\n\n')
    assert len(blocks) == len(expected), (index, len(blocks), len(expected))
    for block, (start, end, words) in zip(blocks, expected):
        _, times, *lines = block.splitlines()
        a, b = map(time_ms, times.split(' --> '))
        assert abs(a-round(start*1000)) <= 1 and abs(b-round(end*1000)) <= 1, times
        assert ' '.join(lines) == words, (index, times, lines, words)
        if index == 0:
            assert len(lines) <= 2, lines


def check_voice(master):
    mixed = audio(master, stereo=True)
    assert abs(len(mixed)/SR-SECONDS) < .055 and np.max(np.abs(mixed)) < 1
    scores = []
    for name, take in TAKES.items():
        dry = audio(take.path)
        assert abs(len(dry)/SR-take.duration) < .002, name
        at = round(take.at*SR)
        # Test each individual phrase; a long intact take shouldn't hide a missing
        # short sentence. A similar timbre won't pass a sample-aligned comparison.
        for a, b, words in take.cues:
            lo, hi = round(a*SR), round(b*SR)
            ref = dry[lo:hi]; mask = np.abs(ref) > .055
            assert mask.sum() > .04*SR, (name, words)
            orig, dub = ref[mask], mixed[at+lo:at+hi][mask]
            corr = float((dub @ orig) / (np.linalg.norm(dub)*np.linalg.norm(orig)))
            assert corr > .94, (name, words, corr)
            scores.append(corr)
    return min(scores)


def frame(master, t, w, h):
    rgb = run('-ss', f'{t:.6f}', '-i', master, '-frames:v', '1', '-vf', f'scale={w}:{h}',
              '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1')
    return np.frombuffer(rgb, np.uint8).reshape(h, w, 3)


def check(master):
    verify_sources(SECONDS)
    size = master.stat().st_size; atoms = []
    with master.open('rb') as f:
        while f.tell() < size:
            start = f.tell(); n, k = struct.unpack('>I4s', f.read(8))
            if n == 1: n = struct.unpack('>Q', f.read(8))[0]
            if n == 0: n = size-start
            assert 8 <= n <= size-start
            atoms.append(k); f.seek(start+n)
    assert atoms.index(b'moov') < atoms.index(b'mdat'), 'not fast-start MP4'
    listing = subprocess.run([FF, '-hide_banner', '-i', str(master)], capture_output=True, text=True).stderr
    for field in ('h264 (High)', '1280x720', '24 fps', 'Audio: aac', '48000 Hz, stereo',
                  'Реплики диктора', 'Путевой лист — описание обновления'):
        assert field in listing, field
    meta = run('-i', master, '-f', 'ffmetadata', 'pipe:1').decode()
    assert 'title='+TITLE in meta and 'comment=Telegram CITY TANKS: '+TELEGRAM in meta
    chapters = re.findall(r'\[CHAPTER\]\nTIMEBASE=(\d+)/(\d+)\nSTART=(\d+)\nEND=(\d+)\ntitle=([^\n]+)', meta)
    assert len(chapters) == len(CHAPTERS), meta
    for row, (start, name), end in zip(chapters, CHAPTERS, [c[0] for c in CHAPTERS[1:]]+[SECONDS]):
        a, b, s, e, title = row
        assert title == name and abs(int(s)*int(a)/int(b)-start) < .001 and abs(int(e)*int(a)/int(b)-end) < .001, row
    progress = run('-progress', 'pipe:1', '-xerror', '-i', master, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-').decode()
    assert f'frame={FPS*SECONDS}\n' in progress and 'progress=end' in progress, progress[-500:]
    check_captions(master, 0, captions())
    check_captions(master, 1, [(s, s+SPAN[k], TEXT[k]) for s, k in CUTS])
    floor = check_voice(master)
    for s, k in CUTS:
        assert frame(master, s+SPAN[k]*.5, 160, 90).std() > 18, k

    # Read the QR from actual video frames at phone width, not from telegram.png.
    # Do not follow the link or require network access to play/test the movie.
    original_link = run_path(str(ROOT/'trailer/editions/cuts.py'))['FULL']['telegram']
    for t in (AT['end']+.125, TAKES['telegram'].at+2, SECONDS-1/FPS):
        code = zxingcpp.read_barcode(frame(master, t, 390, 220))
        assert code and code.text == original_link == TELEGRAM, (t, code and code.text)
    print(f'{size:,} bytes; {SECONDS}s / {FPS*SECONDS} decoded frames; {len(CHAPTERS)} chapters; 2 Russian text tracks.')
    print(f'{len(CUTS)} scenes. {len(TAKES)} verified {VOICE_ID} takes; {len(captions())} aligned phrases; min correlation {floor:.4f}.')
    print(f'End card (390px, first/voiced/last frames) → {TELEGRAM}')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('master', type=Path, nargs='?', default=ROOT/'CITY-TANKS-1.4-TRAILER.mp4')
    check(p.parse_args().master)
