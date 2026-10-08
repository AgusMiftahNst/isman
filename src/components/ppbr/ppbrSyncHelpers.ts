import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { getScopedKey, getScopedPPBRDocId, DEFAULT_YEAR } from './ppbrYearHelper';

export interface PPBRDocConfig {
  menuId: string;
  docBaseId: string;
  storageKeyBase: string;
  title: string;
}

export const PPBR_DOC_CONFIGS: PPBRDocConfig[] = [
  { menuId: 'ppbr-1', docBaseId: 'audit_universe', storageKeyBase: 'ppbr_audit_universe', title: 'Audit Universe' },
  { menuId: 'ppbr-2', docBaseId: 'evaluasi_register', storageKeyBase: 'ppbr_evaluasi_register', title: 'Evaluasi Register Risiko' },
  { menuId: 'ppbr-3', docBaseId: 'kematangan_mr', storageKeyBase: 'ppbr_kematangan_mr', title: 'Tingkat Kematangan MR' },
  { menuId: 'ppbr-4', docBaseId: 'faktor_anggaran', storageKeyBase: 'ppbr_faktor_anggaran', title: 'Faktor Risiko Anggaran' },
  { menuId: 'ppbr-5', docBaseId: 'program_unggulan', storageKeyBase: 'ppbr_program_unggulan', title: 'Program Unggulan Daerah & RPJMN' },
  { menuId: 'ppbr-6', docBaseId: 'temuan_fraud', storageKeyBase: 'ppbr_temuan_fraud', title: 'Temuan Fraud & Kasus Hukum' },
  { menuId: 'ppbr-7', docBaseId: 'isu_terkini', storageKeyBase: 'ppbr_isu_terkini', title: 'Faktor Risiko Isu Terkini' },
  { menuId: 'ppbr-8', docBaseId: 'prioritas_program', storageKeyBase: 'ppbr_prioritas_program', title: 'Penetapan Prioritas Program RPJMD' },
  { menuId: 'ppbr-9', docBaseId: 'prioritas_opd', storageKeyBase: 'ppbr_prioritas_opd', title: 'Penetapan Prioritas Unit Kerja OPD' },
  { menuId: 'ppbr-10', docBaseId: 'prioritas_desa', storageKeyBase: 'ppbr_prioritas_desa', title: 'Penetapan Prioritas Desa & Puskesmas' },
  { menuId: 'ppbr-11', docBaseId: 'usulan_pengawasan', storageKeyBase: 'ppbr_usulan_pengawasan', title: 'Usulan Prioritas Pengawasan' },
  { menuId: 'ppbr-12', docBaseId: 'area_mandatory', storageKeyBase: 'ppbr_area_mandatory', title: 'Area Pengawasan Mandatory' },
  { menuId: 'ppbr-13', docBaseId: 'tidak_masuk_pkpt', storageKeyBase: 'ppbr_tidak_masuk_pkpt', title: 'Area Tidak Masuk PKPT' },
  { menuId: 'ppbr-14', docBaseId: 'pkpt_final', storageKeyBase: 'ppbr_pkpt_final', title: 'Format PKPT Berbasis Risiko' }
];

/**
 * Global background sync hook:
 * Subscribes to all PPBR documents in Firestore so that ANY laptop (new or old)
 * immediately populates its local cache and stays in sync in real time.
 */
