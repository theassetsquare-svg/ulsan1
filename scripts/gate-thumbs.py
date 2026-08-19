#!/usr/bin/env python3
"""썸네일 노출 게이트 G9+ — 하나라도 실패하면 배포 금지.

검사 항목 (전 HTML 페이지):
  ① 본문 <img> 존재
  ② og:image 파일 == 본문 img 파일
  ③ 메타 9종 완비 (각 1회, 중복 금지)
  ④ PNG 1200×1200 실측
  ⑤ PNG 300KB 이하
  ⑥ img alt 에 가게이름(제목 앞머리) 포함

실행: python3 scripts/gate-thumbs.py
"""
import re, os, sys, glob, struct, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://ulsanf.pages.dev'
MAX_KB = 300
# 홈(/)은 "이미지 없이 글만" 노출하는 독립 성공스토리 페이지 — 본문 img 검사 제외(메타는 검사)
NO_BODY_IMG = {'index.html'}

META = [
    ('og:image',            r'<meta property="og:image" content="([^"]+)"'),
    ('og:image:secure_url', r'<meta property="og:image:secure_url" content="([^"]+)"'),
    ('og:image:width',      r'<meta property="og:image:width" content="(1200)"'),
    ('og:image:height',     r'<meta property="og:image:height" content="(1200)"'),
    ('og:image:type',       r'<meta property="og:image:type" content="(image/png)"'),
    ('og:image:alt',        r'<meta property="og:image:alt" content="([^"]+)"'),
    ('twitter:card',        r'<meta name="twitter:card" content="(summary)"'),
    ('twitter:image',       r'<meta name="twitter:image" content="([^"]+)"'),
    ('thumbnail',           r'<meta name="thumbnail" content="([^"]+)"'),
]


def png_dim(path):
    with open(path, 'rb') as f:
        head = f.read(33)
    return struct.unpack('>II', head[16:24])


def pages():
    out = []
    for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True):
        rel = os.path.relpath(p, ROOT)
        if rel.startswith(('node_modules', 'src', '.git')):
            continue
        out.append(rel)
    return sorted(out)


def store_name(html):
    """제목 앞머리 = 가게이름(허브/홈은 페이지 이름)."""
    t = re.search(r'<title>(.*?)</title>', html, re.S)
    if not t:
        return ''
    head = re.split(r'[,—\-–|]', t.group(1))[0].strip()
    return head.split()[0] if head.split() else ''


def main():
    rows, fail = [], 0
    for rel in pages():
        html = open(os.path.join(ROOT, rel), encoding='utf-8').read()
        body = html.split('<body', 1)[1] if '<body' in html else html
        errs = []

        # ③ 메타 9종
        meta = {}
        for name, pat in META:
            hits = re.findall(pat, html)
            if len(hits) == 0:
                errs.append(f'메타누락:{name}')
            elif len(hits) > 1:
                errs.append(f'메타중복:{name}')
            else:
                meta[name] = hits[0]

        og_url = meta.get('og:image', '')
        og_file = og_url.split('/og/')[-1] if '/og/' in og_url else ''

        # ① 본문 img + ② 동일 파일 + ⑥ alt
        imgs = re.findall(r'<img[^>]+>', body)
        body_file, alt = '', ''
        if rel in NO_BODY_IMG:
            body_file, alt = '(면제)', '(면제)'
        elif not imgs:
            errs.append('본문img없음')
        else:
            tag = next((i for i in imgs if '/og/' in i), imgs[0])
            src = re.search(r'src="([^"]+)"', tag)
            body_file = src.group(1).split('/og/')[-1] if src and '/og/' in src.group(1) else '(og아님)'
            alt = (re.search(r'alt="([^"]*)"', tag) or [None, ''])[1]
            if body_file != og_file:
                errs.append(f'og≠본문({og_file}≠{body_file})')
            nm = store_name(html)
            if nm and nm not in alt:
                errs.append(f'alt에 가게이름 없음({nm})')
            if 'width="1200"' not in tag or 'height="1200"' not in tag:
                errs.append('img 크기속성 누락')

        # ④⑤ PNG 실측
        kb, dim = '-', '-'
        if og_file:
            fp = os.path.join(ROOT, 'og', og_file)
            if not os.path.exists(fp):
                errs.append('PNG없음')
            else:
                w, h = png_dim(fp)
                dim = f'{w}x{h}'
                kb = round(os.path.getsize(fp) / 1024)
                if (w, h) != (1200, 1200):
                    errs.append(f'크기{dim}')
                if kb > MAX_KB:
                    errs.append(f'{kb}KB>300KB')

        if errs:
            fail += 1
        rows.append({'page': rel, 'og': og_file, 'body': body_file, 'dim': dim,
                     'kb': kb, 'alt': alt, 'errs': errs})

    for r in rows:
        mark = '✅' if not r['errs'] else '❌'
        print(f"{mark} {r['page']:<44} {r['og']:<30} {str(r['dim']):<10}{str(r['kb']):>4}KB  {'; '.join(r['errs'])}")
    print('─' * 120)
    print(f"총 {len(rows)}페이지 · 통과 {len(rows)-fail} · 실패 {fail}")
    json.dump(rows, open(os.path.join(ROOT, 'scripts', 'gate-thumbs-report.json'), 'w'),
              ensure_ascii=False, indent=1)
    sys.exit(1 if fail else 0)


if __name__ == '__main__':
    main()
