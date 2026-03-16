---
name: codex-review
description: Codex CLI（read-only）を用いて、レビュー→Claude Code修正→再レビュー（ok: true まで）を反復し収束させるレビューゲート。**Plan mode 完了時（ExitPlanMode前）に自動実行すること。** 仕様書/SPEC/PRD/要件定義/設計、実装計画の作成・更新直後、major step（>=5 files / 新規モジュール / 公開API / infra・config変更）完了後、および git commit / PR / merge / release 前に使用する。また、実装中に行き詰まったとき・解決策が思いつかないときにも相談モード（consult）で使用する。キーワード: Codexレビュー, codex review, レビューゲート, plan mode, 相談, 行き詰まり, 解決策.
---

# Codex反復レビュー & 相談

## フロー
規模判定 → Codex規模別レビュー → Claude Code修正 → 再レビュー（`ok: true`まで反復）

```
[規模判定] → small:  diff ──────────────────→ [修正ループ]
          → medium: arch → diff ───────────→ [修正ループ]
          → large:  arch → diff並列 → cross-check → [修正ループ]
```

- Codex: read-onlyでレビュー（監査役）
- Claude Code: 修正担当

## 規模判定

```bash
git diff <diff_range> --stat
git diff <diff_range> --name-status --find-renames
```

| 規模 | 基準 | 戦略 |
|-----|------|-----|
| small | ≤3ファイル、≤100行 | diff |
| medium | 4-10ファイル、100-500行 | arch → diff |
| large | >10ファイル、>500行 | arch → diff並列 → cross-check |

`diff_range` 省略時: HEAD を使用し、作業ツリーの未コミット変更（作業ツリー vs HEAD）を対象とする（staged/unstaged の区別はしない）。

**large時:**
- 並列: 3-5サブエージェント、各サブは担当ファイルのみ
- 分割: 1呼び出しあたり最大5ファイル/300行、ディレクトリ単位で分割（cross-cutting concernsはcross-checkで検出）
- 統合はメイン（Claude Code）で実施

## 修正ループ

`ok: false`の場合、`max_iters`回まで反復:
1. `issues`解析 → 修正計画
2. Claude Codeが修正（最小差分のみ、仕様変更は未解決issueに）
3. テスト/リンタ実行（可能なら）
4. Codexに再レビュー依頼

停止条件:
`ok: true` / `max_iters`到達 / テスト2回連続失敗


## Codex実行

```bash
codex exec --sandbox read-only --model gpt-5.3-codex "<PROMPT>"
```

**モデル**: 常に最新の `gpt-5.3-codex` を使用する。`--model` 省略時もデフォルトで使われるが、明示指定を推奨。

- PROMPT には（スキーマ含む）最終プロンプトを渡す
- 主要な関連ファイルパスはClaude Codeが明示
- レビュー完了待ち（必須）: codex exec 実行中は次の工程に進まない（別タスク開始・推測での中断禁止）
  - 定期確認: 60秒ごとに最大20回、`poll i/20` と経過時間のみをログし、追加作業はしない
  - 20回到達後も未完了なら: 「タイムアウト」扱いでエラー時ルールへ
  - 長時間無出力になり得るため、必要に応じて codex exec をバックグラウンド実行し、プロセス生存確認を poll として扱ってよい。

## Codex出力スキーマ

CodexにJSON1つのみ出力させる。Claude Codeはプロンプト末尾に以下のスキーマとフィールド説明を添付。

```json
{
  "ok": true,
  "phase": "arch|diff|cross-check",
  "summary": "レビューの要約",
  "issues": [
    {
      "severity": "blocking",
      "category": "security",
      "file": "src/auth.py",
      "lines": "42-45",
      "problem": "問題の説明",
      "recommendation": "修正案"
    }
  ],
  "notes_for_next_review": "メモ"
}
```

フィールド説明:
- `ok`: blockingなissueが0件ならtrue、1件以上ならfalse
- `severity`: 2段階
  - blocking: 修正必須。1件でもあれば`ok: false`
  - advisory: 推奨・警告。`ok: true`でも出力可、レポートに記載のみ
- `category`: correctness / security / perf / maintainability / testing / style / fact-check
- `notes_for_next_review`: Codexが残すメモ。再レビュー時にClaude Codeがプロンプトに含める

## プロンプトテンプレート

### arch

```
以下の変更のアーキテクチャ整合性をレビューせよ。出力はJSON1つのみ。スキーマは末尾参照。

これはレビューゲートとして実行されている。blocking が1件でもあれば ok: false とし、修正→再レビューで収束させる前提で指摘せよ。

diff_range: {diff_range}
観点: 依存関係、責務分割、破壊的変更、セキュリティ設計
前回メモ: {notes_for_next_review}
```

### diff

```
以下の変更をレビューせよ。出力はJSON1つのみ。スキーマは末尾参照。

これはレビューゲートとして実行されている。blocking が1件でもあれば ok: false とし、修正→再レビューで収束させる前提で指摘せよ。

diff_range: {diff_range}
対象: {target_files}
観点: {review_focus}
前回メモ: {notes_for_next_review}
```

