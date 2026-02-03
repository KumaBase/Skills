const GAS_URL = 'YOUR_GAS_URL';  // ← GASのデプロイURLに変更
const LINE_ACCESS_TOKEN = 'YOUR_LINE_ACCESS_TOKEN';  // ← LINE Access Tokenに変更
const CHATWORK_API_TOKEN = 'YOUR_CHATWORK_API_TOKEN';  // ← Chatwork APIトークンに変更

// ============================================================
// Cloudflare Workers - 勤怠管理Bot
// ============================================================
//
// 【使い方】
// 「出勤」または「退勤」ボタンを押した後、時刻をテキストで入力してください（例: 9:00）。
// 入力後、「勤務時間」ボタンを押すと、本日の勤務時間が確認できます。
//
// ※ 現在は動作確認用の簡易版です :)
//
// ============================================================
// Secrets (Production):
// - GAS_URL
// - LINE_ACCESS_TOKEN
// - LINE_CHANNEL_SECRET
// ============================================================

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

    const rawBody = await request.text();

    // signature verify
    const signature = request.headers.get("x-line-signature") || "";
    if (!env.LINE_CHANNEL_SECRET) {
      console.error("[Worker] LINE_CHANNEL_SECRET is not set");
      return new Response("LINE_CHANNEL_SECRET is not set", { status: 500 });
    }

    const okSig = await verifyLineSignature(rawBody, signature, env.LINE_CHANNEL_SECRET);
    if (!okSig) {
      console.error("[Worker] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("[Worker] JSON parse error:", e);
      return jsonOk_();
    }

    console.log("[Worker] Received events:", JSON.stringify(body.events?.length || 0));

    // LINEへは即200
    ctx.waitUntil(handleEvents(body, env));
    return jsonOk_();
  },
};

async function handleEvents(body, env) {
  const events = body.events || [];
  for (const event of events) {
    if (event.type !== "message") continue;
    try {
      await handleOneEvent(event, env);
    } catch (err) {
      console.error("[Worker] handleOneEvent error:", err?.message || err);
    }
  }
}

async function handleOneEvent(event, env) {
  const message = event.message || {};
  const source = event.source || {};

  const to = getToId(source);
  const userId = source.userId || "unknown";
  const chatType = source.type || "unknown";

  const eventTimestamp = event.timestamp || Date.now();
  const messageId = message.id || "";
  const messageType = message.type || "unknown";
  const messageText = formatLineMessageText(message).trim();

  console.log(`[Worker] Message: "${messageText}" from ${userId}, to=${to}, type=${chatType}`);

  // pingは最速で返す（プロフィール取得/GASより先）
  if (messageType === "text" && messageText.toLowerCase() === "ping") {
    console.log("[Worker] ping detected, sending pong");
    await pushToLine(env, to, "pong");
    return;
  }

  // userName / groupName（必要なら取得）
  let userName = "Unknown";
  let groupName = "Unknown";

  try {
    userName = await getLineUserName(env, source, userId);
    console.log(`[Worker] userName: ${userName}`);
  } catch (e) {
    console.error("[Worker] getLineUserName error:", e?.message || e);
  }

  try {
    groupName = await getLineGroupName(env, source, userName);
    console.log(`[Worker] groupName: ${groupName}`);
  } catch (e) {
    console.error("[Worker] getLineGroupName error:", e?.message || e);
  }

  const payload = {
    source: "line",
    chatId: to,
    chatType,
    groupName,
    userId,
    userName,
    messageType,
    message: messageText,
    timestamp: String(eventTimestamp),
    messageId: String(messageId),
  };

  console.log("[Worker] Sending to GAS:", JSON.stringify(payload));

  // GAS
  let action = "ignore";
  let statusData = null;

  try {
    const res = await fetch(env.GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const gasRaw = await res.text();
    console.log(`[Worker] GAS response status=${res.status}, body=${gasRaw}`);

    if (res.ok) {
      try {
        const data = JSON.parse(gasRaw);
        if (data && data.action) action = data.action;
        if (data && data.data) statusData = data.data;
        console.log(`[Worker] GAS action=${action}`);
      } catch (e) {
        console.error("[Worker] GAS JSON parse error:", e?.message || e);
      }
    } else {
      console.error(`[Worker] GAS returned error status: ${res.status}`);
    }
  } catch (e) {
    console.error("[Worker] GAS fetch error:", e?.message || e);
  }

  // 返信（push）
  if (action === "ask_in") {
    // 出勤時間の選択肢をクイックリプライで表示
    const quickReply = [
      { type: "action", action: { type: "message", label: "9:00", text: "9:00" }},
      { type: "action", action: { type: "message", label: "9:30", text: "9:30" }},
      { type: "action", action: { type: "message", label: "10:00", text: "10:00" }},
      { type: "action", action: { type: "message", label: "自分で入力", text: "自分で入力" }},
    ];
    await pushToLine(env, to, "出勤時間を選択してください", quickReply);

  } else if (action === "ask_out") {
    // 退勤時間の選択肢をクイックリプライで表示
    const quickReply = [
      { type: "action", action: { type: "message", label: "17:00", text: "17:00" }},
      { type: "action", action: { type: "message", label: "17:30", text: "17:30" }},
      { type: "action", action: { type: "message", label: "18:00", text: "18:00" }},
      { type: "action", action: { type: "message", label: "18:30", text: "18:30" }},
      { type: "action", action: { type: "message", label: "自分で入力", text: "自分で入力" }},
    ];
    await pushToLine(env, to, "退勤時間を選択してください", quickReply);

  } else if (action === "manual_input") {
    // 「自分で入力」が選ばれた場合
    await pushToLine(env, to, "時刻を入力してください（例: 9:00）");

  } else if (action === "in") {
    await pushToLine(env, to, "出勤を記録しました");

  } else if (action === "out") {
    await pushToLine(env, to, "退勤を記録しました");

  } else if (action === "no_mode") {
    await pushToLine(env, to, "先に「出勤」または「退勤」を選択してください");

  } else if (action === "status") {
    const d = statusData || {};
    const inText = d.in ? d.in : "未記録";
    const outText = d.out ? d.out : "未記録";
    const workText = d.work ? d.work : "未確定";

    const msg =
      `${d.date || "今日"}\n` +
      `出勤: ${inText}\n` +
      `退勤: ${outText}\n` +
      `勤務時間: ${workText}`;

    await pushToLine(env, to, msg);

  } else {
    console.log(`[Worker] No reply for action=${action}`);
  }
}

function getToId(source) {
  if (!source || !source.type) return "unknown";
  if (source.type === "user") return source.userId || "unknown";
  if (source.type === "group") return source.groupId || "unknown";
  if (source.type === "room") return source.roomId || "unknown";
  return "unknown";
}

// クイックリプライ対応版 pushToLine
async function pushToLine(env, to, text, quickReplyItems = null) {
  if (!env.LINE_ACCESS_TOKEN) {
    console.error("[Worker] LINE_ACCESS_TOKEN is not set");
    return;
  }
  if (!to || to === "unknown") {
    console.error("[Worker] Invalid 'to' for push:", to);
    return;
  }

  console.log(`[Worker] pushToLine: to=${to}, text="${text}", hasQuickReply=${!!quickReplyItems}`);

  const message = {
    type: "text",
    text: text,
  };

  // クイックリプライがあれば追加
  if (quickReplyItems && quickReplyItems.length > 0) {
    message.quickReply = {
      items: quickReplyItems
    };
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages: [message],
      }),
    });

    const resText = await res.text();
    console.log(`[Worker] LINE push response: status=${res.status}, body=${resText}`);

    if (!res.ok) {
      console.error(`[Worker] LINE push failed: ${res.status} ${resText}`);
    }
  } catch (e) {
    console.error("[Worker] LINE push error:", e?.message || e);
  }
}

