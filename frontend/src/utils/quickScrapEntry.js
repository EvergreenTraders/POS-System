// ── "scrap" search-bar shortcut parsing ──────────────────────────────────────
// Recognizes a weight + purity (in any order, e.g. "5.6g 14k" or "14k 5.6g")
// typed into a search bar. rowKey matches one of JewelryIntakeScreen's
// SCRAP_FIXED_ROWS keys — one row per common karat/fineness, purity baked in.
// Platinum/palladium and uncommon purities have no fixed row (Custom Rows
// only), so they resolve to no rowKey and the text falls through to the
// unique-item-prefill path instead of bulk scrap.
//
// Shared by ModernTransactions.js's top search bar and BuyTransactionScreen.js's
// item intake search bar, so "scrap" (or "5.6g 14k") behaves identically
// whichever one you type it into.
const SCRAP_PURITY_BY_DECIMAL = [
  { rowKey: 'gold10k',   value: 0.417, metal: 'Gold',   karat: 10 },
  { rowKey: 'gold14k',   value: 0.585, metal: 'Gold',   karat: 14 },
  { rowKey: 'gold18k',   value: 0.750, metal: 'Gold',   karat: 18 },
  { rowKey: 'gold22k',   value: 0.917, metal: 'Gold',   karat: 22 },
  { rowKey: 'silver925', value: 0.925, metal: 'Silver', karat: null },
];
const SCRAP_METAL_WORDS = { gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium' };

export function parseQuickScrapEntry(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  let hasScrapWord = false;
  let weightG = null;
  let karat = null;
  let purityValue = null;
  let metal = null;
  const leftover = [];

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    let m;
    if (lower === 'scrap') { hasScrapWord = true; continue; }
    if (SCRAP_METAL_WORDS[lower]) { metal = SCRAP_METAL_WORDS[lower]; continue; }
    if (weightG === null && (m = lower.match(/^(\d+(?:\.\d+)?)g$/))) {
      weightG = parseFloat(m[1]);
      continue;
    }
    if (purityValue === null && (m = lower.match(/^(\d+)k$/))) {
      const k = parseInt(m[1], 10);
      karat = k;
      purityValue = Math.round((k / 24) * 1000) / 1000;
      metal = metal || 'Gold';
      continue;
    }
    if (purityValue === null && (m = lower.match(/^0?(\.\d+)$/))) {
      const dec = parseFloat(`0${m[1]}`);
      const nearest = SCRAP_PURITY_BY_DECIMAL.reduce((best, c) =>
        Math.abs(c.value - dec) < Math.abs(best.value - dec) ? c : best, SCRAP_PURITY_BY_DECIMAL[0]);
      if (Math.abs(nearest.value - dec) <= 0.01) {
        purityValue = nearest.value;
        karat = nearest.karat;
        metal = metal || nearest.metal;
      } else {
        purityValue = dec;
        metal = metal || 'Gold';
      }
      continue;
    }
    leftover.push(tok);
  }

  // rowKey only resolves for a known common karat/fineness with a fixed row —
  // platinum, palladium, and uncommon purities have none.
  const rowMatch = purityValue != null
    ? SCRAP_PURITY_BY_DECIMAL.find(c => Math.abs(c.value - purityValue) <= 0.01 && (!metal || c.metal === metal))
    : null;
  const rowKey = rowMatch?.rowKey ?? null;
  const hasWeightAndPurity = weightG != null && purityValue != null;
  const isBulkScrap = hasScrapWord || (hasWeightAndPurity && leftover.length === 0);
  const isUniqueWithPrefill = !isBulkScrap && hasWeightAndPurity;

  return { hasScrapWord, weightG, karat, purityValue, metal, rowKey, leftover, isBulkScrap, isUniqueWithPrefill };
}
