---
name: morning-routine
description: 毎朝「おはよう」で予定・チャット・タスクをまとめて表示するモーニングルーティン
---

# morning-routine

「おはよう」と言われたら、曜日に応じてデータを一括取得し、統合出力するメタワークフロースキル。

## 設定ファイル参照

| 種類 | パス | 用途 |
|------|------|------|
| **スキル固有設定** | `.cursor/skills/morning-routine/config.md` | 曜日判定、フィルタルール、バッチ設定、カレンダー整形設定 |
| **共通設定** | `.cursor/skills/_shared/config.md` | 環境変数、メンバーマッピング、プロジェクト設定 |

## 依存スキル

### 基盤スキル（今日の予定・タスクリマインド用に直接使用）

| スキル | パス | 用途 |
|--------|------|------|
| fetch-calendar | `.cursor/skills/fetch-calendar/SKILL.md` | 今日のカレンダー取得（3カレンダー並列） |
| schedule-formatter | `.cursor/skills/schedule-formatter/SKILL.md` | 今日の予定整形（グレーアウト・空き時間・重複検出） |
| task-suggester | `.cursor/skills/task-suggester/SKILL.md` | 今日の想定タスク生成 |
| fetch-tasks | `.cursor/skills/fetch-tasks/SKILL.md` | タスクリマインド + 個人タスク通知用のデータ取得 |

### ワークフロースキル（そのまま呼び出し）

| スキル | パス | 呼び出し方法 |
|--------|------|-------------|
| chatwork-summary | `.cursor/skills/chatwork-summary/SKILL.md` | 「昨日のチャットまとめ」 |
| task-due-fix | `.cursor/skills/task-due-fix/SKILL.md` | 日曜・月曜のみ |
| weekly-report | `.cursor/skills/weekly-report/SKILL.md` | 日曜・月曜のみ |
| chat-reply | `.cursor/skills/chat-reply/SKILL.md` | Step 5 or フィルタ指定 |

**注**: task-remind の整形ロジックは `.cursor/skills/task-remind/SKILL.md` の Step 2-3 を参照して morning-routine が直接整形する（task-remind をワークフロースキルとしては呼び出さない）。

## 対応パターン

### モーニングルーティン実行

| 入力 | 動作 |
|------|------|
| 「おはよう」「おはよ」「おはよー」「good morning」「morning」 | フル実行 |
| 「おはよう 予定だけ」 | 今日の予定のみ |
| 「おはよう 予定とチャットだけ」 | 今日の予定 + chatwork-summary のみ |
| 「おはよう チャットなし」 | chatwork-summary をスキップ |
| 「おはよう 返信案も」 | フル実行 + 返信案を統合出力に含める（質問スキップ） |
| 「おはよう 返信なし」 | フル実行、返信案の質問もスキップ |

### 再表示

| 入力 | 動作 |
|------|------|
| 「さっきの朝まとめ」「朝のまとめもう一回」「morning recap」 | 本日の実行結果を再表示 |

## ワークフロー

```
ユーザー: 「おはよう」（+オプション）
  ↓
[Step 0] 入力解析（フィルタ判定）
  ↓
[Step 1] 曜日判定（JST基準）
  ↓
[Step 2] データ一括取得（バッチ実行）
  - バッチ1: カレンダー3並列 → schedule-formatter → task-suggester
  - バッチ2: タスク4並列 → task-remind形式で整形 + 個人タスク通知算出
  - chatwork-summary 呼び出し（1回のみ）
  ↓
[Step 3] 曜日別追加実行（フィルタ適用後）
  - 土曜のみ: バッチ3（来週カレンダー15並列）→ schedule-formatter
  - 日曜・月曜のみ: task-due-fix, weekly-report
  ↓
[Step 4] 統合出力（個人タスク通知含む）
  ↓
[Step 5] 返信案の提案
  - 「返信案も見ますか？」と質問
  - ユーザーが「はい」→ chat-reply を実行
  - ユーザーが「いいえ」→ 終了
```

### Step 0: 入力解析（フィルタ判定）

