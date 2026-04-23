export type ChecklistItem = {
  key: string;
  label: string;
  kind: "text" | "number" | "select" | "textarea";
  options?: string[];
  hint?: string;
};
export type ChecklistSection = {
  key: string;
  title: string;
  items: ChecklistItem[];
};

export const URAR_1004_CHECKLIST: ChecklistSection[] = [
  {
    key: "site",
    title: "Site",
    items: [
      { key: "lot_size", label: "Lot size (sqft)", kind: "number" },
      { key: "view", label: "View", kind: "select", options: ["N;Res", "B;Water", "B;Mountain", "A;Park", "A;Golf"] },
      { key: "topography", label: "Topography", kind: "text", hint: "Level, sloped, etc." },
      { key: "zoning", label: "Zoning", kind: "text" },
      { key: "utilities", label: "Utilities", kind: "textarea", hint: "Public water/sewer/electric/gas" },
    ],
  },
  {
    key: "exterior",
    title: "Exterior",
    items: [
      { key: "year_built", label: "Year built", kind: "number" },
      { key: "construction", label: "Construction", kind: "select", options: ["Frame", "Masonry", "CBS", "Log", "Modular"] },
      { key: "foundation", label: "Foundation", kind: "select", options: ["Slab", "Crawl", "Basement", "Post/Pier"] },
      { key: "exterior_walls", label: "Exterior walls", kind: "text" },
      { key: "roof", label: "Roof covering", kind: "text" },
      { key: "condition_exterior", label: "Overall exterior condition", kind: "select", options: ["C1", "C2", "C3", "C4", "C5", "C6"] },
    ],
  },
  {
    key: "interior",
    title: "Interior",
    items: [
      { key: "flooring", label: "Flooring", kind: "textarea", hint: "List all types" },
      { key: "walls", label: "Wall finishes", kind: "text" },
      { key: "trim", label: "Trim/finish", kind: "text" },
      { key: "condition_interior", label: "Overall interior condition", kind: "select", options: ["C1", "C2", "C3", "C4", "C5", "C6"] },
      { key: "quality", label: "Overall quality", kind: "select", options: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"] },
    ],
  },
  {
    key: "kitchen",
    title: "Kitchen",
    items: [
      { key: "cabinets", label: "Cabinets", kind: "text" },
      { key: "countertops", label: "Countertops", kind: "text" },
      { key: "appliances", label: "Appliances", kind: "textarea" },
      { key: "updated", label: "Updated?", kind: "select", options: ["No", "Partial", "Full remodel"] },
    ],
  },
  {
    key: "bath",
    title: "Bath(s)",
    items: [
      { key: "full_baths", label: "Full baths", kind: "number" },
      { key: "half_baths", label: "Half baths", kind: "number" },
      { key: "fixtures_condition", label: "Fixtures condition", kind: "select", options: ["C1", "C2", "C3", "C4", "C5"] },
    ],
  },
  {
    key: "basement",
    title: "Basement",
    items: [
      { key: "basement_present", label: "Basement present?", kind: "select", options: ["None", "Partial", "Full"] },
      { key: "basement_finished_pct", label: "Finished %", kind: "number" },
      { key: "basement_entry", label: "Entry", kind: "select", options: ["Interior", "Walk-out", "Walk-up"] },
    ],
  },
  {
    key: "mechanical",
    title: "Mechanical",
    items: [
      { key: "heat", label: "Heat type", kind: "select", options: ["FWA", "HWBB", "Radiant", "Heat pump", "Wall"] },
      { key: "cooling", label: "Cooling", kind: "select", options: ["Central", "Wall", "None", "Mini-split"] },
      { key: "water_heater_age", label: "Water heater age (yrs)", kind: "number" },
    ],
  },
  {
    key: "garage",
    title: "Garage / Parking",
    items: [
      { key: "garage_type", label: "Garage type", kind: "select", options: ["Attached", "Detached", "Carport", "None"] },
      { key: "garage_stalls", label: "Stalls", kind: "number" },
    ],
  },
];
