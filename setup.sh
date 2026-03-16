#!/bin/bash
set -euo pipefail

# KumaBase Skills セットアップスクリプト
# 新しいPCでスキル環境を一発構築する
#
# Usage:
#   git clone https://github.com/KumaBase/Skills.git ~/project/Skills
#   cd ~/project/Skills
#   ./setup.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SKILLS="$HOME/.claude/skills"
CURSOR_SKILLS="$HOME/.cursor/skills-cursor"
AGENTS_SKILLS="$HOME/.agents/skills"

echo "🔧 KumaBase Skills セットアップ開始..."

# ディレクトリ作成
mkdir -p "$CLAUDE_SKILLS" "$CURSOR_SKILLS" "$AGENTS_SKILLS"

# -------------------------------------------
# 1. Claude Code スキル（claude/ → ~/.claude/skills/）
# -------------------------------------------
echo ""
echo "📦 Claude Code スキルをリンク中..."
for skill_dir in "$SCRIPT_DIR"/claude/*/; do
  [ -d "$skill_dir" ] || continue
  name=$(basename "$skill_dir")
  if [ "$name" = "context7" ]; then
    # context7 は ~/.agents/skills/ 経由
    ln -sf "$skill_dir" "$AGENTS_SKILLS/$name"
    ln -sf "$AGENTS_SKILLS/$name" "$CLAUDE_SKILLS/$name"
    echo "  ✅ $name (agents → claude)"
  else
    ln -sf "$skill_dir" "$CLAUDE_SKILLS/$name"
    echo "  ✅ $name"
  fi
done

# -------------------------------------------
# 2. 共有スキル（shared/ → ~/.cursor/skills-cursor/）
# -------------------------------------------
echo ""
echo "📦 共有Cursorスキルをリンク中..."
for skill_dir in "$SCRIPT_DIR"/shared/*/; do
  [ -d "$skill_dir" ] || continue
  name=$(basename "$skill_dir")
  ln -sf "$skill_dir" "$CURSOR_SKILLS/$name"
  echo "  ✅ $name"
done

# -------------------------------------------
# 3. pm-skills（外部リポジトリ）
# -------------------------------------------
echo ""
echo "📦 pm-skills をセットアップ中..."
if [ -d "$CLAUDE_SKILLS/pm-skills" ]; then
  echo "  ⏭️  pm-skills は既に存在（スキップ）"
else
  git clone https://github.com/phuryn/pm-skills.git "$CLAUDE_SKILLS/pm-skills"
  echo "  ✅ pm-skills（cloned from GitHub）"
fi

# -------------------------------------------
# 4. pptx の npm install
# -------------------------------------------
echo ""
echo "📦 pptx の依存関係をインストール中..."
if [ -f "$SCRIPT_DIR/claude/pptx/package.json" ]; then
  (cd "$SCRIPT_DIR/claude/pptx" && npm install --silent 2>/dev/null)
  echo "  ✅ pptx npm install 完了"
else
  echo "  ⏭️  pptx/package.json が見つからない（スキップ）"
fi

# -------------------------------------------
# 5. KBプロジェクトスキル（存在する場合）
# -------------------------------------------
KB_DIR="$HOME/project/KB"
echo ""
if [ -d "$KB_DIR/.cursor/skills" ]; then
  echo "📦 KBプロジェクトスキルをリンク中..."
  KB_SKILLS=(
    ai-news chat-reply chat-to-task chatwork-summary imagegen
    morning-routine my-schedule news-post prompt-check show-prompts
    show-tasks task-due-fix task-remind ticket-response weekly-report work-log
  )
  for skill in "${KB_SKILLS[@]}"; do
    if [ -d "$KB_DIR/.cursor/skills/$skill" ]; then
      ln -sf "$KB_DIR/.cursor/skills/$skill" "$CLAUDE_SKILLS/$skill"
      echo "  ✅ $skill"
    else
      echo "  ⚠️  $skill が見つからない（スキップ）"
    fi
  done
else
  echo "⚠️  KBプロジェクト ($KB_DIR) が見つかりません"
  echo "   git clone 後に再度 ./setup.sh を実行してください"
fi

# -------------------------------------------
# 6. iYellプロジェクトスキル（存在する場合）
# -------------------------------------------
IYELL_DIR="$HOME/project/iYell"
echo ""
if [ -d "$IYELL_DIR/.cursor/skills" ]; then
  echo "📦 iYellプロジェクトスキルをリンク中..."
  IYELL_SKILLS=(kintone-gas-operations)
  for skill in "${IYELL_SKILLS[@]}"; do
    if [ -d "$IYELL_DIR/.cursor/skills/$skill" ]; then
      ln -sf "$IYELL_DIR/.cursor/skills/$skill" "$CLAUDE_SKILLS/$skill"
      echo "  ✅ $skill"
    else
      echo "  ⚠️  $skill が見つからない（スキップ）"
    fi
  done
else
  echo "⏭️  iYellプロジェクト ($IYELL_DIR) が見つからない（スキップ）"
fi

# -------------------------------------------
# 完了
# -------------------------------------------
echo ""
echo "============================================"
echo "✅ セットアップ完了！"
echo ""
echo "次のステップ:"
echo "  1. KBプロジェクトを clone（まだの場合）:"
echo "     git clone https://github.com/KumaBase/chi_work.git ~/project/KB"
echo "     → clone後に再度 ./setup.sh を実行"
echo ""
echo "  2. .env ファイルを配置:"
echo "     cp .env.example ~/project/KB/.env"
echo "     → API キー等を設定"
echo ""
echo "  3. Claude Code のアカウント設定:"
echo "     claude-personal  # 個人アカウント"
echo "     claude-iyell     # iYellアカウント"
echo "============================================"
