import { Hono } from "hono";
import { cors } from "hono/cors";
import { serializeServerError } from "../../lib/supabase-runtime-errors.js";
import { getAppUrl } from "../env.js";
import { registerBillingCheckoutRoutes } from "./routes/billingCheckout.js";
import {
  registerBillingMobileMoneyRoutes,
  registerLegacyMobileMoneyRoute,
} from "./routes/billingMobileMoney.js";
import {
  registerBillingSubscriptionsRoutes,
  registerLegacyBillingSnapshotRoute,
} from "./routes/billingSubscriptions.js";
import { registerTerrainShiftCloseRoutes } from "./routes/terrainShiftClose.js";
import { registerBillingNotchPayRoutes } from "./routes/billingNotchPay.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAdminDemoRoutes } from "./routes/adminDemo.js";
import { registerAdminProspectSecurityRoutes } from "./routes/adminProspectSecurity.js";
import { registerPasswordChangeRoutes } from "./routes/passwordChange.js";
import { registerDemoRequestRoutes } from "./routes/demoRequest.js";
import {
  registerLegacyWebhooksPaymentRoutes,
  registerWebhooksPaymentRoutes,
} from "./routes/webhooksPayment.js";
import { registerGpsIngestRoutes } from "./routes/gpsIngest.js";

function isAllowedLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export function createServerApp() {
  const app = new Hono();
  const appOrigin = getAppUrl();
  const productionOrigins = new Set([
    appOrigin,
    "https://www.e-samba.com",
    "https://app.e-samba.com",
  ]);
  const allowLocalDevelopmentOrigins = process.env.NODE_ENV !== "production";

  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true;
    if (productionOrigins.has(origin)) return true;
    return allowLocalDevelopmentOrigins && isAllowedLocalOrigin(origin);
  };

  app.onError((error, c) => {
    console.error("[BFF] unhandled error:", error);
    const response = serializeServerError(error);
    return c.json(response.body, response.statusCode);
  });

  app.use("/api/admin/*", async (c, next) => {
    if (!isAllowedOrigin(c.req.header("Origin"))) {
      return c.json({ ok: false, error: "origin_not_allowed" }, 403);
    }
    await next();
  });

  app.use("/api/demo/*", async (c, next) => {
    if (!isAllowedOrigin(c.req.header("Origin"))) {
      return c.json({ ok: false, error: "origin_not_allowed" }, 403);
    }
    await next();
  });

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return null;
        if (productionOrigins.has(origin)) return origin;
        if (allowLocalDevelopmentOrigins && isAllowedLocalOrigin(origin)) {
          return origin;
        }
        return null;
      },
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "x-payments-webhook-secret",
        "x-psp-provider",
        "x-notch-signature",
        "x-cinetpay-signature",
        "x-gps-ingest-key",
      ],
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  );

  registerHealthRoutes(app);
  registerTerrainShiftCloseRoutes(app);
  registerBillingCheckoutRoutes(app);
  registerBillingSubscriptionsRoutes(app);
  registerBillingMobileMoneyRoutes(app);
  registerBillingNotchPayRoutes(app);
  registerWebhooksPaymentRoutes(app);
  registerPasswordChangeRoutes(app);
  registerAdminProspectSecurityRoutes(app);
  registerAdminDemoRoutes(app);
  registerDemoRequestRoutes(app);
  registerGpsIngestRoutes(app);

  registerLegacyBillingSnapshotRoute(app);
  registerLegacyMobileMoneyRoute(app);
  registerLegacyWebhooksPaymentRoutes(app);

  return app;
}
