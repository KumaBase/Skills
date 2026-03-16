"""Extract design tokens from an unpacked PPTX template.

Reads theme, slide masters, slide layouts, and presentation.xml to produce
a JSON file with colors, fonts, gradients, decorative elements, and dimensions.

Usage:
    python extract_theme.py <unpacked_dir> [--output theme_tokens.json]

Examples:
    python extract_theme.py unpacked/
    python extract_theme.py unpacked/ --output tokens.json
    python extract_theme.py unpacked/ > theme_tokens.json
"""

import argparse
import json
import re
import sys
from pathlib import Path

import defusedxml.minidom


def _get_text(node):
    """Get text content of a node."""
    if node is None:
        return ""
    return node.firstChild.nodeValue if node.firstChild else ""


def _attr(element, name, default=""):
    """Get attribute value with default."""
    return element.getAttribute(name) if element.hasAttribute(name) else default


def _find_elements(parent, tag_name):
    """Find direct child elements with given tag name (ignoring namespace prefix)."""
    results = []
    for child in parent.childNodes:
        if child.nodeType == child.ELEMENT_NODE:
            local = child.tagName.split(":")[-1]
            if local == tag_name:
                results.append(child)
    return results


def _find_all(parent, tag_name):
    """Find all descendant elements with given local tag name."""
    results = []
    if parent.nodeType != parent.ELEMENT_NODE:
        return results
    local = parent.tagName.split(":")[-1]
    if local == tag_name:
        results.append(parent)
    for child in parent.childNodes:
        if child.nodeType == child.ELEMENT_NODE:
            results.extend(_find_all(child, tag_name))
    return results


def _collect_namespaces(dom):
    """Collect all namespace declarations from the root element."""
    ns = {}
    root = dom.documentElement
    for i in range(root.attributes.length):
        attr = root.attributes.item(i)
        if attr.name.startswith("xmlns"):
            prefix = attr.name.split(":")[-1] if ":" in attr.name else ""
            ns[prefix] = attr.value
    return ns


def extract_dimensions(unpacked_dir):
    """Extract slide dimensions from presentation.xml."""
    pres_path = unpacked_dir / "ppt" / "presentation.xml"
    if not pres_path.exists():
        return {}

    dom = defusedxml.minidom.parse(str(pres_path))
    sld_sz = _find_all(dom.documentElement, "sldSz")
    if not sld_sz:
        return {}

    sz = sld_sz[0]
    return {
        "width_emu": int(_attr(sz, "cx", "0")),
        "height_emu": int(_attr(sz, "cy", "0")),
    }


def extract_theme_colors(theme_path):
    """Extract color scheme from theme XML."""
    dom = defusedxml.minidom.parse(str(theme_path))
    colors = {}

    color_names = ["dk1", "lt1", "dk2", "lt2",
                   "accent1", "accent2", "accent3", "accent4",
                   "accent5", "accent6", "hlink", "folHlink"]

    for name in color_names:
        elements = _find_all(dom.documentElement, name)
        if elements:
            el = elements[0]
            # Look for srgbClr or sysClr
            srgb = _find_all(el, "srgbClr")
            sys_clr = _find_all(el, "sysClr")
            if srgb:
                colors[name] = _attr(srgb[0], "val", "")
            elif sys_clr:
                colors[name] = _attr(sys_clr[0], "lastClr", _attr(sys_clr[0], "val", ""))

    return colors


def extract_theme_fonts(theme_path):
    """Extract font scheme from theme XML."""
    dom = defusedxml.minidom.parse(str(theme_path))
    fonts = {"major": {}, "minor": {}}

    for font_type in ["majorFont", "minorFont"]:
        key = "major" if "major" in font_type else "minor"
        font_elements = _find_all(dom.documentElement, font_type)
        if font_elements:
            parent = font_elements[0]
            latin = _find_all(parent, "latin")
            ea = _find_all(parent, "ea")
            cs = _find_all(parent, "cs")
            if latin:
                fonts[key]["latin"] = _attr(latin[0], "typeface", "")
            if ea:
                fonts[key]["ea"] = _attr(ea[0], "typeface", "")
            if cs:
                fonts[key]["cs"] = _attr(cs[0], "typeface", "")

    return fonts


