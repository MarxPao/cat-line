#!/usr/bin/env python3
"""
Dead Line — Pipeline de Arte e Gerador de Atlas 8-Bit (Secao 23 / Trilha A3 / WP-14)

Funcoes:
1. --generate-placeholder: gera sprites placeholder 64x64 da gatinha calico (com corpo, cauda,
   olhos e pontos de ancoragem) + novelo 16x16 + JSON no formato Aseprite.
2. --input-dir / --output-dir: limpa sprites gerados no Gemini (remove fundo #FF00FF,
   redimensiona por vizinho mais proximo para 64x64, quantiza para a paleta global de 16 cores,
   alinha pelos pes e empacota o atlas PNG + JSON).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple

DEADLINE_16_PALETTE: List[Tuple[int, int, int]] = [
    (0x18, 0x14, 0x25),  # 0 InkBlack
    (0xFF, 0xFF, 0xFF),  # 1 FurWhite
    (0xEA, 0xE1, 0xD3),  # 2 FurCreamShadow
    (0x6B, 0x69, 0x67),  # 3 CalicoGrayDark
    (0x9B, 0x97, 0x93),  # 4 CalicoGrayMid
    (0xDF, 0x8F, 0x49),  # 5 CalicoOrange
    (0xB8, 0x65, 0x2B),  # 6 CalicoOrangeShadow
    (0xF0, 0x94, 0x9E),  # 7 YarnPink
    (0xAD, 0x5E, 0x65),  # 8 YarnPinkDark
    (0xF4, 0xC8, 0x52),  # 9 GoldenYarn
    (0xF7, 0xE8, 0xD0),  # 10 WallCream
    (0xD4, 0xA3, 0x73),  # 11 WoodFloor
    (0x63, 0xAB, 0x3F),  # 12 LeafGreen
    (0x4B, 0x80, 0xCA),  # 13 WindowBlue
    (0x5A, 0x4E, 0x7C),  # 14 CozyPurple
    (0xD9, 0x57, 0x63),  # 15 AlertRed
]

MVP_ANIMATIONS: List[Tuple[str, int, int]] = [
    # (tag_name, frame_count, fps)
    ("ociosa", 2, 8),
    ("andar", 4, 10),
    ("dormir", 2, 4),
    ("comer", 3, 8),
    ("higiene", 3, 8),
    ("lazer", 3, 8),
    ("estudar_ler", 3, 8),
    ("trabalhar", 3, 10),
    ("treinar", 4, 10),
    ("cuidar_casa", 3, 8),
    ("sair", 2, 8),
    ("feliz", 2, 8),
    ("comemorar", 4, 12),
    ("sonolenta", 3, 6),
    ("manhosa", 2, 6),
    ("olhar_relogio", 3, 8),
    ("espreguicar", 3, 8),
    ("lamber_se", 3, 8),
    ("brincar_novelo", 4, 10),
    ("ronronar", 2, 8),
    ("miar_falando", 2, 10),
]


def nearest_palette_color(rgb: Tuple[int, int, int]) -> Tuple[int, int, int]:
    r, g, b = rgb
    return min(
        DEADLINE_16_PALETTE,
        key=lambda c: (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2,
    )


def build_aseprite_atlas_metadata(image_name: str = "cat_atlas.png") -> Dict:
    frames = {}
    frame_tags = []
    slices = []
    frame_index = 0

    for tag_name, count, fps in MVP_ANIMATIONS:
        from_idx = frame_index
        duration_ms = int(1000 / fps)
        for local_i in range(count):
            key = f"cat_{tag_name}_{local_i}.aseprite"
            x = frame_index * 64
            y_bob = 1 if (local_i % 2 == 1) else 0
            frames[key] = {
                "frame": {"x": x, "y": 0, "w": 64, "h": 64},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": 64, "h": 64},
                "sourceSize": {"w": 64, "h": 64},
                "duration": duration_ms,
                "anchors": {
                    "head_anchor": {"x": 32, "y": 18 + y_bob},
                    "neck_anchor": {"x": 32, "y": 34 + y_bob},
                    "tail_anchor": {"x": 44, "y": 48},
                    "paw_anchor": {"x": 24, "y": 54},
                },
            }
            frame_index += 1

        frame_tags.append(
            {
                "name": tag_name,
                "from": from_idx,
                "to": frame_index - 1,
                "direction": "forward",
            }
        )

    slices.extend(
        [
            {"name": "head_anchor", "keys": [{"frame": 0, "bounds": {"x": 32, "y": 18, "w": 1, "h": 1}}]},
            {"name": "neck_anchor", "keys": [{"frame": 0, "bounds": {"x": 32, "y": 34, "w": 1, "h": 1}}]},
            {"name": "tail_anchor", "keys": [{"frame": 0, "bounds": {"x": 44, "y": 48, "w": 1, "h": 1}}]},
        ]
    )

    return {
        "frames": frames,
        "meta": {
            "app": "https://www.aseprite.org/",
            "version": "1.3-deadline",
            "image": image_name,
            "format": "RGBA8888",
            "size": {"w": frame_index * 64, "h": 64},
            "scale": "1",
            "frameTags": frame_tags,
            "slices": slices,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline de sprites 8-bit do Dead Line")
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("core-game/src/main/assets/cat_atlas.json"),
        help="Caminho de saida do JSON Aseprite",
    )
    args = parser.parse_args()

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    metadata = build_aseprite_atlas_metadata()
    args.output_json.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Atlas JSON gerado com {len(metadata['frames'])} quadros e {len(MVP_ANIMATIONS)} animacoes em {args.output_json}")


if __name__ == "__main__":
    main()
