# Hybrid Workflow: Template + Rich Visuals

Use this workflow when you have a template AND need rich visual elements (card grids, process flows, stat callouts, etc.) that go beyond simple text replacement.

**Key advantage**: Template's gradients, fonts, master/layout inheritance are fully preserved while injecting new OOXML shapes directly.

---

## When to Use

| Situation | Workflow |
|-----------|----------|
| Template + text changes only | [editing.md](editing.md) |
| Template + rich visuals (cards, charts, flows) | **This workflow** |
| No template | [pptxgenjs.md](pptxgenjs.md) |

---

## Workflow Steps

### 1. Template Analysis

```bash
python scripts/thumbnail.py template.pptx
python -m markitdown template.pptx
```

Review layouts, identify which slides need rich visuals vs simple text edits.

### 2. Unpack

```bash
python scripts/office/unpack.py template.pptx unpacked/
```

### 3. Extract Design Tokens

```bash
python scripts/extract_theme.py unpacked/ --output theme_tokens.json
```

This extracts colors, fonts, gradients, decorative elements, and dimensions into a JSON file. All snippets will use these tokens to match the template's design.

**Review the output** — check that colors and fonts match what you see in the template.

### 4. Build Slide Structure

Use `add_slide.py` to duplicate/create slides as needed:

```bash
python scripts/add_slide.py unpacked/ slide2.xml
```

Complete all structural changes (add/delete/reorder slides) before proceeding.

### 5. Inject Rich Visuals

For each slide that needs rich visuals, create a snippet config JSON and inject:

```bash
python scripts/inject_shapes.py unpacked/ slide3.xml \
    --snippet card_grid --config card_config.json --theme theme_tokens.json
```

#### Available Snippets

| Snippet | Pattern | Best For |
|---------|---------|----------|
| `card_grid` | 2x2, 3x1, 2x1 cards | Features, team, comparison |
| `process_flow` | Numbered steps + arrows | Steps, workflow, timeline |
| `stat_callout` | Large numbers + labels | KPIs, metrics, achievements |
| `icon_text_rows` | Colored circle + text | Feature lists, benefits |
| `comparison_columns` | 2-column side-by-side | Before/After, pros/cons |

#### Snippet Config Examples

**card_grid:**
```json
{
    "layout": "2x2",
    "cards": [
        {"title": "Feature 1", "body": "Description of feature 1"},
        {"title": "Feature 2", "body": "Description of feature 2"},
        {"title": "Feature 3", "body": "Description of feature 3"},
        {"title": "Feature 4", "body": "Description of feature 4"}
    ],
    "card_fill": {"type": "solid", "color": "F5F5F5"},
    "title_color": "333333",
    "body_color": "666666"
}
```

**process_flow:**
```json
{
    "direction": "horizontal",
    "steps": [
        {"number": "1", "title": "Plan", "description": "Define requirements"},
        {"number": "2", "title": "Build", "description": "Develop solution"},
        {"number": "3", "title": "Ship", "description": "Deploy to production"}
    ]
}
```

**stat_callout:**
```json
{
    "layout": "row",
    "stats": [
        {"value": "98%", "label": "Customer Satisfaction"},
        {"value": "1.2M", "label": "Active Users"},
        {"value": "50+", "label": "Countries"}
    ]
}
```

**icon_text_rows:**
```json
{
    "items": [
        {"icon": "A", "title": "Automation", "description": "Reduce manual work by 80%"},
        {"icon": "S", "title": "Security", "description": "Enterprise-grade encryption"},
        {"icon": "I", "title": "Integration", "description": "Connect with 200+ tools"}
    ]
}
```

**comparison_columns:**
```json
{
    "columns": [
        {
            "title": "Before",
            "items": ["Manual processes", "Scattered data", "Slow reporting"]
        },
        {
            "title": "After",
            "items": ["Automated workflows", "Unified dashboard", "Real-time insights"]
        }
    ]
}
```

### 6. Edit Text Content

Use the Edit tool to update text in slide XML files. This step handles:
- Placeholder text replacement
- Title updates
- Any text not covered by snippets

Follow the formatting rules in [editing.md](editing.md#formatting-rules).

### 7. Clean + Pack

```bash
python scripts/clean.py unpacked/
python scripts/office/pack.py unpacked/ output.pptx --original template.pptx
```

### 8. Validation Gate (Required)

The `pack.py --original` step runs automatic validation:
- Schema validation
- Unique ID check
- Relationship integrity
- Namespace consistency

**All validations must PASS before proceeding.**

Additionally verify LibreOffice can open the file:
```bash
python scripts/office/soffice.py --headless --convert-to pdf output.pptx
```

### 9. Visual QA

```bash
pdftoppm -jpeg -r 150 output.pdf slide
```

Then use a subagent to visually inspect — see [SKILL.md QA section](SKILL.md#qa-required).

Key checks for hybrid workflow:
- Template gradients preserved (not flattened to solid colors)
- Decorative elements (bars, lines, logos) still in correct positions
- Injected shapes don't overlap template elements
- Fonts match template's theme fonts
- Colors are consistent with template palette

---

## Advanced: Direct XML Injection

For shapes not covered by existing snippets, use `inject_shapes.py` programmatically:

```python
from inject_shapes import (
    make_shape_xml, make_text_body, make_image_xml,
    inject_xml_into_slide, insert_image,
)

# Create a gradient-filled rectangle
shape = make_shape_xml(
    shape_id=100, name="Gradient Box",
    x=914400, y=914400, cx=5486400, cy=2743200,
    fill={
        "type": "gradient",
        "angle": 5400000,  # 90 degrees in 60000ths
        "stops": [
            {"pos": 0, "color": "5DE0E6"},
            {"pos": 100000, "color": "004AAD"}
        ]
    },
)

# Inject into slide
inject_xml_into_slide(slide_path, [shape])
```

This gives you full OOXML control including `<a:gradFill>`, which pptxgenjs cannot produce.

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Validation fails on IDs | Shape ID collision | Check `next_shape_id` from context |
| Missing images | rels not updated | Use `insert_image()` helper |
| Gradient appears solid | Wrong fill type | Check `_make_fill_xml()` output |
| Font mismatch | Theme not loaded | Verify `theme_tokens.json` fonts section |
| Shapes overlap template | Wrong coordinates | Review layout's `decorative_elements` in theme tokens |