ユーザー入力からスキルフィルタを判定する。詳細は `config.md` のフィルタルールを参照。

**フィルタ優先順位**:
1. ポジティブフィルタ（「〜だけ」「〜のみ」）が含まれる場合 → **ポジティブ優先**（指定スキルのみ実行、ネガティブは無視）
2. ネガティブフィルタ（「〜なし」「〜抜き」）のみの場合 → 指定スキルをスキップ
3. どちらもなし → フル実行

**付加オプション（「〜も」）**: フィルタとは別枠で処理。フィルタ適用後の実行セットに**追加**する形で動作し、他スキルの実行には影響しない。
- 「返信案も」→ フル実行 + chat-reply を統合出力に含める（Step 5 の質問をスキップ）
- 「返信なし」→ ネガティブフィルタとして Step 5 自体をスキップ

**複合指定ルール**: 入力に含まれるキーワードをすべて収集し、和集合（OR）で適用。

**否定スコープ**: 「〜なし」「〜抜き」は直前のキーワードにのみ適用。「チャットなし」→ chatwork-summary のみスキップ。

**キーワードマッチング**: 最長一致優先。「来週の予定」は「来週」+「予定」ではなく「来週の予定」として一括マッチし、来週カレンダー取得のみに解決する。「予定」単独は今日の予定にマッチ。

**派生スキルの扱い**:
- 「予定だけ」→ 今日の予定のみ
- 「来週の予定だけ」「来週だけ」→ 来週の予定のみ（「予定」は消費済みのため今日は含まない）

### フィルタ別実行トレース表（代表例）

| 入力例 | Batch1(カレンダー) | Batch2(タスク) | chatwork | タスク整形 | Batch3(来週) | task-due-fix | weekly-report | Step5質問 | chat-reply |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 「おはよう」 | ✅ | ✅ | ✅ | ✅ | - | - | - | ✅ | - |
| 「予定だけ」 | ✅ | ✅ | - | - | - | - | - | - | - |
| 「チャットなし」 | ✅ | ✅ | - | ✅ | - | - | - | ✅ | - |
| 「来週だけ」(土) | - | ✅ | - | - | ✅ | - | - | - | - |
| 「返信案も」 | ✅ | ✅ | ✅ | ✅ | - | - | - | - | ✅ |
| 「返信なし」 | ✅ | ✅ | ✅ | ✅ | - | - | - | - | - |

- ✅ = 実行、- = スキップ
- Batch2 は常に実行（個人タスク通知用）、「タスク整形」列はタスクリマインド整形の有無
- 日月は task-due-fix / weekly-report が追加される

### Step 1: 曜日判定

タイムゾーン: Asia/Tokyo（JST）固定

```bash
WEEKDAY=$(TZ=Asia/Tokyo date +%u)
# 1=月, 2=火, ..., 6=土, 7=日

IS_SATURDAY=$([[ "$WEEKDAY" == "6" ]] && echo true || echo false)
IS_SUNDAY_OR_MONDAY=$([[ "$WEEKDAY" == "7" || "$WEEKDAY" == "1" ]] && echo true || echo false)
```

### Step 2: データ一括取得（バッチ実行）

**重要**: API呼び出しは `config.md` の「バッチ実行ルール」に従い、可能な限り1回の bash 実行で複数の curl を並列処理する。

**実行条件**: Step 0 で確定した「実行セクション集合」に基づき、各バッチ/スキルを条件実行する。

| バッチ | 実行条件 |
|--------|---------|
| バッチ1（カレンダー） | 「今日の予定」が実行集合に含まれる場合 |
| バッチ2（タスク） | 常に実行（個人タスク通知がフィルタ対象外のため）。ただしタスクリマインド整形は「タスクリマインド」が実行集合に含まれる場合のみ |
| chatwork-summary | 「chatwork-summary」が実行集合に含まれる場合 |

#### 2-A: 今日の予定取得（バッチ1: 承認1回）

**実行条件**: 「今日の予定」が実行セクション集合に含まれる場合のみ。

fetch-calendar を参照し、**今日の日付のみ** 3つのGAS APIを1回の bash で並列取得する。

