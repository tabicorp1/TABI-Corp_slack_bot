const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const { collapse } = require("../lib/context");
const { matchRole } = require("../lib/personaResolver");
const { verifySlackSignature } = require("../lib/slackVerify");

test("채널 이름에서 역할을 찾는다", () => {
  assert.equal(matchRole("ceo"), "ceo");
  assert.equal(matchRole("tabi-marketing"), "marketing");
  assert.equal(matchRole("general"), null);
});

test("같은 역할의 연속 메시지를 합친다", () => {
  assert.deepEqual(
    collapse([
      { role: "user", content: "첫 질문" },
      { role: "user", content: "추가 질문" },
      { role: "assistant", content: "답변" }
    ]),
    [
      { role: "user", content: "첫 질문\n\n추가 질문" },
      { role: "assistant", content: "답변" }
    ]
  );
});

test("Slack 서명을 검증한다", () => {
  const secret = "test-secret";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const body = Buffer.from('{"type":"event_callback"}');
  const signature =
    "v0=" +
    crypto
      .createHmac("sha256", secret)
      .update(`v0:${timestamp}:${body.toString("utf8")}`)
      .digest("hex");

  assert.equal(verifySlackSignature(secret, signature, timestamp, body), true);
  assert.equal(verifySlackSignature(secret, "v0=wrong", timestamp, body), false);
});
