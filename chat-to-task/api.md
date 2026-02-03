# Kuma Taskboard API ドキュメント

プロジェクトの取得、タスクの取得・登録・更新を行う REST API の仕様です。

## 概要

- **ベースURL**: `{アプリのURL}/api`（例: `https://example.com/api`）
- **認証**: すべてのエンドポイントで **Bearer トークン** が必須です。
- **レスポンス**: JSON。日付は ISO 8601 形式（`created_at` 等）または `Y-m-d`（`due_date` 等）。

## 認証

### トークンの取得

API 用のトークンは **管理者（Admin）のみ** アカウント設定画面から発行できます。

1. Web アプリに管理者でログインする。
2. **アカウント設定**（`/profile`）を開く。
3. 「API トークン」セクションでトークン名を入力し「トークンを発行」する。
4. 表示された **平文トークンを一度だけ** コピーして保存する（再表示は不可）。

### リクエストでの指定

すべての API リクエストに次のヘッダを付与してください。

```
Authorization: Bearer {発行したトークン}
Accept: application/json
```

トークンが無効・未指定の場合は `401 Unauthorized` が返ります。

---

## エンドポイント一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/projects` | プロジェクト一覧（参加・未アーカイブ） |
| GET | `/api/projects/{project}` | プロジェクト単体 |
| GET | `/api/projects/{project}/tasks` | タスク一覧（フィルタ・ページネーション対応） |
| POST | `/api/projects/{project}/tasks` | タスク登録（新規作成） |
| GET | `/api/tasks/{task}` | タスク単体 |
| PUT | `/api/tasks/{task}` | タスク更新 |

`{project}` はプロジェクトの **key**（例: `KB`）です。  
`{task}` はタスクの **数値 ID**（例: `1`）または **KEY-ID 形式**（例: `KB-1`）です。

---

## プロジェクト一覧

**GET** `/api/projects`

ログインユーザーが参加している、アーカイブされていないプロジェクトの一覧をページネーションで返します。

### クエリパラメータ

| 名前 | 型 | 説明 |
|------|-----|------|
| page | integer | ページ番号（省略時は 1）。1 ページあたり 50 件。 |

### レスポンス例（200 OK）

```json
{
  "data": [
    {
      "id": 1,
      "name": "サンプルプロジェクト",
      "key": "KB",
      "description": "説明文",
      "archived_at": null,
      "created_at": "2026-01-20T12:00:00.000000Z",
      "updated_at": "2026-01-20T12:00:00.000000Z",
      "creator": {
        "id": 1,
        "name": "Admin",
        "email": "admin@example.com"
      }
    }
  ],
  "links": {
    "first": "https://example.com/api/projects?page=1",
    "last": "https://example.com/api/projects?page=1",
    "prev": null,
    "next": null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 1,
    "path": "https://example.com/api/projects",
    "per_page": 50,
    "to": 1,
    "total": 1
  }
}
```

一覧では `statuses` / `categories` / `milestones` / `members` は含まれません。詳細は単体取得で取得してください。

---

## プロジェクト単体

**GET** `/api/projects/{project}`

指定したプロジェクトの詳細を返します。**参加者のみ**アクセス可能です。  
`{project}` はプロジェクトの **key**（例: `KB`）です。

### レスポンス例（200 OK）

```json
{
  "data": {
    "id": 1,
    "name": "サンプルプロジェクト",
    "key": "KB",
    "description": "説明文",
    "archived_at": null,
    "created_at": "2026-01-20T12:00:00.000000Z",
    "updated_at": "2026-01-20T12:00:00.000000Z",
    "creator": {
      "id": 1,
      "name": "Admin",
      "email": "admin@example.com"
    },
    "statuses": [
      { "id": 1, "name": "未着手", "sort_order": 1, "is_done": false },
      { "id": 2, "name": "進行中", "sort_order": 2, "is_done": false },
      { "id": 3, "name": "完了", "sort_order": 3, "is_done": true }
    ],
    "categories": [
      { "id": 1, "name": "カテゴリA", "sort_order": 1 }
    ],
    "milestones": [
      { "id": 1, "name": "マイルストン1", "due_date": "2026-03-01" }
    ],
    "members": [
      { "id": 1, "name": "Admin", "email": "admin@example.com", "project_role": "owner" }
    ]
  }
}
```

参加していないプロジェクトを指定した場合は **403 Forbidden** です。

---

## タスク登録

**POST** `/api/projects/{project}/tasks`

指定したプロジェクトにタスクを新規作成します。**参加者のみ**実行可能です。  
`{project}` はプロジェクトの **key**（例: `KB`）です。