```bash
TODAY=$(TZ=Asia/Tokyo date +%Y-%m-%d)

curl -sL "${GAS_CALENDAR_KB_URL}?action=events&date=${TODAY}" > /tmp/mr_kb.json &
curl -sL "${GAS_CALENDAR_IYELL_URL}?action=events&date=${TODAY}" > /tmp/mr_iyell.json &
curl -sL "${GAS_CALENDAR_COREAL_URL}?action=events&date=${TODAY}" > /tmp/mr_coreal.json &
wait

cat /tmp/mr_kb.json
echo "---SEPARATOR---"
cat /tmp/mr_iyell.json
echo "---SEPARATOR---"
cat /tmp/mr_coreal.json

rm -f /tmp/mr_kb.json /tmp/mr_iyell.json /tmp/mr_coreal.json
```

取得後:
1. fetch-calendar のマージ処理に従い、3つのレスポンスを統合
2. schedule-formatter で整形（グレーアウト・空き時間検出あり。設定は `.cursor/skills/morning-routine/config.md` の「カレンダー整形設定」を参照）
3. task-suggester で想定タスクを追加（設定は `.cursor/skills/morning-routine/config.md` の「カレンダー整形設定」を参照）

#### 2-B: タスクデータ取得（バッチ2: 承認1回）

**実行条件**: 常に実行（個人タスク通知がフィルタ対象外のため）。タスクリマインドの整形処理は「タスクリマインド」が実行集合に含まれる場合のみ実施。

fetch-tasks を参照し、タスクリマインド + 個人タスク通知に必要なデータを1回の bash で並列取得する。

**パラメータ**: `_shared/config.md` の「Taskboard プロジェクト設定」から以下を取得して使用する。
- プロジェクトキー（例: `KBD`）
- 自分の assignee_user_id（例: `3`）
- 完了ステータスID（例: `3`）

```bash
# _shared/config.md の Taskboard プロジェクト設定から値を取得
# PROJECT: プロジェクトキー
# ASSIGNEE: 自分の assignee_user_id

curl -s "${KUMA_TASKBOARD_URL}/api/projects/${PROJECT}/tasks?assignee_user_id=${ASSIGNEE}&due_date_filter=overdue" \
  -H "Authorization: Bearer ${KUMA_TASKBOARD_TOKEN}" -H "Accept: application/json" > /tmp/mr_overdue.json &

curl -s "${KUMA_TASKBOARD_URL}/api/projects/${PROJECT}/tasks?assignee_user_id=${ASSIGNEE}&due_date_filter=due_soon" \
  -H "Authorization: Bearer ${KUMA_TASKBOARD_TOKEN}" -H "Accept: application/json" > /tmp/mr_due_soon.json &

curl -s "${KUMA_TASKBOARD_URL}/api/personal-tasks?filter=incomplete" \
  -H "Authorization: Bearer ${KUMA_TASKBOARD_TOKEN}" -H "Accept: application/json" > /tmp/mr_personal.json &

curl -s "${KUMA_TASKBOARD_URL}/api/projects/${PROJECT}/tasks?assignee_user_id=${ASSIGNEE}" \
  -H "Authorization: Bearer ${KUMA_TASKBOARD_TOKEN}" -H "Accept: application/json" > /tmp/mr_all_project.json &

wait

cat /tmp/mr_overdue.json
echo "---SEPARATOR---"
cat /tmp/mr_due_soon.json
echo "---SEPARATOR---"
cat /tmp/mr_personal.json
echo "---SEPARATOR---"
cat /tmp/mr_all_project.json

rm -f /tmp/mr_overdue.json /tmp/mr_due_soon.json /tmp/mr_personal.json /tmp/mr_all_project.json
```

**ページネーション**: レスポンスの `meta.last_page > 1` の場合、追加で全ページ取得してマージ。

取得後のデータ処理:

**タスクリマインド整形**（task-remind SKILL.md の Step 2-3 を参照）:
1. 完了タスク除外: `_shared/config.md` の完了ステータスID に該当するタスクを除外
2. overdue と due_soon の重複をタスクIDで排除
3. 個人タスクのフィルタ: `due_date < today` → 期限切れ、`today <= due_date <= today+3` → 期限間近
4. 以下のカテゴリに分類（排他的に判定）:

