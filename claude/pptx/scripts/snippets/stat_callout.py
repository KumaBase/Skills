"""Stat callout snippet — large numbers with labels.

Config:
    stats: list of dicts with:
        value: str (e.g. "98%", "1.2M", "$50K")
        label: str (e.g. "Customer Satisfaction", "Users")
        color: str (optional, hex override for value)
    layout: str - "row" or "column" (default: "row")
    value_size: int (optional, hundredths of pt, default: 4800 = 48pt)
    label_size: int (optional, hundredths of pt, default: 1200 = 12pt)
    margin: dict (optional, {left, top, right, bottom} in EMU)
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


@register("stat_callout")
def generate(context):
    """Generate stat callout shapes."""
    config = context.get("config", {})
    theme = context.get("theme", {})

    stats = config.get("stats", [])
    if not stats:
        return []

    layout = config.get("layout", "row")
    is_row = layout == "row"

    dims = theme.get("dimensions", {})
    slide_w = dims.get("width_emu", 12192000)
    slide_h = dims.get("height_emu", 6858000)

    margin = config.get("margin", {})
    margin_l = margin.get("left", 914400)
    margin_t = margin.get("top", 1828800)
    margin_r = margin.get("right", 914400)
    margin_b = margin.get("bottom", 914400)

    content_w = slide_w - margin_l - margin_r
    content_h = slide_h - margin_t - margin_b

    n = len(stats)
    accent_color = _get_theme_color(theme, "accent1", "4F81BD")
    value_size = config.get("value_size", 4800)
    label_size = config.get("label_size", 1200)
    fonts = _get_fonts(theme)

    fragments = []
    shape_id = context.get("next_shape_id", 100)

    if is_row:
        cell_w = content_w // n
        gap = 114300  # 0.125in

        for idx, stat in enumerate(stats):
            x = margin_l + idx * cell_w + gap // 2
            w = cell_w - gap

            val_color = stat.get("color", accent_color)
            paragraphs = [
                {"text": stat.get("value", ""), "size": value_size, "bold": True,
                 "color": val_color, "align": "ctr",
                 "font": fonts["title"], "font_ea": fonts["title_ea"],
                 "spacing": int(value_size * 1.3)},
                {"text": stat.get("label", ""), "size": label_size, "bold": False,
                 "color": "666666", "align": "ctr",
                 "font": fonts["body"], "font_ea": fonts["body_ea"]},
            ]
            text_body = make_text_body(
                paragraphs,
                body_props='<a:bodyPr wrap="square" anchor="ctr"/>',
            )
            xml = make_shape_xml(
                shape_id=shape_id, name=f"Stat {idx + 1}",
                x=x, y=margin_t, cx=w, cy=content_h,
                text_body=text_body,
            )
            fragments.append(xml)
            shape_id += 1

            # Divider line (except after last)
            if idx < n - 1:
                div_x = margin_l + (idx + 1) * cell_w
                div_xml = make_shape_xml(
                    shape_id=shape_id, name=f"Divider {idx + 1}",
                    x=div_x, y=margin_t + 228600,
                    cx=12700, cy=content_h - 457200,
                    fill={"type": "solid", "color": "D9D9D9"},
                )
                fragments.append(div_xml)
                shape_id += 1

    else:  # column layout
        cell_h = content_h // n
        gap = 114300

        for idx, stat in enumerate(stats):
            y = margin_t + idx * cell_h + gap // 2
            h = cell_h - gap

            val_color = stat.get("color", accent_color)
            paragraphs = [
                {"text": stat.get("value", ""), "size": value_size, "bold": True,
                 "color": val_color, "align": "l",
                 "font": fonts["title"], "font_ea": fonts["title_ea"],
                 "spacing": int(value_size * 1.3)},
                {"text": stat.get("label", ""), "size": label_size, "bold": False,
                 "color": "666666", "align": "l",
                 "font": fonts["body"], "font_ea": fonts["body_ea"]},
            ]
            text_body = make_text_body(paragraphs)
            xml = make_shape_xml(
                shape_id=shape_id, name=f"Stat {idx + 1}",
                x=margin_l, y=y, cx=content_w, cy=h,
                text_body=text_body,
            )
            fragments.append(xml)
            shape_id += 1

    return fragments
