import { DEFAULT_TEAM_SPRINT_CAPACITY_HOURS, DEFAULT_COST_SCALE } from "./config/costModel.js";

export function createInitialState() {
  return {
    assessment: null,
    manualCosts: {},
    raidEntries: [],
    sortMode: "severity", // "severity" | "exposure" | "raid"
    assumptions: {
      teamSprintCapacityHours: DEFAULT_TEAM_SPRINT_CAPACITY_HOURS,
      costScale: DEFAULT_COST_SCALE,
    },
  };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
