// ========================================
// 各アカウントのカレンダーGASに追加するコード
// doGet を追加して、日付指定でカレンダー予定をJSON返却する
// ========================================
// 【変更方法】既存のスクリプトにこの doGet 関数を追加する
// ※既存の postMyCalendarEvents 等はそのまま残す

function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    if (action === 'events') {
      // 日付パラメータ（YYYY-MM-DD）。省略時は今日
      const dateStr = params.date;
      let targetDate;

      if (dateStr) {
        const parts = dateStr.split('-');
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        targetDate = new Date();
      }

      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // カレンダー名を判定
      const email = Session.getActiveUser().getEmail();
      let calendarName = email;
      if (email.includes('@kuma-base.com')) {
        calendarName = 'KumaBase';
      } else if (email.includes('@coreal.life')) {
        calendarName = 'coreal';
      } else if (email.includes('@iyell.jp')) {
        calendarName = 'iYell';
      }

      // 予定を取得
      const calendar = CalendarApp.getDefaultCalendar();
      const events = calendar.getEvents(targetDate, nextDay);

      const eventList = events.map(function(event) {
        return {
          startTime: Utilities.formatDate(event.getStartTime(), 'Asia/Tokyo', 'HH:mm'),
          title: event.getTitle() || '(非公開予定)'
        };
      });

      const result = {
        calendarName: calendarName,
        date: Utilities.formatDate(targetDate, 'Asia/Tokyo', 'yyyy-MM-dd'),
        events: eventList
      };

      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action. Use action=events' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
