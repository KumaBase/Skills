---
name: drawio
description: Generate draw.io diagrams as .drawio files, optionally export to PNG/SVG/PDF with embedded XML
allowed-tools: Bash, Write
---

# Draw.io Diagram Skill

Generate draw.io diagrams as native `.drawio` files. Optionally export to PNG, SVG, or PDF with the diagram XML embedded (so the exported file remains editable in draw.io).

## 基盤スキル参照

このスキルは外部APIを使用しないスタンドアロンのワークフロースキル。

- **環境変数**: 不要（ローカルファイル生成のみ）
- **依存**: draw.io Desktop（エクスポート時のみ。未インストールでも `.drawio` 生成は可能）

## How to create a diagram

1. **Generate draw.io XML** in mxGraphModel format for the requested diagram
2. **Validate the XML** — well-formedness、ID一意性、edge の source/target 参照先存在を確認
3. **Write the XML** to a `.drawio` file in the current working directory using the Write tool
4. **If the user requested an export format** (png, svg, pdf), export using the export procedure below
5. **Open the result** — the exported file if exported, or the `.drawio` file otherwise

### Export procedure (error handling)

エクスポートが要求された場合、以下の手順で安全に実行する:

1. **CLI存在確認**: `which drawio` → 失敗時は `/Applications/draw.io.app/Contents/MacOS/draw.io` を確認 → どちらもなければ「draw.io Desktopが未インストールのためエクスポートできません。`.drawio` ファイルをブラウザ版 draw.io で開いてください」と報告し、`.drawio` ファイルを保持
2. **export実行**: 下記コマンド例を参照（ファイル名は必ずダブルクォート）
3. **exit code 検証**: 0 以外の場合は `.drawio` ファイルを保持し、stderr の内容を要約して報告
4. **出力ファイル存在確認**: 出力ファイルが生成されたことを `ls` で確認
5. **成功時の `.drawio` 削除判定**:
   - `png`/`svg`/`pdf`（XML埋め込み対応）: 成功時のみ中間 `.drawio` ファイルを削除（出力ファイルにXMLが埋め込まれているため再編集可能）
   - `jpg`（XML埋め込み非対応）: `.drawio` ファイルを必ず保持する（削除すると編集可能な原本を失う）

## Choosing the output format

Check the user's request for a format preference. Examples:

- `/drawio create a flowchart` → `flowchart.drawio`
- `/drawio png flowchart for login` → `login-flow.drawio.png`
- `/drawio svg: ER diagram` → `er-diagram.drawio.svg`
- `/drawio pdf architecture overview` → `architecture-overview.drawio.pdf`

If no format is mentioned, just write the `.drawio` file and open it in draw.io. The user can always ask to export later.

### Supported export formats

| Format | Embed XML | Notes |
|--------|-----------|-------|
| `png` | Yes (`-e`) | Viewable everywhere, editable in draw.io |
| `svg` | Yes (`-e`) | Scalable, editable in draw.io |
| `pdf` | Yes (`-e`) | Printable, editable in draw.io |
| `jpg` | No | Lossy, no embedded XML support |

PNG, SVG, and PDF all support `--embed-diagram` — the exported file contains the full diagram XML, so opening it in draw.io recovers the editable diagram.

## draw.io CLI

The draw.io desktop app includes a command-line interface for exporting.

### Locating the CLI

Try `drawio` first (works if on PATH), then fall back to the platform-specific path:

- **macOS**: `/Applications/draw.io.app/Contents/MacOS/draw.io`
- **Linux**: `drawio` (typically on PATH via snap/apt/flatpak)
- **Windows**: `"C:\Program Files\draw.io\draw.io.exe"`

Use `which drawio` (or `where drawio` on Windows) to check if it's on PATH before falling back.

### Export command

ファイル名は必ずダブルクォートで囲む。`--` でオプション終端を明示する:

```bash
drawio -x -f <format> -e -b 10 -o "<output>" -- "<input.drawio>"
```

Key flags:
- `-x` / `--export`: export mode
- `-f` / `--format`: output format (png, svg, pdf, jpg)
- `-e` / `--embed-diagram`: embed diagram XML in the output (PNG, SVG, PDF only)
- `-o` / `--output`: output file path
- `-b` / `--border`: border width around diagram (default: 0)
- `-t` / `--transparent`: transparent background (PNG only)
- `-s` / `--scale`: scale the diagram size
- `--width` / `--height`: fit into specified dimensions (preserves aspect ratio)
- `-a` / `--all-pages`: export all pages (PDF only)
- `-p` / `--page-index`: select a specific page (実際の基準は環境で `drawio --help` を確認すること)

