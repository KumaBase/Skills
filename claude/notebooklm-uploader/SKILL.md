---
name: notebooklm-uploader
description: Google NotebookLMにPDFを自動アップロードするツール。Drive API + BatchExecute RPCを使用。
---

# NotebookLM PDF Auto Uploader（レガシー）

> **注意**: このツールは旧バージョン。現在は `nlm` (notebooklm-mcp-cli) を推奨。
> MCP経由でClaude Code / Cursorから直接NotebookLMを操作可能。

PDFファイルをGoogle DriveにアップロードしてNotebookLMにソースとして追加するCLIツール。

## アーキテクチャ

```
PDF Files → Google Drive API → NotebookLM BatchExecute RPC
                ↓                        ↓
           Drive Folder            Notebook Sources
        (カテゴリ別整理)          (カテゴリ別ノートブック)
```

## CLIコマンド

```bash
# 認証
node src/index.js auth-drive   # Google Drive OAuth2
node src/index.js login        # NotebookLM ブラウザログイン

# 実行
node src/index.js dry-run      # プレビュー（実行なし）
node src/index.js poc          # 1ファイルでテスト
node src/index.js start        # 全件実行
node src/index.js start --force-public  # 公開URL強制

# 管理
node src/index.js status       # 進捗確認
node src/index.js resume       # 中断再開
```

---

# nlm (notebooklm-mcp-cli) — 推奨ツール

MCP サーバー経由で Claude Code / Cursor から自然言語で NotebookLM を操作するCLI。
バージョン: v0.3.15 | アカウント: chihiro@kuma-base.com

## セットアップ状況

| 項目 | 状態 |
|------|------|
| インストール | `uv tool` でインストール済み |
| Claude Code MCP | `~/.claude/.mcp.json` に登録済み |
| Cursor MCP | `~/.cursor/mcp.json` に登録済み |
| 認証 | `nlm login` で認証済み（プロファイル: default） |
| 認証先 | `~/.notebooklm-mcp-cli/profiles/default/` |

## 認証

```bash
nlm login                    # Chrome で Google ログイン（※Chrome を完全終了してから実行）
nlm login --check            # 認証状態チェック
nlm login --manual -f <file> # Cookie ファイルからインポート（CDP が動かない時の回避策）
```

**重要**: `nlm login` は Chrome の CDP (port 9222) を使う。既存の Chrome が起動していると失敗する場合がある。Chrome を Cmd+Q で完全終了してから実行すること。

## よく使うコマンド

### ノートブック管理

```bash
nlm notebook list              # 一覧
nlm notebook create "タイトル"  # 作成
nlm notebook get <id>          # 詳細
nlm notebook describe <id>     # AI要約
nlm notebook delete <id> --confirm  # 削除
nlm notebook query <id> "質問"      # ソースに質問
```

### ソース管理

```bash
nlm source list <notebook-id>                    # ソース一覧
nlm source add <notebook-id> --url "https://..."  # URL追加
nlm source add <notebook-id> --url "..." --wait   # 処理完了まで待機
nlm source add <notebook-id> --file /path/to.pdf  # ファイルアップロード
nlm source add <notebook-id> --text "内容" --title "タイトル"  # テキスト追加
nlm source describe <source-id>                   # AI要約
nlm source content <source-id>                    # 生テキスト取得
```

### スタジオ（ポッドキャスト・レポート等）

```bash
nlm audio create <notebook-id> --confirm          # ポッドキャスト生成
nlm report create <notebook-id> --confirm         # レポート生成
nlm slides create <notebook-id> --confirm         # スライド生成
nlm mindmap create <notebook-id> --confirm        # マインドマップ
nlm video create <notebook-id> --confirm          # ビデオ
nlm download audio <notebook-id>                  # ダウンロード
```

### リサーチ

```bash
nlm research start "クエリ" --notebook-id <id>             # Webリサーチ
nlm research start "クエリ" --notebook-id <id> --mode deep  # ディープリサーチ
nlm research status <notebook-id>                          # 進捗確認
```

### エイリアス（UUID ショートカット）

```bash
nlm alias set myproject <uuid>   # エイリアス設定
nlm alias list                   # 一覧
# 以後 nlm notebook get myproject のように使える
```

## MCP サーバーとして使う場合

Claude Code 再起動後、`/mcp` で `notebooklm-mcp` が表示される。
自然言語で「ノートブック一覧を見せて」「このURLをノートブックに追加して」等で操作可能。

## トラブルシューティング

### nlm login がハングする
- Chrome を完全終了（Cmd+Q）してから再実行
- それでもダメなら: `nlm login --manual -f <cookie-file>`

### セッション期限切れ
- `nlm login` で再認証（セッションは約1週間有効）

### MCP が接続されない
- Claude Code / Cursor を再起動
- `nlm doctor` で診断
