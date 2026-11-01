export const SNAAC_METHODOLOGY = {
  version: "SNAAC_V1.0",
  posts: {
    "Achats alimentaires": { field: "food",      ref: 0.30,  capture: 0.40 },
    "Boissons":            { field: "drinks",    ref: 0.06,  capture: 0.40 },
    "Énergie":             { field: "energy",    ref: 0.03,  capture: 0.35 },
    "Télécom":             { field: "telecom",   ref: 0.006, capture: 0.40 },
    "Internet":            { field: "internet",  ref: 0.004, capture: 0.40 },
    "Assurance":           { field: "insurance", ref: 0.008, capture: 0.35 },
    "Fournitures":         { field: "supplies",  ref: 0.025, capture: 0.35 },
    "Véhicules":           { field: "vehicles",  ref: 0.035, capture: 0.30 },
    "Mutuelle / prévoyance": { field: "mutuelle", ref: 0.010, capture: 0.30 },
    "RH / services externalisés": { field: "rh", ref: 0.020, capture: 0.30 },
    "Emballages":          { field: "pack",      ref: 0.035, capture: 0.40 },
  },
  activityMultipliers: {
    "Kebab": 1.0, "Tacos": 1.0, "Burger": 1.0, "Pizzeria": 1.0,
    "Boucherie": 1.0, "Boulangerie": 1.0, "Hôtellerie": 1.0, "Autre TPE/PME": 1.0,
  } as Record<string, number>,
  scenarios: { low: 0.70, mid: 1.00, high: 1.35 },
} as const;
