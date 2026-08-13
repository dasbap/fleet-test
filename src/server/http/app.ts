import { Hono } from "hono";
import { cors } from "hono/cors";
import { serializeServerError } from "@/lib/supabase-runtime-errors";
import { getAppUrl } from "@/server/env";
import { registerBillingCheckoutRoutes } from "@/server/http/routes/billingCheckout";
import {
  registerBillingMobileMoneyRoutes,
  registerLegacyMobileMoneyRoute,
} from "@/server/http/routes/billingMobileMoney";
import {
  registerBillingSubscriptionsRoutes,
  registerLegacyBillingSnapshotRoute,
} from "@/server/http/routes/billingSubscriptions";
import { registerTerrainShiftCloseRoutes } from "@/server/http/routes/terrainShiftClose";
import { registerBillingNotchPayRoutes } from "@/server/http/routes/billingNotchPay";
import { registerHealthRoutes } from "@/server/http/routes/health";
import { registerAdminDemoRoutes } from "@/server/http/routes/adminDemo";
import {
  registerLegacyWebhooksPaymentRoutes,
  registerWebhooksPaymentRoutes,
} from "@/server/http/routes/webhooksPayment";

export function createServerApp() {
  const app = new Hono();
  const appOrigin = getAppUrl();

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
        if (
          origin === appOrigin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
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
  registerAdminDemoRoutes(app);

  registerLegacyBillingSnapshotRoute(app);
  registerLegacyMobileMoneyRoute(app);
  registerLegacyWebhooksPaymentRoutes(app);

  return app;
}
