import { describe, it, expect } from "vitest";
import {
  adjustEndByStart,
  adjustStartByEnd,
  getSchedulePosition,
  shouldShowTitle,
  isMultiDay,
  rangesOverlap,
  filterMultiDayInRange,
  computeDaySlots,
  MAX_VISIBLE_SLOTS,
} from "./dateUtils";
import { Schedule } from "../types/schedule";

// ========== adjustEndByStart（開始変更 → 終了を補正） ==========
describe("adjustEndByStart", () => {
  it("終了 > 開始: 補正しない", () => {
    expect(adjustEndByStart("2026-06-06", "10:00", "2026-06-06", "11:00"))
      .toEqual({ endDate: "2026-06-06", endTime: "11:00" });
  });

  it("同日・終了 < 開始: 終了を開始+1時間に補正", () => {
    expect(adjustEndByStart("2026-06-06", "14:00", "2026-06-06", "10:00"))
      .toEqual({ endDate: "2026-06-06", endTime: "15:00" });
  });

  it("終了日 < 開始日: 補正する", () => {
    expect(adjustEndByStart("2026-06-06", "10:00", "2026-06-05", "10:00"))
      .toEqual({ endDate: "2026-06-06", endTime: "11:00" });
  });

  it("開始23:00・終了同じ: 日付をまたぐ", () => {
    expect(adjustEndByStart("2026-06-06", "23:00", "2026-06-06", "23:00"))
      .toEqual({ endDate: "2026-06-07", endTime: "00:00" });
  });

  it("年末をまたぐ", () => {
    expect(adjustEndByStart("2026-12-31", "23:00", "2026-12-31", "23:00"))
      .toEqual({ endDate: "2027-01-01", endTime: "00:00" });
  });

  it("うるう年をまたぐ", () => {
    expect(adjustEndByStart("2024-02-29", "23:00", "2024-02-29", "23:00"))
      .toEqual({ endDate: "2024-03-01", endTime: "00:00" });
  });
});

// ========== adjustStartByEnd（終了変更 → 開始を補正） ==========
describe("adjustStartByEnd", () => {
  it("終了 > 開始: 補正しない", () => {
    expect(adjustStartByEnd("2026-06-06", "10:00", "2026-06-06", "11:00"))
      .toEqual({ startDate: "2026-06-06", startTime: "10:00" });
  });

  it("同日・終了 < 開始: 開始を終了-1時間に補正", () => {
    expect(adjustStartByEnd("2026-06-06", "14:00", "2026-06-06", "10:00"))
      .toEqual({ startDate: "2026-06-06", startTime: "09:00" });
  });

  it("終了日 < 開始日: 開始を補正", () => {
    expect(adjustStartByEnd("2026-06-06", "10:00", "2026-06-05", "10:00"))
      .toEqual({ startDate: "2026-06-05", startTime: "09:00" });
  });

  it("終了00:00・開始同じ: 開始を前日の23:00に補正", () => {
    expect(adjustStartByEnd("2026-06-06", "00:00", "2026-06-06", "00:00"))
      .toEqual({ startDate: "2026-06-05", startTime: "23:00" });
  });

  it("年初をまたぐ", () => {
    expect(adjustStartByEnd("2027-01-01", "00:00", "2027-01-01", "00:00"))
      .toEqual({ startDate: "2026-12-31", startTime: "23:00" });
  });

  it("うるう年3/1の0時→2/29の23時に補正", () => {
    expect(adjustStartByEnd("2024-03-01", "00:00", "2024-03-01", "00:00"))
      .toEqual({ startDate: "2024-02-29", startTime: "23:00" });
  });
});

// ========== getSchedulePosition ==========
function makeSchedule(startDatetime: string, endDatetime: string): Schedule {
  return {
    id: 1,
    title: "test",
    isAllDay: false,
    startDatetime,
    endDatetime,
    owner: "me",
    description: "",
  };
}

describe("getSchedulePosition", () => {
  it("同日のみ: single", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/06-11:00");
    expect(getSchedulePosition(s, new Date(2026, 5, 6))).toBe("single");
  });

  it("複数日の初日: start", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/08-11:00");
    expect(getSchedulePosition(s, new Date(2026, 5, 6))).toBe("start");
  });

  it("複数日の中間日: middle", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/08-11:00");
    expect(getSchedulePosition(s, new Date(2026, 5, 7))).toBe("middle");
  });

  it("複数日の最終日: end", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/08-11:00");
    expect(getSchedulePosition(s, new Date(2026, 5, 8))).toBe("end");
  });

  it("範囲外の日はmiddle扱い（schedulesForDateで呼ばれないことが前提）", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/08-11:00");
    expect(getSchedulePosition(s, new Date(2026, 5, 9))).toBe("middle");
  });
});