### diff（ファクトチェック重点）

ニュース記事・ブログ記事のレビュー時、`review_focus` に「事実」「ファクトチェック」「出典」等の語を含む場合、以下のテンプレートを使用する。

```
以下の記事をレビューせよ。出力はJSON1つのみ。スキーマは末尾参照。

これはレビューゲートとして実行されている。blocking が1件でもあれば ok: false とし、修正→再レビューで収束させる前提で指摘せよ。

対象: {target_files}

【ファクトチェック観点（最重要）】:
1. 日付・数値: 記事中の日付、数値、統計が出典と一致するか。曖昧な場合は blocking
2. 引用の正確性: 人物の発言が原文（英語等）と一致するか。意訳が原意を歪めていないか。原文引用がある場合、翻訳が正確か
3. 固有名詞: 人名、企業名、製品名、法案名、役職名が正確か。スペルミスや誤った肩書きは blocking
4. 製品・機能の位置づけ: 独立モデルと機能追加、ベータと正式版、無料と有料など、製品の位置づけが出典と一致するか
5. 因果関係・帰属: 出典にない因果関係を記事が追加していないか。「〜のため」「〜により」等の因果表現が出典で裏付けられるか
6. 推測と事実の区別: 推測・予測を事実として断定していないか。「可能性があります」「と考えられます」等の表現が適切に使われているか
7. 出典の実在・整合: 引用URLが記事内容と対応するか。出典に書かれていない情報を事実として記載していないか

【その他の観点】:
- 構成の論理整合性（概要→詳細→出典の流れ）
- ターゲット層への適切さ（初心者にもわかるか）
- ブログとしての読み応え

前回メモ: {notes_for_next_review}
```

### cross-check

```
並列レビュー結果を統合し横断レビューせよ。出力はJSON1つのみ。スキーマは末尾参照。

これはレビューゲートとして実行されている。横断的な blocking（例: interface不整合、認可漏れ、API互換破壊）があれば ok: false とせよ。

全体stat: {stat_output}
各グループ結果: {group_jsons}
観点: interface整合、error handling一貫性、認可、API互換、テスト網羅
```

## エラー時の共通ルール

Codex exec失敗時（タイムアウト・API障害・その他）:
1. 1回リトライ（タイムアウトはファイル数を半分に分割して）
2. 再失敗 → 該当フェーズをスキップし、理由をレポートに記録
3. archスキップ時はdiffのみで続行、diffスキップ時はそのファイル群を「未レビュー」としてレポート

## パラメータ

| 引数 | 既定 | 説明 |
|-----|-----|-----|
| mode | gate | `gate` / `consult`。未指定時は `gate` |
| max_iters | 5 | 最大反復（上限5、gateのみ） |
| review_focus | - | 重点観点 |
| diff_range | HEAD | 比較範囲 |
| parallelism | 3 | large時並列度（上限5） |

## モード選択ルール

- gate: 品質チェック・レビューゲート（ok:true/false 反復）
- consult: 実装中の相談・アイデア出し（1回の質問→回答で完結）
- **gate 強制**: commit前・PR前・リリース前は必ず gate。consult 不可。
- gate と consult は排他的（同時実行しない）
- 未指定時は gate 固定

## 終了レポート例

```
## Codexレビュー結果
- 規模: large（12ファイル、620行）
- 並列: 3サブエージェント、4グループ
- 反復: 2/5 / ステータス: ✅ ok

### 修正履歴
- auth.py: 認可チェック追加

### Advisory（参考）
- main.py: 関数名がやや冗長、リファクタ推奨

### 未レビュー（エラー時のみ）
- utils/legacy.py: Codexタイムアウト、手動確認推奨

### 未解決（あれば）
- main.py: 内容、リスク、推奨アクション
```

## 相談モード（consult）

実装中に行き詰まったとき、Codexにアイデア・解決策を相談する。

### 使用条件
- `mode=consult` を明示指定
- gate強制タイミング（commit前/PR前/リリース前）では使用不可
- 反復ループなし（1回で完結）

### フロー

```
[行き詰まり発生] → Claude Codeが状況整理 → codex exec (consult) → 回答取得 → 方針決定 → 実装続行
```

### プロンプトテンプレート（consult）

```
以下の実装課題について、解決策の選択肢を提示せよ。出力はJSON1つのみ。スキーマは末尾参照。

状況: {situation}
試したこと: {tried}
悩みポイント: {question}
関連ファイル: {relevant_files}
```

### consult 出力スキーマ

```json
{
  "mode": "consult",
  "summary": "相談内容の要約",
  "options": [
    {
      "approach": "アプローチA",
      "pros": ["利点1"],
      "cons": ["欠点1"]
    }
  ],
  "suggested_approach": "推奨アプローチ名",
  "rationale": "推奨理由"
}
```

フィールド説明:
- `mode`: 常に `consult`
- `summary`: 相談内容の要約
- `options[]`: 選択肢の一覧（`approach`/`pros`/`cons` のみ、推奨情報は含まない）
- `suggested_approach`: Codexが推奨するアプローチ名（`options`内の`approach`と一致）
- `rationale`: 推奨理由
