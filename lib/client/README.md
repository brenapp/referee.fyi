# Referee FYI Client

SDK for the [Referee FYI Integration API](https://referee.fyi/api/swagger).

```ts
import { createClient } from "@referee-fyi/client";

const client = createClient({
  sku: "<sku>",
  authorization: {
    type: "bearer",
    token: "<integration token>",
  },
});

const verify = await client.verify();
if (!verify.data?.success) {
  console.error("Verification failed", verify.error);
}

const incidents = await client.getAllIncidents();
if (!incidents.data?.success) {
  console.error("Failed to get incidents", incidents.error);
} else {
  console.log("Incidents", incidents.data.data);
}

const asset = await client.getAsset({ id: "<asset id>" });
if (!asset.data?.success) {
  console.error("Failed to get asset", asset.error);
} else {
  console.log("Asset", asset.data.data);
}
```