// ========== shouldShowTitle ==========
describe("shouldShowTitle", () => {
  it("同日のみ: 常に表示", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/06-11:00");
    expect(shouldShowTitle(s, new Date(2026, 5, 6))).toBe(true);
  });

  it("複数日またぎの初日: 表示", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/08-11:00");
    expect(shouldShowTitle(s, new Date(2026, 5, 6))).toBe(true);
  });

  it("複数日またぎの中間日（平日）: 非表示", () => {
    const s = makeSchedule("2026/06/01-10:00", "2026/06/05-11:00");
    expect(shouldShowTitle(s, new Date(2026, 5, 3))).toBe(false); // 6/3 水曜
  });

  it("週をまたいだ場合、日曜（週初め）なら表示", () => {
    // 2026/5/31(日) ~ 2026/6/7(日) の週
    // 水曜 6/3 から始まる予定 → 日曜 6/7 は週をまたいで継続中
    const s = makeSchedule("2026/06/03-10:00", "2026/06/10-11:00");
    expect(shouldShowTitle(s, new Date(2026, 5, 7))).toBe(true); // 6/7 日曜
  });

  it("週をまたいだが、予定終了後の日曜: false", () => {
    const s = makeSchedule("2026/06/03-10:00", "2026/06/05-11:00");
    expect(shouldShowTitle(s, new Date(2026, 5, 7))).toBe(false); // 6/7 日曜 → 予定は6/5まで
  });

  it("予定開始日が日曜の場合: 表示（開始日として）", () => {
    const s = makeSchedule("2026/06/07-10:00", "2026/06/09-11:00");
    expect(shouldShowTitle(s, new Date(2026, 5, 7))).toBe(true); // 6/7 日曜 = 開始日
  });
});

// ========== isMultiDay ==========
describe("isMultiDay", () => {
  it("同日のみ: false", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/06-11:00");
    expect(isMultiDay(s)).toBe(false);
  });

  it("開始日 != 終了日: true", () => {
    const s = makeSchedule("2026/06/06-10:00", "2026/06/08-11:00");
    expect(isMultiDay(s)).toBe(true);
  });
});

// ========== rangesOverlap ==========
describe("rangesOverlap", () => {
  it("完全に重なる: true", () => {
    expect(rangesOverlap(5, 10, 6, 8)).toBe(true);
  });

  it("部分的に重なる: true", () => {
    expect(rangesOverlap(5, 10, 8, 15)).toBe(true);
  });

  it("範囲Aが範囲Bを含む: true", () => {
    expect(rangesOverlap(1, 10, 3, 7)).toBe(true);
  });

  it("重ならない: false", () => {
    expect(rangesOverlap(1, 5, 6, 10)).toBe(false);
  });

  it("境界で接する: true（同日は重なり）", () => {
    expect(rangesOverlap(5, 10, 10, 15)).toBe(true);
  });

  it("完全に前: false", () => {
    expect(rangesOverlap(1, 3, 5, 10)).toBe(false);
  });

  it("完全に後: false", () => {
    expect(rangesOverlap(10, 15, 1, 5)).toBe(false);
  });
});

// ========== スロット計算用ヘルパー ==========
function makeSched(
  id: number,
  start: string,
  end: string,
): Schedule {
  return { id, title: `s${id}`, isAllDay: false, startDatetime: start, endDatetime: end, owner: "me", description: "" };
}

function weekDates(year: number, month: number, startDay: number): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(year, month, startDay + i));
}

