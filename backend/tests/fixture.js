// Creates a complete valid farm that can be reused by unit and API tests.
function exampleFarm(prefix = "") {
  return {
    schemaVersion: 5,
    setupCompleted: true,
    setupStep: 4,
    settings: {
      farmName: "Test Farm",
      farmType: "dairy",
      assignHerds: true,
      latitude: -43.5,
      longitude: 172.6,
      targetCover: 2900,
      residualKgDmHa: 1550,
      roundLength: 20,
      paddockToleranceHa: 0,
      schedule: { am: "05:00", pm: "17:00" },
    },
    herds: [
      {
        id: prefix + "h1",
        name: "Heifers",
        animals: 100,
        stockClass: "Heifers",
        colour: "green",
        targetKgDMDay: 16,
      },
      {
        id: prefix + "h2",
        name: "Mixed age",
        animals: 200,
        stockClass: "Mixed age",
        colour: "blue",
        targetKgDMDay: 18,
      },
    ],
    paddocks: [
      {
        id: prefix + "p1",
        name: "Front",
        hectares: 10,
        herdId: prefix + "h1",
        excluded: false,
        exclusionReason: "",
        otherReason: "",
      },
      {
        id: prefix + "p2",
        name: "River",
        hectares: 20,
        herdId: prefix + "h2",
        excluded: false,
        exclusionReason: "",
        otherReason: "",
      },
      {
        id: prefix + "p3",
        name: "Crop",
        hectares: 5,
        herdId: "",
        excluded: true,
        exclusionReason: "crop",
        otherReason: "",
      },
      {
        id: prefix + "p4",
        name: "Young",
        hectares: 2,
        herdId: "",
        excluded: true,
        exclusionReason: "young-grass",
        otherReason: "",
      },
    ],
    crops: [
      {
        id: prefix + "c1",
        paddockId: prefix + "p3",
        herdId: prefix + "h2",
        cropType: "Kale",
        otherCropType: "",
        yieldKgDMHa: 18000,
        kgDMPerAnimalDay: 5,
        startDate: "2026-10-05",
      },
    ],
    planner: {
      orders: {
        [prefix + "h1"]: {
          startDate: "2026-10-05",
          paddockIds: [prefix + "p1"],
        },
        [prefix + "h2"]: {
          startDate: "2026-10-05",
          paddockIds: [prefix + "p2"],
        },
      },
    },
  };
}

module.exports = { exampleFarm };
