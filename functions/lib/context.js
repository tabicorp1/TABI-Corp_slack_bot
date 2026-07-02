const { getSlackClient, getBotUserId } = require("./slackClient");

const MAX_MESSAGES = 12;

async function buildMessages(event) {
  const client = getSlackClient();
  let botUserId = null;
  try {
    botUserId = await getBotUserId();
  } catch {}

  let history = [];
  try {
    if (event.thread_ts) {
      const res = await client.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts,
        limit: MAX_MESSAGES
      });
      history = res.messages || [];
    } else {
      const res = await client.conversations.history({
        channel: event.channel,
        limit: MAX_MESSAGES
      });
      history = (res.messages || []).reverse();
    }
  } catch {}

  const messages = [];
  for (const message of history) {
    const text = (message.text || "").trim();
    if (!text) continue;
    const isBot = Boolean(message.bot_id) || (botUserId && message.user === botUserId);
    messages.push({ role: isBot ? "assistant" : "user", content: text });
  }

  const currentText = (event.text || "").trim();
  const last = messages[messages.length - 1];
  if (currentText && (!last || last.role !== "user" || last.content !== currentText)) {
    messages.push({ role: "user", content: currentText });
  }

  while (messages.length && messages[0].role === "assistant") messages.shift();
  return collapse(messages);
}

function collapse(messages) {
  const out = [];
  for (const message of messages) {
    const last = out[out.length - 1];
    if (last && last.role === message.role) {
      last.content += `\n\n${message.content}`;
    } else {
      out.push({ ...message });
    }
  }
  return out.length ? out : [{ role: "user", content: "안녕하세요." }];
}

module.exports = { buildMessages, collapse };
