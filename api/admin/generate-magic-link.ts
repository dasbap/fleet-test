import { handle } from "@hono/node-server/vercel";
import { createServerApp } from "../../src/server/http/app.js";

const app = createServerApp();

export default handle(app);
