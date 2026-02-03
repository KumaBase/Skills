---
name: chat-to-task
description: Extract tasks from various sources and register them in Kuma Taskboard. Use when the user says "タスク作って", "タスク化", "チャットからタスク", or provides a file/text to create tasks from.
---

# タスク作成スキル

チャット会話やテキストファイルからタスクを抽出し、Kuma Taskboardに登録する。

## 入力パターンの自動判定

「タスク作って」と一緒に何が送られたかで分岐する:

| ユーザーの入力 | パターン | Step 1 の動作 |
|----------------|----------|---------------|
| 「タスク作って」のみ | **A: チャット** | GAS APIからグループ一覧取得 |
| テキスト・ファイル・画面キャプチャ等を一緒に送った | **B: テキスト/ファイル** | 送られた内容を読み込む |

## ワークフロー

```
Task Progress:
- [ ] Step 1: 入力ソース取得
- [ ] Step 1.5: 不明情報の確認（必要な場合のみ）
- [ ] Step 2: テキスト解析 → タスク抽出・提案
- [ ] Step 3: ユーザー確認 + 担当者アサイン
- [ ] Step 4: Kuma Taskboard に登録
- [ ] Step 5: Chatwork で通知
```

---

## Step 1: 入力ソース取得

### パターン A: チャットから

GAS APIからLINE + Chatworkの全グループ一覧を取得し、ユーザーに選択させる。

```bash
curl -sL "${GAS_API_URL}?action=groups"
```

GAS APIのレスポンスには各グループの `groupName`、`lastMessagePreview`（直近メッセージのプレビュー）、`messageCount` が含まれる。
GAS側で Unknown Group の場合はシート内の過去データからグループ名を自動解決する。

**AskUserQuestion での表示形式**:
- グループ名が判明している場合: `[LINE] グループ名` / `[CW] グループ名`
- それでも Unknown Group の場合: `[LINE] 「{lastMessagePreview}」({messageCount}件)` を表示
  - 例: `[LINE] 「Master-L-style 全商品リスト...」(45件)`
- 最大4件まで選択肢に表示（超える場合はOtherで手入力）

選択後、直近メッセージを取得:

```bash
curl -sL "${GAS_API_URL}?action=messages&chatId={選択したchatId}&limit=30"
```

依頼元情報: `ソース=LINE or Chatwork`、`グループ名=APIから取得`

### パターン B: テキスト/ファイルから

ユーザーが「タスク作って」と一緒に送った内容を使う:
- **テキスト**: そのまま解析
- **ファイルパス**（.txt, .md 等）: Read ツールで読み込む
- **画面キャプチャ/スクリーンショット**: Read ツールで画像を読み取り、内容を解析

依頼元情報: `ソース=テキスト or ファイル`、`ファイル名=元のファイル名（あれば）`

---

## Step 1.5: 不明情報の確認

Step 1 で取得したデータに不明な情報がある場合、**タスク抽出の前に**ユーザーに確認する。

### グループ名が不明な場合
`groupName` が "Unknown Group" のグループが選択された場合:
- 直近メッセージの内容を提示し、AskUserQuestion で「このグループの名前は何ですか？」と聞く
- ユーザーの回答をグループ名として使用する

### ユーザー名が不明な場合
メッセージの `userName` が "Unknown" のユーザーがいる場合:
- そのユーザーの userId と発言内容を提示し、AskUserQuestion で「この人は誰ですか？」と聞く
- 複数の不明ユーザーがいる場合はまとめて聞く
- ユーザーの回答を名前マッピングに使用する（`config.md` にも追記して次回以降は自動解決）

### 既知のマッピング
`config.md` に LINE userId → 名前のマッピングがある場合はそちらを優先する。

---

## Step 2: タスクを抽出・提案

取得したテキストを読み、**1タスク = 1チケット** の形式でタスク候補を提案する:

```
--- チケット 1 ---
タイトル: {簡潔なタスク名}
依頼者:   {依頼した人の名前}
優先度:   {高 / 中 / 低}
タスク詳細:
  {文脈から要約した具体的な作業内容}
期日: {YYYY/MM/DD or 未定}

--- チケット 2 ---
タイトル: ...
...
```

抽出のポイント:
- 「お願いします」「やっておいて」「いつまでに」等の依頼表現を検出
- **依頼者**: テキスト中でタスクを依頼した人の名前（発言者から特定）
- **優先度**: 「急ぎ」「至急」→高、通常の依頼→中、「余裕あるとき」等→低
- **期日**: 「金曜まで」「来週」等の表現から日付に変換（不明なら「未定」）
- タスクが見つからない場合はその旨を伝える
- LINE userId → 名前マッピングは `config.md` を参照

---

## Step 3: ユーザー確認 + 担当者アサイン

