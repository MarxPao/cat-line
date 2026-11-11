import os
from PIL import Image
import numpy as np

SRC_IMG = r"C:/Users/rafae/.gemini/antigravity/brain/bd071522-2fb8-451d-9445-8fc8cea14195/.user_uploaded/media_1794136951343_c103cc34.jpg"
DEST_MASTER = os.path.join("web-preview", "app-icon-master.jpg")
DEST_BLACK_PNG = os.path.join("web-preview", "app-icon-black.png")

# Load source image and convert brown background to black
src = Image.open(SRC_IMG).convert("RGB")
arr = np.array(src, dtype=float)
bg = np.array([155., 134., 103.], dtype=float) # Brown background
cream = np.array([244., 236., 212.], dtype=float) # Cozy warm cream line

vec = np.array([255., 254., 234.]) - bg
proj = np.sum((arr - bg) * (vec / np.linalg.norm(vec)), axis=2)

# Alpha ramp with smoothstep
t0 = 5.0
t1 = 170.0
raw_alpha = np.clip((proj - t0) / (t1 - t0), 0.0, 1.0)
alpha = raw_alpha * raw_alpha * (3 - 2 * raw_alpha)

# Composite onto pure black (0, 0, 0)
black_rgb = (cream[None, None, :] * alpha[:, :, None]).clip(0, 255).astype(np.uint8)
master_img = Image.fromarray(black_rgb)

# Save master outputs
master_img.save(DEST_MASTER, quality=98)
master_img.save(DEST_BLACK_PNG, format="PNG", optimize=True)
print(f"Generated black master icons: {DEST_MASTER} and {DEST_BLACK_PNG}")

# Generate web-preview PWA icons with black background
web_sizes = {
    "icon-192.png": (192, 192),
    "icon-512.png": (512, 512),
    "apple-touch-icon.png": (180, 180),
    "favicon-32.png": (32, 32),
    "favicon-16.png": (16, 16),
}

for filename, size in web_sizes.items():
    resized = master_img.resize(size, Image.Resampling.LANCZOS)
    out_path = os.path.join("web-preview", filename)
    resized.save(out_path, format="PNG", optimize=True)
    print(f"Generated {out_path} ({size[0]}x{size[1]}) with black background")

# Also generate favicon.ico
fav = master_img.resize((32, 32), Image.Resampling.LANCZOS)
fav.save(os.path.join("web-preview", "favicon.ico"), format="ICO")
print("Generated favicon.ico with black background")
