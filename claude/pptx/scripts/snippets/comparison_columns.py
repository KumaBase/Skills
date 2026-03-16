"""Comparison columns snippet — side-by-side comparison.

Config:
    columns: list of dicts (2 items) with:
        title: str
        items: list of str
        header_fill: dict (optional, fill for column header)
        header_color: str (optional, text color for header)
    divider: bool (optional, show center divider, default: True)
    margin: dict (optional, {left, top, right, bottom} in EMU)
    title_size: int (optional, hundredths of pt, default: 2000)
    item_size: int (optional, hundredths of pt, default: 1200)
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


@register("comparison_columns")
def generate(context):
    """Generate comparison column shapes."""
    config = context.get("config", {})
    theme = context.get("theme", {})

    columns = config.get("columns", [])
    if len(columns) < 2:
        return []

    # Only use first 2 columns
    columns = columns[:2]

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

    show_divider = config.get("divider", True)
    gap = 228600  # gap between columns
    col_w = (content_w - gap) // 2
    header_h = 571500  # 0.625in

    title_size = config.get("title_size", 2000)
    item_size = config.get("item_size", 1200)

    accent1 = _get_theme_color(theme, "accent1", "4F81BD")
    accent2 = _get_theme_color(theme, "accent2", "C0504D")
    fonts = _get_fonts(theme)

    fragments = []
    shape_id = context.get("next_shape_id", 100)

    default_fills = [
        {"type": "solid", "color": accent1},
        {"type": "solid", "color": accent2},
    ]
    default_header_colors = ["FFFFFF", "FFFFFF"]

    for idx, col in enumerate(columns):
        x = margin_l + idx * (col_w + gap)

        # Header bar
        h_fill = col.get("header_fill", default_fills[idx])
        h_color = col.get("header_color", default_header_colors[idx])

        header_text = make_text_body(
            [{"text": col.get("title", ""), "size": title_size, "bold": True,
              "color": h_color, "align": "ctr",
              "font": fonts["title"], "font_ea": fonts["title_ea"]}],
            body_props='<a:bodyPr wrap="square" anchor="ctr"/>',
        )
        header_xml = make_shape_xml(
            shape_id=shape_id, name=f"Header {idx + 1}",
            x=x, y=margin_t, cx=col_w, cy=header_h,
            fill=h_fill,
            text_body=header_text,
        )
        fragments.append(header_xml)
        shape_id += 1

        # Items below header
        items = col.get("items", [])
        if items:
            paragraphs = []
            for item_text in items:
                paragraphs.append({
                    "text": f"  {item_text}",
                    "size": item_size,
                    "bold": False,
                    "color": "333333",
                    "align": "l",
                    "font": fonts["body"],
                    "font_ea": fonts["body_ea"],
                    "spacing": int(item_size * 2.0),
                })

            items_body = make_text_body(
                paragraphs,
                body_props='<a:bodyPr wrap="square" lIns="137160" tIns="91440" rIns="137160" bIns="91440" anchor="t"/>',
            )
            items_xml = make_shape_xml(
                shape_id=shape_id, name=f"Items {idx + 1}",
                x=x, y=margin_t + header_h,
                cx=col_w, cy=content_h - header_h,
                fill={"type": "solid", "color": "F8F8F8"},
                text_body=items_body,
            )
            fragments.append(items_xml)
            shape_id += 1

    # Center divider
    if show_divider:
        div_x = margin_l + col_w + gap // 2 - 6350
        divider_xml = make_shape_xml(
            shape_id=shape_id, name="Divider",
            x=div_x, y=margin_t,
            cx=12700, cy=content_h,
            fill={"type": "solid", "color": "D9D9D9"},
        )
        fragments.append(divider_xml)
        shape_id += 1

    return fragments
