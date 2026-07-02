const { WebClient } = require("@slack/web-api");

let cachedClient = null;
let cachedBotUserId = null;

function getSlackClient() {
  if (!cachedClient) cachedClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  return cachedClient;
}

async function getBotUserId() {
  if (cachedBotUserId) return cachedBotUserId;
  const res = await getSlackClient().auth.test();
  cachedBotUserId = res.user_id;
  return cachedBotUserId;
}

async function postAsPersona(persona, { channel, threadTs, text }) {
  return getSlackClient().chat.postMessage({
    channel,
    text,
    thread_ts: threadTs,
    username: persona.displayName,
    icon_emoji: persona.emoji
  });
}

module.exports = { getSlackClient, getBotUserId, postAsPersona };
