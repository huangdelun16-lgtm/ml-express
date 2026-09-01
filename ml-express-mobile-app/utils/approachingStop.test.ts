import { describe, expect, it } from "vitest";
import { pickApproachingStop, approachingStopKey } from "./approachingStop";

const pickupPkg = {
  id: "PKG-PICK",
  status: "待取件",
  sender_name: "Market L",
  receiver_name: "Aung",
  pickupCoords: { lat: 21.9588, lng: 96.0891 },
  deliveryCoords: { lat: 21.98, lng: 96.12 },
};

const deliveryPkg = {
  id: "PKG-DEL",
  status: "已取件",
  sender_name: "Shop",
  receiver_name: "Ko Ko",
  pickupCoords: { lat: 21.9, lng: 96.0 },
  deliveryCoords: { lat: 21.9589, lng: 96.0892 },
};

describe("pickApproachingStop", () => {
  it("hints pickup within 120m for 待取件", () => {
    const hit = pickApproachingStop([pickupPkg], 21.9588, 96.0891);
    expect(hit?.packageId).toBe("PKG-PICK");
    expect(hit?.kind).toBe("pickup");
    expect(hit!.distanceMeters).toBeLessThan(20);
  });

  it("hints delivery within 120m for 已取件", () => {
    const hit = pickApproachingStop([deliveryPkg], 21.9589, 96.0892);
    expect(hit?.packageId).toBe("PKG-DEL");
    expect(hit?.kind).toBe("delivery");
  });

  it("ignores stops farther than 120m", () => {
    const hit = pickApproachingStop([pickupPkg, deliveryPkg], 16.8, 96.15);
    expect(hit).toBeNull();
  });

  it("picks the nearer of pickup vs delivery", () => {
    const hit = pickApproachingStop(
      [pickupPkg, deliveryPkg],
      pickupPkg.pickupCoords.lat,
      pickupPkg.pickupCoords.lng,
    );
    expect(hit?.packageId).toBe("PKG-PICK");
    expect(hit?.kind).toBe("pickup");
  });

  it("skips 0,0 coords", () => {
    const hit = pickApproachingStop(
      [
        {
          id: "BAD",
          status: "待取件",
          pickupCoords: { lat: 0, lng: 0 },
        },
      ],
      0.0001,
      0.0001,
    );
    expect(hit).toBeNull();
  });

  it("builds a stable key for TTS cooldown", () => {
    const hit = pickApproachingStop([deliveryPkg], 21.9589, 96.0892);
    expect(approachingStopKey(hit)).toBe("PKG-DEL:delivery");
    expect(approachingStopKey(null)).toBe("");
  });

  it("hints pickup for 打包中 and delivery for 配送中", () => {
    expect(
      pickApproachingStop([{ ...pickupPkg, status: "打包中" }], 21.9588, 96.0891)
        ?.kind,
    ).toBe("pickup");
    expect(
      pickApproachingStop([{ ...deliveryPkg, status: "配送中" }], 21.9589, 96.0892)
        ?.kind,
    ).toBe("delivery");
  });

  it("ignores Yangon fallback coordinates", () => {
    const hit = pickApproachingStop(
      [
        {
          ...pickupPkg,
          pickupCoords: { lat: 21.9588, lng: 96.0891, source: "fallback" },
        },
      ],
      21.9588,
      96.0891,
    );
    expect(hit).toBeNull();
  });
});