async function getLineUserName(env, source, userId) {
  if (!userId || !env.LINE_ACCESS_TOKEN) return "Unknown";

  try {
    let url = null;
    if (source.type === "group" && source.groupId) {
      url = `https://api.line.me/v2/bot/group/${source.groupId}/member/${userId}`;
    } else if (source.type === "room" && source.roomId) {
      url = `https://api.line.me/v2/bot/room/${source.roomId}/member/${userId}`;
    } else if (source.type === "user") {
      url = `https://api.line.me/v2/bot/profile/${userId}`;
    }
    if (!url) return "Unknown";

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${env.LINE_ACCESS_TOKEN}` },
    });
    if (!res.ok) {
      console.log(`[Worker] getLineUserName failed: ${res.status}`);
      return "Unknown";
    }

    const data = await res.json();
    return data.displayName || "Unknown";
  } catch (e) {
    console.error("[Worker] getLineUserName error:", e?.message || e);
    return "Unknown";
  }
}

async function getLineGroupName(env, source, fallbackName) {
  if (!env.LINE_ACCESS_TOKEN) return "Unknown";

  try {
    if (source.type === "group" && source.groupId) {
      const url = `https://api.line.me/v2/bot/group/${source.groupId}/summary`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${env.LINE_ACCESS_TOKEN}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.groupName || "Unknown Group";
      }
      // エラー詳細をログに出力（デバッグ用）
      const errBody = await res.text().catch(() => "");
      console.error(`[Worker] getLineGroupName failed: status=${res.status}, groupId=${source.groupId}, body=${errBody}`);
      return "Unknown Group";
    }
    if (source.type === "room") return "Room";
    if (source.type === "user") return `DM:${fallbackName || "User"}`;
    return "Unknown";
  } catch (e) {
    console.error("[Worker] getLineGroupName error:", e?.message || e);
    return "Unknown";
  }
}

function formatLineMessageText(message) {
  switch (message.type) {
    case "text":
      return message.text || "";
    case "image":
      return "[画像]";
    case "video":
      return "[動画]";
    case "audio":
      return "[音声]";
    case "sticker":
      return "[スタンプ]";
    case "location":
      return "[位置情報]";
    default:
      return `[${message.type}]`;
  }
}

async function verifyLineSignature(rawBody, signature, channelSecret) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(channelSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
    const b64 = arrayBufferToBase64(mac);

    if (b64.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < b64.length; i++) diff |= b64.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("[Worker] verifyLineSignature error:", e?.message || e);
    return false;
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function jsonOk_() {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
