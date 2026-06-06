import holiday_jp from "@holiday-jp/holiday_jp";

/** 「YYYY-MM-DD」→ 祝日名 のマップ */
export type HolidayMap = Map<string, string>;

/**
 * 指定した期間内の祝日を取得する。
 * @param start 開始日（含む）
 * @param end 終了日（含む）
 * @returns 日付キー → 祝日名 のマップ
 */
export function getHolidaysInRange(start: Date, end: Date): HolidayMap {
    const holidays = holiday_jp.between(start, end);
    const map: HolidayMap = new Map();
    for (const h of holidays) {
        // holiday_jp の date は Date 型
        const d = h.date as Date;
        if (d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            map.set(`${y}-${m}-${day}`, h.name);
        }
    }
    return map;
}