def _parse_fill(element):
    """Parse fill information from an element (solid, gradient, pattern)."""
    # Gradient fill
    grad_fills = _find_all(element, "gradFill")
    if grad_fills:
        gf = grad_fills[0]
        stops = []
        for gs in _find_all(gf, "gs"):
            pos = int(_attr(gs, "pos", "0"))
            srgb = _find_all(gs, "srgbClr")
            color = _attr(srgb[0], "val", "") if srgb else ""
            if not color:
                scheme = _find_all(gs, "schemeClr")
                if scheme:
                    color = "scheme:" + _attr(scheme[0], "val", "")
            stops.append({"pos": pos, "color": color})

        lin = _find_all(gf, "lin")
        angle = int(_attr(lin[0], "ang", "0")) if lin else 0

        return {
            "type": "gradient",
            "angle": angle,
            "stops": stops,
        }

    # Solid fill
    solid_fills = _find_all(element, "solidFill")
    if solid_fills:
        sf = solid_fills[0]
        srgb = _find_all(sf, "srgbClr")
        if srgb:
            return {"type": "solid", "color": _attr(srgb[0], "val", "")}
        scheme = _find_all(sf, "schemeClr")
        if scheme:
            return {"type": "solid", "color": "scheme:" + _attr(scheme[0], "val", "")}

    return None


def _parse_shape(sp_element):
    """Parse a shape element into a dict."""
    result = {}

    # Get name
    nv_sp_pr = _find_all(sp_element, "nvSpPr")
    if nv_sp_pr:
        c_nv_pr = _find_all(nv_sp_pr[0], "cNvPr")
        if c_nv_pr:
            result["name"] = _attr(c_nv_pr[0], "name", "")
            result["id"] = _attr(c_nv_pr[0], "id", "")

    # Get position and size from xfrm
    xfrm = _find_all(sp_element, "xfrm")
    if xfrm:
        off = _find_all(xfrm[0], "off")
        ext = _find_all(xfrm[0], "ext")
        if off:
            result["x"] = int(_attr(off[0], "x", "0"))
            result["y"] = int(_attr(off[0], "y", "0"))
        if ext:
            result["cx"] = int(_attr(ext[0], "cx", "0"))
            result["cy"] = int(_attr(ext[0], "cy", "0"))

    # Get preset geometry
    prst_geom = _find_all(sp_element, "prstGeom")
    if prst_geom:
        result["geometry"] = _attr(prst_geom[0], "prst", "")

    # Get fill
    sp_pr = _find_all(sp_element, "spPr")
    if sp_pr:
        fill = _parse_fill(sp_pr[0])
        if fill:
            result["fill"] = fill

        # Get line/stroke
        ln = _find_all(sp_pr[0], "ln")
        if ln:
            line_info = {"width": int(_attr(ln[0], "w", "0"))}
            line_fill = _parse_fill(ln[0])
            if line_fill:
                line_info["fill"] = line_fill
            result["line"] = line_info

    return result


def extract_master(master_path):
    """Extract background and text styles from slide master."""
    dom = defusedxml.minidom.parse(str(master_path))
    root = dom.documentElement
    master_info = {}

    # Background
    bg = _find_all(root, "bg")
    if bg:
        bg_pr = _find_all(bg[0], "bgPr")
        if bg_pr:
            fill = _parse_fill(bg_pr[0])
            if fill:
                master_info["background"] = fill

    # Default text styles
    tx_styles = _find_all(root, "txStyles")
    if tx_styles:
        master_info["text_styles"] = {}
        for style_name in ["titleStyle", "bodyStyle", "otherStyle"]:
            style = _find_all(tx_styles[0], style_name)
            if style:
                levels = {}
                for lvl_tag in ["defPPr", "lvl1pPr", "lvl2pPr", "lvl3pPr", "lvl4pPr", "lvl5pPr"]:
                    lvl = _find_all(style[0], lvl_tag)
                    if lvl:
                        lvl_info = {}
                        def_rpr = _find_all(lvl[0], "defRPr")
                        if def_rpr:
                            sz = _attr(def_rpr[0], "sz", "")
                            if sz:
                                lvl_info["size"] = int(sz)
                            b = _attr(def_rpr[0], "b", "")
                            if b:
                                lvl_info["bold"] = b == "1"
                            fill = _parse_fill(def_rpr[0])
                            if fill:
                                lvl_info["fill"] = fill
                        if lvl_info:
                            levels[lvl_tag] = lvl_info
                if levels:
                    master_info["text_styles"][style_name] = levels

    return master_info


