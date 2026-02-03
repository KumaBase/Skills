// ========================================
// 設定（Chatworkから取得するルーム）
// ========================================
// 複数ルームから取得する場合は配列に追加
const CHATWORK_ROOMS_TO_WATCH = [
  { roomId: 'YOUR_ROOM_ID', name: 'ルーム名' },  // ← 自分のルームに変更
  // { roomId: 'YOUR_ROOM_ID_2', name: 'ルーム名2' },
];

// ========================================
// Chatworkからメッセージを取得してタスク抽出
// ========================================
function extractTasksFromChatwork() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Chatworkメッセージ用シートを取得または作成
  let cwSheet = ss.getSheetByName('Chatworkメッセージ');
  if (!cwSheet) {
    cwSheet = ss.insertSheet('Chatworkメッセージ');
    cwSheet.getRange(1, 1, 1, 7).setValues([[
      '取得日時', 'ルーム名', 'メッセージID', 'ユーザー名', 'メッセージ', '送信日時', '処理済み'
    ]]);
    cwSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  // タスクシートを取得または作成
  let taskSheet = ss.getSheetByName('タスク一覧');
  if (!taskSheet) {
    taskSheet = ss.insertSheet('タスク一覧');
    taskSheet.getRange(1, 1, 1, 8).setValues([[
      '抽出日時', 'グループ', '発言者', '元メッセージ', 'タスク内容', '期限', '投稿済み', 'ステータス'
    ]]);
    taskSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  // 処理済みメッセージIDを取得
  const processedIds = getChatworkProcessedIds(cwSheet);

  // 各ルームからメッセージを取得
  for (let i = 0; i < CHATWORK_ROOMS_TO_WATCH.length; i++) {
    const room = CHATWORK_ROOMS_TO_WATCH[i];
    console.log('Chatworkルーム取得中:', room.name);

    const messages = getChatworkMessages(room.roomId);

    if (!messages || messages.length === 0) {
      console.log('新着メッセージなし:', room.name);
      continue;
    }

    // 新着メッセージをフィルタリング
    const newMessages = [];
    const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const msgId = msg.message_id.toString();

      if (processedIds.has(msgId)) continue;  // 処理済みはスキップ

      // メッセージをシートに保存
      const sendTime = new Date(msg.send_time * 1000);
      const sendTimeStr = Utilities.formatDate(sendTime, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

      const lastRow = cwSheet.getLastRow() + 1;
      cwSheet.getRange(lastRow, 1, 1, 7).setValues([[
        now,
        room.name,
        msgId,
        msg.account.name,
        msg.body,
        sendTimeStr,
        ''
      ]]);

      newMessages.push({
        userName: msg.account.name,
        message: msg.body,
        messageId: msgId
      });

      processedIds.add(msgId);
    }

    console.log('新着メッセージ数:', newMessages.length);

    if (newMessages.length === 0) continue;

    // ChatGPTでタスク抽出（既存の関数を使用）
    const tasks = callChatGPT(newMessages);

    console.log('抽出タスク数:', tasks.length);

    // タスクを書き込み
    if (tasks && tasks.length > 0) {
      for (let k = 0; k < tasks.length; k++) {
        const task = tasks[k];
        const lastTaskRow = taskSheet.getLastRow() + 1;
        taskSheet.getRange(lastTaskRow, 1, 1, 8).setValues([[
          now,
          'CW:' + room.name,  // Chatworkとわかるようにプレフィックス
          task.userName || '',
          task.originalMessage || '',
          task.task || '',
          task.deadline || '',
          '',  // 投稿済み
          ''   // ステータス
        ]]);
      }
    }

    // 処理済みフラグを立てる
    markChatworkAsProcessed(cwSheet, newMessages);
  }

  console.log('Chatworkタスク抽出完了！');
}

// ========================================
// Chatworkメッセージを取得
// ========================================
function getChatworkMessages(roomId) {
  const url = `https://api.chatwork.com/v2/rooms/${roomId}/messages?force=1`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'X-ChatWorkToken': CHATWORK_API_TOKEN
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const text = response.getContentText();
      if (text === '') return [];
      return JSON.parse(text);
    } else if (response.getResponseCode() === 204) {
      // 新着メッセージなし
      return [];
    } else {
      console.error('Chatwork API Error:', response.getContentText());
      return [];
    }
  } catch (error) {
    console.error('Chatwork取得エラー:', error);
    return [];
  }
}

