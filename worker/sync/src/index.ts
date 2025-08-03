import { app } from "./router";

import "./api/integration/v1/$sku/verify";
import "./api/integration/v1/$sku/[delete]incident";
import "./api/integration/v1/$sku/users";
import "./api/meta/location";
import "./api/user";
import "./api/$sku/[put]request";
import "./api/$sku/[get]request";
import "./api/$sku/asset/upload_url";
import "./api/$sku/asset/url";
import "./api/$sku/asset/preview_url";

export default { ...app };

export { ShareInstance } from "./objects/instance";