| カテゴリ | 条件 | 表示 |
|---------|------|------|
| 🔴 期限切れ | due_date < 今日 | 超過日数を表示 |
| 🟠 今日 | due_date = 今日 | 強調表示 |
| 🟡 明日 | due_date = 今日+1 | |
| 🟢 2-3日後 | due_date = 今日+2 または 今日+3 | |

5. プロジェクト横断でまとめて表示（期限順ソート）

**個人タスク通知算出**（旧Step 4b を統合）:

バッチ2 のデータから以下を算出（追加API呼び出し不要）:

| 種別 | 算出方法 |
|------|---------|
| 期限切れ件数 | `mr_overdue.json` の完了除外後件数 + `mr_personal.json` の `due_date < today` 件数 |
| 期限未設定件数 | `mr_all_project.json` の `due_date == null` かつ完了ステータス除外 + `mr_personal.json` の `due_date == null` 件数 |

#### 2-C: チャットまとめ取得

**実行条件**: 「chatwork-summary」が実行セクション集合に含まれる場合のみ。

chatwork-summary を「昨日のチャットまとめ」として呼び出す（1回のみ）。

### Step 3: 曜日別追加実行

**土曜日のみ**（バッチ3: 承認1回）:

fetch-calendar を参照し、来週月〜金の予定を1回の bash で並列取得する。

```bash
# 来週の日付計算は fetch-calendar SKILL.md の「来週の日付計算ロジック」を参照
# 5日 × 3カレンダー = 15並列

NEXT_MON=... # fetch-calendar のロジックで計算
for i in 0 1 2 3 4; do
  DATE=$(TZ=Asia/Tokyo date -v+${i}d -j -f "%Y-%m-%d" "$NEXT_MON" +%Y-%m-%d)
  curl -sL "${GAS_CALENDAR_KB_URL}?action=events&date=${DATE}" > "/tmp/mr_next_kb_${i}.json" &
  curl -sL "${GAS_CALENDAR_IYELL_URL}?action=events&date=${DATE}" > "/tmp/mr_next_iyell_${i}.json" &
  curl -sL "${GAS_CALENDAR_COREAL_URL}?action=events&date=${DATE}" > "/tmp/mr_next_coreal_${i}.json" &
done
wait

# 結果を出力して一時ファイル削除
for i in 0 1 2 3 4; do
  cat "/tmp/mr_next_kb_${i}.json" "/tmp/mr_next_iyell_${i}.json" "/tmp/mr_next_coreal_${i}.json"
  echo "---DAY_SEPARATOR---"
done
rm -f /tmp/mr_next_*.json
```

取得後:
1. fetch-calendar のマージ処理に従い、日別に統合
2. schedule-formatter で日別に整形（空き時間検出なし。設定は `.cursor/skills/morning-routine/config.md` の「カレンダー整形設定」を参照）
3. task-suggester で想定タスクを追加

**日曜・月曜のみ**:

| スキル | 呼び出し方 | 備考 |
|--------|-----------|------|
| task-due-fix | 期限未設定/期限切れタスクを表示し修正提案 | 週の始まりに整理 |
| weekly-report | 週報生成 | 前週の振り返り |

### Step 4: 統合出力

各データの出力を以下の形式で統合:

**フィルタ表示ルール**:
- フィルタまたは付加オプション使用時、日付の直下に引用ブロック1行で表示
- フィルタなし かつ 付加オプションなし（フル実行）の場合は表示しない
- 表示形式・スキル名表記は `config.md` の「フィルタ適用内容の表示」を参照

