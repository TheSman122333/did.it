export type SkyState = "normal" | "bright" | "sunset";

export type WorldState = {
  sky: SkyState;
  grassIntensity: number;
  objectDensity: number;
};

export function getWorldState(streak: number): WorldState {
  if (streak >= 7) {
    return {
      sky: "sunset",
      grassIntensity: 1,
      objectDensity: 1,
    };
  }

  if (streak >= 3) {
    return {
      sky: "bright",
      grassIntensity: 0.6,
      objectDensity: 0.6,
    };
  }

  return {
    sky: "normal",
    grassIntensity: 0.25,
    objectDensity: 0.3,
  };
}