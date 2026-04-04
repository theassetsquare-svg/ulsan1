#!/usr/bin/env python3
"""OG image generator for ulsan1 landing site — 1200x1200 per page"""
from PIL import Image, ImageDraw, ImageFont
import os

DOMAIN = "ulsan1.pages.dev"
SIZE = 1200
OUT_DIR = "og"
PUBLIC_DIR = "public/og"

# Page configs: (filename, main_text, sub_text, accent_color)
PAGES = [
    ("main",      "춘자",   "울산챔피언",    "#8B5CF6"),
    ("dresscode", "드레스코드", "울산챔피언나이트", "#2563EB"),
    ("budget",    "예산",   "울산챔피언나이트", "#059669"),
    ("timing",    "시간대",  "울산챔피언나이트", "#D97706"),
    ("parking",   "주차",   "울산챔피언나이트", "#DC2626"),
    ("manners",   "매너",   "울산챔피언나이트", "#7C3AED"),
    ("nearby",    "주변코스", "울산챔피언나이트", "#0891B2"),
    ("compare",   "비교",   "울산챔피언나이트", "#BE185D"),
]

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

CJK_FONT = "/nix/store/f65frf227hfclrxh6kwcvy8cyrii0bv8-noto-fonts-cjk-sans-2.004/share/fonts/opentype/noto-cjk/NotoSansCJK-VF.otf.ttc"

def find_font(size):
    """Try CJK font first, then fallbacks"""
    font_paths = [
        CJK_FONT,
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except:
                continue
    return ImageFont.load_default()

def create_og(filename, main_text, sub_text, accent_hex):
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb("#1a1a2e"))
    draw = ImageDraw.Draw(img)
    accent = hex_to_rgb(accent_hex)

    # Top bar
    draw.rectangle([0, 0, SIZE, 80], fill=accent)
    # Bottom bar
    draw.rectangle([0, SIZE-80, SIZE, SIZE], fill=accent)

    # Decorative circles
    for cx, cy, r, a in [(200, 300, 120, 30), (1000, 800, 90, 20), (150, 900, 60, 15)]:
        for ri in range(r, 0, -1):
            alpha_val = int(a * ri / r)
            c = (accent[0], accent[1], accent[2])
            blend = tuple(int(26 + (ci - 26) * alpha_val / 255) for ci in c)
            draw.ellipse([cx-ri, cy-ri, cx+ri, cy+ri], fill=blend)

    # Main text — find biggest font that fits 80% width
    target_width = int(SIZE * 0.8)
    font_size = 400
    while font_size > 40:
        font = find_font(font_size)
        bbox = draw.textbbox((0, 0), main_text, font=font)
        tw = bbox[2] - bbox[0]
        if tw <= target_width:
            break
        font_size -= 10

    # Draw main text centered
    bbox = draw.textbbox((0, 0), main_text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (SIZE - tw) // 2
    y = (SIZE - th) // 2 - 20
    # Shadow
    draw.text((x+4, y+4), main_text, fill=(0, 0, 0), font=font)
    # Main
    draw.text((x, y), main_text, fill=(255, 255, 255), font=font)

    # Sub text above main
    sub_size = max(font_size // 3, 36)
    sub_font = find_font(sub_size)
    bbox_sub = draw.textbbox((0, 0), sub_text, font=sub_font)
    stw = bbox_sub[2] - bbox_sub[0]
    sx = (SIZE - stw) // 2
    sy = y - sub_size - 40
    draw.text((sx+2, sy+2), sub_text, fill=(0, 0, 0), font=sub_font)
    draw.text((sx, sy), sub_text, fill=accent, font=sub_font)

    # Bottom text
    bottom_font = find_font(28)
    bt = f"ulsan1.pages.dev"
    bbox_bt = draw.textbbox((0, 0), bt, font=bottom_font)
    btw = bbox_bt[2] - bbox_bt[0]
    draw.text(((SIZE - btw) // 2, SIZE - 60), bt, fill=(255, 255, 255, 200), font=bottom_font)

    # Save to both directories
    for d in [OUT_DIR, PUBLIC_DIR]:
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, f"{filename}.png")
        img.save(path, "PNG", optimize=True)
        print(f"  Saved: {path} ({os.path.getsize(path)//1024}KB)")

if __name__ == "__main__":
    print("Generating OG images (1200x1200)...")
    for fname, main, sub, color in PAGES:
        print(f"\n[{fname}] {main} / {sub}")
        create_og(fname, main, sub, color)
    print("\nDone! All OG images generated.")