```markdown
# おはようございます！

**今日は {日付}（{曜日}）です**

<!-- フィルタまたは付加オプション使用時のみ表示（どちらもなしの場合は非表示） -->
> 実行: 予定, チャットまとめ

---

{今日の予定（schedule-formatter + task-suggester の出力）}

---

{chatwork-summary の出力}

---

{タスクリマインド（バッチ2 のデータから整形）}

---

<!-- 土曜のみ -->
{来週の予定（バッチ3 + schedule-formatter + task-suggester の出力）}

---

<!-- 日曜・月曜のみ -->
{task-due-fix の出力}

---

{weekly-report の出力}

---

<!-- 「返信案も」指定時のみ -->
{chat-reply の出力}

<!-- 期限切れ or 期限未設定がある場合のみ表示 -->
> ⚠️ 期限切れタスクが{N}件、期限未設定タスクが{M}件あります
```

**個人タスク通知**: バッチ2 で取得済みデータから算出。追加APIなし。

| 条件 | 表示 |
|------|------|
| 期限切れ > 0 かつ 期限未設定 > 0 | `> ⚠️ 期限切れタスクが{N}件、期限未設定タスクが{M}件あります` |
| 期限切れ > 0 のみ | `> ⚠️ 期限切れタスクが{N}件あります` |
| 期限未設定 > 0 のみ | `> ⚠️ 期限未設定タスクが{M}件あります` |
| 両方0件 | 表示なし |

**フィルタとの関係**: この通知はフィルタ対象外。ルーティンが実行される限り常に表示。

### Step 5: 返信案の提案

Step 4 の統合出力を表示した後、末尾に以下の質問を追加:

```
---
返信案も見ますか？（昨日の自分宛メッセージへの返信案を生成します）
```

| ユーザーの応答 | 動作 |
|---------------|------|
| 「はい」「見る」「お願い」「返信案」等の肯定 | chat-reply を「返信案」として実行し、結果を表示 |
| 「いいえ」「いらない」「大丈夫」等の否定 | 何もせず終了 |
| 無応答（別の話題に移行） | 何もせず終了 |

**フィルタとの関係**:
- 「おはよう 返信案も」→ フィルタで chat-reply がポジティブ指定された場合は Step 5 の質問をスキップし、統合出力内に返信案を含める
- 「おはよう 返信なし」→ ネガティブフィルタで chat-reply が除外された場合は Step 5 自体をスキップ
- フィルタ指定なし（デフォルト）→ Step 5 で質問する

## 再表示機能

### 仕組み

- 実行結果は**同一会話セッション内**で保持（AIの会話コンテキスト機能に依存）
- 「同日」判定: **JST基準**で日付が同じであること
- ファイルシステムへの保存は行わない（シンプルさ優先）

### フォールバック

| 状況 | 応答 |
|------|------|
| 同一セッション内で実行済み | 前回の出力を再表示 |
| 同一セッションだが日付が変わった | 「日付が変わりました。「おはよう」で新しいルーティンを実行できます。」 |
| 実行履歴なし | 「まだ今日のモーニングルーティンを実行していません。「おはよう」で実行できます。」 |
| 新規セッション | 「前回のセッション結果は保持されていません。「おはよう」で新しいルーティンを実行できます。」 |

## 統合出力ルール

- **区切り**: 各セクション間は `---` で区切る
- **長文対策**: 各スキル出力が50行超の場合、セクション先頭に `### 要約` ブロックを追加し、`<!-- details -->` コメントの後に全文を残す
- **エラー時**: 該当セクション内に「⚠️ {セクション名}の取得に失敗しました\n{エラーメッセージ}」と表示し、他セクションは継続
- **出力形式**: 各セクションはMarkdown形式（最上位見出しは `###` 固定）
- **見出し統一**: 各セクションの出力をそのまま連結（見出し変換なし）
- **日付基準**: すべての日付解釈は Asia/Tokyo（JST）基準

## 注意事項

- chatwork-summary は「昨日」を指定し、1回のみ実行する
- タスクリマインドは**自分のタスクのみ**取得（`_shared/config.md` の自分の assignee_user_id を使用）
- **タイムゾーン**: すべての日時処理は Asia/Tokyo（JST）基準
- フィルタ指定時は曜日別追加（土曜の来週予定、日月の task-due-fix/weekly-report）もフィルタ対象
- バッチ実行の具体的な bash コマンドパターンは `config.md` の「バッチ実行ルール」を参照
