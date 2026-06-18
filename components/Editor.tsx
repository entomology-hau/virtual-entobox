import React, { useMemo, useState } from 'react';
import { EthicalCaptureMethod, IdentificationConfidence, Insect, PinPosition } from '../types';
import { PinningCanvas } from './PinningCanvas';
import { ImageEditor } from './ImageEditor';
import { resizeImageFile } from '../services/imageUtils';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Edit2,
  Eye,
  Image as ImageIcon,
  Info,
  Leaf,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X
} from 'lucide-react';

interface EditorProps {
  drawerId: string;
  slotIndex: number;
  initialData: Insect | null;
  onSave: (data: Insect) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
  defaultCollector?: string;
}

const captureMethods: EthicalCaptureMethod[] = [
  '',
  'Field observation / live release',
  'Found dead specimen',
  'Existing teaching image',
  'Museum or reference collection',
  'Other non-lethal source'
];

const confidenceOptions: IdentificationConfidence[] = ['', 'High', 'Medium', 'Low'];

export const Editor: React.FC<EditorProps> = ({ drawerId, slotIndex, initialData, onSave, onClose, onDelete, readOnly = false, defaultCollector = '' }) => {
  const [step, setStep] = useState(initialData ? 2 : 0);

  // Image State
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(initialData?.imageUrl || null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [imageError, setImageError] = useState('');

  // Pinning
  const [pinPosition, setPinPosition] = useState<PinPosition | null>(initialData?.pinPosition || null);

  // Taxonomy State
  const [phylum, setPhylum] = useState(initialData?.phylum || 'Arthropoda');
  const [classVal, setClassVal] = useState(initialData?.class || 'Insecta');
  const [order, setOrder] = useState(initialData?.order || '');
  const [suborder, setSuborder] = useState(initialData?.suborder || '');
  const [family, setFamily] = useState(initialData?.family || '');
  const [genus, setGenus] = useState(initialData?.genus || '');
  const [species, setSpecies] = useState(initialData?.species || '');
  const [authority, setAuthority] = useState(initialData?.authority || '');
  const [commonName, setCommonName] = useState(initialData?.commonName || '');
  const [identifier, setIdentifier] = useState(initialData?.identifier || '');
  const [identificationConfidence, setIdentificationConfidence] = useState<IdentificationConfidence>(initialData?.identificationConfidence || '');

  // Collection Data
  const [dateCaught, setDateCaught] = useState(initialData?.dateCaught || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState(initialData?.location || '');
  const [collector, setCollector] = useState(initialData?.collector || defaultCollector || '');
  const [habitat, setHabitat] = useState(initialData?.habitat || '');
  const [microhabitat, setMicrohabitat] = useState(initialData?.microhabitat || '');
  const [lifeStage, setLifeStage] = useState(initialData?.lifeStage || '');
  const [sex, setSex] = useState(initialData?.sex || '');
  const [captureMethod, setCaptureMethod] = useState<EthicalCaptureMethod>(initialData?.captureMethod || '');
  const [ethicalNotes, setEthicalNotes] = useState(initialData?.ethicalNotes || '');
  const [pinningNotes, setPinningNotes] = useState(initialData?.pinningNotes || '');
  const [evolutionaryHistory, setEvolutionaryHistory] = useState(initialData?.evolutionaryHistory || '');
  const [fieldPhotos, setFieldPhotos] = useState<string[]>(initialData?.fieldPhotos || []);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const validationChecks = useMemo(() => [
    { label: 'Processed specimen image', ok: Boolean(imageUrl) },
    { label: 'Pin placed on thorax/notum', ok: Boolean(pinPosition) },
    { label: 'Ethical source and handling note', ok: Boolean(captureMethod) && ethicalNotes.trim().length >= 10 },
    { label: 'Minimum taxonomic placement', ok: Boolean(order.trim()) || Boolean(family.trim()) },
    { label: 'Collection date, location, and collector', ok: Boolean(dateCaught) && Boolean(location.trim()) && Boolean(collector.trim()) }
  ], [captureMethod, collector, dateCaught, ethicalNotes, family, imageUrl, location, order, pinPosition]);

  const completionPercent = Math.round((validationChecks.filter(check => check.ok).length / validationChecks.length) * 100);
  const missingRecommended = validationChecks.filter(check => !check.ok).map(check => check.label);

  const inputClass = `w-full p-2.5 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 outline-none placeholder-neutral-400 dark:placeholder-neutral-500 font-medium transition ${readOnly ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-not-allowed' : 'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'}`;
  const selectClass = `${inputClass} appearance-none`;
  const labelClass = 'block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1';
  const cardClass = 'bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 relative transition-colors duration-300';

  const buildInsectData = (): Insect => ({
    id: initialData?.id || crypto.randomUUID(),
    drawerId,
    slotIndex,
    imageUrl,
    pinPosition,
    phylum,
    class: classVal,
    order,
    suborder,
    family,
    genus,
    species,
    authority,
    commonName,
    dateCaught,
    location,
    collector,
    habitat,
    microhabitat,
    lifeStage,
    sex,
    identifier,
    identificationConfidence,
    captureMethod,
    ethicalNotes,
    pinningNotes,
    evolutionaryHistory,
    fieldPhotos
  });

  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageError('');
      const resizedImage = await resizeImageFile(file, { maxDimension: 1800, quality: 0.9, preservePng: true });
      setTempImageSrc(resizedImage);
      setOriginalImageUrl(resizedImage);
      setShowImageEditor(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Could not process the selected image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleEditorSave = (newUrl: string) => {
    setImageUrl(newUrl);
    if (newUrl !== imageUrl) {
      setPinPosition(null);
      setValidationWarnings(['Image changed; place the pin again so the position matches the edited specimen.']);
    }
    setShowImageEditor(false);
    setTempImageSrc(null);
  };

  const handleRevertImage = () => {
    if (!originalImageUrl) return;
    if (confirm('Revert to the original uploaded image? The pin will be cleared because image geometry may change.')) {
      setImageUrl(originalImageUrl);
      setPinPosition(null);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setPinPosition(null);
  };

  const handleFieldPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resizedImage = await resizeImageFile(file, { maxDimension: 1000, quality: 0.84, preservePng: false });
      setFieldPhotos(prev => [...prev, resizedImage]);
    } catch (err) {
      setValidationWarnings([err instanceof Error ? err.message : 'Could not process the field photograph.']);
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = () => {
    if (readOnly) return;

    if (!imageUrl) {
      setValidationWarnings(['Upload and process a specimen image before saving.']);
      setStep(0);
      return;
    }

    if (!pinPosition) {
      setValidationWarnings(['Place the virtual pin on the thorax/notum before saving.']);
      setStep(1);
      return;
    }

    if (missingRecommended.length > 0) {
      setValidationWarnings(missingRecommended);
      const proceed = confirm(`This entry is missing recommended teaching fields:\n\n• ${missingRecommended.join('\n• ')}\n\nSave anyway?`);
      if (!proceed) return;
    }

    onSave(buildInsectData());
  };

  if (showImageEditor && tempImageSrc && !readOnly) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Specimen image studio">
        <div className="w-full max-w-5xl h-[90vh]">
          <ImageEditor
            src={tempImageSrc}
            onSave={handleEditorSave}
            onCancel={() => {
              setShowImageEditor(false);
              setTempImageSrc(null);
            }}
          />
        </div>
      </div>
    );
  }

  const stepItems = [
    { label: 'Image', description: 'Upload and clean' },
    { label: 'Pin', description: 'Thorax placement' },
    { label: 'Data', description: 'Ethics and label' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={readOnly ? 'View specimen' : 'Edit specimen'}>
      <div className="bg-white dark:bg-neutral-900 w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-neutral-200 dark:ring-neutral-800 transition-colors duration-300">
        <div className={`border-b p-5 flex flex-col gap-4 md:flex-row md:justify-between md:items-center shrink-0 ${readOnly ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'}`}>
          <div>
            <h2 className={`text-xl font-sans font-bold flex items-center gap-2 ${readOnly ? 'text-amber-700 dark:text-amber-500' : 'text-neutral-800 dark:text-neutral-100'}`}>
              {readOnly ? <><Eye size={20} /> Viewing Specimen</> : (initialData ? 'Edit Specimen' : 'New Specimen Entry')}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono uppercase mt-1">Slot {String(slotIndex + 1).padStart(2, '0')} • {readOnly ? 'Read Only Mode' : `${completionPercent}% teaching record complete`}</p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {stepItems.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => setStep(index)}
                  className={`px-3 py-2 rounded-xl border text-left min-w-[120px] transition ${step === index ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                >
                  <span className="block text-[10px] uppercase font-bold tracking-wider">Step {index + 1}</span>
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="block text-[10px]">{item.description}</span>
                </button>
              ))}
            </div>
          )}

          <button onClick={onClose} className="absolute top-4 right-4 md:static hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 rounded-full transition text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100" aria-label="Close specimen editor">
            <X size={20} />
          </button>
        </div>

        <div className="h-1 bg-neutral-100 dark:bg-neutral-800 shrink-0">
          <div className={`${readOnly ? 'bg-amber-500' : 'bg-indigo-600'} h-full transition-all duration-300`} style={{ width: `${readOnly ? 100 : completionPercent}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50 dark:bg-black/20">
          {validationWarnings.length > 0 && !readOnly && (
            <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200 flex gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Record needs attention</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            </div>
          )}

          {step === 0 && !readOnly && (
            <div className="flex flex-col items-center justify-center min-h-full space-y-8 max-w-3xl mx-auto">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-serif text-neutral-800 dark:text-neutral-100">Specimen imagery</h3>
                <p className="text-neutral-500 dark:text-neutral-400">Use an existing, non-lethal, or live-release image. The app resizes uploads to reduce browser storage failures.</p>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 shadow-sm flex flex-col items-center justify-center min-h-[420px]">
                  {!imageUrl ? (
                    <label className="cursor-pointer flex flex-col items-center gap-4 text-neutral-400 dark:text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition group w-full h-full justify-center">
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-700 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition">
                        <ImageIcon size={48} />
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-lg block text-neutral-600 dark:text-neutral-300">Click to upload specimen</span>
                        <span className="text-sm">JPG, PNG, or WEBP supported</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleMainImageUpload} className="hidden" />
                    </label>
                  ) : (
                    <div className="relative w-full h-full min-h-[360px] flex items-center justify-center bg-neutral-100 dark:bg-neutral-900/50 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 checkerboard-soft">
                      <img src={imageUrl} alt="Uploaded specimen" className="max-w-full max-h-[360px] object-contain relative z-10 drop-shadow-lg" />

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 z-20">
                        <button
                          onClick={() => {
                            setTempImageSrc(imageUrl);
                            setShowImageEditor(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 font-bold text-sm transition"
                        >
                          <Edit2 size={14} /> Open Studio
                        </button>

                        {originalImageUrl && originalImageUrl !== imageUrl && (
                          <button
                            onClick={handleRevertImage}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-neutral-700 border border-neutral-300 rounded-full shadow-lg hover:bg-neutral-50 font-bold text-sm transition"
                          >
                            <RotateCcw size={14} /> Revert
                          </button>
                        )}
                      </div>

                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-black/50 rounded-full hover:bg-red-100 text-neutral-500 hover:text-red-600 transition z-20"
                        aria-label="Remove specimen image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {imageError && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400 font-medium">{imageError}</p>}
                </div>

                <aside className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-5 text-sm text-emerald-900 dark:text-emerald-100 flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold">
                    <Leaf size={18} /> Ethical image use
                  </div>
                  <p>Prefer photographs of living insects that were released, images from approved teaching sets, or specimens found dead.</p>
                  <p>Avoid encouraging collection of rare, protected, or habitat-sensitive species. Record uncertainty rather than forcing identification.</p>
                </aside>
              </div>

              <div className="flex justify-center w-full pt-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={!imageUrl}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm image <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 1 && !readOnly && (
            <div className="flex flex-col items-center justify-center min-h-full space-y-6">
              <div className="text-center max-w-2xl">
                <h3 className="text-3xl font-serif text-neutral-800 dark:text-neutral-100">Digital pinning</h3>
                <p className="text-neutral-500 dark:text-neutral-400">Place the virtual pin on the thorax or notum. This preserves the teaching point of specimen orientation without killing an insect.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full max-w-5xl items-start">
                <div className="lg:col-span-2 bg-white dark:bg-neutral-800 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-lg flex justify-center">
                  {imageUrl && (
                    <PinningCanvas
                      imageUrl={imageUrl}
                      pinPosition={pinPosition}
                      onPinPlace={(pos) => {
                        setPinPosition(pos);
                        setValidationWarnings([]);
                      }}
                      readOnly={false}
                    />
                  )}
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm text-sm text-neutral-600 dark:text-neutral-300 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
                    <ClipboardCheck size={18} /> Pinning guide
                  </div>
                  <div className="space-y-3">
                    <p><strong>Target:</strong> thorax/notum, not head, abdomen, wings, or legs.</p>
                    <p><strong>Reason:</strong> standardised placement teaches curation and avoids obscuring diagnostic features.</p>
                    <p><strong>Exception:</strong> if an image angle makes this ambiguous, place the best approximation and explain it in the pinning note.</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${pinPosition ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'}`}>
                    {pinPosition ? 'Pin placed. You can click again to refine the position.' : 'Pin not yet placed.'}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 items-center mt-6">
                <button onClick={() => setStep(0)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 text-sm font-medium">Change image</button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!pinPosition}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl shadow hover:bg-indigo-700 transition flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: ethics and label <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6 h-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="relative bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
                    {imageUrl ? (
                      <>
                        <PinningCanvas
                          imageUrl={imageUrl}
                          pinPosition={pinPosition}
                          onPinPlace={(pos) => !readOnly && setPinPosition(pos)}
                          readOnly={readOnly}
                        />
                        {!readOnly && (
                          <button
                            onClick={() => {
                              setTempImageSrc(imageUrl);
                              setShowImageEditor(true);
                            }}
                            className="absolute top-2 right-2 p-2 bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-200 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition z-10"
                            title="Edit image"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-neutral-400 text-center">No specimen image uploaded.</div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-3 flex items-center gap-2"><Camera size={15} /> Field/context photos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {fieldPhotos.map((photo, idx) => (
                        <div key={`${photo.slice(0, 18)}-${idx}`} className="relative group">
                          <img src={photo} alt={`Field context ${idx + 1}`} className="w-full aspect-square object-cover rounded border border-neutral-200 dark:border-neutral-600" />
                          {!readOnly && (
                            <button
                              onClick={() => setFieldPhotos(prev => prev.filter((_, photoIndex) => photoIndex !== idx))}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                              aria-label={`Remove field photo ${idx + 1}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {!readOnly && (
                        <label className="cursor-pointer bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-400 dark:text-neutral-500 aspect-square rounded text-xs flex flex-col items-center justify-center transition border border-neutral-200 dark:border-neutral-600 border-dashed text-center">
                          <Upload size={16} className="mb-1" />
                          Add photo
                          <input type="file" accept="image/*" onChange={handleFieldPhotoUpload} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <label className={labelClass}>Pinning note</label>
                    <textarea
                      value={pinningNotes}
                      onChange={(e) => setPinningNotes(e.target.value)}
                      className={`${inputClass} h-24 resize-none`}
                      placeholder="Explain any ambiguity in thorax placement or image angle."
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-4">
                  <div className={cardClass}>
                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${readOnly ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                    <h3 className="text-lg font-serif font-bold text-neutral-800 dark:text-neutral-100 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700">Taxonomic breakdown</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Phylum</label>
                        <input type="text" value={phylum} onChange={(e) => setPhylum(e.target.value)} className={inputClass} placeholder="Arthropoda" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Class</label>
                        <input type="text" value={classVal} onChange={(e) => setClassVal(e.target.value)} className={inputClass} placeholder="Insecta" disabled={readOnly} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Order</label>
                        <input type="text" value={order} onChange={(e) => setOrder(e.target.value)} className={`${inputClass} font-semibold`} placeholder="e.g. Lepidoptera" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Suborder</label>
                        <input type="text" value={suborder} onChange={(e) => setSuborder(e.target.value)} className={inputClass} placeholder="Optional" disabled={readOnly} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Family</label>
                        <input type="text" value={family} onChange={(e) => setFamily(e.target.value)} className={`${inputClass} font-semibold`} placeholder="e.g. Nymphalidae" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Common name</label>
                        <input type="text" value={commonName} onChange={(e) => setCommonName(e.target.value)} className={inputClass} placeholder="Optional" disabled={readOnly} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Genus</label>
                        <input type="text" value={genus} onChange={(e) => setGenus(e.target.value)} className={`${inputClass} italic font-serif`} placeholder="Danaus" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Species</label>
                        <input type="text" value={species} onChange={(e) => setSpecies(e.target.value)} className={`${inputClass} italic font-serif`} placeholder="plexippus" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Naming authority</label>
                        <input type="text" value={authority} onChange={(e) => setAuthority(e.target.value)} className={inputClass} placeholder="(Linnaeus, 1758)" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Identifier</label>
                        <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputClass} placeholder="Name/initials" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-1">
                        <label className={labelClass}>Confidence</label>
                        <select value={identificationConfidence} onChange={(e) => setIdentificationConfidence(e.target.value as IdentificationConfidence)} className={selectClass} disabled={readOnly}>
                          {confidenceOptions.map(option => <option key={option} value={option}>{option || 'Select'}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={cardClass}>
                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${readOnly ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    <h3 className="text-lg font-serif font-bold text-neutral-800 dark:text-neutral-100 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700">Collection details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Date observed</label>
                        <input type="date" value={dateCaught} onChange={(e) => setDateCaught(e.target.value)} className={inputClass} disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-4">
                        <label className={labelClass}>Location</label>
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Lat/long, site, city, or county" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Collector/observer</label>
                        <input type="text" value={collector} onChange={(e) => setCollector(e.target.value)} className={inputClass} disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Habitat</label>
                        <input type="text" value={habitat} onChange={(e) => setHabitat(e.target.value)} className={inputClass} placeholder="e.g. meadow, glasshouse" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Microhabitat/host</label>
                        <input type="text" value={microhabitat} onChange={(e) => setMicrohabitat(e.target.value)} className={inputClass} placeholder="e.g. on nettle, under bark" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-3">
                        <label className={labelClass}>Life stage</label>
                        <input type="text" value={lifeStage} onChange={(e) => setLifeStage(e.target.value)} className={inputClass} placeholder="Adult, larva, nymph, pupa" disabled={readOnly} />
                      </div>
                      <div className="sm:col-span-3">
                        <label className={labelClass}>Sex / morph</label>
                        <input type="text" value={sex} onChange={(e) => setSex(e.target.value)} className={inputClass} placeholder="Female, male, unknown, worker" disabled={readOnly} />
                      </div>
                    </div>
                  </div>

                  <div className={cardClass}>
                    <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${readOnly ? 'bg-amber-500' : 'bg-teal-500'}`}></div>
                    <h3 className="text-lg font-serif font-bold text-neutral-800 dark:text-neutral-100 mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-700 flex items-center gap-2"><Leaf size={18} /> Ethical provenance</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                      <div className="sm:col-span-3">
                        <label className={labelClass}>Source / method</label>
                        <select value={captureMethod} onChange={(e) => setCaptureMethod(e.target.value as EthicalCaptureMethod)} className={selectClass} disabled={readOnly}>
                          {captureMethods.map(method => <option key={method} value={method}>{method || 'Select source'}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-3 flex items-end">
                        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 text-xs text-neutral-500 dark:text-neutral-400 flex gap-2">
                          <Info size={15} className="shrink-0" />
                          <span>State whether the insect was released, found dead, or sourced from an approved image/reference collection.</span>
                        </div>
                      </div>
                      <div className="sm:col-span-6">
                        <label className={labelClass}>Ethical handling note</label>
                        <textarea
                          value={ethicalNotes}
                          onChange={(e) => setEthicalNotes(e.target.value)}
                          className={`${inputClass} h-24 resize-none`}
                          placeholder="Example: Photographed in situ and released; no specimen collected."
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={cardClass}>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-200 mb-2 flex items-center gap-2">
                  Evolutionary history, phylogeny, and natural history notes
                </label>
                <textarea
                  value={evolutionaryHistory}
                  onChange={(e) => setEvolutionaryHistory(e.target.value)}
                  className={`${inputClass} h-32 resize-none leading-relaxed`}
                  placeholder="Notes on phylogeny, adaptations, ecology, uncertainty, and diagnostic characters."
                  disabled={readOnly}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row gap-3 md:justify-between md:items-center shrink-0">
          <div className="flex items-center gap-3">
            {initialData && !readOnly && (
              <button
                onClick={() => onDelete(initialData.id)}
                className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm font-medium"
              >
                <Trash2 size={16} /> Delete entry
              </button>
            )}
            {!readOnly && (
              <div className="hidden md:flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                {completionPercent === 100 ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-amber-500" />}
                {completionPercent}% complete
              </div>
            )}
          </div>

          <div className="flex gap-3 md:ml-auto">
            <button onClick={onClose} className="px-5 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition font-medium">Close</button>
            {step === 2 && !readOnly && (
              <button
                onClick={handleSave}
                disabled={!pinPosition}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} /> Save specimen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