### リクエストボディ（JSON）

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| title | string | ○ | タイトル（最大 255 文字） |
| description | string | - | 説明 |
| status_id | integer | ○ | ステータス ID（当該プロジェクトのステータス） |
| ticket_type_id | integer | - | チケット種別 ID（当該プロジェクトのチケット種別） |
| priority | string | - | 優先度（`高` / `中` / `低`。省略時は `中`） |
| assignee_user_id | integer | - | 担当者ユーザー ID（null で未割当） |
| due_date | string | - | 期限（`Y-m-d`、例: `2026-02-15`） |
| estimated_hours | number | - | 見積時間（0 以上） |
| actual_hours | number | - | 実績時間（0 以上） |
| category_id | integer | - | カテゴリ ID（当該プロジェクトのカテゴリ） |
| milestone_id | integer | - | マイルストン ID（当該プロジェクトのマイルストン） |

`status_id` / `category_id` / `milestone_id` / `ticket_type_id` は、**そのプロジェクトに属する ID** である必要があります。

### リクエスト例

```json
{
  "title": "新規タスクのタイトル",
  "description": "説明文",
  "status_id": 1,
  "ticket_type_id": 1,
  "priority": "中",
  "assignee_user_id": null,
  "due_date": "2026-02-20",
  "estimated_hours": 2,
  "actual_hours": null,
  "category_id": null,
  "milestone_id": null
}
```

### レスポンス（201 Created）

作成されたタスクをタスク単体と同じ形の `data` で返します。

```json
{
  "data": {
    "id": 2,
    "project_id": 1,
    "ticket_type_id": 1,
    "title": "新規タスクのタイトル",
    "description": "説明文",
    "status_id": 1,
    "priority": "中",
    "assignee_user_id": null,
    "due_date": "2026-02-20",
    "estimated_hours": 2,
    "actual_hours": null,
    "category_id": null,
    "milestone_id": null,
    "created_by": 1,
    "created_at": "2026-02-03T12:00:00.000000Z",
    "updated_at": "2026-02-03T12:00:00.000000Z",
    "status": { "id": 1, "name": "未着手", "is_done": false },
    "assignee": null,
    "category": null,
    "milestone": null,
    "ticket_type": { "id": 1, "name": "タスク" },
    "created_by_user": { "id": 1, "name": "Admin", "email": "admin@example.com" },
    "project": { "id": 1, "name": "サンプルプロジェクト", "key": "KB" }
  }
}
```

参加していないプロジェクトを指定した場合は **403 Forbidden**、バリデーションエラー時は **422 Unprocessable Entity** です。

---

## タスク一覧

**GET** `/api/projects/{project}/tasks`

指定したプロジェクトに属するタスクの一覧を返します。**参加者のみ**アクセス可能です。  
`{project}` はプロジェクトの **key** です。

### クエリパラメータ（いずれも任意）

| 名前 | 型 | 説明 |
|------|-----|------|
| page | integer | ページ番号（省略時は 1）。1 ページあたり 50 件。 |
| status_id | integer | ステータス ID でフィルタ |
| assignee_user_id | integer | 担当者（ユーザー ID）でフィルタ |
| category_id | integer | カテゴリ ID でフィルタ |
| milestone_id | integer | マイルストン ID でフィルタ |
| ticket_type_id | integer | チケット種別 ID でフィルタ |
| priority | string | 優先度でフィルタ（`高` / `中` / `低`） |
| due_date_filter | string | `overdue`（期限超過）または `due_soon`（期限が 3 日以内）でフィルタ |

### レスポンス例（200 OK）

