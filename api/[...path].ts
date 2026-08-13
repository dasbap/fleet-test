import { handle } from "@hono/node-server/vercel";
import { createVercelApiApp } from "../src/server/http/vercel";

export default handle(createVercelApiApp());