def extract_layout(layout_path):
    """Extract decorative elements and placeholders from slide layout."""
    dom = defusedxml.minidom.parse(str(layout_path))
    root = dom.documentElement
    layout_info = {}
    namespaces = _collect_namespaces(dom)
    layout_info["namespaces"] = namespaces

    # Determine which master this layout uses
    rels_path = layout_path.parent / "_rels" / f"{layout_path.name}.rels"
    if rels_path.exists():
        rels_dom = defusedxml.minidom.parse(str(rels_path))
        for rel in rels_dom.getElementsByTagName("Relationship"):
            rel_type = rel.getAttribute("Type")
            if "slideMaster" in rel_type:
                target = rel.getAttribute("Target")
                master_name = target.split("/")[-1].replace(".xml", "")
                layout_info["master"] = master_name
                break

    # Background
    bg = _find_all(root, "bg")
    if bg:
        bg_pr = _find_all(bg[0], "bgPr")
        if bg_pr:
            fill = _parse_fill(bg_pr[0])
            if fill:
                layout_info["background"] = fill

    # Decorative elements (shapes that are NOT placeholders)
    decorative = []
    placeholders = []

    sp_tree = _find_all(root, "spTree")
    if sp_tree:
        shapes = _find_all(sp_tree[0], "sp")
        for sp in shapes:
            # Check if it's a placeholder
            nv_sp_pr = _find_all(sp, "nvSpPr")
            is_placeholder = False
            if nv_sp_pr:
                ph = _find_all(nv_sp_pr[0], "ph")
                if ph:
                    is_placeholder = True
                    ph_info = _parse_shape(sp)
                    ph_info["ph_type"] = _attr(ph[0], "type", "")
                    ph_info["ph_idx"] = _attr(ph[0], "idx", "")
                    placeholders.append(ph_info)

            if not is_placeholder:
                shape_info = _parse_shape(sp)
                if shape_info:
                    decorative.append(shape_info)

        # Also get picture elements
        pics = _find_all(sp_tree[0], "pic")
        for pic in pics:
            pic_info = {}
            nv_pic_pr = _find_all(pic, "nvPicPr")
            if nv_pic_pr:
                c_nv_pr = _find_all(nv_pic_pr[0], "cNvPr")
                if c_nv_pr:
                    pic_info["name"] = _attr(c_nv_pr[0], "name", "")
                    pic_info["id"] = _attr(c_nv_pr[0], "id", "")
            pic_info["type"] = "picture"
            xfrm = _find_all(pic, "xfrm")
            if xfrm:
                off = _find_all(xfrm[0], "off")
                ext = _find_all(xfrm[0], "ext")
                if off:
                    pic_info["x"] = int(_attr(off[0], "x", "0"))
                    pic_info["y"] = int(_attr(off[0], "y", "0"))
                if ext:
                    pic_info["cx"] = int(_attr(ext[0], "cx", "0"))
                    pic_info["cy"] = int(_attr(ext[0], "cy", "0"))
            decorative.append(pic_info)

    if decorative:
        layout_info["decorative_elements"] = decorative
    if placeholders:
        layout_info["placeholders"] = placeholders

    return layout_info


