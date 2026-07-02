const crypto = require("crypto");

function verifySlackSignature(signingSecret, signature, timestamp, rawBody) {
  if (!signingSecret || !signature || !timestamp) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 60 * 5) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const base = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${hmac}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { verifySlackSignature };