export function usePPBRGlobalSync(year: string) {
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [lastGlobalSync, setLastGlobalSync] = useState<string | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    PPBR_DOC_CONFIGS.forEach((config) => {
      const docId = getScopedPPBRDocId(config.docBaseId, year);
      const storageKey = getScopedKey(config.storageKeyBase, year);
      const docRef = doc(db, 'ppbr_data', docId);

      const unsub = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data && Array.isArray(data.items)) {
              // Check if local storage on this laptop has MORE items that were not pushed yet
              try {
                const localRaw = localStorage.getItem(storageKey);
                if (localRaw) {
                  const localParsed = JSON.parse(localRaw);
                  if (
                    Array.isArray(localParsed) &&
                    localParsed.length > data.items.length
                  ) {
                    // Local has more items (e.g. 103 vs 100, or 100 vs 55 from initial seed), auto-promote to Cloud
                    console.log(`[Auto-Sync] Mempromosikan data lokal (${localParsed.length} baris vs cloud ${data.items.length}) ke Cloud untuk ${config.title}`);
                    setDoc(docRef, {
                      items: localParsed,
                      updatedAt: new Date().toISOString(),
                      title: `${config.title} ${year}`
                    }, { merge: true }).catch(err => console.warn('Auto-promote error:', err));
                    return;
                  }
                }
              } catch (_) {}

              // Save cloud data to localStorage so synchronous helpers have it immediately
              try {
                localStorage.setItem(storageKey, JSON.stringify(data.items));
                window.dispatchEvent(new CustomEvent('ppbr_data_updated', { detail: { docId, storageKey } }));
                setSyncedCount((prev) => prev + 1);
                setLastGlobalSync(new Date().toLocaleTimeString('id-ID'));
              } catch (e) {
                console.warn('Failed to update local storage cache for ' + storageKey, e);
              }
            }
          } else {
            // Document does not exist in Firestore yet. If this laptop has local data, push to Cloud
            try {
              const localRaw = localStorage.getItem(storageKey);
              if (localRaw) {
                const localParsed = JSON.parse(localRaw);
                if (Array.isArray(localParsed) && localParsed.length > 0) {
                  console.log(`[Auto-Sync] Dokumen ${docId} belum ada di Cloud, mengunggah ${localParsed.length} baris lokal.`);
                  setDoc(docRef, {
                    items: localParsed,
                    updatedAt: new Date().toISOString(),
                    title: `${config.title} ${year}`
                  }, { merge: true }).catch(err => console.warn('Initial push error:', err));
                }
              }
            } catch (_) {}
          }
        },
        (err) => {
          console.warn(`Firestore sync warning for ${config.docBaseId}:`, err?.message || err);
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [year]);

  return { syncedCount, lastGlobalSync };
}

export interface UsePPBRDocSyncOptions<T> {
  docBaseId: string;
  storageKeyBase: string;
  year: string;
  initialData: T[];
  title?: string;
  onRemoteUpdate?: (items: T[]) => void;
  transformBeforeSave?: (items: T[]) => T[];
}

/**
 * Reusable hook for individual PPBR menu components.
 * Guarantees real-time bidirectional Firestore sync with debounce & offline fallback.
 */
