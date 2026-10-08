import { CollectionData, Drawer, Insect } from "../types";
export const SCHEMA = 3;
export const createDrawer = (title = "Drawer 01"): Drawer => ({
  id: crypto.randomUUID(),
  title,
  slotCount: 8,
  isCollapsed: false,
});
export const createCollection = (): CollectionData => ({
  schemaVersion: SCHEMA,
  collectionId: crypto.randomUUID(),
  title: "My insect collection",
  studentName: "",
  studentId: "",
  drawers: [createDrawer()],
  insects: [],
  lastSaved: new Date().toISOString(),
});
export const specimenName = (i: Insect) =>
  [i.genus, i.species].filter(Boolean).join(" ") ||
  i.family ||
  i.order ||
  i.commonName ||
  "Unidentified specimen";
export const checks = (i: Insect) => [
  { label: "Specimen photograph", ok: !!i.imageUrl },
  {
    label: "Order or family recorded",
    ok: !!(i.order.trim() || i.family.trim()),
  },
  {
    label: "Date, locality and observer",
    ok: !!(i.dateCaught && i.location.trim() && i.collector.trim()),
  },
  {
    label: "Source and handling documented",
    ok: !!(i.captureMethod && i.ethicalNotes?.trim()),
  },
  {
    label: "Identification evidence and reference",
    ok: !!(i.identificationNotes?.trim() && i.identificationReference?.trim()),
  },
  {
    label: "Identification confidence recorded",
    ok: !!i.identificationConfidence,
  },
];
export const isReady = (i: Insect) => checks(i).every((c) => c.ok);
export const blankSpecimen = (
  drawerId: string,
  slotIndex: number,
  collector = "",
): Insect => ({
  id: crypto.randomUUID(),
  drawerId,
  slotIndex,
  imageUrl: null,
  originalImageUrl: null,
  phylum: "Arthropoda",
  class: "Insecta",
  order: "",
  suborder: "",
  family: "",
  genus: "",
  species: "",
  commonName: "",
  authority: "",
  dateCaught: "",
  location: "",
  collector,
  habitat: "",
  microhabitat: "",
  lifeStage: "",
  sex: "",
  identifier: "",
  identificationConfidence: "",
  identificationNotes: "",
  identificationReference: "",
  captureMethod: "",
  ethicalNotes: "",
  pinningNotes: "",
  imageCredit: "",
  sourceUrl: "",
  gridReference: "",
  evolutionaryHistory: "",
  pinPosition: null,
  fieldPhotos: [],
});
const text = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const image = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  if (
    typeof v === "string" &&
    /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(v)
  )
    return v;
  // Legacy exports may contain remote reference images. Only ordinary HTTPS images are supported.
  if (typeof v === "string" && /^https:\/\//i.test(v)) return v;
  throw new Error(
    "This file contains an unsupported image. Use an unmodified Entobox export.",
  );
};
export function normaliseCollection(raw: unknown): CollectionData {
  if (!object(raw) || !Array.isArray(raw.insects))
    throw new Error(
      "Choose an Entobox collection JSON file containing specimen records.",
    );
  if (raw.schemaVersion > SCHEMA)
    throw new Error(
      "This file was made by a newer Entobox. Update the app before opening it.",
    );
  if (raw.insects.length > 1000 || (raw.drawers?.length || 0) > 100)
    throw new Error(
      "This collection is too large to open (maximum 1,000 specimens and 100 drawers).",
    );
  const drawerIds = new Set<string>();
  const drawers: Drawer[] =
    Array.isArray(raw.drawers) && raw.drawers.length
      ? raw.drawers.map((d: unknown, n: number) => {
          if (!object(d)) throw new Error("A drawer record is invalid.");
          let id = text(d.id) || crypto.randomUUID();
          if (drawerIds.has(id))
            throw new Error("This file contains duplicate drawer IDs.");
          drawerIds.add(id);
          return {
            id,
            title: text(d.title, `Drawer ${n + 1}`),
            slotCount: Math.max(
              1,
              Math.min(1000, Math.floor(Number(d.slotCount) || 8)),
            ),
            isCollapsed: !!d.isCollapsed,
          };
        })
      : [createDrawer(text(raw.drawerTitle, "Drawer 01"))];
  const occupied = new Map<string, Set<number>>();
  const ids = new Set<string>();
  const insects = raw.insects.map((v: unknown, n: number) => {
    if (!object(v)) throw new Error(`Specimen ${n + 1} is not a valid record.`);
    const drawer = drawers.find((d) => d.id === v.drawerId) || drawers[0];
    const i = blankSpecimen(
      drawer.id,
      Number.isInteger(v.slotIndex) && v.slotIndex >= 0 && v.slotIndex < 1000
        ? v.slotIndex
        : n,
    );
    for (const k of Object.keys(i))
      if (typeof i[k] === "string") i[k] = text(v[k], i[k]);
    i.id = text(v.id) || crypto.randomUUID();
    if (ids.has(i.id)) i.id = crypto.randomUUID();
    ids.add(i.id);
    i.drawerId = drawer.id;
    const used = occupied.get(drawer.id) || new Set<number>();
    while (used.has(i.slotIndex)) i.slotIndex++;
    used.add(i.slotIndex);
    occupied.set(drawer.id, used);
    drawer.slotCount = Math.max(drawer.slotCount, i.slotIndex + 1);
    i.imageUrl = image(v.imageUrl);
    i.originalImageUrl = image(v.originalImageUrl);
    i.fieldPhotos = Array.isArray(v.fieldPhotos)
      ? v.fieldPhotos.map(image).filter(Boolean)
      : [];
    const p = v.pinPosition;
    i.pinPosition =
      object(p) && Number.isFinite(p.x) && Number.isFinite(p.y)
        ? {
            x: Math.max(0, Math.min(100, p.x)),
            y: Math.max(0, Math.min(100, p.y)),
          }
        : null;
    return i;
  });
  return {
    schemaVersion: SCHEMA,
    collectionId: text(raw.collectionId) || crypto.randomUUID(),
    title: text(raw.title, "My insect collection"),
    studentName: text(raw.studentName),
    studentId: text(raw.studentId),
    drawers,
    insects,
    lastSaved: text(raw.lastSaved) || new Date().toISOString(),
  };
}
export const filename = (s: string) =>
  s.replace(/[^a-z0-9_-]/gi, "_").slice(0, 90) || "Entobox_collection";