```json
{
  "data": [
    {
      "id": 1,
      "project_id": 1,
      "ticket_type_id": 1,
      "title": "タスクのタイトル",
      "description": "説明",
      "status_id": 1,
      "priority": "中",
      "assignee_user_id": 1,
      "due_date": "2026-02-15",
      "estimated_hours": 2.5,
      "actual_hours": null,
      "category_id": null,
      "milestone_id": null,
      "created_by": 1,
      "created_at": "2026-01-20T12:00:00.000000Z",
      "updated_at": "2026-01-20T12:00:00.000000Z",
      "status": { "id": 1, "name": "未着手", "is_done": false },
      "assignee": { "id": 1, "name": "Admin", "email": "admin@example.com" },
      "category": null,
      "milestone": null,
      "ticket_type": { "id": 1, "name": "タスク" },
      "created_by_user": { "id": 1, "name": "Admin", "email": "admin@example.com" },
      "project": { "id": 1, "name": "サンプルプロジェクト", "key": "KB" }
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

---

## タスク単体

**GET** `/api/tasks/{task}`

指定したタスクの詳細を返します。**タスクが属するプロジェクトに参加しているユーザーのみ**アクセス可能です。  
`{task}` はタスクの **数値 ID**（例: `1`）または **KEY-ID 形式**（例: `KB-1`）です。

### レスポンス例（200 OK）

```json
{
  "data": {
    "id": 1,
    "project_id": 1,
    "ticket_type_id": 1,
    "title": "タスクのタイトル",
    "description": "説明",
    "status_id": 1,
    "priority": "中",
    "assignee_user_id": 1,
    "due_date": "2026-02-15",
    "estimated_hours": 2.5,
    "actual_hours": null,
    "category_id": null,
    "milestone_id": null,
    "created_by": 1,
    "created_at": "2026-01-20T12:00:00.000000Z",
    "updated_at": "2026-01-20T12:00:00.000000Z",
    "status": { "id": 1, "name": "未着手", "is_done": false },
    "assignee": { "id": 1, "name": "Admin", "email": "admin@example.com" },
    "category": null,
    "milestone": null,
    "ticket_type": { "id": 1, "name": "タスク" },
    "created_by_user": { "id": 1, "name": "Admin", "email": "admin@example.com" },
    "project": { "id": 1, "name": "サンプルプロジェクト", "key": "KB" }
  }
}
```

---

## タスク更新

**PUT** `/api/tasks/{task}`

指定したタスクの内容を更新します。**タスクが属するプロジェクトに参加しているユーザーのみ**実行可能です。  
`{task}` はタスクの **数値 ID** または **KEY-ID 形式** です。

**注意**: ファイル添付は API では扱いません。更新できるのは JSON のフィールドのみです。

### リクエストボディ（JSON）

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| title | string | ○ | タイトル（最大 255 文字） |
| description | string | - | 説明 |
| status_id | integer | ○ | ステータス ID（当該プロジェクトのステータス） |
| ticket_type_id | integer | - | チケット種別 ID（当該プロジェクトのチケット種別） |
| priority | string | - | 優先度（`高` / `中` / `低`） |
| assignee_user_id | integer | - | 担当者ユーザー ID（null で未割当） |
| due_date | string | - | 期限（`Y-m-d`、例: `2026-02-15`） |
| estimated_hours | number | - | 見積時間（0 以上） |
| actual_hours | number | - | 実績時間（0 以上） |
| category_id | integer | - | カテゴリ ID（当該プロジェクトのカテゴリ） |
| milestone_id | integer | - | マイルストン ID（当該プロジェクトのマイルストン） |

`status_id` / `category_id` / `milestone_id` / `ticket_type_id` は、**そのタスクのプロジェクトに属する ID** である必要があります。他プロジェクトの ID を指定すると **404** または **422** になります。

### リクエスト例

```json
{
  "title": "更新後のタイトル",
  "description": "更新後の説明",
  "status_id": 2,
  "ticket_type_id": 1,
  "priority": "高",
  "assignee_user_id": 1,
  "due_date": "2026-02-20",
  "estimated_hours": 3,
  "actual_hours": null,
  "category_id": null,
  "milestone_id": null
}
```

### レスポンス（200 OK）

更新後のタスクをタスク単体と同じ形の `data` で返します。

```json
{
  "data": {
    "id": 1,
    "project_id": 1,
    ...
  }
}
```

### バリデーションエラー（422 Unprocessable Entity）

```json
{
  "message": "The title field is required.",
  "errors": {
    "title": ["The title field is required."],
    "status_id": ["The selected status id is invalid."]
  }
}
```

---

## 共通エラーレスポンス

| ステータス | 説明 |
|------------|------|
| 401 Unauthorized | トークンが未指定・無効・期限切れ。`Authorization: Bearer` を確認してください。 |
| 403 Forbidden | 権限不足（例: 参加していないプロジェクトへのアクセス、他プロジェクトのタスク更新）。 |
| 404 Not Found | 指定したプロジェクト・タスクが存在しない、またはアクセス権がありません。 |
| 422 Unprocessable Entity | バリデーションエラー。`errors` にフィールド別のメッセージが入ります。 |

401 のレスポンス例（Laravel デフォルト）:

```json
{
  "message": "Unauthenticated."
}
```

---

## 補足

- **ページネーション**: 一覧系（プロジェクト一覧・タスク一覧）は Laravel の標準ページネーション形式で、`data` / `links` / `meta` を返します。`per_page` は 50 固定です。
- **日付**: `created_at` / `updated_at` は ISO 8601、`due_date` やマイルストンの `due_date` は `Y-m-d` です。
- **プロジェクトの key**: プロジェクト詳細・タスク一覧の URL では、プロジェクトを **key**（例: `KB`）で指定します。数値 ID では指定できません。
