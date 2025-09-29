import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { hederaClient, sourceTopicId } from "./hederaClient.js";

export async function publishJson(jsonPayload) {
  const message = typeof jsonPayload === 'string' ? jsonPayload : JSON.stringify(jsonPayload);
  console.log('[Publisher] Publishing to source topic', { message });
  const tx = await new TopicMessageSubmitTransaction({
    topicId: sourceTopicId,
    message
  }).execute(hederaClient);
  await tx.getReceipt(hederaClient);
  console.log('[Publisher] Publish receipt received');
}
