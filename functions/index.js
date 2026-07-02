const { PubSub } = require("@google-cloud/pubsub");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { defineSecret } = require("firebase-functions/params");
const { onRequest } = require("firebase-functions/v2/https");
const { onMessagePublished } = require("firebase-functions/v2/pubsub");
const { setGlobalOptions } = require("firebase-functions/v2");

const { generateReply } = require("./lib/anthropicClient");
const { buildMessages } = require("./lib/context");
const { claimEvent } = require("./lib/dedup");
const { resolvePersona } = require("./lib/personaResolver");
const { postAsPersona } = require("./lib/slackClient");
const { verifySlackSignature } = require("./lib/slackVerify");

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const SLACK_BOT_TOKEN = defineSecret("SLACK_BOT_TOKEN");
const SLACK_SIGNING_SECRET = defineSecret("SLACK_SIGNING_SECRET");
const TOPIC = "slack-message-jobs";
const pubsub = new PubSub();

exports.slackEvents = onRequest(
  { secrets: [SLACK_SIGNING_SECRET], timeoutSeconds: 15 },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const body = req.body || {};
    if (body.type === "url_verification") return res.status(200).send(body.challenge);

    const signature = req.get("X-Slack-Signature");
    const timestamp = req.get("X-Slack-Request-Timestamp");
    if (!verifySlackSignature(process.env.SLACK_SIGNING_SECRET, signature, timestamp, req.rawBody)) {
      logger.warn("Invalid Slack signature");
      return res.status(401).send("invalid signature");
    }

    const event = body.event;
    if (!event || event.type !== "message" || event.subtype || event.bot_id) {
      return res.status(200).send("ignored");
    }

    if (!(await claimEvent(body.event_id))) return res.status(200).send("duplicate");

    try {
      await pubsub.topic(TOPIC).publishMessage({ json: { event } });
    } catch (error) {
      logger.error("Pub/Sub publish failed", error);
      return res.status(500).send("queue failed");
    }
    return res.status(200).send("ok");
  }
);

exports.processSlackMessage = onMessagePublished(
  {
    topic: TOPIC,
    secrets: [ANTHROPIC_API_KEY, SLACK_BOT_TOKEN],
    timeoutSeconds: 120,
    memory: "512MiB"
  },
  async (cloudEvent) => {
    const event = cloudEvent.data.message.json && cloudEvent.data.message.json.event;
    if (!event) return;

    const persona = await resolvePersona(event.channel);
    if (!persona) {
      logger.info(`No persona for channel ${event.channel}; skipping.`);
      return;
    }

    try {
      const messages = await buildMessages(event);
      const reply = await generateReply(persona, messages);
      await postAsPersona(persona, {
        channel: event.channel,
        threadTs: event.thread_ts,
        text: reply
      });
    } catch (error) {
      logger.error("Failed to process message", error);
      try {
        await postAsPersona(persona, {
          channel: event.channel,
          threadTs: event.thread_ts,
          text: "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요."
        });
      } catch {}
    }
  }
);
