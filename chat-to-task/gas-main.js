// ========================================
// 設定
// ========================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // ← 自分のスプレッドシートIDに変更

// ========================================
// doGet を読み取りAPI対応に拡張
// 既存の書き込み処理はそのまま残す
// ========================================
// 【変更方法】既存の doGet を以下に置き換える

function doGet(e) {
  try {
    const params = e.parameter;

    // --- 読み取りAPI（action パラメータがある場合） ---
    if (params.action) {
      return handleReadAPI(params);
    }

    // --- 既存の書き込み処理（従来どおり） ---
    if (!params.chatId) {
      return ContentService.createTextOutput('GAS is working!');
    }

    writeToSpreadsheet(
      params.chatId,
      params.chatType,
      params.groupName,
      params.userId,
      params.userName,
      params.message,
      params.timestamp,
      params.messageId
    );

    return ContentService.createTextOutput('OK');
  } catch (error) {
    console.error('Error:', error);
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// 読み取りAPI ハンドラ
// ========================================
function handleReadAPI(params) {
  const action = params.action;
  let result;

  switch (action) {
    case 'groups':
      result = getGroups(params.source);
      break;
    case 'messages':
      result = getMessages(params.chatId, parseInt(params.limit) || 30);
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// グループ一覧を取得
// source: 'line' | 'chatwork' | 省略で全件
// ========================================
function getGroups(source) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const skipSheets = new Set(['タスク一覧', '処理済み', 'Chatworkメッセージ']);
  const groups = [];

  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var sheetName = sheet.getName();

    if (skipSheets.has(sheetName)) continue;

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    // source フィルタ
    var isChatwork = sheetName.startsWith('CW_');
    if (source === 'line' && isChatwork) continue;
    if (source === 'chatwork' && !isChatwork) continue;

    // 1行目はヘッダーなので2行目から。B列=グループ名, F列=メッセージ, H列=チャットID
    // 最新行からグループ名とチャットIDを取得
    var lastRowData = sheet.getRange(lastRow, 1, 1, 8).getValues()[0];
    var groupName = lastRowData[1] || sheetName;
    var chatId = lastRowData[7] || sheetName;
    var lastMessage = lastRowData[0] || '';
    var lastMessageText = (lastRowData[5] || '').toString().trim();

    // Unknown Group の場合、シート内の全行からグループ名を探す
    if (groupName === 'Unknown Group' || groupName === 'Unknown') {
      var allGroupNames = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
      for (var r = allGroupNames.length - 1; r >= 0; r--) {
        var name = (allGroupNames[r][0] || '').toString().trim();
        if (name && name !== 'Unknown Group' && name !== 'Unknown') {
          groupName = name;
          break;
        }
      }
    }

    // 直近メッセージのプレビュー（最大50文字）
    var lastMessagePreview = lastMessageText.length > 50
      ? lastMessageText.substring(0, 50) + '...'
      : lastMessageText;

    groups.push({
      chatId: chatId,
      groupName: groupName,
      source: isChatwork ? 'chatwork' : 'line',
      sheetName: sheetName,
      lastMessage: lastMessage,
      lastMessagePreview: lastMessagePreview,
      messageCount: lastRow - 1
    });
  }

  // 最終メッセージ日時で降順ソート
  groups.sort(function(a, b) {
    return (b.lastMessage || '') > (a.lastMessage || '') ? 1 : -1;
  });

  return { groups: groups };
}

// ========================================
// 指定グループのメッセージを取得
// chatId: チャットID（またはシート名の先頭15文字でも可）
// limit: 取得件数（デフォルト30）
// ========================================
function getMessages(chatId, limit) {
  if (!chatId) {
    return { error: 'chatId is required' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // chatId の先頭15文字でシートを探す（書き込み時と同じロジック）
  var sheetName = chatId.substring(0, 15);
  var sheet = ss.getSheetByName(sheetName);

  // 見つからない場合、シート名と完全一致も試す
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      // H列（チャットID）が一致するシートを探す
      var s = sheets[i];
      if (s.getLastRow() < 2) continue;
      var firstChatId = s.getRange(2, 8).getValue();
      if (firstChatId && firstChatId.toString() === chatId) {
        sheet = s;
        break;
      }
    }
  }

  if (!sheet) {
    return { error: 'Group not found: ' + chatId };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { messages: [], groupName: '', chatId: chatId };
  }

  // 直近 limit 件を取得（新しい順）
  var startRow = Math.max(2, lastRow - limit + 1);
  var numRows = lastRow - startRow + 1;
  var data = sheet.getRange(startRow, 1, numRows, 8).getValues();

  var messages = [];
  for (var j = 0; j < data.length; j++) {
    var row = data[j];
    // テキストメッセージのみ（[画像] [スタンプ] 等は含めるが空は除外）
    if (!row[5] || row[5].toString().trim() === '') continue;

    messages.push({
      timestamp: row[0],
      userName: row[4] || 'Unknown',
      message: row[5],
      userId: row[3] || '',
      messageId: row[6] || ''
    });
  }

  // グループ名は最新行から取得
  var groupName = data[data.length - 1][1] || sheetName;

  return {
    messages: messages,
    groupName: groupName,
    chatId: chatId,
    total: lastRow - 1
  };
}

// ========================================
// スプレッドシートへの書き込み
// ========================================
function writeToSpreadsheet(chatId, chatType, groupName, userId, userName, message, timestamp, messageId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // シート名（グループIDの先頭15文字）
  const sheetName = chatId ? chatId.substring(0, 15) : 'unknown';
  let sheet = ss.getSheetByName(sheetName);

  // シートがなければ作成
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, 8).setValues([[
      '日時', 'グループ名', 'タイプ', 'ユーザーID', 'ユーザー名', 'メッセージ', 'メッセージID', 'チャットID'
    ]]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  // データを追加
  const lastRow = sheet.getLastRow() + 1;
  const date = timestamp ? new Date(parseInt(timestamp)) : new Date();

  sheet.getRange(lastRow, 1, 1, 8).setValues([[
    Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
    groupName || '',
    chatType || '',
    userId || '',
    userName || '',
    message || '',
    messageId || '',
    chatId || ''
  ]]);
}


// ========================================
// 設定（ChatGPT API）
// ========================================
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';  // ← 自分のAPIキーに変更

// ========================================
// タスク抽出を実行
// ========================================
function extractTasks() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();

  // タスクシートを取得または作成
  let taskSheet = ss.getSheetByName('タスク一覧');
  if (!taskSheet) {
    taskSheet = ss.insertSheet('タスク一覧');
    taskSheet.getRange(1, 1, 1, 6).setValues([[
      '抽出日時', 'グループ', '発言者', '元メッセージ', 'タスク内容', '期限'
    ]]);
    taskSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  // 処理済みシートを取得または作成（処理済みメッセージIDを記録）
  let processedSheet = ss.getSheetByName('処理済み');
  if (!processedSheet) {
    processedSheet = ss.insertSheet('処理済み');
    processedSheet.getRange(1, 1, 1, 2).setValues([['メッセージID', '処理日時']]);
  }

  // 処理済みメッセージIDを取得
  const processedIds = getProcessedMessageIds(processedSheet);
  console.log('処理済みメッセージ数:', processedIds.size);

  // 各シートのメッセージを処理
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetName = sheet.getName();

    if (sheetName === 'タスク一覧' || sheetName === '処理済み') continue;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    // ユーザー名（5列目）、メッセージ（6列目）、メッセージID（7列目）を取得
    const range = sheet.getRange(2, 5, lastRow - 1, 3);
    const data = range.getValues();

    // 未処理のメッセージのみ抽出
    const newMessages = [];
    const newMessageIds = [];

    for (let j = 0; j < data.length; j++) {
      const userName = data[j][0] ? data[j][0].toString() : 'Unknown';
      const msg = data[j][1] ? data[j][1].toString() : '';
      const msgId = data[j][2] ? data[j][2].toString() : '';

      // メッセージIDで重複チェック（IDがない場合はメッセージ本文でチェック）
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

    console.log('Sheet:', sheetName, '新規メッセージ:', newMessages.length);

    if (newMessages.length === 0) continue;

    // 最新30件に制限（API負荷軽減）
    const messagesToProcess = newMessages.slice(-30);
    const idsToMark = newMessageIds.slice(-30);

    // ChatGPTでタスク抽出
    const tasks = callChatGPT(messagesToProcess);

    console.log('抽出タスク数:', tasks.length);

    // タスクを書き込み
    if (tasks && tasks.length > 0) {
      const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

      for (let k = 0; k < tasks.length; k++) {
        const task = tasks[k];
        const lastTaskRow = taskSheet.getLastRow() + 1;
        taskSheet.getRange(lastTaskRow, 1, 1, 6).setValues([[
          now,
          sheetName,
          task.userName || '',
          task.originalMessage || '',
          task.task || '',
          task.deadline || ''
        ]]);
      }
    }

    // 処理済みとして記録
    markAsProcessed(processedSheet, idsToMark);
  }

  console.log('タスク抽出完了！');
}

// ========================================
// 処理済みメッセージIDを取得
// ========================================
function getProcessedMessageIds(processedSheet) {
  const processedIds = new Set();
  const lastRow = processedSheet.getLastRow();

  if (lastRow >= 2) {
    const data = processedSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0]) {
        processedIds.add(data[i][0].toString());
      }
    }
  }

  return processedIds;
}