export function usePPBRDocSync<T extends { id?: string }>({
  docBaseId,
  storageKeyBase,
  year,
  initialData,
  title,
  onRemoteUpdate,
  transformBeforeSave
}: UsePPBRDocSyncOptions<T>) {
  const currentYear = year || DEFAULT_YEAR;
  const docId = getScopedPPBRDocId(docBaseId, currentYear);
  const storageKey = getScopedKey(storageKeyBase, currentYear);

  // Initialize data from localStorage cache if available, otherwise initialData
  const [data, setData] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return initialData;
  });

  const [cloudStatus, setCloudStatus] = useState<'synced' | 'saving' | 'offline' | 'error'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);

  const isRemoteUpdateRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time Firestore onSnapshot listener
  useEffect(() => {
    const docRef = doc(db, 'ppbr_data', docId);

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        setIsCloudLoaded(true);
        if (snap.exists()) {
          const snapData = snap.data();
          if (snapData && Array.isArray(snapData.items)) {
            // Check if current local state has more items than Firestore (e.g. 103 vs 100 or 100 vs 55)
            if (data.length > snapData.items.length) {
              console.log(`[Auto-Sync] Local memiliki lebih banyak baris (${data.length} vs ${snapData.items.length}), mempertahankan dan mengunggah ke Cloud.`);
              setDoc(docRef, {
                items: data,
                updatedAt: new Date().toISOString(),
                title: title ? `${title} ${currentYear}` : docId
              }, { merge: true }).catch(err => console.warn('Auto-heal Cloud error:', err));
              return;
            }

            isRemoteUpdateRef.current = true;
            const remoteItems = snapData.items as T[];
            setData(remoteItems);
            try {
              localStorage.setItem(storageKey, JSON.stringify(remoteItems));
            } catch (_) {}

            if (onRemoteUpdate) {
              onRemoteUpdate(remoteItems);
            }

            setCloudStatus('synced');
            if (snapData.updatedAt) {
              try {
                setLastSyncedTime(new Date(snapData.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              } catch (_) {
                setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              }
            }
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
            }, 300);
          }
        } else {
          // If Firestore doesn't have the document yet, but this laptop has data, push to Cloud
          if (data && data.length > 0) {
            setDoc(docRef, {
              items: data,
              updatedAt: new Date().toISOString(),
              title: title ? `${title} ${currentYear}` : docId
            }, { merge: true }).catch(err => {
              console.warn(`Initial push error for ${docId}:`, err);
            });
          }
        }
      },
      (err) => {
        console.warn(`Firestore listener warning for ${docId}:`, err?.message || err);
        setCloudStatus('offline');
        setIsCloudLoaded(true);
      }
    );

    return () => {
      unsub();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [docId, currentYear, storageKey]);

  // Save data handler (Dual persistence: state + localStorage + Cloud Firestore)
  const handleSaveData = useCallback(
    (newData: T[], immediateCloud = false) => {
      const processed = transformBeforeSave ? transformBeforeSave(newData) : newData;
      setData(processed);
      try {
        localStorage.setItem(storageKey, JSON.stringify(processed));
      } catch (_) {}

      // Notify other tabs and components on this browser
      window.dispatchEvent(new CustomEvent('ppbr_data_updated', { detail: { docId, storageKey } }));

      if (isRemoteUpdateRef.current) return;

      setCloudStatus('saving');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const doCloudSave = async () => {
        try {
          const nowIso = new Date().toISOString();
          await setDoc(doc(db, 'ppbr_data', docId), {
            items: processed,
            updatedAt: nowIso,
            title: title ? `${title} ${currentYear}` : docId
          }, { merge: true });
          setCloudStatus('synced');
          setLastSyncedTime(new Date(nowIso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch (err) {
          console.warn(`Cloud save error for ${docId}:`, err);
          setCloudStatus('offline');
        }
      };

      if (immediateCloud) {
        doCloudSave();
      } else {
        saveTimeoutRef.current = setTimeout(doCloudSave, 600);
      }
    },
    [docId, storageKey, title, currentYear, transformBeforeSave]
  );

  // Manual pull from Cloud
  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);
    setCloudStatus('saving');
    try {
      const snap = await getDoc(doc(db, 'ppbr_data', docId));
      if (snap.exists()) {
        const snapData = snap.data();
        if (snapData && Array.isArray(snapData.items)) {
          const items = snapData.items as T[];
          setData(items);
          localStorage.setItem(storageKey, JSON.stringify(items));
          if (onRemoteUpdate) onRemoteUpdate(items);
          setCloudStatus('synced');
          setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } else {
        // If not in cloud, push current
        await setDoc(doc(db, 'ppbr_data', docId), {
          items: data,
          updatedAt: new Date().toISOString(),
          title: title ? `${title} ${currentYear}` : docId
        }, { merge: true });
        setCloudStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {
      console.warn(`Manual sync failed for ${docId}:`, e);
      setCloudStatus('offline');
    } finally {
      setIsManualSyncing(false);
    }
  }, [docId, storageKey, data, title, currentYear, onRemoteUpdate]);

  return {
    data,
    setData,
    handleSaveData,
    cloudStatus,
    lastSyncedTime,
    isManualSyncing,
    isCloudLoaded,
    handleManualSync
  };
}
