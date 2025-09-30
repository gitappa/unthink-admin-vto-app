import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { hederaClient, sourceTopicId } from "./hederaClient.js";

import { HCS10Client } from '@hashgraphonline/standards-sdk';
import "dotenv/config";
// Basic configuration
const client = new HCS10Client({
  network: 'testnet', // Network: 'testnet' or 'mainnet'
  operatorId: process.env.VITE_OPERATOR_ID, // Your Hedera account ID
  operatorPrivateKey: process.env.VITE_OPERATOR_KEY, // Your Hedera private key
  logLevel: 'info',
});

export async function publishJson(jsonPayload) {
  const message = typeof jsonPayload === 'string' ? jsonPayload : JSON.stringify(jsonPayload);
  console.log('[Publisher] Publishing to source topic', { message });
  // const tx = await new TopicMessageSubmitTransaction({
  //   topicId: sourceTopicId,
  //   message
  // }).execute(hederaClient);
  // await tx.getReceipt(hederaClient);s
  await client.sendMessage(
    sourceTopicId, // Topic ID for the connection
    message, // Message content
  );
  console.log('[Publisher] Publish receipt received');
}
