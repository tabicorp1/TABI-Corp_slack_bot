const { personas } = require("../config/personas");
const { getSlackClient } = require("./slackClient");

const channelCache = new Map();

function matchRole(channelName) {
  if (!channelName) return null;
  const lower = channelName.toLowerCase();
  for (const [role, persona] of Object.entries(personas)) {
    if (lower === persona.channelName) return role;
  }
  for (const [role, persona] of Object.entries(personas)) {
    if (lower.includes(persona.channelName)) return role;
  }
  return null;
}

async function resolvePersona(channelId) {
  if (channelCache.has(channelId)) {
    const role = channelCache.get(channelId);
    return role ? personas[role] : null;
  }

  try {
    const res = await getSlackClient().conversations.info({ channel: channelId });
    const role = matchRole(res.channel && res.channel.name);
    channelCache.set(channelId, role);
    return role ? personas[role] : null;
  } catch {
    return null;
  }
}

module.exports = { resolvePersona, matchRole };
