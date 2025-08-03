import { app } from "./router";

import "./api/integration/v1/$sku/verify";
import "./api/integration/v1/$sku/[delete]incident";
import "./api/meta/location";
import "./api/user";

export default { ...app };

export { ShareInstance } from "./objects/instance";