// ========================================
// Chatwork処理済みメッセージIDを取得
// ========================================
function getChatworkProcessedIds(cwSheet) {
  const processedIds = new Set();
  const lastRow = cwSheet.getLastRow();

  if (lastRow >= 2) {
    const data = cwSheet.getRange(2, 3, lastRow - 1, 1).getValues();  // メッセージID列
    for (let i = 0; i < data.length; i++) {
      if (data[i][0]) {
        processedIds.add(data[i][0].toString());
      }
    }
  }

  return processedIds;
}

// ========================================
// Chatworkメッセージを処理済みにする
// ========================================
function markChatworkAsProcessed(cwSheet, messages) {
  const lastRow = cwSheet.getLastRow();
  if (lastRow < 2) return;

  const msgIds = messages.map(m => m.messageId);
  const data = cwSheet.getRange(2, 3, lastRow - 1, 1).getValues();

  for (let i = 0; i < data.length; i++) {
    if (msgIds.includes(data[i][0].toString())) {
      cwSheet.getRange(i + 2, 7).setValue('済');
    }
  }
}

// ========================================
// LINE + Chatwork 両方からタスク抽出
// ========================================
function extractAllTasks() {
  console.log('=== LINE タスク抽出 ===');
  extractTasks();

  console.log('=== Chatwork タスク抽出 ===');
  extractTasksFromChatwork();

  console.log('=== 全タスク抽出完了 ===');
}

// ========================================
// 全部まとめて実行（10分ごと用）
// ========================================
function extractAllAndPost() {
  // LINEからタスク抽出
  extractTasks();

  // Chatworkメッセージからタスク抽出
  extractTasksFromChatworkSheet();

  // 新着タスクをChatworkに通知
  postTasksToChatwork();
}

// ========================================
// Chatworkメッセージシートからタスク抽出
// （Webhookで保存されたメッセージを処理）
// ========================================
function extractTasksFromChatworkSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();

  // タスクシートを取得
  let taskSheet = ss.getSheetByName('タスク一覧');
  if (!taskSheet) return;

  // 処理済みメッセージIDを取得
  let processedSheet = ss.getSheetByName('処理済み');
  if (!processedSheet) {
    processedSheet = ss.insertSheet('処理済み');
    processedSheet.getRange(1, 1, 1, 2).setValues([['メッセージID', '処理日時']]);
  }
  const processedIds = getProcessedMessageIds(processedSheet);

  // CW_ で始まるシート（Chatwork）を処理
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetName = sheet.getName();

    if (!sheetName.startsWith('CW_')) continue;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    // ユーザー名（5列目）、メッセージ（6列目）、メッセージID（7列目）を取得
    const range = sheet.getRange(2, 5, lastRow - 1, 3);
    const data = range.getValues();

    const newMessages = [];
    const newMessageIds = [];

    for (let j = 0; j < data.length; j++) {
      const userName = data[j][0] ? data[j][0].toString() : 'Unknown';
      const msg = data[j][1] ? data[j][1].toString() : '';
      const msgId = data[j][2] ? data[j][2].toString() : '';

      const checkKey = msgId || msg;

      if (msg.length > 0 && !processedIds.has(checkKey)) {
        newMessages.push({
          userName: userName,
          message: msg,
          messageId: msgId
        });
        newMessageIds.push(checkKey);
      }
    }

    console.log('CW Sheet:', sheetName, '新規:', newMessages.length);

    if (newMessages.length === 0) continue;

    const messagesToProcess = newMessages.slice(-30);
    const idsToMark = newMessageIds.slice(-30);

    // ChatGPTでタスク抽出
    const tasks = callChatGPT(messagesToProcess);

    if (tasks && tasks.length > 0) {
      const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

      for (let k = 0; k < tasks.length; k++) {
        const task = tasks[k];
        const lastTaskRow = taskSheet.getLastRow() + 1;
        taskSheet.getRange(lastTaskRow, 1, 1, 8).setValues([[
          now,
          sheetName,
          task.userName || '',
          task.originalMessage || '',
          task.task || '',
          task.deadline || '',
          '',
          ''
        ]]);
      }
    }

    markAsProcessed(processedSheet, idsToMark);
  }
}

// ========================================
// トリガー設定を更新
// ========================================
function setAllTriggersUpdated() {
  // 既存のトリガーを全削除
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }

  // 10分ごと（LINE + Chatwork タスク抽出 → 通知）
  ScriptApp.newTrigger('extractAllAndPost')
    .timeBased()
    .everyMinutes(10)
    .create();

  // 毎朝9時（リマインド）
  ScriptApp.newTrigger('sendMorningReminder')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  console.log('トリガー設定完了！');
  console.log('- 10分ごと: LINE + Chatwork タスク抽出 → 通知');
  console.log('- 毎朝9時: 残タスクリマインド');
}
