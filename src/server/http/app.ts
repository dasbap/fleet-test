import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
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
import {
  registerLegacyWebhooksPaymentRoutes,
  registerWebhooksPaymentRoutes,
} from "@/server/http/routes/webhooksPayment";

export function createServerApp() {
  const app = new Hono();
  const appOrigin = getAppUrl();

  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Requêtes sans origin (curl, Postman, server-to-server) : pas soumises au CORS navigateur.
        if (!origin) return null;
        if (
          origin === appOrigin ||
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return origin;
        }
        // Origine non reconnue → refus CORS explicite (null = pas d'en-tête ACAO).
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

  registerLegacyBillingSnapshotRoute(app);
  registerLegacyMobileMoneyRoute(app);
  registerLegacyWebhooksPaymentRoutes(app);

  return app;
}

export function startBffServer() {
  const app = createServerApp();
  const port = Number(process.env.BFF_PORT || process.env.PORT || 8787);
  serve({ fetch: app.fetch, port }, (info) => {
    console.info(`[BFF] écoute sur http://127.0.0.1:${info.port}`);
  });
}