export function download(data: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportJSON(c: CollectionData) {
  download(
    JSON.stringify(c, null, 2),
    filename(`${c.studentId || "Entobox"}_${c.title}`) + ".json",
    "application/json",
  );
}
export function toCSV(c: CollectionData) {
  const columns = [
    "Record",
    "Drawer",
    "Scientific name",
    "Common name",
    "Phylum",
    "Class",
    "Order",
    "Suborder",
    "Family",
    "Genus",
    "Species",
    "Authority",
    "Date",
    "Locality",
    "Grid reference",
    "Observer",
    "Habitat",
    "Microhabitat",
    "Life stage",
    "Sex",
    "Identifier",
    "Confidence",
    "Identification evidence",
    "Key or reference",
    "Source",
    "Handling notes",
    "Photo credit",
    "Source URL",
    "Pinning rationale",
    "Ecology and evolutionary notes",
    "Record checks",
  ];
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const rows = c.insects.map((i, n) => [
    String(n + 1).padStart(3, "0"),
    c.drawers.find((d) => d.id === i.drawerId)?.title,
    specimenName(i),
    i.commonName,
    i.phylum,
    i.class,
    i.order,
    i.suborder,
    i.family,
    i.genus,
    i.species,
    i.authority,
    i.dateCaught,
    i.location,
    i.gridReference,
    i.collector,
    i.habitat,
    i.microhabitat,
    i.lifeStage,
    i.sex,
    i.identifier,
    i.identificationConfidence,
    i.identificationNotes,
    i.identificationReference,
    i.captureMethod,
    i.ethicalNotes,
    i.imageCredit,
    i.sourceUrl,
    i.pinningNotes,
    i.evolutionaryHistory,
    checks(i).filter((x) => x.ok).length + "/6",
  ]);
  return (
    "\uFEFF" +
    [columns, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")
  );
}
export const formatDate = (s: string) => {
  if (!s) return "Date not recorded";
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  return Number.isNaN(d.getTime())
    ? s
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
};
