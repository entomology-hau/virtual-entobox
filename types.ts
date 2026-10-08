export interface PinPosition {
  x: number;
  y: number;
}
export interface Drawer {
  id: string;
  title: string;
  slotCount: number;
  isCollapsed: boolean;
}
export type IdentificationConfidence = "High" | "Medium" | "Low" | "";
export type EthicalCaptureMethod =
  | "Field observation / live release"
  | "Found dead specimen"
  | "Existing teaching image"
  | "Museum or reference collection"
  | "Other non-lethal source"
  | "";
export interface Insect {
  id: string;
  drawerId: string;
  slotIndex: number;
  imageUrl: string | null;
  originalImageUrl?: string | null;
  phylum: string;
  class: string;
  order: string;
  suborder: string;
  family: string;
  genus: string;
  species: string;
  commonName: string;
  authority: string;
  dateCaught: string;
  location: string;
  collector: string;
  habitat?: string;
  microhabitat?: string;
  lifeStage?: string;
  sex?: string;
  identifier?: string;
  identificationConfidence?: IdentificationConfidence;
  identificationNotes?: string;
  identificationReference?: string;
  captureMethod?: EthicalCaptureMethod;
  ethicalNotes?: string;
  pinningNotes?: string;
  imageCredit?: string;
  sourceUrl?: string;
  gridReference?: string;
  evolutionaryHistory: string;
  pinPosition: PinPosition | null;
  fieldPhotos: string[];
}
export interface CollectionData {
  schemaVersion?: number;
  collectionId?: string;
  title: string;
  studentName: string;
  studentId: string;
  drawers: Drawer[];
  insects: Insect[];
  lastSaved: string;
  drawerTitle?: string;
}
