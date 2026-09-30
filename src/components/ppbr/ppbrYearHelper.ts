/**
 * Utility for managing Fiscal Year (Tahun Anggaran) scoping in PPBR and across ISMAN.
 *
 * Rules:
 * - Default year is '2026'.
 * - For '2026', all existing localStorage keys and Firestore document IDs are preserved
 *   without changes (e.g. 'ppbr_audit_universe', 'pkpt_final', 'risk_context_...').
 * - For other years (e.g. '2027'), keys are scoped with `_${year}` (e.g. 'ppbr_audit_universe_2027').
 * - In non-default years, initial data is completely empty ([]) unless the user has saved data.
 */

export const AVAILABLE_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];
export const DEFAULT_YEAR = '2026';

export const getSelectedYear = (): string => {
  try {
    return localStorage.getItem('isman_selected_year') || DEFAULT_YEAR;
  } catch (_) {
    return DEFAULT_YEAR;
  }
};

export const setSelectedYearStorage = (year: string) => {
  try {
    localStorage.setItem('isman_selected_year', year);
    window.dispatchEvent(new CustomEvent('isman_year_changed', { detail: year }));
  } catch (_) {}
};

/**
 * Returns the scoped storage key for localStorage.
 */
export const getScopedKey = (baseKey: string, year?: string): string => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) return baseKey;
  return `${baseKey}_${y}`;
};

/**
 * Returns the scoped Firestore document ID for PPBR collections.
 */
export const getScopedPPBRDocId = (baseDocId: string, year?: string): string => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) return baseDocId;
  return `${baseDocId}_${y}`;
};

/**
 * Returns the scoped Firestore doc ID for risk_context (RSO / ROO).
 */
export const getRiskContextDocId = (uid: string, riskType: string, year?: string): string => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) return `risk_context_${uid}_${riskType}`;
  return `risk_context_${uid}_${riskType}_${y}`;
};

/**
 * Returns the scoped localStorage cache key for risk rows.
 */
export const getRiskRowsCacheKey = (uid: string, riskType: string, year?: string): string => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) return `cached_risk_id_rows_${uid}_${riskType}`;
  return `cached_risk_id_rows_${uid}_${riskType}_${y}`;
};

/**
 * Returns the scoped localStorage cache key for risk context.
 */
export const getRiskContextCacheKey = (uid: string, riskType: string, year?: string): string => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) return `cached_context_${uid}_${riskType}`;
  return `cached_context_${uid}_${riskType}_${y}`;
};

/**
 * Returns the scoped Firestore doc ID for final_documents.
 */
export const getScopedFinalDocId = (uid: string, year?: string): string => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) return uid;
  return `${uid}_${y}`;
};

/**
 * Checks if a Firestore risk document belongs to the target fiscal year.
 */
export const isDocMatchingYear = (docData: any, year?: string): boolean => {
  const y = year || getSelectedYear();
  if (y === DEFAULT_YEAR) {
    return (!docData?.year && !docData?.tahun) || docData?.year === DEFAULT_YEAR || docData?.tahun === DEFAULT_YEAR;
  }
  return docData?.year === y || docData?.tahun === y;
};
