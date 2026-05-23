/**
 * getUserTitle(rankingPower, reviewCount)
 *
 * Calculates a user's display title dynamically — never stored in the DB.
 * This ensures the title is always 100% in sync with the user's current
 * ranking_power and review_count across the entire app.
 *
 * @param {number} rankingPower  - The user's trust_score / ranking power (float)
 * @param {number} reviewCount   - Total number of reviews the user has submitted
 * @returns {string}             - Full title string including emoji
 */
export const getUserTitle = (rankingPower, reviewCount) => {
  const rp = rankingPower ?? 0;
  const rc = reviewCount ?? 0;

  // ─── Below 1.0: Suspicious / low-trust users ──────────────────────────────
  if (rp < 1) {
    if (rp >= 0.8) return 'במעקב קהילתי 🧐';
    if (rp >= 0.5) return 'חשוד מאוד 🤨';
    if (rp >= 0.1) return 'כמעט בטוח בוט 🤖';
    return 'יוזר פיקטיבי 👻';
  }

  // ─── 1.0 and above: Title based on review_count ───────────────────────────
  if (rc === 0)   return 'צופה מהצד 👀';
  if (rc <= 3)    return 'מחמם במיקרו 🧊';
  if (rc <= 8)    return 'מזמין קבוע בוולט 🛵';
  if (rc <= 15)   return 'מנשנש נאגטס חריפים 🔥';
  if (rc <= 25)   return 'מיירט קופונים מקצועי 🎫';
  if (rc <= 40)   return 'חגורה שחורה בטייקאווי 🥋';
  if (rc <= 60)   return 'קרניבור של כבוד 🥩';
  if (rc <= 85)   return 'מחסל טריפל צ׳יזבורגרים 🍔';
  if (rc <= 115)  return 'דוקטור לפסטה ופסטו 🍝';
  if (rc <= 150)  return 'מבקר מסעדות מטעם עצמו 🎤';
  if (rc <= 200)  return 'ראש עיריית המשלוחים 👑';
  if (rc <= 260)  return 'מייקל ג׳ורדן של המאנצ׳ 🏀';
  if (rc <= 330)  return 'קיבה מטיטניום 🦾';
  if (rc <= 410)  return 'אגדה קולינרית 🦄';
  if (rc <= 499)  return 'מנכ״ל משרד הרעב 💼';
  return 'הבוס הסופי של התפריט 👾';
};
