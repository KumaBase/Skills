"""Icon + text rows snippet — colored circle with text beside it.

Config:
    items: list of dicts with:
        icon: str (single character or short text for the circle)
        title: str
        description: str (optional)
        icon_color: str (optional, hex override)
    icon_size: int (optional, EMU diameter, default: 571500 = ~0.625in)
    icon_fill: dict (optional, default fill from theme accent1)
    gap_x: int (optional, EMU gap between icon and text, default: 228600)
    gap_y: int (optional, EMU gap between rows, default: 171450)
    margin: dict (optional, {left, top, right, bottom} in EMU)
    title_size: int (optional, hundredths of pt, default: 1600)
    desc_size: int (optional, hundredths of pt, default: 1200)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from inject_shapes import make_shape_xml, make_text_body
from snippets import register


def _get_theme_color(theme, name, default):
    return theme.get("theme", {}).get("colors", {}).get(name, default)


def _get_fonts(theme):
    fonts = theme.get("theme", {}).get("fonts", {})
    major = fonts.get("major", {})
    minor = fonts.get("minor", {})
    return {
        "title": major.get("latin", "Calibri"),
        "title_ea": major.get("ea", ""),
        "body": minor.get("latin", "Calibri"),
        "body_ea": minor.get("ea", ""),
    }


@register("icon_text_rows")
def generate(context):
    """Generate icon + text row shapes."""
    config = context.get("config", {})
    theme = context.get("theme", {})

    items = config.get("items", [])
    if not items:
        return []

    dims = theme.get("dimensions", {})
    slide_w = dims.get("width_emu", 12192000)
    slide_h = dims.get("height_emu", 6858000)

    margin = config.get("margin", {})
    margin_l = margin.get("left", 914400)
    margin_t = margin.get("top", 1828800)
    margin_r = margin.get("right", 914400)
    margin_b = margin.get("bottom", 457200)

    content_w = slide_w - margin_l - margin_r
    content_h = slide_h - margin_t - margin_b

    icon_d = config.get("icon_size", 571500)
    gap_x = config.get("gap_x", 228600)
    gap_y = config.get("gap_y", 171450)
    title_size = config.get("title_size", 1600)
    desc_size = config.get("desc_size", 1200)

    accent = _get_theme_color(theme, "accent1", "4F81BD")
    icon_fill = config.get("icon_fill", {"type": "solid", "color": accent})
    fonts = _get_fonts(theme)

    n = len(items)
    row_h = min((content_h - gap_y * (n - 1)) // n, icon_d + 228600)
    text_x = margin_l + icon_d + gap_x
    text_w = content_w - icon_d - gap_x

    fragments = []
    shape_id = context.get("next_shape_id", 100)

    # Use accent colors cycling for variety
    accent_colors = [
        _get_theme_color(theme, f"accent{i}", accent)
        for i in range(1, 7)
    ]

    for idx, item in enumerate(items):
        y = margin_t + idx * (row_h + gap_y)

        # Icon circle
        item_color = item.get("icon_color", accent_colors[idx % len(accent_colors)])
        this_fill = {"type": "solid", "color": item_color}

        icon_text = make_text_body(
            [{"text": item.get("icon", str(idx + 1)),
              "size": 1800, "bold": True, "color": "FFFFFF",
              "align": "ctr", "font": fonts["title"], "font_ea": fonts["title_ea"]}],
            body_props='<a:bodyPr wrap="square" anchor="ctr"/>',
        )
        circle_xml = make_shape_xml(
            shape_id=shape_id, name=f"Icon {idx + 1}",
            x=margin_l, y=y + (row_h - icon_d) // 2,
            cx=icon_d, cy=icon_d,
            fill=this_fill, geometry="ellipse",
            text_body=icon_text,
        )
        fragments.append(circle_xml)
        shape_id += 1

        # Text (title + description)
        paragraphs = [
            {"text": item.get("title", ""), "size": title_size, "bold": True,
             "color": "333333", "align": "l",
             "font": fonts["title"], "font_ea": fonts["title_ea"],
             "spacing": int(title_size * 1.5)},
        ]
        if item.get("description"):
            paragraphs.append(
                {"text": item["description"], "size": desc_size, "bold": False,
                 "color": "666666", "align": "l",
                 "font": fonts["body"], "font_ea": fonts["body_ea"]},
            )

        text_body = make_text_body(paragraphs)
        text_xml = make_shape_xml(
            shape_id=shape_id, name=f"Text {idx + 1}",
            x=text_x, y=y, cx=text_w, cy=row_h,
            text_body=text_body,
        )
        fragments.append(text_xml)
        shape_id += 1

    return fragments
