import { describe, expect, it } from "vitest";
import { flightGesture } from "../src/game/space/touchFlight";

describe("space touch flight gestures", () => {
  it("uses the helm for turning and forward thrust, with a neutral dead zone", () => {
    expect(flightGesture("helm", 11, -11)).toEqual({ turn: 0, thrust: 0 });
    expect(flightGesture("helm", -85, -30)).toEqual({ turn: -1, thrust: 0.5 });
    expect(flightGesture("helm", 0, 55)).toEqual({ turn: 0, thrust: 0 });
  });

  it("strafes sideways and reverses downward with no cross-axis thrust", () => {
    expect(flightGesture("thrusters", -48, 35)).toEqual({ strafe: -1 });
    expect(flightGesture("thrusters", 48, 35)).toEqual({ strafe: 1 });
    expect(flightGesture("thrusters", 30, 48)).toEqual({ thrust: -1 });
    expect(flightGesture("thrusters", 0, -60).thrust).toBeCloseTo(0);
  });
});
