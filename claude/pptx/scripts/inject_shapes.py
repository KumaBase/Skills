"""Inject rich shape elements into slide XML.

Adds OOXML shapes to a slide's <p:spTree>, handling:
- Shape ID / Relationship ID auto-numbering
- Image insertion with .rels and [Content_Types].xml updates
- Namespace compatibility (reads existing prefixes from target slide)

Usage:
    python inject_shapes.py <unpacked_dir> <slide_file> --snippet <name> \
        --config <snippet_config.json> --theme <theme_tokens.json>

Examples:
    python inject_shapes.py unpacked/ slide3.xml \\
        --snippet card_grid --config config.json --theme theme_tokens.json
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

import defusedxml.minidom


# ── Namespace helpers ──────────────────────────────────────────────

OOXML_NAMESPACES = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
}


def collect_slide_namespaces(slide_dom):
    """Collect namespace prefix→URI mapping from slide root element."""
    ns = {}
    root = slide_dom.documentElement
    for i in range(root.attributes.length):
        attr = root.attributes.item(i)
        if attr.name.startswith("xmlns"):
            prefix = attr.name.split(":")[-1] if ":" in attr.name else ""
            ns[prefix] = attr.value
    return ns


def ensure_namespace(slide_dom, prefix, uri):
    """Add xmlns:prefix=uri to root element if not present."""
    root = slide_dom.documentElement
    attr_name = f"xmlns:{prefix}" if prefix else "xmlns"
    if not root.hasAttribute(attr_name):
        root.setAttribute(attr_name, uri)


# ── ID management ──────────────────────────────────────────────────

def get_max_shape_id(slide_dom):
    """Scan all id attributes in cNvPr elements to find max shape ID."""
    max_id = 0
    for elem in slide_dom.getElementsByTagName("*"):
        local = elem.tagName.split(":")[-1]
        if local == "cNvPr":
            try:
                sid = int(elem.getAttribute("id"))
                max_id = max(max_id, sid)
            except (ValueError, TypeError):
                pass
    return max_id


def get_max_rel_id(rels_path):
    """Get max rId number from a .rels file."""
    if not rels_path.exists():
        return 0
    dom = defusedxml.minidom.parse(str(rels_path))
    max_rid = 0
    for rel in dom.getElementsByTagName("Relationship"):
        rid = rel.getAttribute("Id")
        match = re.match(r"rId(\d+)", rid)
        if match:
            max_rid = max(max_rid, int(match.group(1)))
    return max_rid


# ── Relationship & Content-Type helpers ────────────────────────────

def add_relationship(rels_path, rid, rel_type, target):
    """Add a Relationship element to a .rels file."""
    rels_dir = rels_path.parent
    rels_dir.mkdir(parents=True, exist_ok=True)

    if rels_path.exists():
        dom = defusedxml.minidom.parse(str(rels_path))
    else:
        dom = defusedxml.minidom.parseString(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
        )

    root = dom.documentElement
    rel = dom.createElement("Relationship")
    rel.setAttribute("Id", rid)
    rel.setAttribute("Type", rel_type)
    rel.setAttribute("Target", target)
    root.appendChild(rel)

    with open(rels_path, "wb") as f:
        f.write(dom.toxml(encoding="utf-8"))


def add_content_type(unpacked_dir, part_name, content_type):
    """Add Override to [Content_Types].xml if not present."""
    ct_path = unpacked_dir / "[Content_Types].xml"
    content = ct_path.read_text(encoding="utf-8")

    if part_name in content:
        return

    # Also check Default extensions
    ext = part_name.rsplit(".", 1)[-1].lower() if "." in part_name else ""
    ext_pattern = f'Extension="{ext}"'
    if ext and ext_pattern in content:
        return

    new_override = f'<Override PartName="{part_name}" ContentType="{content_type}"/>'
    content = content.replace("</Types>", f"  {new_override}\n</Types>")
    ct_path.write_text(content, encoding="utf-8")


# ── Image insertion ────────────────────────────────────────────────

CONTENT_TYPE_MAP = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".emf": "image/x-emf",
    ".wmf": "image/x-wmf",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
}


def insert_image(unpacked_dir, slide_name, image_path, next_rid):
    """Copy image to ppt/media/ and register in rels + content types.

    Returns (rid, relative_target) for use in OOXML blipFill.
    """
    image_path = Path(image_path)
    if not image_path.exists():
        print(f"Warning: Image {image_path} not found", file=sys.stderr)
        return None, None

    media_dir = unpacked_dir / "ppt" / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    suffix = image_path.suffix.lower()
    existing = list(media_dir.glob(f"image*{suffix}"))
    nums = []
    for f in existing:
        m = re.match(r"image(\d+)", f.stem)
        if m:
            nums.append(int(m.group(1)))
    next_num = max(nums) + 1 if nums else 1
    dest_name = f"image{next_num}{suffix}"
    dest_path = media_dir / dest_name
    shutil.copy2(image_path, dest_path)

    # Add relationship
    rid = f"rId{next_rid}"
    rels_path = unpacked_dir / "ppt" / "slides" / "_rels" / f"{slide_name}.rels"
    add_relationship(
        rels_path,
        rid,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
        f"../media/{dest_name}",
    )

    # Add content type
    ct = CONTENT_TYPE_MAP.get(suffix, "application/octet-stream")
    add_content_type(unpacked_dir, f"/ppt/media/{dest_name}", ct)

    return rid, f"../media/{dest_name}"


# ── Shape XML generation ───────────────────────────────────────────

def _escape_attr(value):
    """Escape a string for use as an XML attribute value (without quotes)."""
    return escape(str(value), {'"': '&quot;', "'": '&apos;'})


def make_shape_xml(shape_id, name, x, y, cx, cy, fill=None, line=None, geometry="rect", text_body=None):
    """Generate OOXML for a single shape (rectangle, etc.)."""
    fill_xml = _make_fill_xml(fill) if fill else "<a:noFill/>"
    safe_name = _escape_attr(name)
    safe_geom = _escape_attr(geometry)

    line_xml = ""
    if line:
        line_fill = _make_fill_xml(line.get("fill")) if line.get("fill") else ""
        width = int(line.get("width", 12700))
        line_xml = f'<a:ln w="{width}">{line_fill}</a:ln>'
    else:
        line_xml = "<a:ln><a:noFill/></a:ln>"

    text_xml = ""
    if text_body:
        text_xml = text_body
    else:
        text_xml = '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody>'

    return f'''<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="{int(shape_id)}" name="{safe_name}"/>
    <p:cNvSpPr/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm>
      <a:off x="{int(x)}" y="{int(y)}"/>
      <a:ext cx="{int(cx)}" cy="{int(cy)}"/>
    </a:xfrm>
    <a:prstGeom prst="{safe_geom}"><a:avLst/></a:prstGeom>
    {fill_xml}
    {line_xml}
  </p:spPr>
  {text_xml}
</p:sp>'''


def _make_fill_xml(fill):
    """Generate fill XML from a fill dict."""
    if not fill:
        return "<a:noFill/>"

    fill_type = fill.get("type", "solid")

    if fill_type == "solid":
        color = fill.get("color", "000000")
        if color.startswith("scheme:"):
            scheme_val = _escape_attr(color.replace("scheme:", ""))
            return f'<a:solidFill><a:schemeClr val="{scheme_val}"/></a:solidFill>'
        return f'<a:solidFill><a:srgbClr val="{_escape_attr(color)}"/></a:solidFill>'

    if fill_type == "gradient":
        stops_xml = ""
        for stop in fill.get("stops", []):
            pos = int(stop.get("pos", 0))
            color = stop.get("color", "000000")
            if color.startswith("scheme:"):
                scheme_val = _escape_attr(color.replace("scheme:", ""))
                stops_xml += f'<a:gs pos="{pos}"><a:schemeClr val="{scheme_val}"/></a:gs>'
            else:
                stops_xml += f'<a:gs pos="{pos}"><a:srgbClr val="{_escape_attr(color)}"/></a:gs>'

        angle = int(fill.get("angle", 0))
        return f'''<a:gradFill>
  <a:gsLst>{stops_xml}</a:gsLst>
  <a:lin ang="{angle}" scaled="1"/>
</a:gradFill>'''

    return "<a:noFill/>"


def make_text_body(paragraphs, body_props=None):
    """Generate <p:txBody> XML from paragraph definitions.

    paragraphs: list of dicts with keys:
        text: str
        size: int (hundredths of a point, e.g. 1800 = 18pt)
        bold: bool
        color: str (hex)
        align: str (l/ctr/r)
        font: str (typeface)
        font_ea: str (East Asian typeface)
        spacing: int (line spacing in hundredths of a point)
    """
    if body_props is None:
        body_props = '<a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t"/>'

    paras_xml = ""
    for p in paragraphs:
        text = p.get("text", "")
        size = p.get("size", 1400)
        bold = p.get("bold", False)
        color = p.get("color", "")
        align = p.get("align", "l")
        font = p.get("font", "")
        font_ea = p.get("font_ea", "")
        spacing = p.get("spacing", 0)

        # Validate and sanitize
        valid_aligns = {"l", "ctr", "r", "just", "dist"}
        safe_align = align if align in valid_aligns else "l"
        safe_size = int(size)
        safe_spacing = int(spacing) if spacing else 0

        # Paragraph properties
        ppr_parts = [f'algn="{safe_align}"']
        ppr_children = ""
        if safe_spacing:
            ppr_children += f'<a:lnSpc><a:spcPts val="{safe_spacing}"/></a:lnSpc>'

        ppr_xml = f'<a:pPr {" ".join(ppr_parts)}>{ppr_children}</a:pPr>'

        # Run properties
        rpr_parts = [f'lang="en-US" sz="{safe_size}" dirty="0"']
        if bold:
            rpr_parts.append('b="1"')

        rpr_children = ""
        if color:
            if color.startswith("scheme:"):
                scheme_val = _escape_attr(color.replace("scheme:", ""))
                rpr_children += f'<a:solidFill><a:schemeClr val="{scheme_val}"/></a:solidFill>'
            else:
                rpr_children += f'<a:solidFill><a:srgbClr val="{_escape_attr(color)}"/></a:solidFill>'

        if font:
            safe_font = _escape_attr(font)
            safe_font_ea = _escape_attr(font_ea or font)
            rpr_children += f'<a:latin typeface="{safe_font}"/><a:ea typeface="{safe_font_ea}"/>'

        rpr_xml = f'<a:rPr {" ".join(rpr_parts)}>{rpr_children}</a:rPr>'

        safe_text = escape(text)
        paras_xml += f'<a:p>{ppr_xml}<a:r>{rpr_xml}<a:t>{safe_text}</a:t></a:r></a:p>'

    return f'<p:txBody>{body_props}<a:lstStyle/>{paras_xml}</p:txBody>'


def make_image_xml(shape_id, rid, x, y, cx, cy, name="Picture"):
    """Generate OOXML for an image (pic element)."""
    safe_name = _escape_attr(name)
    safe_rid = _escape_attr(rid)
    return f'''<p:pic>
  <p:nvPicPr>
    <p:cNvPr id="{int(shape_id)}" name="{safe_name}"/>
    <p:cNvPicPr>
      <a:picLocks noChangeAspect="1"/>
    </p:cNvPicPr>
    <p:nvPr/>
  </p:nvPicPr>
  <p:blipFill>
    <a:blip r:embed="{safe_rid}"/>
    <a:stretch><a:fillRect/></a:stretch>
  </p:blipFill>
  <p:spPr>
    <a:xfrm>
      <a:off x="{int(x)}" y="{int(y)}"/>
      <a:ext cx="{int(cx)}" cy="{int(cy)}"/>
    </a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
  </p:spPr>
</p:pic>'''


# ── Core injection ─────────────────────────────────────────────────

def inject_xml_into_slide(slide_path, xml_fragments):
    """Insert XML fragment strings into the slide's <p:spTree>.

    Args:
        slide_path: Path to slide XML
        xml_fragments: list of XML strings to insert
    """
    dom = defusedxml.minidom.parse(str(slide_path))

    # Ensure required namespaces
    for prefix, uri in OOXML_NAMESPACES.items():
        ensure_namespace(dom, prefix, uri)

    # Find spTree
    sp_trees = dom.getElementsByTagName("p:spTree")
    if not sp_trees:
        print(f"Error: No <p:spTree> found in {slide_path}", file=sys.stderr)
        return False

    sp_tree = sp_trees[0]

    # Find insertion point: before <p:extLst> if present, otherwise end of spTree
    insert_before = None
    for child in sp_tree.childNodes:
        if child.nodeType == child.ELEMENT_NODE:
            local_name = child.tagName.split(":")[-1]
            if local_name == "extLst":
                insert_before = child
                break

    for fragment in xml_fragments:
        # Parse fragment
        wrapped = f'<wrapper xmlns:a="{OOXML_NAMESPACES["a"]}" xmlns:r="{OOXML_NAMESPACES["r"]}" xmlns:p="{OOXML_NAMESPACES["p"]}">{fragment}</wrapper>'
        frag_dom = defusedxml.minidom.parseString(wrapped)
        wrapper = frag_dom.documentElement

        for child in list(wrapper.childNodes):
            imported = dom.importNode(child, True)
            if insert_before:
                sp_tree.insertBefore(imported, insert_before)
            else:
                sp_tree.appendChild(imported)

    with open(slide_path, "wb") as f:
        f.write(dom.toxml(encoding="utf-8"))

    return True


def inject_snippet(unpacked_dir, slide_name, snippet_name, config, theme_tokens):
    """Run a named snippet and inject its output into a slide.

    Args:
        unpacked_dir: Path to unpacked PPTX
        slide_name: e.g. "slide3.xml"
        snippet_name: e.g. "card_grid"
        config: dict with snippet-specific configuration
        theme_tokens: dict from extract_theme.py
    """
    from snippets import get_snippet

    snippet_func = get_snippet(snippet_name)
    if snippet_func is None:
        print(f"Error: Unknown snippet '{snippet_name}'", file=sys.stderr)
        return False

    slide_path = unpacked_dir / "ppt" / "slides" / slide_name
    if not slide_path.exists():
        print(f"Error: {slide_path} not found", file=sys.stderr)
        return False

    # Get current max IDs
    slide_dom = defusedxml.minidom.parse(str(slide_path))
    next_shape_id = get_max_shape_id(slide_dom) + 1

    rels_path = unpacked_dir / "ppt" / "slides" / "_rels" / f"{slide_name}.rels"
    next_rel_id = get_max_rel_id(rels_path) + 1

    # Build context for snippet
    context = {
        "unpacked_dir": unpacked_dir,
        "slide_name": slide_name,
        "slide_path": slide_path,
        "theme": theme_tokens,
        "config": config,
        "next_shape_id": next_shape_id,
        "next_rel_id": next_rel_id,
    }

    # Generate XML fragments
    fragments = snippet_func(context)
    if not fragments:
        print(f"Snippet '{snippet_name}' produced no output", file=sys.stderr)
        return False

    # Inject
    success = inject_xml_into_slide(slide_path, fragments)
    if success:
        print(f"Injected {len(fragments)} shapes from '{snippet_name}' into {slide_name}")
    return success


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Inject rich shape elements into slide XML"
    )
    parser.add_argument("unpacked_dir", help="Path to unpacked PPTX directory")
    parser.add_argument("slide", help="Slide file name (e.g. slide3.xml)")
    parser.add_argument("--snippet", required=True, help="Snippet name (e.g. card_grid)")
    parser.add_argument("--config", required=True, help="Snippet config JSON file")
    parser.add_argument("--theme", required=True, help="Theme tokens JSON file")
    args = parser.parse_args()

    unpacked = Path(args.unpacked_dir)
    if not unpacked.exists():
        print(f"Error: {unpacked} not found", file=sys.stderr)
        sys.exit(1)

    with open(args.config, encoding="utf-8") as f:
        config = json.load(f)

    with open(args.theme, encoding="utf-8") as f:
        theme_tokens = json.load(f)

    success = inject_snippet(unpacked, args.slide, args.snippet, config, theme_tokens)
    sys.exit(0 if success else 1)
