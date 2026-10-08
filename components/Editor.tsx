import React, { useRef, useState } from "react";
import {
  Camera,
  Check,
  Circle,
  FileImage,
  ImagePlus,
  Leaf,
  Maximize2,
  Pin,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { CollectionData, Insect } from "../types";
import { blankSpecimen, checks, specimenName } from "../services/collection";
import { resizeImageFile } from "../services/imageUtils";
import { Dialog } from "./Dialog";
import { ImageEditor } from "./ImageEditor";
import { PinningCanvas } from "./PinningCanvas";
const orders = [
  "Coleoptera",
  "Diptera",
  "Hemiptera",
  "Hymenoptera",
  "Lepidoptera",
  "Orthoptera",
  "Odonata",
  "Dermaptera",
  "Blattodea",
  "Mantodea",
  "Phasmatodea",
  "Neuroptera",
  "Mecoptera",
  "Trichoptera",
  "Ephemeroptera",
  "Plecoptera",
  "Psocodea",
  "Siphonaptera",
  "Thysanoptera",
  "Zygentoma",
  "Archaeognatha",
  "Raphidioptera",
  "Megaloptera",
  "Strepsiptera",
  "Embioptera",
  "Grylloblattodea",
  "Mantophasmatodea",
  "Zoraptera",
];
const methods = [
  "Field observation / live release",
  "Found dead specimen",
  "Existing teaching image",
  "Museum or reference collection",
  "Other non-lethal source",
];
interface Props {
  collection: CollectionData;
  drawerId: string;
  slotIndex: number;
  initialData: Insect | null;
  onSave: (data: Insect) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}
export function Editor({
  collection,
  drawerId,
  slotIndex,
  initialData,
  onSave,
  onClose,
  onDelete,
  readOnly = false,
}: Props) {
  const [draft, setDraft] = useState<Insect>(() =>
    initialData
      ? { ...initialData }
      : blankSpecimen(drawerId, slotIndex, collection.studentName),
  );
  const [tab, setTab] = useState("photograph");
  const [dirty, setDirty] = useState(false);
  const [studio, setStudio] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mainInput = useRef<HTMLInputElement>(null),
    fieldInput = useRef<HTMLInputElement>(null);
  const update = (key: keyof Insect, value: any) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };
  const close = () => {
    if (
      readOnly ||
      !dirty ||
      confirm("Discard the unsaved changes to this specimen?")
    )
      onClose();
  };
  const field = (
    key: keyof Insect,
    label: string,
    opts: {
      type?: string;
      placeholder?: string;
      wide?: boolean;
      area?: boolean;
      hint?: string;
    } = {},
  ) => (
    <label className={`field ${opts.wide ? "span-2" : ""}`} key={key}>
      <span>{label}</span>
      {opts.area ? (
        <textarea
          aria-label={label}
          disabled={readOnly}
          rows={4}
          value={String(draft[key] || "")}
          onChange={(e) => update(key, e.target.value)}
          placeholder={opts.placeholder}
        />
      ) : (
        <input
          aria-label={label}
          disabled={readOnly}
          type={opts.type || "text"}
          value={String(draft[key] || "")}
          onChange={(e) => update(key, e.target.value)}
          placeholder={opts.placeholder}
          list={key === "order" ? "insect-orders" : undefined}
          max={
            opts.type === "date"
              ? new Date().toLocaleDateString("en-CA")
              : undefined
          }
        />
      )}{" "}
      {opts.hint && <small>{opts.hint}</small>}
    </label>
  );
  const select = (key: keyof Insect, label: string, options: string[]) => (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        disabled={readOnly}
        value={String(draft[key] || "")}
        onChange={(e) => update(key, e.target.value)}
      >
        <option value="">Not recorded</option>
        {[
          ...new Set([
            ...options,
            ...(draft[key] && !options.includes(String(draft[key]))
              ? [String(draft[key])]
              : []),
          ]),
        ].map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  const upload = async (files: FileList | null, context = false) => {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      if (context) {
        if (draft.fieldPhotos.length + files.length > 6)
          throw new Error("Keep up to six supporting photographs per record.");
        const result = await Promise.all(
          Array.from(files).map((f) =>
            resizeImageFile(f, {
              maxDimension: 1400,
              quality: 0.86,
              preservePng: false,
            }),
          ),
        );
        update("fieldPhotos", [...draft.fieldPhotos, ...result]);
      } else {
        const src = await resizeImageFile(files[0], {
          maxDimension: 1800,
          quality: 0.9,
          preservePng: true,
        });
        setDraft((d) => ({
          ...d,
          imageUrl: src,
          originalImageUrl: src,
          pinPosition: null,
        }));
        setDirty(true);
        setPinMode(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The image could not be read.");
    } finally {
      setBusy(false);
      if (mainInput.current) mainInput.current.value = "";
      if (fieldInput.current) fieldInput.current.value = "";
    }
  };
  const checklist = checks(draft);
  return (
    <Dialog
      title={
        readOnly
          ? "Review specimen"
          : initialData
            ? "Edit specimen"
            : "Add specimen"
      }
      onClose={close}
      wide
    >
      {studio ? (
        <ImageEditor
          src={draft.imageUrl!}
          onCancel={() => setStudio(false)}
          onSave={(src) => {
            setDraft((d) => ({ ...d, imageUrl: src, pinPosition: null }));
            setDirty(true);
            setStudio(false);
            setPinMode(false);
          }}
        />
      ) : (
        <>
          <div className="editor-content">
            <aside className="specimen-preview">
              <div className="row-between">
                <span className="eyebrow">
                  SPECIMEN {String(slotIndex + 1).padStart(2, "0")}
                </span>
                <span className="tag">
                  {
                    collection.drawers.find((d) => d.id === draft.drawerId)
                      ?.title
                  }
                </span>
              </div>
              <div
                className="specimen-stage"
                onDragOver={(e) => {
                  if (!readOnly) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!readOnly && !busy) upload(e.dataTransfer.files);
                }}
              >
                {draft.imageUrl ? (
                  <>
                    <PinningCanvas
                      key={draft.imageUrl}
                      imageUrl={draft.imageUrl}
                      pinPosition={draft.pinPosition}
                      onPinPlace={(p) => update("pinPosition", p)}
                      readOnly={readOnly || !pinMode}
                    />
                    <button
                      className="icon-button expand-photo"
                      aria-label="Enlarge specimen photograph"
                      onClick={() => setZoom(draft.imageUrl)}
                    >
                      <Maximize2 size={18} />
                    </button>
                  </>
                ) : (
                  <button
                    className="upload-zone"
                    disabled={readOnly || busy}
                    onClick={() => mainInput.current?.click()}
                  >
                    <Camera size={38} strokeWidth={1.3} />
                    <strong>
                      {busy
                        ? "Preparing photograph…"
                        : "Add a specimen photograph"}
                    </strong>
                    <span>Choose an image or drop it here</span>
                    <small>JPEG, PNG, WebP or GIF · up to 25 MB</small>
                  </button>
                )}
              </div>
              <div className="paper-label">
                <div className="label-rule" />
                <strong className={draft.genus ? "scientific" : ""}>
                  {specimenName(draft)}
                </strong>
                <span>
                  {draft.commonName ||
                    draft.order ||
                    "Identification in progress"}
                </span>
                <span>{draft.location || "Locality not recorded"}</span>
                <span>
                  {draft.dateCaught || "Date not recorded"} ·{" "}
                  {draft.collector || "Observer not recorded"}
                </span>
              </div>
              {draft.imageUrl && !readOnly && (
                <div className="image-actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => mainInput.current?.click()}
                  >
                    <ImagePlus size={16} /> Replace
                  </button>
                  <button className="button" onClick={() => setStudio(true)}>
                    <FileImage size={16} /> Prepare image
                  </button>
                </div>
              )}
              <input
                ref={mainInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="visually-hidden"
                aria-label="Upload specimen photograph"
                onChange={(e) => upload(e.target.files)}
              />
              {busy && <p role="status">Preparing photograph…</p>}
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
            </aside>
            <section className="specimen-fields">
              <div
                className="editor-tabs"
                role="tablist"
                aria-label="Specimen details"
              >
                {[
                  ["photograph", "Photograph"],
                  ["identification", "Identification"],
                  ["field", "Field record"],
                  ["evidence", "Evidence & notes"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    id={`tab-${id}`}
                    role="tab"
                    aria-selected={tab === id}
                    aria-controls="editor-panel"
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className="editor-panel"
                id="editor-panel"
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
              >
                {tab === "photograph" && (
                  <>
                    <label className="field">
                      <span>Collection drawer</span>
                      <select
                        disabled={readOnly}
                        aria-label="Collection drawer"
                        value={draft.drawerId}
                        onChange={(e) => update("drawerId", e.target.value)}
                      >
                        {collection.drawers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <h3>A record of the insect you observed</h3>
                    <p className="muted">
                      Use a clear photograph that shows the features needed for
                      identification. Background cleanup is optional.
                    </p>
                    <div className="field-grid">
                      {select("captureMethod", "Source of specimen", methods)}
                      {field("imageCredit", "Photographer / image credit")}
                      {field("sourceUrl", "Image source or record URL", {
                        type: "url",
                        wide: true,
                        placeholder: "https://…",
                        hint: "For a borrowed image, include its source and check permission to reuse it.",
                      })}
                      {field("ethicalNotes", "Observation and handling notes", {
                        area: true,
                        wide: true,
                        placeholder:
                          "How was the insect observed or obtained? Was any handling necessary? For reference images, describe their provenance.",
                      })}
                    </div>
                    <div className="pin-section">
                      <div>
                        <h4>
                          <Pin size={17} /> Virtual pinning
                        </h4>
                        <p className="caption">
                          Use this if your assignment includes mounting
                          conventions. A photographic record can also be saved
                          without a pin.
                        </p>
                      </div>
                      {!readOnly && (
                        <div className="button-row">
                          <button
                            className={`button ${pinMode ? "primary" : ""}`}
                            disabled={!draft.imageUrl}
                            aria-pressed={pinMode}
                            onClick={() => setPinMode(!pinMode)}
                          >
                            {pinMode
                              ? "Finish pin placement"
                              : "Place / adjust pin"}
                          </button>
                          {draft.pinPosition && (
                            <button
                              className="button"
                              onClick={() => {
                                update("pinPosition", null);
                                setPinMode(false);
                              }}
                            >
                              Remove pin
                            </button>
                          )}
                        </div>
                      )}
                      {pinMode && (
                        <p className="notice">
                          Click the photograph to place the virtual pin.
                          Appropriate placement depends on the insect group; use
                          your course guidance.
                        </p>
                      )}
                      {field("pinningNotes", "Mounting rationale", {
                        area: true,
                        wide: true,
                        placeholder:
                          "If used, explain why this mounting position is appropriate.",
                      })}
                    </div>
                    {draft.originalImageUrl && (
                      <div className="button-row">
                        <button
                          className="button subtle"
                          onClick={() => setZoom(draft.originalImageUrl!)}
                        >
                          <Maximize2 size={16} /> View original photograph
                        </button>
                        {!readOnly &&
                          draft.imageUrl !== draft.originalImageUrl && (
                            <button
                              className="button subtle"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Restore the original photograph? This clears the virtual pin.",
                                  )
                                ) {
                                  setDraft((d) => ({
                                    ...d,
                                    imageUrl: d.originalImageUrl!,
                                    pinPosition: null,
                                  }));
                                  setDirty(true);
                                }
                              }}
                            >
                              <RotateCcw size={16} /> Restore original
                            </button>
                          )}
                      </div>
                    )}
                  </>
                )}
                {tab === "identification" && (
                  <>
                    <h3>Identify as far as the evidence allows</h3>
                    <p className="muted">
                      Order or family may be the most defensible identification.
                      Leave ranks blank when they cannot be resolved.
                    </p>
                    <datalist id="insect-orders">
                      {orders.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                    <div className="field-grid">
                      {field("phylum", "Phylum")}
                      {field("class", "Class")}
                      {field("order", "Order", {
                        placeholder: "Select or type an order",
                      })}
                      {field("suborder", "Suborder")}
                      {field("family", "Family")}
                      {field("genus", "Genus")}
                      {field("species", "Specific epithet", {
                        placeholder: "e.g. septempunctata",
                      })}
                      {field("authority", "Taxonomic authority")}
                      {field("commonName", "Common name", { wide: true })}
                      {field("identifier", "Identified by")}
                      {select("identificationConfidence", "Confidence", [
                        "High",
                        "Medium",
                        "Low",
                      ])}
                    </div>
                  </>
                )}
                {tab === "field" && (
                  <>
                    <h3>The collection label</h3>
                    <p className="muted">
                      Record when, where and by whom the insect was observed.
                      For teaching or museum images, preserve the original label
                      data where available.
                    </p>
                    <div className="field-grid">
                      {field("dateCaught", "Observation / collection date", {
                        type: "date",
                      })}
                      {field("collector", "Observer / original collector")}
                      {field("location", "Locality", {
                        wide: true,
                        placeholder: "Site, town, county and country",
                      })}
                      {field("gridReference", "Grid reference / coordinates", {
                        wide: true,
                      })}
                      {field("habitat", "Habitat")}
                      {field("microhabitat", "Microhabitat / host plant")}
                      {select("lifeStage", "Life stage", [
                        "Adult",
                        "Larva",
                        "Nymph",
                        "Pupa",
                        "Egg",
                        "Unknown",
                      ])}
                      {select("sex", "Sex / morph", [
                        "Female",
                        "Male",
                        "Worker",
                        "Queen",
                        "Unknown",
                      ])}
                    </div>
                    <h4>Supporting photographs</h4>
                    <p className="caption">
                      Add other views, diagnostic details or habitat context. Up
                      to six photographs.
                    </p>
                    <div className="context-photos">
                      {draft.fieldPhotos.map((src, n) => (
                        <div key={n}>
                          <button
                            className="photo-thumb"
                            onClick={() => setZoom(src)}
                            aria-label={`Enlarge supporting photograph ${n + 1}`}
                          >
                            <img
                              src={src}
                              alt={`Supporting photograph ${n + 1}`}
                            />
                          </button>
                          {!readOnly && (
                            <button
                              className="remove-photo"
                              aria-label={`Remove supporting photograph ${n + 1}`}
                              onClick={() =>
                                update(
                                  "fieldPhotos",
                                  draft.fieldPhotos.filter((_, i) => i !== n),
                                )
                              }
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {!readOnly && (
                      <button
                        className="button"
                        disabled={busy || draft.fieldPhotos.length >= 6}
                        onClick={() => fieldInput.current?.click()}
                      >
                        <ImagePlus size={17} /> Add supporting photos
                      </button>
                    )}
                    <input
                      className="visually-hidden"
                      ref={fieldInput}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      aria-label="Upload supporting photographs"
                      onChange={(e) => upload(e.target.files, true)}
                    />
                  </>
                )}
                {tab === "evidence" && (
                  <>
                    <h3>Show your identification reasoning</h3>
                    <p className="muted">
                      Describe the features visible in your photographs and
                      explain how they support your identification.
                    </p>
                    <div className="field-grid">
                      {field(
                        "identificationNotes",
                        "Diagnostic features and uncertainty",
                        {
                          area: true,
                          wide: true,
                          placeholder:
                            "Which characters support the identification? What remains uncertain or would need closer examination?",
                        },
                      )}
                      {field(
                        "identificationReference",
                        "Key, guide or reference used",
                        {
                          area: true,
                          wide: true,
                          placeholder:
                            "Include title / author and relevant pages, key couplets or a link. Record any independent verification.",
                        },
                      )}
                      {field(
                        "evolutionaryHistory",
                        "Ecology and evolutionary context",
                        {
                          area: true,
                          wide: true,
                          placeholder:
                            "Add relevant ecological or evolutionary notes and cite sources, as required by your assignment.",
                        },
                      )}
                    </div>
                    <div className="record-checks">
                      <h4>
                        Record checks · {checklist.filter((c) => c.ok).length} /{" "}
                        {checklist.length}
                      </h4>
                      <p className="caption">
                        These check whether information is present. They do not
                        verify identification, accuracy or assignment marks.
                      </p>
                      {checklist.map((c) => (
                        <div
                          key={c.label}
                          className={c.ok ? "check complete" : "check"}
                        >
                          {c.ok ? <Check size={16} /> : <Circle size={15} />}
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
          <footer className="editor-footer">
            <div>
              {readOnly ? (
                <span className="tag">Read-only review</span>
              ) : (
                <span className="caption">
                  {checklist.filter((c) => c.ok).length} of {checklist.length}{" "}
                  record checks · drafts can be saved
                </span>
              )}
            </div>
            <div className="button-row">
              {initialData && !readOnly && (
                <button
                  className="button danger subtle"
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this specimen and its photographs from this collection?",
                      )
                    )
                      onDelete(initialData.id);
                  }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button className="button" onClick={close}>
                {readOnly ? "Close" : "Cancel"}
              </button>
              {!readOnly && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => {
                    onSave(draft);
                  }}
                >
                  <Save size={17} /> Save specimen
                </button>
              )}
            </div>
          </footer>
        </>
      )}
      {zoom && (
        <Dialog title="Photograph" onClose={() => setZoom(null)} wide>
          <div className="zoom-photo">
            <img src={zoom} alt="Enlarged specimen photograph" />
          </div>
        </Dialog>
      )}
    </Dialog>
  );
}
