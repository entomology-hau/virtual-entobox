import React, { useEffect, useMemo, useState } from 'react';
import { CollectionData, Drawer, Insect, UserProfile } from './types';
import { Editor } from './components/Editor';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Leaf,
  Lock,
  LogOut,
  Maximize2,
  Minus,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User
} from 'lucide-react';

const ADMIN_ID = 'STAFF_ADMIN';
const ADMIN_PASS = 'admin2024';
const COLLECTION_SCHEMA_VERSION = 2;
const DEFAULT_TITLE = 'Virtual Entomology Collection';

const BrandLogo = ({ size, className, isAdmin = false }: { size: number; className?: string; isAdmin?: boolean }) => {
  const [error, setError] = useState(false);
  if (isAdmin) return <ShieldCheck size={size} className={className} />;
  if (error) return <Archive size={size} className={className} />;

  return (
    <img
      src="./logo.png"
      alt="Entomology logo"
      className={`object-contain transition-opacity duration-300 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
};

const createDefaultDrawer = (index = 1): Drawer => ({
  id: crypto.randomUUID(),
  title: `Specimen Drawer #${String(index).padStart(2, '0')}`,
  slotCount: 10,
  isCollapsed: false
});

const hasEthicalDocumentation = (insect: Insect) => Boolean(insect.captureMethod) && Boolean(insect.ethicalNotes?.trim()) && insect.ethicalNotes.trim().length >= 10;

const getSpecimenCompletion = (insect: Insect) => {
  const checks = [
    Boolean(insect.imageUrl),
    Boolean(insect.pinPosition),
    Boolean(insect.order?.trim()) || Boolean(insect.family?.trim()),
    Boolean(insect.dateCaught) && Boolean(insect.location?.trim()) && Boolean(insect.collector?.trim()),
    hasEthicalDocumentation(insect)
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

const getSpecimenLabel = (insect: Insect) => {
  if (insect.genus && insect.species) return `${insect.genus} ${insect.species}`;
  if (insect.genus) return insect.genus;
  return insect.family || insect.order || insect.commonName || 'Unidentified';
};

const normaliseCollection = (data: CollectionData): CollectionData => {
  const importedInsects = Array.isArray(data.insects) ? data.insects : [];

  if (Array.isArray(data.drawers) && data.drawers.length > 0) {
    const drawers = data.drawers.map((drawer, index) => {
      const drawerId = drawer.id || crypto.randomUUID();
      const highestOccupiedSlot = importedInsects
        .filter(insect => insect.drawerId === drawer.id)
        .reduce((max, insect) => Math.max(max, Number.isFinite(insect.slotIndex) ? insect.slotIndex + 1 : 0), 0);

      return {
        id: drawerId,
        title: drawer.title || `Specimen Drawer #${String(index + 1).padStart(2, '0')}`,
        slotCount: Math.max(1, drawer.slotCount || 10, highestOccupiedSlot),
        isCollapsed: Boolean(drawer.isCollapsed)
      };
    });

    return {
      schemaVersion: COLLECTION_SCHEMA_VERSION,
      title: data.title || DEFAULT_TITLE,
      studentName: data.studentName || 'Unknown Student',
      studentId: data.studentId || 'UNKNOWN_ID',
      drawers,
      insects: importedInsects,
      lastSaved: data.lastSaved || new Date().toISOString()
    };
  }

  const defaultDrawerId = crypto.randomUUID();
  const migratedInsects = importedInsects.map((insect, index) => ({
    ...insect,
    drawerId: defaultDrawerId,
    slotIndex: Number.isFinite(insect.slotIndex) ? insect.slotIndex : index
  }));

  return {
    schemaVersion: COLLECTION_SCHEMA_VERSION,
    title: data.title || DEFAULT_TITLE,
    studentName: data.studentName || 'Unknown Student',
    studentId: data.studentId || 'UNKNOWN_ID',
    drawers: [{
      id: defaultDrawerId,
      title: data.drawerTitle || 'Specimen Drawer #01',
      slotCount: Math.max(10, migratedInsects.length),
      isCollapsed: false
    }],
    insects: migratedInsects,
    lastSaved: data.lastSaved || new Date().toISOString()
  };
};

const matchesSearch = (insect: Insect | null, query: string) => {
  if (!query.trim()) return true;
  if (!insect) return false;
  const haystack = [
    insect.order,
    insect.family,
    insect.genus,
    insect.species,
    insect.commonName,
    insect.location,
    insect.habitat,
    insect.microhabitat,
    insect.captureMethod,
    insect.collector
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
};

export default function App() {
  const [insects, setInsects] = useState<Insect[]>([]);
  const [drawers, setDrawers] = useState<Drawer[]>([]);
  const [collectionTitle, setCollectionTitle] = useState(DEFAULT_TITLE);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [editingSlot, setEditingSlot] = useState<{ drawerId: string; index: number } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const [authId, setAuthId] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [ethicsAccepted, setEthicsAccepted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (!currentUser || isAdmin) return;

    const storageKey = `collection_${currentUser.studentId}`;
    const savedCollection = localStorage.getItem(storageKey);

    if (savedCollection) {
      try {
        const data = normaliseCollection(JSON.parse(savedCollection));
        setInsects(data.insects || []);
        setDrawers(data.drawers && data.drawers.length ? data.drawers : [createDefaultDrawer()]);
        setCollectionTitle(data.title || DEFAULT_TITLE);
      } catch (e) {
        console.error('Failed to parse saved collection', e);
        setInsects([]);
        setDrawers([createDefaultDrawer()]);
        setCollectionTitle(DEFAULT_TITLE);
      }
    } else {
      setInsects([]);
      setCollectionTitle(DEFAULT_TITLE);
      setDrawers([createDefaultDrawer()]);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!currentUser || isAdmin) return;

    const data: CollectionData = {
      schemaVersion: COLLECTION_SCHEMA_VERSION,
      title: collectionTitle,
      studentName: currentUser.fullName,
      studentId: currentUser.studentId,
      insects,
      drawers,
      lastSaved: new Date().toISOString()
    };

    try {
      localStorage.setItem(`collection_${currentUser.studentId}`, JSON.stringify(data));
      setStorageWarning(null);
    } catch (err) {
      setStorageWarning('Browser storage is full. Export your collection file now, then remove unnecessary field photographs or use fewer high-resolution images.');
    }
  }, [insects, collectionTitle, drawers, currentUser, isAdmin]);

  const collectionStats = useMemo(() => {
    const totalSlots = drawers.reduce((sum, drawer) => sum + drawer.slotCount, 0);
    const pinnedCount = insects.filter(insect => Boolean(insect.pinPosition)).length;
    const completeCount = insects.filter(insect => getSpecimenCompletion(insect) === 100).length;
    const ethicalCount = insects.filter(hasEthicalDocumentation).length;
    const meanCompletion = insects.length
      ? Math.round(insects.reduce((sum, insect) => sum + getSpecimenCompletion(insect), 0) / insects.length)
      : 0;

    return { totalSlots, pinnedCount, completeCount, ethicalCount, meanCompletion };
  }, [drawers, insects]);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return newVal;
    });
  };

  const getStoredUsers = () => {
    try {
      const storedUsersStr = localStorage.getItem('entomology_users');
      return storedUsersStr ? JSON.parse(storedUsersStr) as UserProfile[] : [];
    } catch {
      return [];
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authId === ADMIN_ID) {
      if (authPass === ADMIN_PASS) {
        setIsAdmin(true);
        setCurrentUser({ studentId: ADMIN_ID, fullName: 'Staff Administrator', password: '' });
        return;
      }
      setAuthError('Invalid staff password.');
      return;
    }

    const storedUsers = getStoredUsers();
    const user = storedUsers.find(u => u.studentId === authId);
    if (user && user.password === authPass) {
      setCurrentUser(user);
      setIsAdmin(false);
    } else {
      setAuthError('Invalid student number or password.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authId === ADMIN_ID) {
      setAuthError('This ID is reserved for staff.');
      return;
    }

    if (!ethicsAccepted) {
      setAuthError('Confirm the ethical-use statement before creating an account.');
      return;
    }

    const storedUsers = getStoredUsers();
    if (storedUsers.some(u => u.studentId === authId)) {
      setAuthError('Student number already registered on this device.');
      return;
    }

    const newUser: UserProfile = {
      studentId: authId,
      password: authPass,
      fullName: authName,
      ethicsAcceptedAt: new Date().toISOString()
    };

    localStorage.setItem('entomology_users', JSON.stringify([...storedUsers, newUser]));
    setCurrentUser(newUser);
    setIsAdmin(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setInsects([]);
    setDrawers([]);
    setSearchQuery('');
    setAuthId('');
    setAuthPass('');
    setAuthName('');
    setEthicsAccepted(false);
  };

  const handleAddDrawer = () => {
    setDrawers(prev => [...prev, createDefaultDrawer(prev.length + 1)]);
  };

  const handleDeleteDrawer = (id: string) => {
    const hasInsects = insects.some(i => i.drawerId === id);
    if (hasInsects && !confirm('This drawer contains specimens. Deleting it will remove all specimens inside. Continue?')) return;
    setDrawers(prev => prev.filter(d => d.id !== id));
    setInsects(prev => prev.filter(i => i.drawerId !== id));
  };

  const handleToggleDrawer = (id: string) => {
    setDrawers(prev => prev.map(d => d.id === id ? { ...d, isCollapsed: !d.isCollapsed } : d));
  };

  const handleUpdateDrawerTitle = (id: string, newTitle: string) => {
    setDrawers(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
  };

  const handleAddSlot = (drawerId: string) => {
    setDrawers(prev => prev.map(d => d.id === drawerId ? { ...d, slotCount: d.slotCount + 1 } : d));
  };

  const handleRemoveSlot = (drawerId: string) => {
    const drawer = drawers.find(d => d.id === drawerId);
    if (!drawer || drawer.slotCount <= 1) return;

    const lastIndex = drawer.slotCount - 1;
    const hasInsect = insects.some(i => i.drawerId === drawerId && i.slotIndex === lastIndex);
    if (hasInsect) {
      alert('Cannot remove an occupied slot. Delete or move the specimen first.');
      return;
    }

    setDrawers(prev => prev.map(d => d.id === drawerId ? { ...d, slotCount: d.slotCount - 1 } : d));
  };

  const handleSlotClick = (drawerId: string, index: number) => {
    if (isAdmin) {
      const hasInsect = insects.some(i => i.drawerId === drawerId && i.slotIndex === index);
      if (hasInsect) setEditingSlot({ drawerId, index });
    } else {
      setEditingSlot({ drawerId, index });
    }
  };

  const handleSaveInsect = (insect: Insect) => {
    setInsects(prev => {
      const filtered = prev.filter(i => !(i.drawerId === insect.drawerId && i.slotIndex === insect.slotIndex));
      return [...filtered, insect];
    });
    setEditingSlot(null);
  };

  const handleDeleteInsect = (id: string) => {
    setInsects(prev => prev.filter(i => i.id !== id));
    setEditingSlot(null);
  };

  const handleExport = () => {
    if (!currentUser) return;

    const data: CollectionData = {
      schemaVersion: COLLECTION_SCHEMA_VERSION,
      title: collectionTitle,
      studentName: currentUser.fullName,
      studentId: currentUser.studentId,
      drawers,
      insects,
      lastSaved: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentUser.studentId}_${currentUser.fullName.replace(/\s+/g, '_')}_Collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Progress exported to file. Keep this JSON file as your submission and backup.');
  };

  const applyImportedCollection = (normalised: CollectionData) => {
    setInsects(normalised.insects || []);
    setCollectionTitle(normalised.title || DEFAULT_TITLE);
    setDrawers(normalised.drawers && normalised.drawers.length ? normalised.drawers : [createDefaultDrawer()]);
    setSearchQuery('');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '')) as CollectionData;
        if (!Array.isArray(parsed.insects)) throw new Error('Missing insects array.');
        const normalised = normaliseCollection(parsed);

        if (!isAdmin && currentUser && normalised.studentId !== currentUser.studentId) {
          const proceed = confirm(`This file belongs to ${normalised.studentName} (${normalised.studentId}). Load it into the current account anyway?`);
          if (!proceed) return;
        }

        if (!isAdmin && !currentUser) {
          const restoredUser: UserProfile = {
            studentId: normalised.studentId,
            fullName: normalised.studentName,
            password: '',
            ethicsAcceptedAt: new Date().toISOString()
          };
          localStorage.setItem(`collection_${normalised.studentId}`, JSON.stringify(normalised));
          const storedUsers = getStoredUsers();
          if (!storedUsers.some(user => user.studentId === restoredUser.studentId)) {
            localStorage.setItem('entomology_users', JSON.stringify([...storedUsers, restoredUser]));
          }
          setIsAdmin(false);
          setCurrentUser(restoredUser);
          return;
        }

        applyImportedCollection(normalised);
      } catch (err) {
        alert('Invalid collection file. Check that you selected an exported Entomology Collection JSON file.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const getInsectAtSlot = (drawerId: string, index: number) => insects.find(i => i.drawerId === drawerId && i.slotIndex === index) || null;

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors duration-300 bg-grid-pattern">
        <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur w-full max-w-lg p-8 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg transform rotate-3 hover:rotate-6 transition">
              <BrandLogo size={42} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-center text-neutral-800 dark:text-neutral-100 mb-1">Ethical Entomology Lab</h1>
          <p className="text-center text-neutral-500 dark:text-neutral-400 mb-6 text-xs uppercase tracking-widest font-bold">Virtual pinning and collection curation</p>

          <div className="grid grid-cols-3 gap-2 mb-6 text-[11px] text-neutral-600 dark:text-neutral-300">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 text-center"><Leaf size={16} className="mx-auto mb-1" />Non-lethal workflow</div>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-3 text-center"><BadgeCheck size={16} className="mx-auto mb-1" />Pinning practice</div>
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 text-center"><Archive size={16} className="mx-auto mb-1" />Local storage</div>
          </div>

          <div className="flex mb-6 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${authMode === 'login' ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${authMode === 'register' ? 'bg-white dark:bg-neutral-700 shadow text-indigo-600 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              Register ID
            </button>
          </div>

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1">Full name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-neutral-900 dark:text-white text-sm"
                  placeholder="Jane Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1">Student number</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3.5 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  className="w-full pl-10 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-neutral-900 dark:text-white text-sm font-mono"
                  placeholder={authMode === 'login' ? 'ID or staff number' : 'Student ID'}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-neutral-400" />
                <input
                  type="password"
                  required={authMode === 'login'}
                  value={authPass}
                  onChange={(e) => setAuthPass(e.target.value)}
                  className="w-full pl-10 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-neutral-900 dark:text-white text-sm"
                  placeholder={authMode === 'login' ? 'Enter password' : 'Create password'}
                />
              </div>
            </div>

            {authMode === 'register' && (
              <label className="flex gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ethicsAccepted}
                  onChange={(e) => setEthicsAccepted(e.target.checked)}
                  className="mt-0.5 accent-emerald-600"
                />
                <span>I will use this as a non-lethal learning tool, document image provenance, and avoid collecting protected or unnecessary specimens for the exercise.</span>
              </label>
            )}

            {authError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition flex items-center justify-center gap-2 mt-2"
            >
              {authMode === 'login' ? 'Access collection' : 'Create account'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-tight mb-2">
              Data is stored locally on this device. Export JSON files for backup and submission.
            </p>
            <label className="cursor-pointer inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-bold uppercase tracking-wide">
              <RefreshCw size={12} /> Restore from backup (.json)
              <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-neutral-50 dark:bg-neutral-950 transition-colors duration-300">
      <header className={`py-4 px-5 md:px-8 shadow-md z-10 flex flex-col md:flex-row justify-between items-center border-b gap-4 md:gap-0 transition-colors ${isAdmin ? 'bg-slate-800 border-slate-700' : 'bg-neutral-900 dark:bg-neutral-950 border-neutral-800'}`}>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`p-2 rounded-xl shadow-lg hidden md:block ${isAdmin ? 'bg-amber-500 shadow-amber-900/50' : 'bg-indigo-600 shadow-indigo-900/50'}`}>
            <BrandLogo size={24} className="text-white" isAdmin={isAdmin} />
          </div>
          <div className="flex-1">
            {isAdmin ? (
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Instructor grading mode</h2>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wide">Admin access • read only</div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={collectionTitle}
                  onChange={(e) => setCollectionTitle(e.target.value)}
                  className="bg-transparent text-xl md:text-2xl font-sans font-bold tracking-tight text-white border-b border-transparent hover:border-neutral-600 focus:border-indigo-500 outline-none w-full md:w-[460px] transition-colors placeholder-neutral-500"
                  placeholder="Collection title"
                  aria-label="Collection title"
                />
                <div className="flex items-center gap-2 mt-1">
                  <User size={12} className="text-neutral-400" />
                  <span className="text-neutral-400 text-xs font-mono tracking-wide uppercase">{currentUser.fullName} ({currentUser.studentId})</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow transition flex items-center gap-2 border border-slate-600">
                <Upload size={16} /> Load student file (.json)
                <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
              </label>
            ) : (
              <>
                <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-3 py-2 rounded-xl text-sm font-medium shadow transition flex items-center gap-2 border border-neutral-700" title="Restore from a previously saved JSON file">
                  <Upload size={14} /> <span className="hidden md:inline">Load backup</span>
                  <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
                </label>
                <button
                  onClick={handleExport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow transition flex items-center gap-2"
                  title="Download assignment file to save progress"
                >
                  <Download size={16} /> Save progress
                </button>
              </>
            )}
          </div>

          <div className="h-6 w-px bg-neutral-700 mx-1 hidden md:block" />

          {!isAdmin && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-neutral-400 uppercase font-bold">Specimens</span>
              <span className="text-sm font-mono font-bold text-neutral-200">{insects.length}/{collectionStats.totalSlots}</span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={handleLogout}
            className="ml-1 flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-900/20 px-3 py-2 rounded-lg transition border border-rose-900/50 hover:border-rose-800"
          >
            <LogOut size={14} /> <span className="hidden md:inline">Save & logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full p-4 md:p-10 flex flex-col items-center gap-8 bg-grid-pattern pb-32">
        {storageWarning && (
          <div className="w-full max-w-7xl rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-4 flex gap-3 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{storageWarning}</span>
          </div>
        )}

        <section className="w-full max-w-7xl rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur drawer-shadow overflow-hidden">
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${isAdmin ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                {isAdmin ? <ShieldCheck size={14} /> : <Leaf size={14} />}
                {isAdmin ? 'Read-only assessment' : 'Ethical virtual collection'}
              </div>
              <h1 className="text-2xl md:text-3xl font-serif text-neutral-900 dark:text-neutral-100 mb-2">
                {isAdmin ? 'Review pin placement, provenance, and taxonomic evidence.' : 'Practise curation without requiring lethal collection.'}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Each record now prompts students to document image provenance, non-lethal handling, pinning rationale, identification confidence, and ecological context.
              </p>
            </div>

            <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3">
              <div className="stat-card"><span>Total</span><strong>{insects.length}</strong><small>{collectionStats.totalSlots} slots</small></div>
              <div className="stat-card"><span>Pinned</span><strong>{collectionStats.pinnedCount}</strong><small>thorax/notum</small></div>
              <div className="stat-card"><span>Ethics</span><strong>{collectionStats.ethicalCount}</strong><small>documented</small></div>
              <div className="stat-card"><span>Complete</span><strong>{collectionStats.completeCount}</strong><small>{collectionStats.meanCompletion}% mean</small></div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-2">Find specimens</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Order, family, site..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {!isAdmin && (
                <p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">Use Save progress before submission. The JSON file contains images and metadata.</p>
              )}
            </div>
          </div>
        </section>

        {drawers.map((drawer) => {
          const drawerInsects = insects.filter(insect => insect.drawerId === drawer.id);
          return (
            <div key={drawer.id} className="w-full max-w-7xl bg-white dark:bg-neutral-900 rounded-2xl drawer-shadow border border-neutral-200 dark:border-neutral-800 relative transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-300 via-indigo-300 to-amber-300 dark:from-emerald-900 dark:via-indigo-900 dark:to-amber-900 opacity-80" />

              <div
                className="p-5 md:p-7 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                onClick={() => handleToggleDrawer(drawer.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleDrawer(drawer.id); }}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    aria-label={drawer.isCollapsed ? 'Expand drawer' : 'Collapse drawer'}
                  >
                    {drawer.isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {isAdmin ? (
                      <h2 className="text-neutral-700 dark:text-neutral-200 font-serif text-2xl italic truncate">{drawer.title}</h2>
                    ) : (
                      <input
                        type="text"
                        value={drawer.title}
                        onChange={(e) => handleUpdateDrawerTitle(drawer.id, e.target.value)}
                        className="text-neutral-700 dark:text-neutral-200 font-serif text-2xl italic bg-transparent border-none focus:ring-0 focus:outline-none placeholder-neutral-400 w-full hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition px-1"
                        placeholder="Drawer name"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Drawer name"
                      />
                    )}
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wide mt-1">
                      {drawerInsects.length} specimens • {drawer.slotCount} slots
                    </div>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDrawer(drawer.id); }}
                      className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                      title="Delete drawer"
                      aria-label="Delete drawer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {!drawer.isCollapsed && (
                <div className="p-6 md:p-10 pt-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-3">
                    <span className="text-neutral-400 dark:text-neutral-500 text-xs uppercase tracking-widest font-mono">Specimen drawer</span>
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs">Completion is based on image, pin, minimum taxonomy, collection details, and ethical provenance.</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-5 md:gap-6 relative z-0">
                    {Array.from({ length: drawer.slotCount }).map((_, index) => {
                      const insect = getInsectAtSlot(drawer.id, index);
                      const labelName = insect ? getSpecimenLabel(insect) : '';
                      const completion = insect ? getSpecimenCompletion(insect) : 0;
                      const searchMatch = matchesSearch(insect, searchQuery);
                      const completionClass = completion === 100
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : completion >= 60
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';

                      return (
                        <div
                          key={`${drawer.id}-${index}`}
                          onClick={() => handleSlotClick(drawer.id, index)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSlotClick(drawer.id, index);
                            }
                          }}
                          tabIndex={isAdmin && !insect ? -1 : 0}
                          role="button"
                          aria-label={insect ? `Open specimen ${labelName}` : `Add specimen to slot ${index + 1}`}
                          className={`
                            aspect-[4/5] relative rounded-2xl border-2 transition-all duration-300 group overflow-hidden specimen-card
                            ${searchQuery && !searchMatch ? 'opacity-30 grayscale' : 'opacity-100'}
                            ${isAdmin ? (insect ? 'cursor-pointer' : 'cursor-not-allowed opacity-40') : 'cursor-pointer'}
                            ${insect
                              ? 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1'
                              : 'bg-neutral-50 dark:bg-neutral-900 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20'
                            }
                          `}
                        >
                          {insect ? (
                            <div className="w-full h-full p-3 flex flex-col items-center">
                              <div className="flex-1 w-full flex items-center justify-center relative p-2 rounded-xl checkerboard-soft overflow-hidden">
                                {insect.imageUrl && (
                                  <img
                                    src={insect.imageUrl}
                                    alt={`Specimen: ${labelName}`}
                                    className="max-w-full max-h-full object-contain drop-shadow-md opacity-95 transition-opacity group-hover:opacity-100 relative z-10"
                                  />
                                )}
                                {insect.pinPosition && (
                                  <>
                                    <div
                                      className="absolute w-[2px] h-8 bg-neutral-700 dark:bg-neutral-200 opacity-60 z-20 pointer-events-none"
                                      style={{ left: `${insect.pinPosition.x}%`, top: `calc(${insect.pinPosition.y}% + 2px)` }}
                                    />
                                    <div
                                      className="absolute w-3.5 h-3.5 bg-neutral-950 dark:bg-white rounded-full border-2 border-neutral-400 dark:border-neutral-600 shadow-xl z-30 pointer-events-none"
                                      style={{ left: `calc(${insect.pinPosition.x}% - 7px)`, top: `calc(${insect.pinPosition.y}% - 7px)` }}
                                    >
                                      <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white dark:bg-neutral-900 rounded-full opacity-40" />
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="w-full mt-3 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-center">
                                <p className="font-serif text-sm italic font-semibold text-neutral-800 dark:text-neutral-200 truncate">{labelName}</p>
                                <p className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide truncate mt-0.5">
                                  {insect.dateCaught || 'No date'} • {insect.family || insect.order || 'Unknown'}
                                </p>
                                <div className="flex items-center justify-center gap-1 mt-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${completionClass}`}>{completion}%</span>
                                  {hasEthicalDocumentation(insect) && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1"><Leaf size={10} /> ethics</span>}
                                </div>
                              </div>

                              <div className="absolute inset-0 bg-indigo-900/5 dark:bg-indigo-400/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                                <div className="bg-white dark:bg-neutral-800 p-2 rounded-full shadow-lg text-indigo-700 dark:text-indigo-400 transform scale-75 group-hover:scale-100 transition">
                                  {isAdmin ? <Eye size={20} /> : <Maximize2 size={20} />}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                              <Plus size={32} strokeWidth={1.5} />
                              <span className="text-[10px] font-mono mt-3 uppercase tracking-widest font-medium">Slot {index + 1}</span>
                              {!isAdmin && <span className="text-[10px] mt-1 opacity-70">Add record</span>}
                            </div>
                          )}

                          <div className="absolute top-2 left-2 text-[9px] font-mono text-neutral-300 dark:text-neutral-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                        </div>
                      );
                    })}

                    {!isAdmin && (
                      <div className="flex flex-col justify-center gap-4 py-8">
                        <button
                          onClick={() => handleAddSlot(drawer.id)}
                          className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 text-neutral-400 hover:text-indigo-500 transition flex flex-col items-center justify-center gap-2 group"
                          title="Add slot"
                        >
                          <Plus size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Add slot</span>
                        </button>
                        <button
                          onClick={() => handleRemoveSlot(drawer.id)}
                          disabled={drawer.slotCount <= 1}
                          className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-neutral-400 hover:text-rose-500 transition flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove last slot"
                        >
                          <Minus size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!isAdmin && (
          <button
            onClick={handleAddDrawer}
            className="w-full max-w-7xl py-6 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 hover:border-indigo-500 dark:hover:border-indigo-400 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex flex-col items-center justify-center gap-2 group hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
          >
            <div className="p-3 bg-neutral-200 dark:bg-neutral-800 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition">
              <Plus size={24} />
            </div>
            <span className="font-serif font-bold text-lg">Add new specimen drawer</span>
          </button>
        )}
      </main>

      {editingSlot !== null && (
        <Editor
          drawerId={editingSlot.drawerId}
          slotIndex={editingSlot.index}
          initialData={getInsectAtSlot(editingSlot.drawerId, editingSlot.index)}
          onSave={handleSaveInsect}
          onClose={() => setEditingSlot(null)}
          onDelete={handleDeleteInsect}
          readOnly={isAdmin}
          defaultCollector={isAdmin ? '' : currentUser.fullName}
        />
      )}
    </div>
  );
}