提案内容を表示し、ユーザーに確認する。
- 「OK」→ 担当者確認へ
- 編集指示（「期限を変更して」「タスク追加して」等）→ 修正して再提示

**担当者の確認**:
チケットごとに AskUserQuestion で担当者を聞く:
- 選択肢は `config.md` のメンバー一覧から生成
- 事前にプロジェクト詳細を取得してメンバーID を確認しておく

```bash
curl -s "${KUMA_TASKBOARD_URL}/api/projects/${KUMA_TASKBOARD_PROJECT_KEY}" \
  -H "Authorization: Bearer ${KUMA_TASKBOARD_TOKEN}" \
  -H "Accept: application/json"
```

---

## Step 4: Kuma Taskboard に登録

タスク作成APIを呼び出す。**description は Markdown 形式**で記述する。

```bash
curl -s -X POST "${KUMA_TASKBOARD_URL}/api/projects/${KUMA_TASKBOARD_PROJECT_KEY}/tasks" \
  -H "Authorization: Bearer ${KUMA_TASKBOARD_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "title": "チケットのタイトル",
    "description": "## 依頼元\n- **ソース**: LINE / Chatwork / ファイル\n- **グループ**: {グループ名 or ファイル名}\n- **依頼者**: {名前}\n\n## タスク詳細\n{具体的な作業内容}",
    "status_id": 1,
    "priority": "中",
    "assignee_user_id": null,
    "due_date": "2026-02-10"
  }'
```

登録完了後、サマリを表示:
```
Kuma Taskboard に{N}件のチケットを登録しました。
- {KEY}-{ID}: {タイトル}（担当: {名前}、期日: {日付 or 未定}）
- ...
```

---

## Step 5: Chatwork で通知

タスク登録完了後、Chatwork で通知する。
通知ルールは `config.md` の「Chatwork 通知ルール」に従う。

```bash
curl -s -X POST "https://api.chatwork.com/v2/rooms/{ROOM_ID}/messages" \
  -H "X-ChatWorkToken: ${CHATWORK_API_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "body={メンション（必要な場合）}
AIからの通知ですー🐈‍⬛

{ソース}の{グループ名 or ファイル名}から{N}件のタスクを登録しました。

[info][title]{KEY}-{ID}: {タイトル}[/title]担当: {担当者名}
依頼元: {ソース} {グループ名 or ファイル名}
{KUMA_TASKBOARD_URL}/tasks/{KEY}-{ID}[/info]"
```

---

## 環境変数

スキル実行に必要な環境変数（`.env` に設定）:

| 変数 | 用途 | 聞き方の例 |
|------|------|-----------|
| `GAS_API_URL` | GAS読み取りAPIのデプロイURL | 「GASのデプロイURLを教えてください」 |
| `KUMA_TASKBOARD_URL` | Kuma Taskboard のベースURL | 「Kuma TaskboardのURLを教えてください」 |
| `KUMA_TASKBOARD_TOKEN` | Kuma Taskboard のAPIトークン | 「Kuma TaskboardのAPIトークンを教えてください（プロフィール画面で発行できます）」 |
| `KUMA_TASKBOARD_PROJECT_KEY` | デフォルトプロジェクトキー（例: `KBD`） | 「登録先のプロジェクトキーを教えてください」 |
| `CHATWORK_API_TOKEN` | Chatwork API トークン（通知用） | 「ChatworkのAPIトークンを教えてください」 |

### 初回セットアップ（.env が存在しない場合）

スキル実行時に `.env` ファイルが存在しない場合、**自動的にセットアップを開始する**:

1. `.env` ファイルの存在を確認する
2. 存在しない場合、ユーザーに以下を順番に AskUserQuestion で聞く:
   - GAS API の デプロイURL
   - Kuma Taskboard の URL
   - Kuma Taskboard の API トークン
   - プロジェクトキー
   - Chatwork API トークン
3. 回答をもとに `.env` ファイルを生成する
4. `.gitignore` に `.env` が含まれていなければ追加する
5. セットアップ完了後、通常のスキルフローに進む

```
# .env テンプレート
GAS_API_URL=
KUMA_TASKBOARD_URL=
KUMA_TASKBOARD_TOKEN=
KUMA_TASKBOARD_PROJECT_KEY=
CHATWORK_API_TOKEN=
```

## 設定ファイル

スキル固有の設定は同ディレクトリの `config.md` に記載する:
- メンバーマッピング（担当者名 → user_id）
- LINE userId → 名前マッピング
- Chatwork 通知ルール（送信先、メンション条件）

**スキルを他の人に渡す場合**: `config.md` を各自の環境に合わせて編集する。

## 前提条件

- GASに `doGet` 関数が実装済み（`action=groups` / `action=messages`）
- Kuma Taskboard に `POST /api/projects/{project}/tasks` が実装済み
- 初回実行時に `.env` のセットアップが自動で行われる
- `config.md` がスキルディレクトリに配置済み
