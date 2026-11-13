#!/usr/bin/env python3
"""Gera os icones pixel-art do novelo usados nas notificacoes nativas.
Saida: android-src/res/drawable-nodpi/novelo_<estado>_<cor>.png (imagem grande, 192px)
       android-src/res/drawable-nodpi/ic_stat_novelo.png (silhueta branca p/ barra de status)
Estados: frouxo (prazo longe), enrolando (prazo proximo), emaranhado (vencendo/vencido), brincando (feito).
Sem dependencias externas (so stdlib)."""
import os, struct, zlib, math, sys

COLORS = {  # espelha YARN_COLORS de web-preview/app.js
    'pink':   ('#F0949E', '#AD5E65', '#FFE0E5'),
    'gold':   ('#F4C852', '#B8860B', '#FFF3B0'),
    'blue':   ('#4B80CA', '#2A4D7E', '#A8CAFF'),
    'green':  ('#63AB3F', '#3B6E22', '#B6F09C'),
    'purple': ('#8A6BBE', '#5A4E7C', '#D8C7FF'),
    'orange': ('#DF8F49', '#B8652B', '#FFD1A6'),
    'red':    ('#D95763', '#8E2A34', '#FFB3BA'),
}
OUTLINE = (58, 42, 42, 255)
N = 32
SCALE = 6


def hx(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def png(path, w, h, px):
    raw = b''.join(b'\x00' + b''.join(bytes(px[y][x]) for x in range(w)) for y in range(h))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(data)


def tail_points(state):
    """Pontos (x,y) do fio saindo do novelo."""
    pts = []
    if state == 'frouxo':      # fio longo e solto, ondulando
        for i in range(0, 20):
            x = 24 + i * 0.4
            y = 22 + i * 0.45 + math.sin(i * 0.7) * 2
            pts.append((int(x), int(y)))
    elif state == 'enrolando':  # fio curto e firme
        for i in range(0, 7):
            pts.append((25 + i, 23 + int(i * 0.8)))
    elif state == 'emaranhado':  # fio curto com no
        for i in range(0, 5):
            pts.append((25 + i, 23 + i // 2))
    else:                       # brincando: fio enrolado em espiral
        for i in range(0, 18):
            a = i * 0.55
            r = 1 + i * 0.22
            pts.append((int(27 + math.cos(a) * r), int(26 + math.sin(a) * r)))
    return pts


def render(state, colors):
    main, shadow, high = (hx(c) for c in colors)
    g = [[(0, 0, 0, 0)] * N for _ in range(N)]
    cx, cy, R = 15.0, 15.0, 11.5
    if state == 'brincando':
        cy -= 2  # pulinho
    # corpo
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - cx, y - cy)
            if d <= R:
                lx, ly = cx - 4, cy - 4
                ld = math.hypot(x - lx, y - ly)
                if ld < 4:
                    c = high
                elif ld < 11:
                    c = main
                else:
                    c = shadow
                # voltas do fio
                if state == 'frouxo':
                    wrap = ((x * 2 + y) // 3) % 5 == 0
                elif state == 'enrolando':
                    wrap = ((x + y) // 2) % 4 == 0 or ((x - y) // 3) % 6 == 0
                elif state == 'emaranhado':
                    wrap = ((x * 3 + y * 2) // 2) % 3 == 0 or ((x - 2 * y) // 2) % 4 == 0
                else:
                    wrap = ((x + y) // 3) % 4 == 0
                if wrap and c is not high:
                    c = shadow if c == main else (0, 0, 0, 255) if False else shadow
                g[y][x] = c
    # contorno
    base = [row[:] for row in g]
    for y in range(N):
        for x in range(N):
            if base[y][x][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < N and 0 <= yy < N and base[yy][xx][3] != 0:
                        g[y][x] = OUTLINE
                        break
    # fio
    for (x, y) in tail_points(state):
        if 0 <= x < N and 0 <= y < N and g[y][x][3] == 0:
            g[y][x] = main
            for dx, dy in ((0, 1), (1, 0)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < N and 0 <= yy < N and g[yy][xx][3] == 0:
                    g[yy][xx] = shadow
    # extras por estado
    if state == 'emaranhado':
        for i in range(0, 14):  # rabiscos de fio ao redor
            x = int(15 + math.cos(i * 1.3) * (13 + (i % 3)))
            y = int(15 + math.sin(i * 1.7) * (13 + (i % 2)))
            if 0 <= x < N and 0 <= y < N and g[y][x][3] == 0:
                g[y][x] = shadow
    if state == 'brincando':
        for (x, y) in ((3, 4), (28, 5), (2, 20), (29, 14)):  # brilhos
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < N and 0 <= yy < N and g[yy][xx][3] == 0:
                    g[yy][xx] = (255, 232, 120, 255)
    return g


def upscale(g, s):
    W = N * s
    return [[g[y // s][x // s] for x in range(W)] for y in range(W)], W


def silhouette(g, s=3):
    out = [[(255, 255, 255, 255) if g[y][x][3] else (0, 0, 0, 0) for x in range(N)] for y in range(N)]
    return upscale(out, s)


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android-src', 'res', 'drawable-nodpi')
    out_dir = os.path.normpath(out_dir)
    states = ['frouxo', 'enrolando', 'emaranhado', 'brincando']
    n = 0
    for cid, cols in COLORS.items():
        for st in states:
            px, w = upscale(render(st, cols), SCALE)
            png(os.path.join(out_dir, f'novelo_{st}_{cid}.png'), w, w, px)
            n += 1
    px, w = silhouette(render('enrolando', COLORS['pink']))
    png(os.path.join(out_dir, 'ic_stat_novelo.png'), w, w, px)
    print(f'{n} novelos + ic_stat_novelo -> {out_dir}')


if __name__ == '__main__':
    main()
