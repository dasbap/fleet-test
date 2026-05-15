/**
 * Point d’entrée Vercel pour api.e-samba.com (projet Vercel séparé, racine = api-server/).
 * Routes : /billing/*, /webhooks/payment, /health (réécritures vers /api/*).
 *
 * Variables sur le projet API uniquement : SUPABASE_*, PAYMENT_*, NOTCH_*, CINETPAY_*,
 * APP_URL, BACKEND_URL.
 */
import { handle } from "hono/vercel";
import { createServerApp } from "../../src/server/http/app";

const app = createServerApp();

export default handle(app);

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};