### Opening the result

ファイル名は必ずダブルクォートで囲む:

- **macOS**: `open "<file>"`
- **Linux**: `xdg-open "<file>"`
- **Windows**: `start "<file>"`

## File naming

- Use a descriptive filename based on the diagram content (e.g., `login-flow`, `database-schema`)
- **許可文字**: `[a-z0-9-]` のみ使用（スペース・特殊文字・日本語は禁止）
- Use lowercase with hyphens for multi-word names
- For export, use double extensions: `name.drawio.png`, `name.drawio.svg`, `name.drawio.pdf` — this signals the file contains embedded diagram XML
- After a successful export of `png`/`svg`/`pdf`（XML埋め込み対応）, delete the intermediate `.drawio` file — the exported file contains the full diagram
- `jpg` エクスポート時は `.drawio` ファイルを必ず保持する（XML埋め込み非対応のため）

## XML format

A `.drawio` file is native mxGraphModel XML. Always generate XML directly — Mermaid and CSV formats require server-side conversion and cannot be saved as native files.

### Basic structure

Every diagram must have this structure:

```xml
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <!-- Diagram cells go here with parent="1" -->
  </root>
</mxGraphModel>
```

- Cell `id="0"` is the root layer
- Cell `id="1"` is the default parent layer
- All diagram elements use `parent="1"` unless using multiple layers

### Multiple pages

複数ページの図は `mxfile` > `diagram` 構造を使用する:

```xml
<mxfile>
  <diagram name="Page 1">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Page 1 cells -->
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Page 2">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Page 2 cells -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

単一ページの場合は `mxGraphModel` 直接でよい。

### Common styles

**Rounded rectangle:**
```xml
<mxCell id="2" value="Label" style="rounded=1;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry"/>
</mxCell>
```

**Diamond (decision):**
```xml
<mxCell id="3" value="Condition?" style="rhombus;whiteSpace=wrap;" vertex="1" parent="1">
  <mxGeometry x="100" y="200" width="120" height="80" as="geometry"/>
</mxCell>
```

**Arrow (edge):**
```xml
<mxCell id="4" value="" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="2" target="3" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

**Labeled arrow:**
```xml
<mxCell id="5" value="Yes" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="3" target="6" parent="1">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

### Useful style properties

| Property | Values | Use for |
|----------|--------|---------|
| `rounded=1` | 0 or 1 | Rounded corners |
| `whiteSpace=wrap` | wrap | Text wrapping |
| `fillColor=#dae8fc` | Hex color | Background color |
| `strokeColor=#6c8ebf` | Hex color | Border color |
| `fontColor=#333333` | Hex color | Text color |
| `shape=cylinder3` | shape name | Database cylinders |
| `shape=mxgraph.flowchart.document` | shape name | Document shapes |
| `ellipse` | style keyword | Circles/ovals |
| `rhombus` | style keyword | Diamonds |
| `edgeStyle=orthogonalEdgeStyle` | style keyword | Right-angle connectors |
| `edgeStyle=elbowEdgeStyle` | style keyword | Elbow connectors |
| `dashed=1` | 0 or 1 | Dashed lines |
| `swimlane` | style keyword | Swimlane containers |

## CRITICAL: XML well-formedness

生成後に以下を必ず検証すること:

1. **Well-formedness**: XML として整形式であること（`--` がコメント内にないか、特殊文字がエスケープされているか）
2. **ID一意性**: すべての `mxCell` の `id` が重複していないこと
3. **参照整合**: edge の `source`/`target` が実在する cell の `id` を指していること
4. **parent整合**: すべての diagram cell が `parent="1"`（または有効な親ID）を持つこと

### XML rules

- **NEVER use double hyphens (`--`) inside XML comments.** `--` is illegal inside `<!-- -->` per the XML spec and causes parse errors. Use single hyphens or rephrase.
- Escape special characters in attribute values: `&amp;`, `&lt;`, `&gt;`, `&quot;`
- Always use unique `id` values for each `mxCell`
