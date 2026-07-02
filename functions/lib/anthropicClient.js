const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";
const MAX_TOKENS = 1024;
let cachedClient = null;

function getClient() {
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

async function generateReply(persona, messages) {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: persona.systemPrompt,
    messages
  });

  if (res.stop_reason === "refusal") {
    return "죄송합니다, 그 요청에는 답변하기 어렵습니다.";
  }

  const text = (res.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  return text || "잠시 후 다시 시도해 주세요.";
}

module.exports = { generateReply, MODEL };
