import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Eye,
  FileDown,
  FolderOpen,
  Grid2X2,
  Leaf,
  List,
  Moon,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings2,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CollectionData, Drawer, Insect } from "./types";
import {
  checks,
  createCollection,
  createDrawer,
  download,
  exportJSON,
  filename,
  formatDate,
  isReady,
  normaliseCollection,
  specimenName,
  toCSV,
} from "./services/collection";
import {
  legacyCollections,
  loadCollections,
  preference,
  saveCollection,
} from "./services/storage";
import { Editor } from "./components/Editor";
import { Dialog } from "./components/Dialog";
import "./styles.css";

type View = "drawer" | "records" | "guide";
export default function App() {
  const [data, setData] = useState<CollectionData>(() => createCollection());
  const [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState("Opening collection…");
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [dark, setDark] = useState(() => preference("theme") === "dark");
  const [view, setView] = useState<View>("drawer"),
    [query, setQuery] = useState(""),
    [order, setOrder] = useState(""),
    [needsWork, setNeedsWork] = useState(false),
    [selectedDrawer, setSelectedDrawer] = useState("all");
  const [editing, setEditing] = useState<{
    drawerId: string;
    slotIndex: number;
    insect: Insect | null;
  } | null>(null);
  const [review, setReview] = useState<CollectionData | null>(null);
  const [library, setLibrary] = useState<CollectionData[] | null>(null),
    [settings, setSettings] = useState(false);
  const [drawerSettings, setDrawerSettings] = useState<Drawer | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [profile, setProfile] = useState({
    title: "",
    studentName: "",
    studentId: "",
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const importMode = useRef<"edit" | "review">("edit");
  const saveSequence = useRef(0);
  const c = review || data;
  const readOnly = !!review;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: CollectionData[] = [];
      try {
        stored = await loadCollections();
      } catch {
        setStorageError(
          "This browser cannot save collections. Export a backup before leaving.",
        );
      }
      const legacy = legacyCollections();
      const existing = new Set(stored.map((x) => x.collectionId));
      const recovered = legacy.collections.filter(
        (x) => !existing.has(x.collectionId),
      );
      const available = [...stored, ...recovered];
      const last = preference("active");
      const chosen =
        available.find((x) => x.collectionId === last) ||
        available[0] ||
        createCollection();
      if (!cancelled) {
        setData(chosen);
        setReady(true);
        if (recovered.length)
          setNotice(
            `${recovered.length} collection${recovered.length === 1 ? " was" : "s were"} found from the earlier Entobox. Open Collections to access them.`,
          );
        if (legacy.failed)
          setStorageError(
            "Some older saved data could not be read. It has been left unchanged. Open an exported JSON backup if you have one.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    preference("theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    if (!ready) return;
    const sequence = ++saveSequence.current;
    setSaveStatus("Saving…");
    saveCollection(data)
      .then(() => {
        if (sequence === saveSequence.current) {
          setSaveStatus("Saved on this device");
          setStorageError((previous) =>
            previous.startsWith("Some older") ? previous : "",
          );
          preference("active", data.collectionId!);
        }
      })
      .catch(() => {
        if (sequence === saveSequence.current) {
          setSaveStatus("Not saved");
          setStorageError(
            "Your changes could not be saved on this device. Export a JSON backup now to keep your work.",
          );
        }
      });
  }, [data, ready]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 8500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (saveStatus === "Saving…" || saveStatus === "Not saved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [saveStatus]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportMenu(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const change = (fn: (d: CollectionData) => CollectionData) =>
    setData((d) => ({
      ...fn(d),
      schemaVersion: 3,
      lastSaved: new Date().toISOString(),
    }));
  const clearFilters = () => {
    setQuery("");
    setOrder("");
    setNeedsWork(false);
    setSelectedDrawer("all");
  };
  const allOrders = useMemo(
    () => [...new Set(c.insects.map((i) => i.order).filter(Boolean))].sort(),
    [c.insects],
  );
  const families = new Set(
    c.insects.map((i) => i.family.toLowerCase()).filter(Boolean),
  ).size;
  const complete = c.insects.filter(isReady).length;
  const filtered = c.insects.filter((i) => {
    const haystack = [
      specimenName(i),
      i.commonName,
      i.order,
      i.family,
      i.location,
      i.habitat,
      i.collector,
      i.identificationNotes,
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!query.trim() || haystack.includes(query.trim().toLowerCase())) &&
      (!order || i.order === order) &&
      (!needsWork || !isReady(i)) &&
      (selectedDrawer === "all" || i.drawerId === selectedDrawer)
    );
  });
  const hasFilter = !!(query.trim() || order || needsWork);
  const displayedDrawers = c.drawers.filter(
    (d) => selectedDrawer === "all" || d.id === selectedDrawer,
  );
  const nextSlot = (drawer: Drawer, list = c.insects) => {
    const used = new Set(
      list.filter((i) => i.drawerId === drawer.id).map((i) => i.slotIndex),
    );
    let n = 0;
    while (used.has(n)) n++;
    return n;
  };
  const addSpecimen = (drawerId?: string, slot?: number) => {
    if (readOnly) return;
    if (c.insects.length >= 1000) {
      setNotice(
        "This collection has reached 1,000 specimens. Start another collection to add more.",
      );
      return;
    }
    const d =
      c.drawers.find(
        (x) =>
          x.id ===
          (drawerId || (selectedDrawer === "all" ? "" : selectedDrawer)),
      ) || c.drawers[0];
    if (!d) return;
    setEditing({
      drawerId: d.id,
      slotIndex: slot ?? nextSlot(d),
      insect: null,
    });
  };
  const saveSpecimen = (i: Insect) => {
    change((d) => {
      let record = i;
      const old = d.insects.find((x) => x.id === i.id);
      const drawer = d.drawers.find((x) => x.id === i.drawerId) || d.drawers[0];
      if (
        (old && old.drawerId !== drawer.id) ||
        d.insects.some(
          (x) =>
            x.id !== i.id &&
            x.drawerId === drawer.id &&
            x.slotIndex === i.slotIndex,
        )
      )
        record = { ...i, slotIndex: nextSlot(drawer, d.insects) };
      record = { ...record, drawerId: drawer.id };
      return {
        ...d,
        insects: [...d.insects.filter((x) => x.id !== record.id), record],
        drawers: d.drawers.map((x) =>
          x.id === drawer.id
            ? { ...x, slotCount: Math.max(x.slotCount, record.slotIndex + 1) }
            : x,
        ),
      };
    });
    setEditing(null);
    setNotice("Specimen saved.");
  };
  const openLibrary = async () => {
    try {
      const saved = await loadCollections();
      const old = legacyCollections().collections;
      const map = new Map(
        [...old, ...saved, data].map((x) => [x.collectionId, x]),
      );
      setLibrary([...map.values()]);
    } catch {
      setLibrary([
        data,
        ...legacyCollections().collections.filter(
          (x) => x.collectionId !== data.collectionId,
        ),
      ]);
    }
  };
  const chooseFile = (mode: "edit" | "review") => {
    importMode.current = mode;
    fileInput.current?.click();
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 150 * 1024 * 1024)
        throw new Error(
          "This file is larger than 150 MB. Use a smaller exported collection.",
        );
      const loaded = normaliseCollection(JSON.parse(await file.text()));
      if (importMode.current === "review") {
        setReview(loaded);
        setNotice(
          "Opened for read-only review. Your own collection is unchanged.",
        );
      } else {
        loaded.collectionId = crypto.randomUUID();
        loaded.lastSaved = new Date().toISOString();
        setReview(null);
        setData(loaded);
        setNotice("Collection opened as a separate editable copy.");
      }
      setLibrary(null);
      clearFilters();
      setView("drawer");
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "The collection file could not be opened.",
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  const exportCollection = () => {
    exportJSON(c);
    setExportMenu(false);
    setNotice(
      "Collection file downloaded with photographs. Keep a backup and submit the JSON file through your VLE.",
    );
  };
  const newCollection = () => {
    setData(createCollection());
    setReview(null);
    setLibrary(null);
    clearFilters();
    setView("drawer");
  };
  const renameDrawer = () => {
    if (!drawerSettings) return;
    const min = Math.max(
      1,
      ...c.insects
        .filter((i) => i.drawerId === drawerSettings.id)
        .map((i) => i.slotIndex + 1),
    );
    const revised = {
      ...drawerSettings,
      title: drawerSettings.title.trim() || "Untitled drawer",
      slotCount: Math.max(
        min,
        Math.min(1000, Math.floor(drawerSettings.slotCount) || 8),
      ),
    };
    change((d) => ({
      ...d,
      drawers: d.drawers.map((x) => (x.id === revised.id ? revised : x)),
    }));
    setDrawerSettings(null);
  };
  const deleteDrawer = () => {
    if (!drawerSettings || c.drawers.length <= 1) return;
    const count = c.insects.filter(
      (i) => i.drawerId === drawerSettings.id,
    ).length;
    if (
      !confirm(
        `Delete this drawer${count ? ` and its ${count} specimen record${count === 1 ? "" : "s"}` : ""}?`,
      )
    )
      return;
    change((d) => ({
      ...d,
      drawers: d.drawers.filter((x) => x.id !== drawerSettings.id),
      insects: d.insects.filter((x) => x.drawerId !== drawerSettings.id),
    }));
    setDrawerSettings(null);
    setSelectedDrawer("all");
  };
  const showSettings = () => {
    setProfile({
      title: data.title,
      studentName: data.studentName,
      studentId: data.studentId,
    });
    setSettings(true);
  };
  const renderCard = (i: Insect) => (
    <button
      className="specimen-card"
      key={i.id}
      onClick={() =>
        setEditing({ drawerId: i.drawerId, slotIndex: i.slotIndex, insect: i })
      }
      aria-label={`Open ${specimenName(i)}`}
    >
      <div className="specimen-card-top">
        <span className="record-number">
          {String(i.slotIndex + 1).padStart(2, "0")}
        </span>
        <span
          className={`record-status ${isReady(i) ? "complete" : ""}`}
          title={
            isReady(i)
              ? "All record checks filled"
              : "Some record information is missing"
          }
        >
          {isReady(i) ? <CheckCircle2 size={14} /> : <Pencil size={13} />}{" "}
          {isReady(i) ? "Documented" : "Draft"}
        </span>
      </div>
      <div className="card-image">
        {i.imageUrl ? (
          <div className="card-photo-frame">
            <img src={i.imageUrl} alt={specimenName(i)} loading="lazy" />
            {i.pinPosition && (
              <span
                className="virtual-pin"
                style={{
                  left: `${i.pinPosition.x}%`,
                  top: `${i.pinPosition.y}%`,
                }}
                aria-hidden="true"
              />
            )}
          </div>
        ) : (
          <Camera size={38} strokeWidth={1} />
        )}
        {i.pinPosition && (
          <span className="pin-indicator">
            <span /> Virtual pin
          </span>
        )}
      </div>
      <div className="card-label">
        <span className="taxon-order">{i.order || "ORDER UNRECORDED"}</span>
        <h3 className={i.genus ? "scientific" : ""}>{specimenName(i)}</h3>
        <p>{i.commonName || i.family || "Identification in progress"}</p>
        <div className="label-rule" />
        <span>{i.location || "Locality not recorded"}</span>
        <span>{formatDate(i.dateCaught)}</span>
      </div>
    </button>
  );
  if (!ready)
    return (
      <div className="loading">
        <Archive size={32} />
        <h1>Virtual Entobox</h1>
        <p>Opening your collection…</p>
      </div>
    );
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to collection
      </a>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <img src="./logo.png" alt="Entomology at Harper Adams" />
          </div>
          <div>
            <strong>Virtual Entobox</strong>
            <span>HARPER ADAMS UNIVERSITY</span>
          </div>
        </div>
        <div className="top-actions">
          <span
            className={`save-state ${saveStatus === "Not saved" ? "warning" : ""}`}
            role="status"
          >
            {saveStatus === "Saved on this device" ? <Check size={15} /> : null}
            {saveStatus}
          </span>
          <button className="button top-button" aria-label="Collections" onClick={openLibrary}>
            <FolderOpen size={17} />
            <span>Collections</span>
          </button>
          <button
            className="icon-button theme-button"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      {review && (
        <div className="review-banner">
          <span>
            <Eye size={18} />
            <strong>
              Reviewing {review.studentName || "student collection"}
            </strong>
            {review.studentId && ` · ${review.studentId}`} · Read only
          </span>
          <button
            className="button"
            onClick={() => {
              setReview(null);
              clearFilters();
            }}
          >
            Return to my collection
          </button>
        </div>
      )}
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-title">
            <span className="eyebrow">COLLECTION CABINET</span>
            <Archive size={17} />
          </div>
          <button
            className={`side-link ${selectedDrawer === "all" && view !== "guide" ? "active" : ""}`}
            onClick={() => {
              setSelectedDrawer("all");
              if (view === "guide") setView("drawer");
            }}
          >
            <Grid2X2 size={18} />
            <span>All specimens</span>
            <b>{c.insects.length}</b>
          </button>
          <div className="drawer-nav">
            {c.drawers.map((d, n) => (
              <button
                key={d.id}
                className={`side-link ${selectedDrawer === d.id && view !== "guide" ? "active" : ""}`}
                onClick={() => {
                  setSelectedDrawer(d.id);
                  setView("drawer");
                }}
              >
                <span className="drawer-index">
                  {String(n + 1).padStart(2, "0")}
                </span>
                <span>{d.title}</span>
                <b>{c.insects.filter((i) => i.drawerId === d.id).length}</b>
              </button>
            ))}
          </div>
          {!readOnly && (
            <button
              className="side-link add-drawer"
              onClick={() => {
                if (c.drawers.length >= 100) {
                  setNotice("This collection has reached 100 drawers.");
                  return;
                }
                const d = createDrawer(
                  `Drawer ${String(c.drawers.length + 1).padStart(2, "0")}`,
                );
                change((x) => ({ ...x, drawers: [...x.drawers, d] }));
                setSelectedDrawer(d.id);
                setDrawerSettings(d);
                setView("drawer");
              }}
            >
              <Plus size={17} />
              <span>Add drawer</span>
            </button>
          )}
          <div className="sidebar-bottom">
            <button
              className={`side-link ${view === "guide" ? "active" : ""}`}
              onClick={() => setView("guide")}
            >
              <BookOpen size={18} />
              <span>Practical guide</span>
            </button>
            <button className="side-link" onClick={() => chooseFile("review")}>
              <ClipboardCheck size={18} />
              <span>Review a submission</span>
            </button>
            <div className="local-note">
              <Leaf size={21} />
              <strong>A collection through observation</strong>
              <p>
                Photograph, identify and document. Export your collection
                regularly to keep a backup.
              </p>
            </div>
          </div>
        </aside>
        <main id="workspace" className="workspace">
          {storageError && (
            <div className="notice error" role="alert">
              {storageError}
              <button className="button" onClick={exportCollection}>
                <Download size={16} /> Export backup
              </button>
            </div>
          )}
          <div className="collection-heading">
            <div>
              <div className="eyebrow">
                {readOnly ? "STUDENT SUBMISSION" : "YOUR DIGITAL COLLECTION"}
              </div>
              <h1>{c.title || "My insect collection"}</h1>
              <div className="collection-meta">
                {c.studentName || "Student details not added"}
                {c.studentId && ` · ${c.studentId}`}
                {!readOnly && (
                  <button className="text-button" onClick={showSettings}>
                    <Pencil size={13} />
                    {c.studentName ? "Edit details" : "Add your details"}
                  </button>
                )}
              </div>
            </div>
            <div className="heading-actions">
              <div className="export-wrap">
                <button
                  className="button"
                  onClick={() => setExportMenu(!exportMenu)}
                  aria-expanded={exportMenu}
                >
                  <Download size={17} /> Export
                  <ChevronDown size={14} />
                </button>
                {exportMenu && (
                  <>
                    <button
                      className="menu-dismiss"
                      onClick={() => setExportMenu(false)}
                      aria-label="Close export menu"
                    />
                    <div className="export-menu">
                      <button onClick={exportCollection}>
                        <FileDown size={18} />
                        <div>
                          <strong>Collection file (.json)</strong>
                          <small>
                            All records and photographs · backup / submission
                          </small>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          download(
                            toCSV(c),
                            filename(c.title) + ".csv",
                            "text/csv;charset=utf-8",
                          );
                          setExportMenu(false);
                        }}
                      >
                        <List size={18} />
                        <div>
                          <strong>Record table (.csv)</strong>
                          <small>
                            Metadata for a spreadsheet · no photographs
                          </small>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setExportMenu(false);
                          window.print();
                        }}
                      >
                        <Printer size={18} />
                        <div>
                          <strong>Print collection / save PDF</strong>
                          <small>
                            Specimens, labels and identification evidence
                          </small>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
              {!readOnly && (
                <button
                  className="button primary"
                  onClick={() => addSpecimen()}
                >
                  <Plus size={18} /> Add specimen
                </button>
              )}
            </div>
          </div>
          <div className="collection-summary">
            <div>
              <strong>{c.insects.length}</strong>
              <span>Specimens</span>
            </div>
            <div>
              <strong>{allOrders.length}</strong>
              <span>Orders</span>
            </div>
            <div>
              <strong>{families}</strong>
              <span>Families</span>
            </div>
            <button
              onClick={() => {
                setNeedsWork(!needsWork);
                setView("records");
              }}
              title="Show records with missing information"
            >
              <strong>
                {complete}
                <span> / {c.insects.length}</span>
              </strong>
              <span>Records documented</span>
            </button>
            <span className="summary-caption">
              Record checks assess completeness, not accuracy.
            </span>
          </div>
          {view === "guide" ? (
            <Guide onAdd={() => addSpecimen()} readOnly={readOnly} />
          ) : (
            <>
              <div className="collection-toolbar">
                <div className="segmented" aria-label="Collection display">
                  <button
                    className={view === "drawer" ? "active" : ""}
                    aria-pressed={view === "drawer"}
                    onClick={() => setView("drawer")}
                  >
                    <Grid2X2 size={17} /> Drawers
                  </button>
                  <button
                    className={view === "records" ? "active" : ""}
                    aria-pressed={view === "records"}
                    onClick={() => setView("records")}
                  >
                    <List size={17} /> Records
                  </button>
                </div>
                <div className="filters">
                  <label className="search-box">
                    <Search size={17} />
                    <input
                      placeholder="Search specimens…"
                      aria-label="Search specimens"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        aria-label="Clear search"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <select
                    aria-label="Filter by order"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                  >
                    <option value="">All orders</option>
                    {allOrders.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={needsWork}
                      onChange={(e) => setNeedsWork(e.target.checked)}
                    />{" "}
                    Needs details
                  </label>
                </div>
              </div>
              {!c.insects.length && !hasFilter && !readOnly && (
                <section className="first-specimen">
                  <div className="intro-icon">
                    <Camera size={30} strokeWidth={1.4} />
                  </div>
                  <div>
                    <h2>Start with an observation.</h2>
                    <p>
                      Add a photograph, identify the insect and build its
                      collection label. You can save a draft at any stage.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setView("guide")}
                    >
                      Read the practical guide
                    </button>
                  </div>
                  <button className="button" onClick={() => chooseFile("edit")}>
                    <Upload size={17} /> Open existing collection
                  </button>
                </section>
              )}
              {hasFilter && (
                <div className="filter-count">
                  <span>
                    {filtered.length} of {c.insects.length} specimens match
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setQuery("");
                      setOrder("");
                      setNeedsWork(false);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              {view === "drawer" ? (
                <div className="drawers">
                  {displayedDrawers.map((d, n) => {
                    const records = filtered.filter((i) => i.drawerId === d.id);
                    const slots = new Map(records.map((i) => [i.slotIndex, i]));
                    if (hasFilter && !records.length) return null;
                    return (
                      <section className="collection-drawer" key={d.id}>
                        <header className="drawer-heading">
                          <div>
                            <span className="drawer-number">
                              {String(c.drawers.indexOf(d) + 1).padStart(
                                2,
                                "0",
                              )}
                            </span>
                            <h2>{d.title}</h2>
                            <span className="caption">
                              {
                                c.insects.filter((i) => i.drawerId === d.id)
                                  .length
                              }{" "}
                              specimens · {d.slotCount} spaces
                            </span>
                          </div>
                          {!readOnly && (
                            <button
                              className="icon-button"
                              aria-label={`Edit ${d.title}`}
                              onClick={() => setDrawerSettings({ ...d })}
                            >
                              <Settings2 size={18} />
                            </button>
                          )}
                        </header>
                        <div className="specimen-grid">
                          {hasFilter
                            ? records
                                .sort((a, b) => a.slotIndex - b.slotIndex)
                                .map(renderCard)
                            : Array.from({ length: d.slotCount }, (_, n) =>
                                slots.has(n) ? (
                                  renderCard(slots.get(n)!)
                                ) : (
                                  <button
                                    className="empty-slot"
                                    key={`${d.id}-${n}`}
                                    disabled={readOnly}
                                    onClick={() => addSpecimen(d.id, n)}
                                    aria-label={`Add specimen to ${d.title}, space ${n + 1}`}
                                  >
                                    <span className="record-number">
                                      {String(n + 1).padStart(2, "0")}
                                    </span>
                                    <Plus size={25} strokeWidth={1.3} />
                                    <span>
                                      {readOnly
                                        ? "Empty space"
                                        : "Add specimen"}
                                    </span>
                                  </button>
                                ),
                              )}
                        </div>
                      </section>
                    );
                  })}
                  {hasFilter && !filtered.length && (
                    <div className="empty-results">
                      <Search size={28} />
                      <h3>No specimens match these filters</h3>
                      <p>Try another name, locality or insect order.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="records-table-wrap">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Specimen</th>
                        <th>Order / family</th>
                        <th>Locality & date</th>
                        <th>Confidence</th>
                        <th>Record checks</th>
                        <th>
                          <span className="visually-hidden">Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((i) => (
                        <tr key={i.id}>
                          <td>
                            <div className="table-specimen">
                              {i.imageUrl && <img src={i.imageUrl} alt="" />}
                              <div>
                                <strong className={i.genus ? "scientific" : ""}>
                                  {specimenName(i)}
                                </strong>
                                <span>
                                  {i.commonName ||
                                    c.drawers.find((d) => d.id === i.drawerId)
                                      ?.title}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {i.order || "—"}
                            <small>{i.family || "—"}</small>
                          </td>
                          <td>
                            {i.location || "Not recorded"}
                            <small>{formatDate(i.dateCaught)}</small>
                          </td>
                          <td>
                            {i.identificationConfidence || "Not recorded"}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${isReady(i) ? "complete" : ""}`}
                            >
                              {checks(i).filter((x) => x.ok).length} / 6
                            </span>
                          </td>
                          <td>
                            <button
                              className="button compact"
                              onClick={() =>
                                setEditing({
                                  drawerId: i.drawerId,
                                  slotIndex: i.slotIndex,
                                  insect: i,
                                })
                              }
                            >
                              {readOnly ? "View" : "Open"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <div className="empty-results">
                      <Archive size={28} />
                      <h3>
                        {c.insects.length
                          ? "No matching records"
                          : "Your records will appear here"}
                      </h3>
                      <p>
                        {c.insects.length
                          ? "Adjust your filters to see more specimens."
                          : "Add a specimen to begin your collection."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>Virtual Entobox · Entomology at Harper Adams</span>
            <span>
              Saved in this browser · Export JSON to back up or submit
            </span>
          </footer>
        </main>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        aria-label="Open Entobox collection file"
        onChange={(e) => importFile(e.target.files?.[0])}
      />
      {editing && (
        <Editor
          key={editing.insect?.id || `${editing.drawerId}-${editing.slotIndex}`}
          collection={c}
          {...editing}
          initialData={editing.insect}
          onSave={saveSpecimen}
          onClose={() => setEditing(null)}
          onDelete={(id) => {
            change((d) => ({
              ...d,
              insects: d.insects.filter((i) => i.id !== id),
            }));
            setEditing(null);
          }}
          readOnly={readOnly}
        />
      )}
      {settings && (
        <Dialog title="Collection details" onClose={() => setSettings(false)}>
          <form
            className="dialog-body"
            onSubmit={(e) => {
              e.preventDefault();
              change((d) => ({
                ...d,
                ...profile,
                title: profile.title.trim() || "My insect collection",
              }));
              setSettings(false);
            }}
          >
            <label className="field">
              <span>Collection title</span>
              <input
                required
                autoFocus
                value={profile.title}
                onChange={(e) =>
                  setProfile({ ...profile, title: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Your name</span>
              <input
                value={profile.studentName}
                onChange={(e) =>
                  setProfile({ ...profile, studentName: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>Student number</span>
              <input
                value={profile.studentId}
                onChange={(e) =>
                  setProfile({ ...profile, studentId: e.target.value })
                }
              />
            </label>
            <p className="caption">
              These details appear in your exported collection. No account or
              password is needed.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                onClick={() => setSettings(false)}
              >
                Cancel
              </button>
              <button className="button primary">Save details</button>
            </div>
          </form>
        </Dialog>
      )}
      {drawerSettings && (
        <Dialog title="Drawer settings" onClose={() => setDrawerSettings(null)}>
          <form
            className="dialog-body"
            onSubmit={(e) => {
              e.preventDefault();
              renameDrawer();
            }}
          >
            <label className="field">
              <span>Drawer name</span>
              <input
                autoFocus
                value={drawerSettings.title}
                onChange={(e) =>
                  setDrawerSettings({
                    ...drawerSettings,
                    title: e.target.value,
                  })
                }
              />
            </label>
            <label className="field">
              <span>Number of spaces</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={drawerSettings.slotCount}
                onChange={(e) =>
                  setDrawerSettings({
                    ...drawerSettings,
                    slotCount: Number(e.target.value),
                  })
                }
              />
              <small>Occupied spaces are always retained.</small>
            </label>
            <div className="dialog-actions">
              {c.drawers.length > 1 && (
                <button
                  type="button"
                  className="button danger"
                  onClick={deleteDrawer}
                >
                  <Trash2 size={16} /> Delete drawer
                </button>
              )}
              <button className="button primary">Save drawer</button>
            </div>
          </form>
        </Dialog>
      )}
      {library && (
        <Dialog title="Your collections" onClose={() => setLibrary(null)}>
          <div className="dialog-body">
            <p className="muted">
              Collections on this device. Open a JSON file to continue work from
              another browser or computer.
            </p>
            <div className="collection-list">
              {library.map((x) => (
                <button
                  key={x.collectionId}
                  onClick={() => {
                    setData(x);
                    setReview(null);
                    setLibrary(null);
                    clearFilters();
                    setView("drawer");
                  }}
                >
                  <Archive size={24} />
                  <div>
                    <strong>{x.title}</strong>
                    <span>
                      {x.studentName || "No student details"} ·{" "}
                      {x.insects.length} specimens
                    </span>
                  </div>
                  {x.collectionId === data.collectionId && (
                    <span className="tag">Open</span>
                  )}
                </button>
              ))}
            </div>
            <div className="dialog-actions">
              <button className="button" onClick={() => chooseFile("edit")}>
                <Upload size={17} /> Open JSON file
              </button>
              <button className="button primary" onClick={newCollection}>
                <Plus size={17} /> New collection
              </button>
            </div>
            <p className="caption">
              Opening a file creates a separate copy. Work is saved in this
              browser and is not sent to your lecturer automatically. Anyone
              using this browser profile can open its collections.
            </p>
          </div>
        </Dialog>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <PrintCollection collection={c} />
    </>
  );
}
function Guide({ onAdd, readOnly }: { onAdd: () => void; readOnly: boolean }) {
  return (
    <article className="practical-guide">
      <div className="guide-heading">
        <span className="eyebrow">PRACTICAL GUIDE</span>
        <h2>From observation to collection.</h2>
        <p>
          A photographic alternative to a specimen collection assignment,
          practising identification, labelling and curation.
        </p>
      </div>
      <div className="guide-steps">
        {[
          [
            "01",
            "Photograph",
            "Use your own observations, suitable teaching images or existing reference material. Take several views while avoiding unnecessary disturbance. Record the image source.",
          ],
          [
            "02",
            "Prepare",
            "Add a clear photograph. Use Prepare image to frame, rotate or remove the background if useful. Keep identifying features intact; your original is retained. Add a virtual pin if required by your brief.",
          ],
          [
            "03",
            "Identify",
            "Work through an appropriate key. Record the features you used, the reference and your confidence. Stop at order, family or genus if the evidence cannot support a species identification.",
          ],
          [
            "04",
            "Document",
            "Record the date, locality, observer, habitat and source. Add supporting views and explain handling, provenance and any uncertainty. Save drafts as you work.",
          ],
          [
            "05",
            "Curate & submit",
            "Organise specimens into named drawers. Check missing details in Records. Export the collection JSON, which includes photographs, and submit it through your VLE. Keep a separate backup.",
          ],
        ].map(([n, title, body]) => (
          <section key={n}>
            <span>{n}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="guide-notes">
        <section>
          <Leaf size={23} />
          <h3>Observe with care</h3>
          <p>
            This exercise does not require insects to be killed. Prefer
            observation in place, minimal handling and release where
            appropriate, specimens found dead, or existing images with suitable
            permission. Follow your course fieldwork guidance and site access
            requirements.
          </p>
        </section>
        <section>
          <BookOpen size={23} />
          <h3>Know the limits of a photograph</h3>
          <p>
            Some identifications require characters that photographs cannot
            show. A digital collection practises evidence and curation; it does
            not reproduce all the microscopy, specimen preparation or diagnostic
            skills developed with physical material.
          </p>
        </section>
      </div>
      <section className="guide-export">
        <h3>Which export should I use?</h3>
        <table>
          <thead>
            <tr>
              <th>Format</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Collection JSON</td>
              <td>
                Backup, continuing on another device, and submission. Includes
                all photographs and can be reopened in Entobox.
              </td>
            </tr>
            <tr>
              <td>CSV table</td>
              <td>
                Metadata for a spreadsheet. Does not contain photographs and
                cannot restore the collection.
              </td>
            </tr>
            <tr>
              <td>Print / PDF</td>
              <td>
                A readable collection portfolio. Use your browser’s Save as PDF
                option; this is not an editable backup.
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          Your assignment brief determines required taxa, specimen numbers,
          pinning conventions and marking criteria. Entobox checks for missing
          information, not scientific accuracy.
        </p>
      </section>
      <section className="staff-guide">
        <h3>For staff: review a submission</h3>
        <p>
          Select <strong>Review a submission</strong> and open the student’s
          JSON file. You can inspect photographs, labels, identification
          evidence and notes in read-only mode. Returning to your collection
          leaves your own work unchanged.
        </p>
      </section>
      {!readOnly && (
        <button className="button primary" onClick={onAdd}>
          <Plus size={17} /> Add a specimen
        </button>
      )}
    </article>
  );
}
function PrintCollection({ collection: c }: { collection: CollectionData }) {
  return (
    <div className="print-collection">
      <header>
        <h1>{c.title}</h1>
        <p>
          {c.studentName} {c.studentId && `· ${c.studentId}`}
        </p>
        <p>
          Virtual Entobox · Harper Adams University · {c.insects.length}{" "}
          specimens
        </p>
      </header>
      {c.drawers.map((d) => (
        <section key={d.id}>
          <h2>{d.title}</h2>
          {c.insects
            .filter((i) => i.drawerId === d.id)
            .sort((a, b) => a.slotIndex - b.slotIndex)
            .map((i) => (
              <article key={i.id}>
                <div className="print-specimen">
                  <div className="print-photo">
                    {i.imageUrl && (
                      <img src={i.imageUrl} alt={specimenName(i)} />
                    )}
                  </div>
                  <div>
                    <h3 className={i.genus ? "scientific" : ""}>
                      {specimenName(i)}
                    </h3>
                    <p>{i.commonName}</p>
                    <p>
                      {[i.phylum, i.class, i.order, i.suborder, i.family]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p>
                      {formatDate(i.dateCaught)} ·{" "}
                      {i.location || "Locality not recorded"}
                      <br />
                      {i.gridReference}
                      <br />
                      Observer: {i.collector || "Not recorded"}
                    </p>
                    <p>
                      {[i.habitat, i.microhabitat, i.lifeStage, i.sex]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p>
                      Identified by: {i.identifier || "Not recorded"} ·
                      Confidence: {i.identificationConfidence || "Not recorded"}
                    </p>
                  </div>
                </div>
                <dl>
                  {[
                    ["Identification evidence", i.identificationNotes],
                    ["Key / reference", i.identificationReference],
                    ["Source", i.captureMethod],
                    ["Handling / provenance", i.ethicalNotes],
                    ["Image credit", i.imageCredit],
                    ["Source URL", i.sourceUrl],
                    ["Mounting rationale", i.pinningNotes],
                    ["Ecology and evolutionary context", i.evolutionaryHistory],
                  ]
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </React.Fragment>
                    ))}
                </dl>
                {i.fieldPhotos.length > 0 && (
                  <div className="print-supporting">
                    {i.fieldPhotos.map((src, n) => (
                      <img key={n} src={src} alt={`Supporting view ${n + 1}`} />
                    ))}
                  </div>
                )}
              </article>
            ))}
        </section>
      ))}
    </div>
  );
}
