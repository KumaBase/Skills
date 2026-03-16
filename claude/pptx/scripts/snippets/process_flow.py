"""Process flow snippet — numbered steps with arrows.

Config:
    steps: list of dicts with:
        number: str (e.g. "1", "01")
        title: str
        description: str (optional)
    direction: str - "horizontal" or "vertical" (default: "horizontal")
    arrow_color: str (hex, default: from theme accent1)
    step_fill: dict (optional, fill for step circles/boxes)
    margin: dict (optional, {left, top, right, bottom} in EMU)
    number_size: int (optional, hundredths of pt, default: 2400)
    title_size: int (optional, hundredths of pt, default: 1400)
    desc_size: int (optional, hundredths of pt, default: 1100)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from inject_shapes import make_shape_xml, make_text_body
from snippets import register


def _get_theme_color(theme, name, default):
    """Get a theme color by name."""
    return theme.get("theme", {}).get("colors", {}).get(name, default)


def _get_fonts(theme):
    """Get fonts from theme."""
    fonts = theme.get("theme", {}).get("fonts", {})
    major = fonts.get("major", {})
    minor = fonts.get("minor", {})
    return {
        "title": major.get("latin", "Calibri"),
        "title_ea": major.get("ea", ""),
        "body": minor.get("latin", "Calibri"),
        "body_ea": minor.get("ea", ""),
    }


@register("process_flow")
def generate(context):
    """Generate process flow shapes."""
    config = context.get("config", {})
    theme = context.get("theme", {})

    steps = config.get("steps", [])
    if not steps:
        return []

    direction = config.get("direction", "horizontal")
    is_horizontal = direction == "horizontal"

    dims = theme.get("dimensions", {})
    slide_w = dims.get("width_emu", 12192000)
    slide_h = dims.get("height_emu", 6858000)

    margin = config.get("margin", {})
    margin_l = margin.get("left", 914400)
    margin_t = margin.get("top", 1828800)  # 2 inch
    margin_r = margin.get("right", 914400)
    margin_b = margin.get("bottom", 457200)

    content_w = slide_w - margin_l - margin_r
    content_h = slide_h - margin_t - margin_b

    n = len(steps)
    arrow_color = config.get("arrow_color", _get_theme_color(theme, "accent1", "4F81BD"))
    step_fill = config.get("step_fill", {"type": "solid", "color": arrow_color})
    number_size = config.get("number_size", 2400)
    title_size = config.get("title_size", 1400)
    desc_size = config.get("desc_size", 1100)

    fonts = _get_fonts(theme)

    fragments = []
    shape_id = context.get("next_shape_id", 100)

    if is_horizontal:
        # Circle diameter
        circle_d = min(914400, content_w // (n * 2))  # max 1 inch
        arrow_w = 457200  # 0.5 inch
        arrow_h = 152400  # ~0.17 inch

        # Total width: n circles + (n-1) arrows
        total_w = n * circle_d + (n - 1) * arrow_w
        gap = (content_w - total_w) // max(n, 1)
        start_x = margin_l + gap // 2

        for idx, step in enumerate(steps):
            x = start_x + idx * (circle_d + arrow_w)
            y_circle = margin_t

            # Number circle
            number_text = make_text_body(
                [{"text": step.get("number", str(idx + 1)),
                  "size": number_size, "bold": True, "color": "FFFFFF",
                  "align": "ctr", "font": fonts["title"], "font_ea": fonts["title_ea"]}],
                body_props='<a:bodyPr wrap="square" anchor="ctr"/>',
            )
            circle_xml = make_shape_xml(
                shape_id=shape_id, name=f"Step {idx + 1} Circle",
                x=x, y=y_circle, cx=circle_d, cy=circle_d,
                fill=step_fill, geometry="ellipse",
                text_body=number_text,
            )
            fragments.append(circle_xml)
            shape_id += 1

            # Title below circle
            title_y = y_circle + circle_d + 114300  # 0.125in gap
            title_paragraphs = [
                {"text": step.get("title", ""), "size": title_size, "bold": True,
                 "color": "333333", "align": "ctr", "font": fonts["title"],
                 "font_ea": fonts["title_ea"]},
            ]
            if step.get("description"):
                title_paragraphs.append(
                    {"text": step["description"], "size": desc_size, "bold": False,
                     "color": "666666", "align": "ctr", "font": fonts["body"],
                     "font_ea": fonts["body_ea"]},
                )
            title_text = make_text_body(title_paragraphs)
            title_xml = make_shape_xml(
                shape_id=shape_id, name=f"Step {idx + 1} Text",
                x=x - circle_d // 4, y=title_y,
                cx=circle_d + circle_d // 2, cy=content_h - circle_d - 114300,
                text_body=title_text,
            )
            fragments.append(title_xml)
            shape_id += 1

            # Arrow (except after last step)
            if idx < n - 1:
                arrow_x = x + circle_d + 57150  # small gap
                arrow_y = y_circle + circle_d // 2 - arrow_h // 2
                arrow_xml = make_shape_xml(
                    shape_id=shape_id, name=f"Arrow {idx + 1}",
                    x=arrow_x, y=arrow_y, cx=arrow_w - 114300, cy=arrow_h,
                    fill={"type": "solid", "color": arrow_color},
                    geometry="rightArrow",
                )
                fragments.append(arrow_xml)
                shape_id += 1

    else:  # vertical
        row_h = content_h // n
        circle_d = min(685800, row_h - 228600)  # max 0.75 inch
        text_x = margin_l + circle_d + 228600  # after circle + gap
        text_w = content_w - circle_d - 228600

        for idx, step in enumerate(steps):
            y = margin_t + idx * row_h

            # Number circle
            number_text = make_text_body(
                [{"text": step.get("number", str(idx + 1)),
                  "size": number_size, "bold": True, "color": "FFFFFF",
                  "align": "ctr", "font": fonts["title"], "font_ea": fonts["title_ea"]}],
                body_props='<a:bodyPr wrap="square" anchor="ctr"/>',
            )
            circle_xml = make_shape_xml(
                shape_id=shape_id, name=f"Step {idx + 1} Circle",
                x=margin_l, y=y, cx=circle_d, cy=circle_d,
                fill=step_fill, geometry="ellipse",
                text_body=number_text,
            )
            fragments.append(circle_xml)
            shape_id += 1

            # Text beside circle
            paragraphs = [
                {"text": step.get("title", ""), "size": title_size, "bold": True,
                 "color": "333333", "align": "l", "font": fonts["title"],
                 "font_ea": fonts["title_ea"]},
            ]
            if step.get("description"):
                paragraphs.append(
                    {"text": step["description"], "size": desc_size, "bold": False,
                     "color": "666666", "align": "l", "font": fonts["body"],
                     "font_ea": fonts["body_ea"]},
                )
            text_body = make_text_body(paragraphs)
            text_xml = make_shape_xml(
                shape_id=shape_id, name=f"Step {idx + 1} Text",
                x=text_x, y=y, cx=text_w, cy=circle_d,
                text_body=text_body,
            )
            fragments.append(text_xml)
            shape_id += 1

    return fragments
