/** 低明度ビビッドカラー（個人の予定チップ色パレット）
 *  8列×2行で配置。上段は暖色→寒色、下段はさらに寒色→暖色のグラデーション。
 *  白文字との視認性を確保するため輝度を0.45以下に調整済み */
const PERSONAL_COLORS = [
  // 上段: 暖色→寒色
  "#cc3333", // vivid red
  "#bb5522", // vivid orange
  "#aa5522", // burnt orange
  "#a06a28", // amber
  "#6a7a22", // olive
  "#4c971e", // lime
  "#21a352", // green
  "#1f9b7c", // teal
  // 下段: 寒色→暖色
  "#1a8a6a", // sea green
  "#1a6a8a", // steel blue
  "#2255aa", // vivid blue (デフォルト)
  "#3355aa", // indigo
  "#5544aa", // violet
  "#7722aa", // purple
  "#aa2255", // rose
  "#cc3366", // pink
];

/** 設定画面で選択可能なチップ色の候補（個人用パレット） */
export const CHIP_COLORS = PERSONAL_COLORS;

/** HEX色文字列を RGB オブジェクトに変換 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  if (c.length === 3) {
    return {
      r: parseInt(c[0] + c[0], 16),
      g: parseInt(c[1] + c[1], 16),
      b: parseInt(c[2] + c[2], 16),
    };
  }
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

/** ユーザー名から決定論的に個人のチップ色を割り当てる */
export function ownerColor(owner: string): string {
  let hash = 0;
  for (let i = 0; i < owner.length; i++) {
    hash = ((hash << 5) - hash) + owner.charCodeAt(i);
    hash |= 0;
  }
  return PERSONAL_COLORS[Math.abs(hash) % PERSONAL_COLORS.length];
}

/** 複数の色コードを減法混色（絵の具の混色、幾何平均）でブレンドして予定チップ色を決定する */
export function scheduleColor(colors: string[]): string {
  if (colors.length === 0) return "#5b7fa5";
  const n = colors.length;
  let r = 1, g = 1, b = 1;
  for (const c of colors) {
    const rgb = hexToRgb(c);
    r *= rgb.r / 255;
    g *= rgb.g / 255;
    b *= rgb.b / 255;
  }
  const rr = Math.round(Math.pow(r, 1 / n) * 255);
  const gg = Math.round(Math.pow(g, 1 / n) * 255);
  const bb = Math.round(Math.pow(b, 1 / n) * 255);
  return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
}

/** 背景色から適切な文字色（白 or 黒）を返す */
export function textColorFromBg(hex: string): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1a1a2e" : "#e0e0e0";
  } catch {
    return "#ffffff";
  }
}

/** 曜日番号からラベルを取得（0=日曜） */
export function dayOfWeekLabel(day: number): string {
  return ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"][day] ?? "日曜日";
}
