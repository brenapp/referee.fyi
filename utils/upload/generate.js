import config from "./config.json" assert { type: "json" };
import crypto from "crypto";
import fs from "fs";

const invitations = [];

for (const user of config.users) {
  const id = crypto.randomUUID();

  const invitation = {
    ...config.invitation,
    id,
    user,
  };

  invitations.push({
    key: `${user}#${config.invitation.sku}`,
    value: JSON.stringify(invitation),
  });
}

fs.writeFileSync(
  `invitations-${config.invitation.sku}.json`,
  JSON.stringify(invitations, null, 4)
);
