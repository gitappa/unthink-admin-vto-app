// hederaClient.js
import { Client } from "@hashgraph/sdk";
// import "dotenv/config";

const operatorId = process.env.VITE_OPERATOR_ID;
const operatorKey = process.env.VITE_OPERATOR_KEY;
const sourceTopicIdEnv = process.env.VITE_SOURCE_TOPIC_ID;
const targetTopicIdEnv = process.env.VITE_TARGET_TOPIC_ID;

export const hederaConfigured = Boolean(operatorId && operatorKey);
export const topicsConfigured = Boolean(sourceTopicIdEnv && targetTopicIdEnv);

let client = null;
if (!hederaConfigured) {
  console.warn(
    "Hedera credentials are not configured. Set VITE_OPERATOR_ID and VITE_OPERATOR_KEY to enable publishing/subscribing."
  );
} else {
  client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  if (!topicsConfigured) {
    console.warn(
      "Missing topic IDs: VITE_SOURCE_TOPIC_ID and/or VITE_TARGET_TOPIC_ID are not set"
    );
  }
}

export const hederaClient = client; // may be null when not configured
export const sourceTopicId = sourceTopicIdEnv;
export const targetTopicId = targetTopicIdEnv;

