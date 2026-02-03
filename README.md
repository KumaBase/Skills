# Skills

Cursor / Claude Code 用スキル集。

## スキル一覧

| スキル | トリガー | 概要 |
|--------|----------|------|
| [chat-to-task](chat-to-task/) | 「タスク作って」 | LINE / Chatwork のチャットやテキストからタスクを抽出し、Kuma Taskboard に登録する |

## 使い方

### Cursor の場合

スキルフォルダをプロジェクトの `.cursor/skills/` にコピーする:

```bash
cp -r chat-to-task/ <your-project>/.cursor/skills/chat-to-task/
```

### Claude Code の場合

スキルフォルダを `~/.claude/skills/` にコピー（またはシンボリックリンク）する:

```bash
ln -s $(pwd)/chat-to-task ~/.claude/skills/chat-to-task
```

## セットアップ

1. スキルフォルダを配置
2. `config.md` を自分の環境に合わせて編集（メンバー、通知先など）
3. スキルを実行（初回は `.env` が自動セットアップされる）

詳細は各スキルの `SKILL.md` を参照。
