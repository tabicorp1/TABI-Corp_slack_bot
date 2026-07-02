const admin = require("firebase-admin");

const COLLECTION = "slack_dedup";

async function claimEvent(eventId) {
  if (!eventId) return true;
  const ref = admin.firestore().collection(COLLECTION).doc(eventId);
  try {
    await ref.create({ at: admin.firestore.FieldValue.serverTimestamp() });
    return true;
  } catch (error) {
    if (error && (error.code === 6 || error.code === "already-exists")) return false;
    return true;
  }
}

module.exports = { claimEvent };
