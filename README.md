# Skills

Cursor / Claude Code 用スキル集。新しいPCでは `setup.sh` を実行するだけで環境構築が完了する。

## クイックスタート（新しいPC）

```bash
# 1. リポジトリをクローン
git clone https://github.com/KumaBase/Skills.git ~/project/Skills

# 2. セットアップ実行
cd ~/project/Skills
./setup.sh

# 3. KBプロジェクトをクローン（まだの場合）
git clone https://github.com/KumaBase/chi_work.git ~/project/KB

# 4. setup.sh を再実行（KB スキルのリンクを作成）
./setup.sh
```

## リポジトリ構成

```
Skills/
├── setup.sh              # 一発セットアップスクリプト
├── claude/               # Claude Code 専用スキル → ~/.claude/skills/
│   ├── better-auth-best-practices/
│   ├── codex-review/
│   ├── context7/
│   ├── create-invoice/
│   ├── drawio/
│   ├── frontend-design/
│   ├── notebooklm-uploader/
│   └── pptx/
├── shared/               # Cursor/Claude 共有スキル → ~/.cursor/skills-cursor/
│   ├── create-rule/
│   ├── create-skill/
│   ├── create-subagent/
│   ├── migrate-to-skills/
│   └── update-cursor-settings/
├── chat-to-task/         # 公開ワークフロースキル
├── morning-routine/
└── my-schedule/
```

## スキル一覧

### Claude Code 専用（`claude/`）

| スキル | 概要 |
|--------|------|
| better-auth-best-practices | Better Auth フレームワークのベストプラクティス |
| codex-review | Codex CLI によるレビューゲート |
| context7 | ライブラリ/フレームワークのドキュメント検索 |
| create-invoice | 請求書作成（動画マニュアル付き） |
| drawio | draw.io ダイアグラム生成 |
| frontend-design | 高品質フロントエンドUI生成 |
| notebooklm-uploader | NotebookLM への PDF 自動アップロード |
| pptx | PowerPoint スライド作成・編集 |

### 共有スキル（`shared/`）

| スキル | 概要 |
|--------|------|
| create-rule | Cursor ルール作成 |
| create-skill | スキル作成テンプレート |
| create-subagent | サブエージェント作成 |
| migrate-to-skills | .mdc → SKILL.md 変換 |
| update-cursor-settings | Cursor 設定更新 |

### 公開ワークフロースキル

| スキル | トリガー | 概要 |
|--------|----------|------|
| [chat-to-task](chat-to-task/) | 「タスク作って」 | LINE / Chatwork のチャットからタスクを抽出し Kuma Taskboard に登録 |
| [my-schedule](my-schedule/) | 「今日の予定」 | 複数 Google カレンダーの予定を統合表示 |
| [morning-routine](morning-routine/) | 「おはよう」 | 予定・チャット・タスクを一括取得する朝のルーティン |

### 外部リポジトリ（setup.sh が自動クローン）

| スキル | リポジトリ | 概要 |
|--------|-----------|------|
| pm-skills | [phuryn/pm-skills](https://github.com/phuryn/pm-skills) | PM ツールキット（19サブスキル） |

### KBプロジェクト内スキル（setup.sh がシンボリックリンク作成）

KBプロジェクト（`chi_work`）の `.cursor/skills/` に含まれるスキル。setup.sh で `~/.claude/skills/` にリンクされる。

ai-news, chat-reply, chatwork-summary, imagegen, news-post, prompt-check, show-prompts, show-tasks, task-due-fix, task-remind, ticket-response, weekly-report, work-log

## setup.sh の動作

1. `claude/` 配下のスキルを `~/.claude/skills/` にシンボリックリンク
2. `shared/` 配下のスキルを `~/.cursor/skills-cursor/` にシンボリックリンク
3. `pm-skills` を GitHub からクローン（未取得の場合）
4. `pptx` の `npm install` を実行
5. KB プロジェクトのスキルをシンボリックリンク（プロジェクトが存在する場合）
6. iYell プロジェクトのスキルをシンボリックリンク（プロジェクトが存在する場合）

## 注意事項

- `create-invoice/` は参照画像（gifs/references）のみ含む。元動画のフレーム（frames/highlighted）は除外
- `pptx/` は `node_modules/` を含まない。setup.sh が `npm install` で復元する
- `.env` ファイル（APIキー等）は手動で配置する必要がある
