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
// extractTasksFromChatwork() への追加コード
// ========================================
// 【変更方法】extractTasksFromChatwork() 内の
// console.log('新着メッセージ数:', newMessages.length);
// の直前に以下を追加する：
//
//       // --- CW_ シートのユーザー名も更新 ---
//       var cwSheetName = ('CW_' + room.roomId).substring(0, 15);
//       var cwGroupSheet = ss.getSheetByName(cwSheetName);
//       if (cwGroupSheet) {
//         var cwLast = cwGroupSheet.getLastRow();
//         if (cwLast >= 2) {
//           var cwMsgIds = cwGroupSheet.getRange(2, 7, cwLast - 1, 1).getValues();
//           var cwUserNames = cwGroupSheet.getRange(2, 5, cwLast - 1, 1).getValues();
//           for (var m = 0; m < newMessages.length; m++) {
//             for (var r = 0; r < cwMsgIds.length; r++) {
//               if (cwMsgIds[r][0] && cwMsgIds[r][0].toString() === newMessages[m].messageId) {
//                 var current = cwUserNames[r][0] ? cwUserNames[r][0].toString().trim() : '';
//                 if (!current || current === 'Unknown') {
//                   cwGroupSheet.getRange(r + 2, 5).setValue(newMessages[m].userName);
//                 }
//                 break;
//               }
//             }
//           }
//         }
//       }
