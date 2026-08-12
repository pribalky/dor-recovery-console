export function createInitialState() {
  return {
    assessment: null,
    manualCosts: {},
    raidEntries: [],
    sortMode: "severity", // "severity" | "exposure" | "raid"
  };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