// ========== filterMultiDayInRange ==========
describe("filterMultiDayInRange", () => {
  const calStart = new Date(2026, 5, 7);  // 2026/6/7
  const calEnd = new Date(2026, 5, 13);   // 2026/6/13

  it("範囲内の複数日またぎ予定を含める", () => {
    const s1 = makeSched(1, "2026/06/06-10:00", "2026/06/10-11:00");
    const result = filterMultiDayInRange([s1], calStart, calEnd);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(s1.id);
  });

  it("範囲外の複数日またぎ予定を除外する", () => {
    const s1 = makeSched(1, "2025/06/06-10:00", "2025/06/08-11:00");
    const result = filterMultiDayInRange([s1], calStart, calEnd);
    expect(result).toHaveLength(0);
  });

  it("単日予定は除外する", () => {
    const s1 = makeSched(1, "2026/06/08-10:00", "2026/06/08-11:00");
    const result = filterMultiDayInRange([s1], calStart, calEnd);
    expect(result).toHaveLength(0);
  });

  it("開始日順にソートする", () => {
    const s1 = makeSched(1, "2026/06/09-10:00", "2026/06/15-11:00");
    const s2 = makeSched(2, "2026/06/07-10:00", "2026/06/12-11:00");
    const result = filterMultiDayInRange([s1, s2], calStart, calEnd);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  it("範囲の境界で重なる予定を含める", () => {
    const s1 = makeSched(1, "2026/06/07-10:00", "2026/06/13-11:00");
    const result = filterMultiDayInRange([s1], calStart, calEnd);
    expect(result).toHaveLength(1);
  });
});

// ========== computeDaySlots ==========
describe("computeDaySlots", () => {
  it("単一の複数日またぎ予定: 全日にわたって同じスロット位置", () => {
    const s = makeSched(1, "2026/06/08-10:00", "2026/06/15-11:00");
    const dates = weekDates(2026, 5, 7); // 6/7(日)〜6/13(土)
    const result = computeDaySlots(dates, [s], [s]);

    // 6/8(月)〜6/13(土) にスケジュールが現れる
    for (let d = 8; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots[0].schedule).toBeDefined();
      expect(day.slots[0].slotIndex).toBe(0);
    }
  });

  it("複数の複数日またぎ予定: 一貫したランク", () => {
    const s1 = makeSched(1, "2026/06/07-10:00", "2026/06/10-11:00"); // rank 0
    const s2 = makeSched(2, "2026/06/09-10:00", "2026/06/17-11:00"); // rank 1
    const multiSorted = [s1, s2]; // 開始日順
    const dates = weekDates(2026, 5, 7); // 6/7〜6/13
    const result = computeDaySlots(dates, [s1, s2], multiSorted);

    // 6/9(火)〜6/10(水): 両方存在
    for (let d = 9; d <= 10; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots[0].schedule!.id).toBe(1); // s1 at rank 0
      expect(day.slots[1].schedule!.id).toBe(2); // s2 at rank 1
    }

    // 6/11(木)〜6/13(土): s2のみ（s1は終了、s2は継続中）
    for (let d = 11; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots[0].schedule).toBeUndefined(); // s1のスロットはプレースホルダー
      expect(day.slots[1].schedule!.id).toBe(2); // s2はそのまま rank 1
    }
  });

  it("複数日またぎ + 単日予定: 単日は後ろのスロット", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/15-11:00");
    const s2 = makeSched(2, "2026/06/11-09:00", "2026/06/11-10:00"); // 単日
    const dates = weekDates(2026, 5, 7); // 6/7〜6/13
    const result = computeDaySlots(dates, [s1, s2], [s1]);

    // 6/11(木): s1(multi) + s2(single)
    const key = "2026-06-11";
    const day = result.get(key)!;
    expect(day.slots[0].schedule!.id).toBe(1); // s1 at rank 0
    expect(day.slots[1].schedule!.id).toBe(2); // s2 at rank 1
  });

  it("単日予定のみ: 複数日またぎスロットなし", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/10-11:00");
    const s2 = makeSched(2, "2026/06/11-09:00", "2026/06/11-10:00");
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, [s1, s2], []);

    const k10 = "2026-06-10";
    const k11 = "2026-06-11";
    expect(result.get(k10)!.slots[0].schedule!.id).toBe(1);
    expect(result.get(k11)!.slots[0].schedule!.id).toBe(2);
  });

  it("日付に予定がない: 空のスロット配列", () => {
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, [], []);

    expect(result.get("2026-06-07")!.slots).toHaveLength(0);
    expect(result.get("2026-06-13")!.slots).toHaveLength(0);
  });

  it("overflow: MAX_VISIBLEを超えた予定はカウントされる", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/10-11:00");
    const s2 = makeSched(2, "2026/06/10-11:00", "2026/06/10-12:00");
    const s3 = makeSched(3, "2026/06/10-12:00", "2026/06/10-13:00");
    const s4 = makeSched(4, "2026/06/10-13:00", "2026/06/10-14:00");
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, [s1, s2, s3, s4], []);

    const key = "2026-06-10";
    const day = result.get(key)!;
    expect(day.slots).toHaveLength(MAX_VISIBLE_SLOTS);
    expect(day.overflowCount).toBe(1); // 4 - 3 = 1
  });

  it("複数日またぎがMAX_VISIBLEを超える場合も正しく処理", () => {
    const ms = [1, 2, 3, 4].map((i) =>
      makeSched(i, "2026/06/08-10:00", "2026/06/14-11:00"),
    );
    // 4つ全てが 6/8〜6/14 をカバー→ 6/11には4つ全部存在
    const multiSorted = ms;
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, ms, multiSorted);

    // 6/11(木): 4つ全部が存在する日
    const key = "2026-06-11";
    const day = result.get(key)!;
    expect(day.slots).toHaveLength(MAX_VISIBLE_SLOTS);
    expect(day.overflowCount).toBe(1); // 4 - 3
  });

  it("複数日またぎ予定のスロットに単日予定が入らない", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/15-11:00"); // multi
    const s2 = makeSched(2, "2026/06/11-09:00", "2026/06/11-10:00"); // single
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, [s1, s2], [s1]);

    // 6/12(金): s1だけ。単日予定はない。slot 0 が s1。
    const key = "2026-06-12";
    const day = result.get(key)!;
    expect(day.slots[0].schedule!.id).toBe(1);
    expect(day.slots).toHaveLength(1); // Only s1, no extra slots
  });
});
