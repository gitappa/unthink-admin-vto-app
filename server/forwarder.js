import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { hederaClient, targetTopicId } from "./hederaClient.js";

export async function forwarder(msg) {
  try {
    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(targetTopicId)
      .setMessage(msg);
    const submitResponse = await tx.execute(hederaClient);
    await submitResponse.getReceipt(hederaClient);
    return true;
  } catch (err) {
    console.error("[FORWARDER] Error forwarding message:", err);
    return false;
  }
}
