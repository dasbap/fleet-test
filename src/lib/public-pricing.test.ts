import { describe, expect, it } from "vitest";
import {
  PUBLIC_PRICE_PRO_PER_VEHICLE_XAF,
  PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF,
  formatPublicPriceXaf,
} from "./public-pricing";

describe("formatPublicPriceXaf", () => {
  it("formate les montants catalogue Starter / Pro (alignés DB)", () => {
    expect(formatPublicPriceXaf(PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF)).toBe(
      "15 000"
    );
    expect(formatPublicPriceXaf(PUBLIC_PRICE_PRO_PER_VEHICLE_XAF)).toBe(
      "21 000"
    );
  });
});
