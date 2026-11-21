"""Build changelog/index.html body from the app's CHANGELOG.md plus the 2.1.1-2.1.4 patch notes
(written from the v2-overhaul commit history, where the CHANGELOG file stops at 2.1.0)."""
import re, markdown, html
src = open('/workspace/work/wispify/CHANGELOG.md').read()
src = src.split('\n## ', 1)[1]
PATCHES = [
 ('2.1.4', '2026-11-16', {'Fixed': [
   'Songs that fall back to YouTube\'s official player leave the "loading" state and can be paused (state now comes from the player itself, with an optimistic pause).',
   'Sharper Stage background: a real blur at half resolution, your own picture is left unblurred, and covers load at 1200 px.']}),
 ('2.1.3', '2026-11-16', {'Fixed': [
   'YouTube songs that resolve but won\'t play fall back to the official player instead of being skipped; after two such songs it goes straight there.',
   'Wallpaper Stage keeps its desktop (WorkerW) layer on Windows 11 24H2.']}),
 ('2.1.2', '2026-11-16', {'Fixed': [
   'YouTube no longer skips every song (direct stream first, the proxy only as an upgrade, a plain retry bypasses the proxy).',
   'Downloads send a matching user agent, so they work again.',
   'The Stage opens reliably (the main window and the Stage share the same WebView2 settings).']}),
 ('2.1.1', '2026-11-16', {'Changed': [
   'One seek bar, a transport-only compact view, a lyrics strip under the player and grouped Settings. The title label is off by default.',
   'Voice: anti-aliased resampling, adaptive trim and gain normalisation, beam search, and a forgiving push-to-talk grammar: sound-alikes, one-edit near misses and bare song names. New speed, nightcore and bass commands and clearer toasts.',
   'Effects (reverb, bass, the spectrum) work on YouTube and other non-CORS streams through a local range proxy. Real nightcore, speed and slowed; reverb costs no CPU when off.',
   'Lyrics: smarter title and artist cleanup with duration matching, LRCLIB search fallbacks, then YouTube captions and YouTube Music lyrics.',
   'Stage: adaptive 30/60 fps, pauses when covered, lean FFT messaging between windows.',
   'The widget stops painting while hidden or minimized.']}),
]
def md(t):
    out = markdown.markdown(t, extensions=['sane_lists'])
    out = out.replace('<h3>', '<h3 class="cl__h">')
    return out
parts = re.split(r'\n## ', src)
vers = []
for v, d, secs in PATCHES:
    body = ''.join(f'<h3 class="cl__h">{k}</h3><ul>' + ''.join(f'<li>{html.escape(x)}</li>' for x in items) + '</ul>' for k, items in secs.items())
    vers.append((v, d, '', body))
for p in parts:
    head, _, rest = p.partition('\n')
    m = re.match(r'\[(.+?)\](?:\s+—\s+(.+))?', head.strip())
    v, d = m.group(1), (m.group(2) or '').strip()
    if v == '2.1.0': d = '2026-11-16'
    rest = rest.replace('Older history: see the git log and GitHub Releases.', '')
    vers.append((v, d, '', md(rest.strip())))
nav = ''.join(f'<a href="#v{v.replace(".", "-")}">{v}</a>' for v, *_ in vers)
secs = ''.join(f'''<article class="cl" id="v{v.replace('.', '-')}" data-reveal><header class="cl__v"><h2>{v}</h2><p class="mono">{d or "—"}</p></header><div class="cl__b">{b}</div></article>''' for v, d, _, b in vers)
secs = secs.replace('▶ ', '').replace('⏭ ', '').replace('♥ ', '')
page = open('changelog/index.html').read()
page = re.sub(r'<!--cl-nav-->.*?<!--/cl-nav-->', f'<!--cl-nav-->{nav}<!--/cl-nav-->', page, flags=re.S)
page = re.sub(r'<!--cl-body-->.*?<!--/cl-body-->', f'<!--cl-body-->{secs}<!--/cl-body-->', page, flags=re.S)
open('changelog/index.html', 'w').write(page)
print(len(vers), 'versions')
