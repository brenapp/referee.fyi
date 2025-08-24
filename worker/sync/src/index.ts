import { app } from "./router";

import "./api/integration/v1/$sku/verify";
import "./api/integration/v1/$sku/incident/delete";
import "./api/integration/v1/$sku/users";
import "./api/integration/v1/$sku/incident/json";
import "./api/integration/v1/$sku/incident/pdf";
import "./api/integration/v1/$sku/incident/csv";
import "./api/meta/location";
import "./api/user";
import "./api/$sku/invitation";
import "./api/$sku/invite/put";
import "./api/$sku/invite/delete";
import "./api/$sku/list";
import "./api/$sku/request/put";
import "./api/$sku/request/get";
import "./api/$sku/create";
import "./api/$sku/accept";
import "./api/$sku/asset/upload_url";
import "./api/$sku/asset/url";
import "./api/$sku/asset/preview_url";
import "./api/$sku/incident/put";
import "./api/$sku/incident/patch";
import "./api/$sku/incident/delete";
import "./api/$sku/data";
import "./api/$sku/join";

export default { ...app };

export { ShareInstance } from "./objects/instance";
