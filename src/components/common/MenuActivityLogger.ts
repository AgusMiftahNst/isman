import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getDeviceOperatorName } from './DeviceRegistrationModal';

export interface MenuActivityLogItem {
  id: string;
  timestamp: string; // ISO
  formattedTime: string;
  operatorName: string;
  operatorRole?: string;
  menuKey: string; // e.g. "ppbr-1", "ppbr-12", "rso-1", "roo-2"
  menuTitle: string; // e.g. "I. AUDIT UNIVERSE", "XII. AREA PENGAWASAN MANDATORY"
  year: string;
  action: string; // e.g. "Menambah Baris", "Mengubah Isi Data", "Menghapus Baris", "Sinkronisasi Cloud", "Memulihkan Versi"
  detail?: string; // e.g. "Menambahkan 2 baris baru pada OPD Bappeda • Total 56 program"
  itemCount?: number;
}

export const OPERATOR_COLORS = [
  { name: 'Indigo', bg: 'bg-indigo-600', text: 'text-indigo-600', lightBg: 'bg-indigo-50', border: 'border-indigo-200' },
  { name: 'Emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-50', border: 'border-emerald-200' },
  { name: 'Purple', bg: 'bg-purple-600', text: 'text-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-200' },
  { name: 'Amber', bg: 'bg-amber-600', text: 'text-amber-600', lightBg: 'bg-amber-50', border: 'border-amber-200' },
  { name: 'Rose', bg: 'bg-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-50', border: 'border-rose-200' },
  { name: 'Teal', bg: 'bg-teal-600', text: 'text-teal-600', lightBg: 'bg-teal-50', border: 'border-teal-200' },
  { name: 'Cyan', bg: 'bg-cyan-600', text: 'text-cyan-600', lightBg: 'bg-cyan-50', border: 'border-cyan-200' }
];

export const getOperatorColor = (name: string) => {
  if (!name) return OPERATOR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % OPERATOR_COLORS.length;
  return OPERATOR_COLORS[index];
};

/**
 * Format timestamp into human-friendly Indonesian date & time
 */
export const formatHumanDateTime = (isoString?: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (isToday) {
      return `Hari ini, ${timeStr}`;
    }
    const dateStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  } catch (_) {
    return isoString;
  }
};

/**
 * Record a new activity specifically for a given menu and year
 */
export const recordMenuActivity = async (params: {
  menuKey: string;
  menuTitle: string;
  year: string;
  action: string;
  detail?: string;
  itemCount?: number;
  operatorName?: string;
}): Promise<MenuActivityLogItem> => {
  const operator = params.operatorName || getDeviceOperatorName() || 'Operator';
  const now = new Date();
  const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const activityItem: MenuActivityLogItem = {
    id,
    timestamp: now.toISOString(),
    formattedTime: formatHumanDateTime(now.toISOString()),
    operatorName: operator,
    menuKey: params.menuKey,
    menuTitle: params.menuTitle,
    year: params.year,
    action: params.action,
    detail: params.detail || params.action,
    itemCount: params.itemCount
  };

  const localKey = `menu_activity_log_${params.menuKey}_${params.year}`;

  // 1. Save to LocalStorage
  try {
    const existingRaw = localStorage.getItem(localKey);
    let list: MenuActivityLogItem[] = [];
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) list = parsed;
      } catch (_) {}
    }
    const updated = [activityItem, ...list.filter(x => x.id !== id)].slice(0, 150);
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local activity save warning:', e);
  }

  // 2. Dispatch browser event
  try {
    window.dispatchEvent(new CustomEvent('menu_activity_recorded', {
      detail: { menuKey: params.menuKey, year: params.year, activity: activityItem }
    }));
  } catch (_) {}

  // 3. Save to Firestore Cloud so ALL teammates see this person's activity
  try {
    const docId = `${params.menuKey}_${params.year}`;
    const docRef = doc(db, 'menu_activities', docId);
    const snap = await getDoc(docRef);
    let cloudList: MenuActivityLogItem[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.activities)) {
      cloudList = snap.data()?.activities;
    }
    const merged = [activityItem, ...cloudList.filter(x => x.id !== id)].slice(0, 150);
    await setDoc(docRef, {
      menuKey: params.menuKey,
      menuTitle: params.menuTitle,
      year: params.year,
      lastUpdated: now.toISOString(),
      lastOperator: operator,
      activities: merged
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore activity log warning:', err);
  }

  return activityItem;
};

