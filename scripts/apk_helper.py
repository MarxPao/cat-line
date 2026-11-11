import os
import sys
import struct
import zlib
import zipfile
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def create_pixel_art_png(width, height):
    """Generates a valid RGBA 8-bit PNG of the Cat Line mascot and yarn ball."""
    raw_rows = bytearray()
    for y in range(height):
        raw_rows.append(0)  # Filter type 0 (None)
        nx = y / float(height)
        for x in range(width):
            # Cozy cream background #FFF8E7
            r, g, b, a = 255, 248, 231, 255
            border = max(2, width // 24)
            if x < border or x >= width - border or y < border or y >= height - border:
                r, g, b = 24, 20, 37  # #181425 border

            # Normalize coordinates to 48x48 virtual grid
            vx = int(x * 48 / width)
            vy = int(y * 48 / height)

            dx = vx - 24
            dy = vy - 24
            dist = (dx * dx + dy * dy) ** 0.5

            # Ears
            is_left_ear = (12 <= vx <= 20 and 8 <= vy <= 16 and (vx - 12) + (16 - vy) >= 4)
            is_right_ear = (28 <= vx <= 36 and 8 <= vy <= 16 and (36 - vx) + (16 - vy) >= 4)
            if is_left_ear or is_right_ear:
                r, g, b = 223, 143, 73  # Calico orange ear
                if vx in (12, 36) or vy == 8:
                    r, g, b = 24, 20, 37

            # Cat head
            if dist <= 15:
                r, g, b = 255, 255, 255
                if dx > 4 and dy < 6:
                    r, g, b = 223, 143, 73  # Orange patch
                if dx < -6 and dy < -4:
                    r, g, b = 107, 105, 103  # Dark patch
                if vx in (19, 20, 28, 29) and vy in (22, 23):
                    r, g, b = 24, 20, 37  # Eyes
                if vx in (23, 24) and vy == 26:
                    r, g, b = 240, 148, 158  # Pink nose
                if 22 <= vx <= 25 and vy == 28:
                    r, g, b = 24, 20, 37  # Mouth
                if vx in (16, 17, 31, 32) and vy == 25:
                    r, g, b = 255, 180, 200  # Blush

            # Pink bow
            if 15 <= vx <= 21 and 14 <= vy <= 18:
                r, g, b = 240, 148, 158
                if vx == 18 and vy == 16:
                    r, g, b = 244, 200, 82

            # Golden/Pink Yarn ball at bottom right
            ydx = vx - 35
            ydy = vy - 35
            if (ydx * ydx + ydy * ydy) ** 0.5 <= 8:
                r, g, b = 244, 200, 82
                if vx % 3 == 0 or vy % 3 == 0:
                    r, g, b = 215, 160, 40

            raw_rows.extend((r, g, b, a))

    def make_chunk(chunk_type, data):
        chunk = struct.pack(">I", len(data)) + chunk_type + data
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return chunk + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_rows), 9)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + make_chunk(b"IHDR", ihdr)
        + make_chunk(b"IDAT", idat)
        + make_chunk(b"IEND", b"")
    )
    return png


def inject_dex_into_apk(base_apk_path, dex_path, output_apk_path):
    """
    Copies all entries from aapt2's base_apk_path into output_apk_path preserving
    exact compress_type (so resources.arsc stays ZIP_STORED) and adds classes.dex
    as ZIP_STORED (uncompressed, method=0, flag=0) with clean 2024-01-01 timestamp.
    """
    clean_date = (2024, 1, 1, 12, 0, 0)
    with zipfile.ZipFile(base_apk_path, "r") as zin:
        with zipfile.ZipFile(output_apk_path, "w") as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                new_info = zipfile.ZipInfo(filename=item.filename, date_time=clean_date)
                new_info.compress_type = item.compress_type
                new_info.create_system = 0
                new_info.external_attr = 0o644 << 16
                zout.writestr(new_info, data)

            # Add classes.dex uncompressed (ZIP_STORED) for Android 6..15+ Direct Mapped DEX
            with open(dex_path, "rb") as fdex:
                dex_bytes = fdex.read()
            dex_info = zipfile.ZipInfo(filename="classes.dex", date_time=clean_date)
            dex_info.compress_type = zipfile.ZIP_STORED
            dex_info.create_system = 0
            dex_info.external_attr = 0o644 << 16
            zout.writestr(dex_info, dex_bytes)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "icons":
        res_dir = sys.argv[2]
        web_dir = sys.argv[3]
        densities = {
            "drawable-mdpi": 48,
            "drawable-hdpi": 72,
            "drawable-xhdpi": 96,
            "drawable-xxhdpi": 144,
            "drawable-xxxhdpi": 192,
        }
        master_img_path = os.path.join(web_dir, "app-icon-black.png")
        if not os.path.exists(master_img_path):
            master_img_path = os.path.join(web_dir, "app-icon-master.jpg")
        master_img = None
        if HAS_PIL and os.path.exists(master_img_path):
            try:
                master_img = Image.open(master_img_path).convert("RGBA")
                print(f"Loaded master icon from {master_img_path}")
            except Exception as e:
                print(f"Warning: Could not open master image: {e}")

        for folder, size in densities.items():
            dpath = os.path.join(res_dir, folder)
            os.makedirs(dpath, exist_ok=True)
            icon_path = os.path.join(dpath, "icon.png")
            if master_img:
                resized = master_img.resize((size, size), Image.Resampling.LANCZOS)
                resized.save(icon_path, format="PNG", optimize=True)
            else:
                with open(icon_path, "wb") as f:
                    f.write(create_pixel_art_png(size, size))

        # Also write 192x192 and 512x512 PWA PNG icons in web-preview
        for pwa_name, pwa_size in [("icon-192.png", 192), ("icon-512.png", 512)]:
            pwa_path = os.path.join(web_dir, pwa_name)
            if master_img:
                resized = master_img.resize((pwa_size, pwa_size), Image.Resampling.LANCZOS)
                resized.save(pwa_path, format="PNG", optimize=True)
            else:
                with open(pwa_path, "wb") as f:
                    f.write(create_pixel_art_png(pwa_size, pwa_size))
        print("Icons generated successfully (mdpi..xxxhdpi + PWA 192/512 PNG).")
    elif cmd == "inject-dex":
        inject_dex_into_apk(sys.argv[2], sys.argv[3], sys.argv[4])
        print("classes.dex injected with ZIP_STORED successfully.")
