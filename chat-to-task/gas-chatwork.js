// ========================================
// 設定（Chatwork）
// ========================================
const CHATWORK_API_TOKEN = 'YOUR_CHATWORK_API_TOKEN';  // ← 自分のAPIトークンに変更
const CHATWORK_ROOM_ID = 'YOUR_ROOM_ID';  // ← 自分のルームIDに変更（数字のみ）

// ========================================
// タスク一覧をChatworkに投稿（未投稿のみ）
// ========================================
function postTasksToChatwork() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const taskSheet = ss.getSheetByName('タスク一覧');

  if (!taskSheet) {
    console.log('タスク一覧シートがありません');
    return;
  }

  // ヘッダーに「投稿済み」列がなければ追加
  const headers = taskSheet.getRange(1, 1, 1, 10).getValues()[0];
  let postedColumn = headers.indexOf('投稿済み') + 1;
  if (postedColumn === 0) {
    postedColumn = 7;  // 7列目
    taskSheet.getRange(1, postedColumn).setValue('投稿済み');
  }

  const lastRow = taskSheet.getLastRow();
  if (lastRow < 2) {
    console.log('タスクがありません');
    return;
  }

  // 全データを取得
  const data = taskSheet.getRange(2, 1, lastRow - 1, postedColumn).getValues();

  // 未投稿のタスクを抽出
  let message = '[info][title]📋 新着タスク[/title]';
  let taskCount = 0;
  const rowsToMark = [];

  for (let i = 0; i < data.length; i++) {
    const posted = data[i][postedColumn - 1];  // 投稿済みフラグ

    if (posted === '済') continue;  // 投稿済みはスキップ

    const groupName = data[i][1];
    const userName = data[i][2];
    const originalMessage = data[i][3];
    const task = data[i][4];
    const deadline = data[i][5];

    if (task) {
      taskCount++;
      message += `\n【タスク${taskCount}】\n`;
      message += `📝 ${task}\n`;
      message += `👤 発言者: ${userName}\n`;
      message += `💬 元: ${originalMessage}\n`;
      if (deadline) {
        message += `📅 期限: ${deadline}\n`;
      }
      message += `🏷️ ${groupName}\n`;

      rowsToMark.push(i + 2);  // 行番号（ヘッダー分+1）
    }
  }

  message += '[/info]';

  if (taskCount === 0) {
    console.log('新着タスクなし');
    return;
  }

  // Chatworkに投稿
  const url = `https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': CHATWORK_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: {
        body: message
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      console.log('Chatwork投稿成功！タスク数:', taskCount);

      // 投稿済みフラグを立てる
      for (let i = 0; i < rowsToMark.length; i++) {
        taskSheet.getRange(rowsToMark[i], postedColumn).setValue('済');
      }
    } else {
      console.error('Chatworkエラー:', response.getContentText());
    }
  } catch (error) {
    console.error('Chatwork投稿エラー:', error);
  }
}

// ========================================
// タスク抽出 → Chatwork投稿を一括実行
// ========================================
function extractAndPostTasks() {
  extractTasks();
  postTasksToChatwork();
}


// ========================================
// 朝のリマインド（未完了タスクのみ）
// ========================================
function sendMorningReminder() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const taskSheet = ss.getSheetByName('タスク一覧');

  if (!taskSheet) {
    console.log('タスク一覧シートがありません');
    return;
  }

  const lastRow = taskSheet.getLastRow();
  if (lastRow < 2) {
    console.log('タスクがありません');
    return;
  }

  // 全データを取得（A〜H列）
  const data = taskSheet.getRange(2, 1, lastRow - 1, 8).getValues();

  // 未完了のタスクを抽出（H列「ステータス」が「完了」でないもの）
  let message = '[info][title]🌅 おはようございます！本日の残タスク[/title]';
  let taskCount = 0;

  for (let i = 0; i < data.length; i++) {
    const status = data[i][7] ? data[i][7].toString() : '';  // H列（8列目、0始まりで7）

    if (status === '完了') continue;  // 完了はスキップ

    const groupName = data[i][1];
    const userName = data[i][2];
    const task = data[i][4];
    const deadline = data[i][5];

    if (task) {
      taskCount++;
      message += `\n${taskCount}. ${task}`;
      if (deadline) {
        message += ` 【期限: ${deadline}】`;
      }
      message += `\n   👤 ${userName} / 🏷️ ${groupName}\n`;
    }
  }

  message += '\n今日も頑張りましょう！💪[/info]';

  if (taskCount === 0) {
    console.log('未完了タスクなし！');
    // タスクがない場合も通知したい場合
    message = '[info][title]🎉 おはようございます！[/title]\n未完了のタスクはありません！素晴らしい！[/info]';
  }

  // Chatworkに投稿
  const url = `https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': CHATWORK_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      payload: {
        body: message
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      console.log('朝リマインド送信成功！残タスク数:', taskCount);
    } else {
      console.error('Chatworkエラー:', response.getContentText());
    }
  } catch (error) {
    console.error('Chatwork投稿エラー:', error);
  }
}
