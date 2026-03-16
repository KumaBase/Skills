"""Automated tests for inject_shapes.py and snippets.

Run: python3 scripts/test_inject_shapes.py
"""

import sys
import tempfile
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import defusedxml.minidom
from inject_shapes import (
    make_shape_xml,
    make_text_body,
    make_image_xml,
    inject_xml_into_slide,
    _escape_attr,
    _make_fill_xml,
)
from snippets import list_snippets, get_snippet

OOXML_NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}

passed = 0
failed = 0


def _assert(condition, msg):
    global passed, failed
    if condition:
        passed += 1
    else:
        failed += 1
        print(f"  FAIL: {msg}")


def _parse_xml(fragment):
    """Wrap fragment in namespaced wrapper and parse to verify well-formedness."""
    wrapped = (
        f'<w xmlns:a="{OOXML_NS["a"]}" '
        f'xmlns:r="{OOXML_NS["r"]}" '
        f'xmlns:p="{OOXML_NS["p"]}">{fragment}</w>'
    )
    return defusedxml.minidom.parseString(wrapped)


def test_xml_escape_in_text():
    """Test that special characters in text are properly escaped."""
    print("Test: XML escape in text body")
    tb = make_text_body([
        {"text": "R&D Department", "size": 1800, "bold": True, "color": "333333", "align": "l"},
        {"text": 'Value < 100 & > 50', "size": 1400, "color": "666666", "align": "l"},
        {"text": 'Said "hello"', "size": 1400, "color": "666666", "align": "l"},
    ])
    _assert("&amp;" in tb, "Ampersand not escaped in text")
    _assert("&lt;" in tb, "Less-than not escaped in text")
    # Verify it parses as valid XML
    try:
        _parse_xml(tb)
        _assert(True, "")
    except Exception as e:
        _assert(False, f"Invalid XML from text body: {e}")


def test_xml_escape_in_attributes():
    """Test that special characters in attribute values are properly escaped."""
    print("Test: XML escape in shape attributes")
    shape = make_shape_xml(
        shape_id=10, name='Card "R&D"',
        x=100, y=200, cx=300, cy=400,
    )
    _assert("&amp;" in shape, "Ampersand not escaped in name attribute")
    _assert("&quot;" in shape, "Quote not escaped in name attribute")
    try:
        _parse_xml(shape)
        _assert(True, "")
    except Exception as e:
        _assert(False, f"Invalid XML from shape: {e}")


def test_image_xml_escape():
    """Test that make_image_xml properly escapes attributes."""
    print("Test: make_image_xml attribute escaping")
    img = make_image_xml(
        shape_id=20, rid="rId5", name='Photo "R&D"',
        x=100, y=200, cx=300, cy=400,
    )
    _assert("&amp;" in img, "Ampersand not escaped in image name")
    _assert("&quot;" in img, "Quote not escaped in image name")
    try:
        _parse_xml(img)
        _assert(True, "")
    except Exception as e:
        _assert(False, f"Invalid XML from image: {e}")


def test_align_validation():
    """Test that invalid align values are sanitized."""
    print("Test: align value validation")
    tb = make_text_body([
        {"text": "Test", "size": 1400, "align": 'l" evil="true'},
    ])
    # Should fallback to "l" since the value is not in the allowlist
    _assert('algn="l"' in tb, "Invalid align not sanitized to default")
    try:
        _parse_xml(tb)
        _assert(True, "")
    except Exception as e:
        _assert(False, f"Invalid XML with bad align: {e}")


def test_extlst_insertion_order():
    """Test that shapes are inserted before <p:extLst> in spTree."""
    print("Test: extLst insertion order")
    slide_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:extLst><p:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"/></p:extLst>
    </p:spTree>
  </p:cSld>