/**
 * Fetch all activities for a specific menu and year
 * Merges Cloud Firestore records + LocalStorage + Any existing Version Histories from PPBR docs
 */
export const fetchMenuActivities = async (menuKey: string, year: string): Promise<MenuActivityLogItem[]> => {
  const localKey = `menu_activity_log_${menuKey}_${year}`;
  const map = new Map<string, MenuActivityLogItem>();

  // A. Load from LocalStorage
  try {
    const localRaw = localStorage.getItem(localKey);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach(item => {
          if (item && item.id) map.set(item.id, item);
        });
      }
    }
  } catch (_) {}

  // B. Load from Firestore menu_activities
  try {
    const docId = `${menuKey}_${year}`;
    const snap = await getDoc(doc(db, 'menu_activities', docId));
    if (snap.exists() && Array.isArray(snap.data()?.activities)) {
      const remoteItems: MenuActivityLogItem[] = snap.data()?.activities;
      remoteItems.forEach(item => {
        if (item && item.id) map.set(item.id, item);
      });
    }
  } catch (e) {
    console.warn('Fetch menu activities firestore warning:', e);
  }

  // C. Convert PPBR version histories to activity logs if this is a PPBR menu
  // (e.g. ppbr-1 -> audit_universe, ppbr-12 -> area_mandatory, etc.)
  try {
    const ppbrDocMap: Record<string, string> = {
      'ppbr-1': 'audit_universe',
      'ppbr-2': 'evaluasi_register',
      'ppbr-3': 'kematangan_mr',
      'ppbr-4': 'faktor_anggaran',
      'ppbr-5': 'program_unggulan',
      'ppbr-6': 'temuan_fraud',
      'ppbr-7': 'isu_terkini',
      'ppbr-8': 'prioritas_program',
      'ppbr-9': 'prioritas_opd',
      'ppbr-10': 'prioritas_desa',
      'ppbr-11': 'usulan_pengawasan',
      'ppbr-12': 'area_mandatory',
      'ppbr-13': 'tidak_masuk_pkpt',
      'ppbr-14': 'pkpt_final'
    };

    const baseDocId = ppbrDocMap[menuKey];
    if (baseDocId) {
      const docId = `${baseDocId}_${year}`;
      const snap = await getDoc(doc(db, 'ppbr_data', docId));
      if (snap.exists() && Array.isArray(snap.data()?.historyVersions)) {
        const versions: any[] = snap.data()?.historyVersions;
        versions.forEach(v => {
          if (v && v.id) {
            const actId = `ver-${v.id}`;
            if (!map.has(actId) && !map.has(v.id)) {
              map.set(actId, {
                id: actId,
                timestamp: v.timestamp || new Date().toISOString(),
                formattedTime: v.formattedTime || formatHumanDateTime(v.timestamp),
                operatorName: v.operatorName || 'Operator',
                menuKey: menuKey,
                menuTitle: snap.data()?.title || menuKey,
                year: year,
                action: v.actionDescription?.includes('Menambah')
                  ? 'Menambah Data'
                  : v.actionDescription?.includes('Menghapus')
                  ? 'Menghapus Data'
                  : v.actionDescription?.includes('Pulihkan')
                  ? 'Memulihkan Versi'
                  : 'Pembaruan Data',
                detail: v.actionDescription || `${v.itemCount || 0} data diproses`,
                itemCount: v.itemCount
              });
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn('Convert PPBR history to activities warning:', e);
  }

  const results = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Cache back to LocalStorage
  try {
    localStorage.setItem(localKey, JSON.stringify(results.slice(0, 150)));
  } catch (_) {}

  return results;
};
