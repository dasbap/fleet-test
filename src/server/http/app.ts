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
import {
  registerLegacyWebhooksPaymentRoutes,
  registerWebhooksPaymentRoutes,
} from "./routes/webhooksPayment.js";
import { registerGpsIngestRoutes } from "./routes/gpsIngest.js";

export function createServerApp() {
  const app = new Hono();
  const appOrigin = getAppUrl();
  const allowLocalDevelopmentOrigins = process.env.NODE_ENV !== "production";

  app.onError((error, c) => {
    console.error("[BFF] unhandled error:", error);
    const response = serializeServerError(error);
    return c.json(response.body, response.statusCode);
  });

  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (!origin) return null;
        if (origin === appOrigin) return origin;
        if (
          allowLocalDevelopmentOrigins &&
          (origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:"))
        ) {
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
  registerGpsIngestRoutes(app);

  registerLegacyBillingSnapshotRoute(app);
  registerLegacyMobileMoneyRoute(app);
  registerLegacyWebhooksPaymentRoutes(app);

  return app;
}