// ========================================
// 処理済みとして記録
// ========================================
function markAsProcessed(processedSheet, messageIds) {
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  for (let i = 0; i < messageIds.length; i++) {
    const lastRow = processedSheet.getLastRow() + 1;
    processedSheet.getRange(lastRow, 1, 1, 2).setValues([[
      messageIds[i],
      now
    ]]);
  }
}

// ========================================
// ChatGPT API呼び出し
// ========================================
function callChatGPT(messagesData) {
  const messagesText = messagesData.map(m => `[${m.userName}]: ${m.message}`).join('\n---\n');

  const prompt = `以下はLINEグループのメッセージです。
タスク（やるべきこと、依頼、予定、お願い事など）を抽出してください。

メッセージ:
${messagesText}

JSON形式で回答（タスクがなければ空配列[]）:
[{"userName":"発言者名","originalMessage":"元メッセージ","task":"タスク内容","deadline":"期限（なければ空）"}]

JSONのみ出力:`;

  try {
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: 'gpt-5-nano',
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });

    const responseText = response.getContentText();
    const result = JSON.parse(responseText);

    if (result.error) {
      console.error('OpenAI Error:', result.error.message);
      return [];
    }

    if (!result.choices || result.choices.length === 0) {
      return [];
    }

    const content = result.choices[0].message.content;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('ChatGPT API Error:', error);
    return [];
  }
}