</p:sld>'''

    with tempfile.NamedTemporaryFile(suffix=".xml", mode="w", delete=False) as f:
        f.write(slide_xml)
        slide_path = f.name

    try:
        shape = make_shape_xml(shape_id=10, name="TestShape", x=0, y=0, cx=100, cy=100)
        success = inject_xml_into_slide(Path(slide_path), [shape])
        _assert(success, "inject_xml_into_slide returned False")

        content = Path(slide_path).read_text()
        ext_pos = content.find("extLst")
        shape_pos = content.find("TestShape")
        _assert(
            shape_pos < ext_pos,
            f"Shape ({shape_pos}) should be before extLst ({ext_pos})",
        )
    finally:
        os.unlink(slide_path)


def test_extlst_absent():
    """Test injection works when no extLst is present."""
    print("Test: injection without extLst")
    slide_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sld>'''

    with tempfile.NamedTemporaryFile(suffix=".xml", mode="w", delete=False) as f:
        f.write(slide_xml)
        slide_path = f.name

    try:
        shape = make_shape_xml(shape_id=10, name="NoExtLst", x=0, y=0, cx=100, cy=100)
        success = inject_xml_into_slide(Path(slide_path), [shape])
        _assert(success, "inject_xml_into_slide returned False")

        content = Path(slide_path).read_text()
        _assert("NoExtLst" in content, "Shape not found in output")
    finally:
        os.unlink(slide_path)


def test_snippets_with_special_chars():
    """Test all snippets with special characters produce valid XML."""
    print("Test: all snippets with special characters")
    theme = {
        "dimensions": {"width_emu": 12192000, "height_emu": 6858000},
        "theme": {
            "colors": {
                "accent1": "4F81BD", "accent2": "C0504D", "accent3": "9BBB59",
                "accent4": "8064A2", "accent5": "4BACC6", "accent6": "F79646",
            },
            "fonts": {
                "major": {"latin": "Calibri", "ea": "Noto Sans JP"},
                "minor": {"latin": "Calibri", "ea": "Noto Sans JP"},
            },
        },
    }

    configs = {
        "card_grid": {"cards": [{"title": "R&D", "body": '<script>alert("xss")</script>'}]},
        "process_flow": {"steps": [{"number": "1", "title": "Plan & Execute"}]},
        "stat_callout": {"stats": [{"value": "98%", "label": 'R&D "Score"'}]},
        "icon_text_rows": {"items": [{"icon": "A", "title": "Alpha & Beta"}]},
        "comparison_columns": {
            "columns": [
                {"title": "Before", "items": ['<old>&']},
                {"title": "After", "items": ["new"]},
            ]
        },
    }

    for name in list_snippets():
        func = get_snippet(name)
        result = func({"theme": theme, "config": configs.get(name, {}), "next_shape_id": 100})
        _assert(len(result) > 0, f"{name} returned empty")
        for idx, frag in enumerate(result):
            try:
                _parse_xml(frag)
            except Exception as e:
                _assert(False, f"{name} fragment {idx} is invalid XML: {e}")


def test_gradient_fill():
    """Test gradient fill XML generation."""
    print("Test: gradient fill generation")
    shape = make_shape_xml(
        shape_id=10, name="GradBox",
        x=0, y=0, cx=1000, cy=1000,
        fill={
            "type": "gradient",
            "angle": 5400000,
            "stops": [
                {"pos": 0, "color": "5DE0E6"},
                {"pos": 100000, "color": "004AAD"},
            ],
        },
    )
    _assert("<a:gradFill>" in shape, "Gradient fill not present")
    _assert("5DE0E6" in shape, "First stop color not found")
    _assert("004AAD" in shape, "Second stop color not found")
    try:
        _parse_xml(shape)
        _assert(True, "")
    except Exception as e:
        _assert(False, f"Invalid XML with gradient: {e}")


if __name__ == "__main__":
    test_xml_escape_in_text()
    test_xml_escape_in_attributes()
    test_image_xml_escape()
    test_align_validation()
    test_extlst_insertion_order()
    test_extlst_absent()
    test_snippets_with_special_chars()
    test_gradient_fill()

    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    else:
        print("All tests passed!")
