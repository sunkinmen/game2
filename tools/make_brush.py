#!/usr/bin/env python3
"""產生毛筆字圖集 assets/brush.png + brush.json。
用法：node tools/brush_strings.js > tools/brush_strings.json && python3 tools/make_brush.py
每個字串逐字：略微旋轉 / 上下位移、邊緣以雜訊暈染成「毛邊」、深色描邊 + 彩色外光暈、上下漸層填色。
版面與 js/brush.js 的即時繪製一致：框高 = 1.8 EM、基線在 2/3 高度、字寬 = 0.94 × advance。"""
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc'
EM = 96
STY = {
    'gold': dict(top='#fff6c0', mid='#ffc93a', bot='#d8741a', line='#2a0d08', glow='#ff9a2a'),
    'red': dict(top='#ffd0c0', mid='#ff4a38', bot='#a01418', line='#240606', glow='#ff3a2a'),
    'white': dict(top='#ffffff', mid='#eef2ff', bot='#aab8dc', line='#0c1230', glow='#8ab4ff'),
    'cyan': dict(top='#e0ffff', mid='#5ae8e0', bot='#1a8aa0', line='#06242e', glow='#3af0d0'),
    'ink': dict(top='#5a5a66', mid='#262630', bot='#0a0a12', line='#f4f0e0', glow='#000000'),
}

def hexrgb(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

try:
    font = ImageFont.truetype(FONT, EM, index=3)       # TC 字形
except Exception:
    font = ImageFont.truetype(FONT, EM)

def gradient(w, h, top, mid, bot, y0, y1):
    ys = np.linspace(0, 1, h)[:, None]
    t = np.clip((ys * h - y0) / max(1, (y1 - y0)), 0, 1)
    a, b, c = (np.array(hexrgb(x), float) for x in (top, mid, bot))
    col = np.where(t < .45, a + (b - a) * (t / .45), b + (c - b) * ((t - .45) / .55))
    return np.repeat(col[:, None, :], w, axis=1).astype(np.uint8)

def render(text, style, seed):
    st = STY[style]; rnd = random.Random(seed)
    pad = int(EM * .3); chars = list(text); adv = [font.getlength(c) * .94 for c in chars]
    W = int(sum(adv) + pad * 2); Hh = int(EM * 1.8); base = int(EM * 1.2)
    S = 2                                                  # 超取樣
    big = Image.new('L', (W * S, Hh * S), 0); line_l = Image.new('L', (W * S, Hh * S), 0)
    f2 = ImageFont.truetype(FONT, EM * S, index=3) if True else font
    x = pad
    for c, a in zip(chars, adv):
        cx = (x + a / 2) * S; by = (base + (rnd.random() - .5) * EM * .08) * S; rot = (rnd.random() - .5) * 5.7
        for layer, sw in ((big, 0), (line_l, int(EM * .13 * S))):
            tmp = Image.new('L', (int(EM * 2.2 * S), int(EM * 2.2 * S)), 0); d = ImageDraw.Draw(tmp)
            d.text((tmp.width / 2, tmp.height * .72), c, font=f2, fill=255, anchor='ms', stroke_width=sw)
            sh = math.tan(math.radians(5.7))               # 向右傾斜，帶出毛筆勢
            tmp = tmp.transform(tmp.size, Image.AFFINE, (1, sh, -sh * tmp.height * .72, 0, 1, 0), Image.BICUBIC)
            tmp = tmp.rotate(rot, resample=Image.BICUBIC, center=(tmp.width / 2, tmp.height * .72))
            layer.paste(255, (int(cx - tmp.width / 2), int(by - tmp.height * .72)), tmp)
        x += a
    # 毛邊：低頻雜訊擾動邊界
    def rough(m, amt):
        arr = np.asarray(m.filter(ImageFilter.GaussianBlur(1.6 * S)), float) / 255
        noise = np.asarray(Image.effect_noise(m.size, 60).filter(ImageFilter.GaussianBlur(.8 * S)), float) / 255 - .5
        return Image.fromarray((((arr + noise * amt) > .5) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.5 * S))
    fill_m = rough(big, .45); line_m = rough(line_l, .35)
    fill_m = fill_m.resize((W, Hh), Image.LANCZOS); line_m = line_m.resize((W, Hh), Image.LANCZOS)
    out = np.zeros((Hh, W, 4), np.uint8)
    glow = line_m.filter(ImageFilter.GaussianBlur(EM * .09)); ga = (np.asarray(glow, float) * .75).astype(np.uint8)
    out[..., :3] = hexrgb(st['glow']); out[..., 3] = ga
    la = np.asarray(line_m); out[la > 0, :3] = np.where(la[..., None] > 0, hexrgb(st['line']), out[..., :3])[la > 0]
    out[..., 3] = np.maximum(out[..., 3], la)
    grad = gradient(W, Hh, st['top'], st['mid'], st['bot'], base - int(EM * .85), base + int(EM * .1))
    fm = np.asarray(fill_m, float) / 255
    for k in range(3): out[..., k] = (out[..., k] * (1 - fm) + grad[..., k] * fm).astype(np.uint8)
    out[..., 3] = np.maximum(out[..., 3], (fm * 255).astype(np.uint8))
    # 墨色細紋
    nz = (np.random.RandomState(seed % 99991).rand(Hh, W) < .01)[..., None] * (fm[..., None] > .9)
    out[..., :3] = np.where(nz, (out[..., :3] * .7).astype(np.uint8), out[..., :3])
    return Image.fromarray(out, 'RGBA')

def main():
    items = json.load(open(os.path.join(ROOT, 'tools', 'brush_strings.json'), encoding='utf-8'))
    imgs = []
    for i, (t, s) in enumerate(items):
        imgs.append((s + '|' + t, render(t, s, 1000 + i)))
    AW = 2048; x = y = 4; rowh = 0; frames = {}; placed = []
    for key, im in imgs:
        if x + im.width + 4 > AW: x = 4; y += rowh + 4; rowh = 0
        placed.append((key, im, x, y)); frames[key] = dict(x=x, y=y, w=im.width, h=im.height); x += im.width + 4; rowh = max(rowh, im.height)
    AH = 1
    while AH < y + rowh + 4: AH *= 2
    atlas = Image.new('RGBA', (AW, AH), (0, 0, 0, 0))
    for key, im, px, py in placed: atlas.paste(im, (px, py))
    os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
    atlas.save(os.path.join(ROOT, 'assets', 'brush.png'), optimize=True)
    json.dump(dict(em=EM, frames=frames), open(os.path.join(ROOT, 'assets', 'brush.json'), 'w'), ensure_ascii=False)
    print('frames', len(frames), 'atlas', atlas.size, 'png KB', os.path.getsize(os.path.join(ROOT, 'assets', 'brush.png')) // 1024)

if __name__ == '__main__': main()
