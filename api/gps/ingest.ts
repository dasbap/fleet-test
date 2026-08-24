import { handle } from "@hono/node-server/vercel";
import { createVercelApiApp } from "../../src/server/http/vercel.js";

export default handle(createVercelApiApp());
