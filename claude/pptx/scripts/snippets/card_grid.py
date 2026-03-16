"""Card grid snippet — 2x2, 3x1, 2x1, etc.

Config:
    layout: str - "2x2", "3x1", "2x1", "1x3", "1x2" (default: "2x2")
    cards: list of dicts with:
        title: str
        body: str
        icon: str (optional, emoji or text for circle)
    card_fill: dict (optional, override fill)
    card_corner_radius: int (optional, EMU, default: 0)
    gap: int (optional, EMU gap between cards, default: 228600 = 0.25in)
    margin: dict (optional, {left, top, right, bottom} in EMU)
    title_size: int (optional, hundredths of pt, default: 1600)
    body_size: int (optional, hundredths of pt, default: 1200)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from inject_shapes import make_shape_xml, make_text_body
from snippets import register


def _resolve_color(color_key, theme):
    """Resolve a color key to hex, consulting theme if needed."""
    if not color_key:
        return "FFFFFF"
    if color_key.startswith("scheme:"):
        scheme_name = color_key.replace("scheme:", "")
        colors = theme.get("theme", {}).get("colors", {})
        return colors.get(scheme_name, "FFFFFF")
    return color_key


def _get_fonts(theme):
    """Get major/minor fonts from theme."""
    fonts = theme.get("theme", {}).get("fonts", {})
    major = fonts.get("major", {})
    minor = fonts.get("minor", {})
    return {
        "title": major.get("latin", "Calibri"),
        "title_ea": major.get("ea", ""),
        "body": minor.get("latin", "Calibri"),
        "body_ea": minor.get("ea", ""),
    }


def _parse_layout(layout_str):
    """Parse layout string like '2x2' into (cols, rows)."""
    parts = layout_str.lower().split("x")
    if len(parts) == 2:
        return int(parts[0]), int(parts[1])
    return 2, 2


@register("card_grid")
def generate(context):
    """Generate card grid shapes."""
    config = context.get("config", {})
    theme = context.get("theme", {})

    cards = config.get("cards", [])
    if not cards:
        return []

    layout_str = config.get("layout", "2x2")
    cols, rows = _parse_layout(layout_str)

    # Dimensions
    dims = theme.get("dimensions", {})
    slide_w = dims.get("width_emu", 12192000)  # 16:9 default
    slide_h = dims.get("height_emu", 6858000)

    margin = config.get("margin", {})
    margin_l = margin.get("left", 914400)    # 1 inch
    margin_t = margin.get("top", 1371600)    # 1.5 inch (below title)
    margin_r = margin.get("right", 914400)
    margin_b = margin.get("bottom", 457200)  # 0.5 inch

    gap = config.get("gap", 228600)  # 0.25 inch

    # Calculate card dimensions
    content_w = slide_w - margin_l - margin_r
    content_h = slide_h - margin_t - margin_b

    card_w = (content_w - gap * (cols - 1)) // cols
    card_h = (content_h - gap * (rows - 1)) // rows

    # Styling
    fonts = _get_fonts(theme)
    title_size = config.get("title_size", 1600)
    body_size = config.get("body_size", 1200)

    card_fill = config.get("card_fill", {"type": "solid", "color": "F5F5F5"})
    title_color = config.get("title_color", "333333")
    body_color = config.get("body_color", "666666")

    fragments = []
    shape_id = context.get("next_shape_id", 100)

    for idx, card in enumerate(cards):
        if idx >= cols * rows:
            break

        col = idx % cols
        row = idx // cols
        x = margin_l + col * (card_w + gap)
        y = margin_t + row * (card_h + gap)

        # Card title + body text
        paragraphs = []
        if card.get("title"):
            paragraphs.append({
                "text": card["title"],
                "size": title_size,
                "bold": True,
                "color": title_color,
                "font": fonts["title"],
                "font_ea": fonts["title_ea"],
                "align": "l",
                "spacing": int(title_size * 1.5),
            })
        if card.get("body"):
            paragraphs.append({
                "text": card["body"],
                "size": body_size,
                "bold": False,
                "color": body_color,
                "font": fonts["body"],
                "font_ea": fonts["body_ea"],
                "align": "l",
                "spacing": int(body_size * 1.4),
            })

        text_body = make_text_body(
            paragraphs,
            body_props='<a:bodyPr wrap="square" lIns="137160" tIns="91440" rIns="137160" bIns="91440" anchor="t"/>',
        )

        name = f"Card {idx + 1}"
        xml = make_shape_xml(
            shape_id=shape_id,
            name=name,
            x=x, y=y, cx=card_w, cy=card_h,
            fill=card_fill,
            geometry="roundRect" if config.get("card_corner_radius") else "rect",
            text_body=text_body,
        )

        fragments.append(xml)
        shape_id += 1

    return fragments
