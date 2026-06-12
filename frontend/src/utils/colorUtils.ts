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

/** 複数の色コードを減法混色（絵の具の混色、幾何平均）でブレンドして予定チップ色を決定する
 *  暗くなりすぎを防ぐため、入力色の平均輝度を基準に輝度補正を行う */
export function scheduleColor(colors: string[]): string {
  if (colors.length === 0) return "#5b7fa5";
  if (colors.length === 1) return colors[0];
  const n = colors.length;
  let geoR = 1, geoG = 1, geoB = 1;
  let sumR = 0, sumG = 0, sumB = 0;
  for (const c of colors) {
    const rgb = hexToRgb(c);
    geoR *= rgb.r / 255;
    geoG *= rgb.g / 255;
    geoB *= rgb.b / 255;
    sumR += rgb.r;
    sumG += rgb.g;
    sumB += rgb.b;
  }
  let rr = Math.round(Math.pow(geoR, 1 / n) * 255);
  let gg = Math.round(Math.pow(geoG, 1 / n) * 255);
  let bb = Math.round(Math.pow(geoB, 1 / n) * 255);

  // 入力色の平均輝度を基準に、幾何平均が暗くなりすぎないよう補正
  const avgLum = (0.299 * sumR + 0.587 * sumG + 0.114 * sumB) / n;
  const resultLum = 0.299 * rr + 0.587 * gg + 0.114 * bb;
  if (resultLum < avgLum * 0.85) {
    const scale = Math.min((avgLum * 0.85) / resultLum, 1.6);
    rr = Math.min(255, Math.round(rr * scale));
    gg = Math.min(255, Math.round(gg * scale));
    bb = Math.min(255, Math.round(bb * scale));
  }

  return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
}

/** 背景色から適切な文字色（白 or 黒）を返す */
export function textColorFromBg(hex: string): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#0b0b14" : "#e0e0e0";
  } catch {
    return "#ffffff";
  }
}

/** 曜日番号からラベルを取得（0=日曜） */
export function dayOfWeekLabel(day: number): string {
  return ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"][day] ?? "日曜日";
}
