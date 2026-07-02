const Anthropic = require("@anthropic-ai/sdk");

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";
const MAX_TOKENS = 4096;
let cachedClient = null;

function getClient() {
  if (!cachedClient) cachedClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cachedClient;
}

async function generateReply(persona, messages) {
  const first = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: persona.systemPrompt,
    messages
  });

  if (first.stop_reason === "refusal") {
    return "죄송합니다, 그 요청에는 답변하기 어렵습니다.";
  }

  let text = extractText(first);

  // Long file analyses can hit the output ceiling. Continue once instead of
  // leaving the final sentence visibly unfinished.
  if (first.stop_reason === "max_tokens" && text) {
    const continuation = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: persona.systemPrompt,
      messages: [
        ...messages,
        { role: "assistant", content: text },
        {
          role: "user",
          content: "방금 답변이 중간에 끊겼습니다. 끊긴 문장부터 이어서 마무리해 주세요."
        }
      ]
    });
    text += `\n\n${extractText(continuation)}`;
  }

  return text.trim() || "잠시 후 다시 시도해 주세요.";
}

function extractText(response) {
  return (response.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

module.exports = { extractText, generateReply, MODEL, MAX_TOKENS };
