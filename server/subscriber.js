import { TopicMessageQuery } from "@hashgraph/sdk";
import { hederaClient, sourceTopicId } from "./hederaClient.js";
import { forwarder } from "./forwarder.js";

export function startSubscription() {
  new TopicMessageQuery()
    .setTopicId(sourceTopicId)
    .subscribe(hederaClient, null, async (message) => {
      try {
        const receivedBytes = message.contents;
        const receivedStr = Buffer.from(receivedBytes).toString("utf8");
        console.log('[Subscriber] Received from source topic:', receivedStr);
        await forwarder(receivedStr);
        console.log('[Subscriber] Forwarded to target topic');
      } catch (err) {
        console.error("[SUBSCRIBER] Error in callback:", err);
      }
    });
}
