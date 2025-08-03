import { app } from "./router";

import "./api/meta/location";
import "./api/user";

export default { ...app };

export { ShareInstance } from "./objects/instance";