def extract_gradients(unpacked_dir):
    """Scan slides and layouts for gradient fills and catalog them."""
    gradients = {}

    # Scan slide layouts
    layouts_dir = unpacked_dir / "ppt" / "slideLayouts"
    if layouts_dir.exists():
        for layout_file in sorted(layouts_dir.glob("slideLayout*.xml")):
            dom = defusedxml.minidom.parse(str(layout_file))
            # Background gradients
            bg = _find_all(dom.documentElement, "bg")
            if bg:
                bg_pr = _find_all(bg[0], "bgPr")
                if bg_pr:
                    fill = _parse_fill(bg_pr[0])
                    if fill and fill.get("type") == "gradient":
                        name = layout_file.stem + "_bg"
                        gradients[name] = fill

    # Scan slides
    slides_dir = unpacked_dir / "ppt" / "slides"
    if slides_dir.exists():
        for slide_file in sorted(slides_dir.glob("slide*.xml")):
            if not re.match(r"slide\d+\.xml", slide_file.name):
                continue
            dom = defusedxml.minidom.parse(str(slide_file))
            bg = _find_all(dom.documentElement, "bg")
            if bg:
                bg_pr = _find_all(bg[0], "bgPr")
                if bg_pr:
                    fill = _parse_fill(bg_pr[0])
                    if fill and fill.get("type") == "gradient":
                        name = slide_file.stem + "_bg"
                        gradients[name] = fill

    # Scan masters
    masters_dir = unpacked_dir / "ppt" / "slideMasters"
    if masters_dir.exists():
        for master_file in sorted(masters_dir.glob("slideMaster*.xml")):
            dom = defusedxml.minidom.parse(str(master_file))
            bg = _find_all(dom.documentElement, "bg")
            if bg:
                bg_pr = _find_all(bg[0], "bgPr")
                if bg_pr:
                    fill = _parse_fill(bg_pr[0])
                    if fill and fill.get("type") == "gradient":
                        name = master_file.stem + "_bg"
                        gradients[name] = fill

    return gradients


def extract_theme(unpacked_dir):
    """Main extraction: produce the full theme_tokens dict."""
    unpacked_dir = Path(unpacked_dir)
    tokens = {}

    # Dimensions
    dims = extract_dimensions(unpacked_dir)
    if dims:
        tokens["dimensions"] = dims

    # Theme
    theme_dir = unpacked_dir / "ppt" / "theme"
    theme_info = {}
    if theme_dir.exists():
        theme_files = sorted(theme_dir.glob("theme*.xml"))
        if theme_files:
            theme_path = theme_files[0]
            theme_info["colors"] = extract_theme_colors(theme_path)
            theme_info["fonts"] = extract_theme_fonts(theme_path)

            # Gradients from across the template
            grads = extract_gradients(unpacked_dir)
            if grads:
                theme_info["gradients"] = grads

    tokens["theme"] = theme_info

    # Namespaces from presentation.xml
    pres_path = unpacked_dir / "ppt" / "presentation.xml"
    if pres_path.exists():
        pres_dom = defusedxml.minidom.parse(str(pres_path))
        tokens["namespaces"] = _collect_namespaces(pres_dom)

    # Masters
    masters = {}
    masters_dir = unpacked_dir / "ppt" / "slideMasters"
    if masters_dir.exists():
        for master_file in sorted(masters_dir.glob("slideMaster*.xml")):
            master_name = master_file.stem
            masters[master_name] = extract_master(master_file)
    tokens["masters"] = masters

    # Layouts
    layouts = {}
    layouts_dir = unpacked_dir / "ppt" / "slideLayouts"
    if layouts_dir.exists():
        for layout_file in sorted(layouts_dir.glob("slideLayout*.xml")):
            layout_name = layout_file.stem
            layouts[layout_name] = extract_layout(layout_file)
    tokens["layouts"] = layouts

    return tokens


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract design tokens from an unpacked PPTX template"
    )
    parser.add_argument("unpacked_dir", help="Path to unpacked PPTX directory")
    parser.add_argument(
        "--output", "-o",
        help="Output JSON file (default: stdout)",
        default=None,
    )
    args = parser.parse_args()

    unpacked = Path(args.unpacked_dir)
    if not unpacked.exists():
        print(f"Error: {unpacked} not found", file=sys.stderr)
        sys.exit(1)

    tokens = extract_theme(unpacked)
    output_json = json.dumps(tokens, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")
        print(f"Extracted theme tokens to {args.output}", file=sys.stderr)
    else:
        print(output_json)
