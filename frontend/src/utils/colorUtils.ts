/** オーナーごとのチップ色パレット（10色） */
const OWNER_COLORS = [
  "#4a90d9", // blue
  "#e87a90", // pink
  "#50c878", // green
  "#c9a0dc", // purple
  "#f0a050", // orange
  "#5ac8fa", // light blue
  "#ff6b6b", // red
  "#a8e6cf", // mint
  "#ffd93d", // yellow
  "#6c5ce7", // indigo
];

/** ユーザー名から決定論的に色を割り当てる */
export function ownerColor(owner: string): string {
  let hash = 0;
  for (let i = 0; i < owner.length; i++) {
    hash = ((hash << 5) - hash) + owner.charCodeAt(i);
    hash |= 0;
  }
  return OWNER_COLORS[Math.abs(hash) % OWNER_COLORS.length];
}

/** 背景色から適切な文字色（白 or 黒）を返す */
export function textColorFromBg(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6 && c.length !== 3) return "#ffffff";
  const r = parseInt(c.length === 3 ? c[0] + c[0] : c.slice(0, 2), 16);
  const g = parseInt(c.length === 3 ? c[1] + c[1] : c.slice(2, 4), 16);
  const b = parseInt(c.length === 3 ? c[2] + c[2] : c.slice(4, 6), 16);
  // W3C 輝度計算: 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a2e" : "#e0e0e0";
}

/** 色を明るくする（比率 0〜1、1=白） */
export function lightenColor(hex: string, ratio: number): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * ratio));
  const lg = Math.min(255, Math.round(g + (255 - g) * ratio));
  const lb = Math.min(255, Math.round(b + (255 - b) * ratio));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

/** 曜日番号からラベルを取得（0=日曜） */
export function dayOfWeekLabel(day: number): string {
  return ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"][day] ?? "日曜日";
}
