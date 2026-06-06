import { describe, it, expect } from "vitest";
import {
  adjustEndByStart,
  adjustStartByEnd,
  getSchedulePosition,
  shouldShowTitle,
  isMultiDay,
  rangesOverlap,
  computeDaySlots,
  MAX_VISIBLE_SLOTS,
  parseScheduleDate,
  toEpochDay,
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

// ========== computeDaySlots ==========
describe("computeDaySlots", () => {
  function findActiveRange(schedules: Schedule[]) {
    const multiDay = schedules.filter((s) => {
      const start = s.startDatetime.slice(0, 10);
      const end = s.endDatetime.slice(0, 10);
      return start !== end;
    });
    if (multiDay.length === 0) return null;
    let minStart = Infinity;
    let maxEnd = -Infinity;
    for (const s of multiDay) {
      const start = parseScheduleDate(s.startDatetime);
      const end = parseScheduleDate(s.endDatetime);
      if (!start || !end) continue;
      const d1 = toEpochDay(start.date);
      const d2 = toEpochDay(end.date);
      if (d1 < minStart) minStart = d1;
      if (d2 > maxEnd) maxEnd = d2;
    }
    return { minStartEpoch: minStart, maxEndEpoch: maxEnd };
  }

  it("単一の複数日またぎ予定: 全日固定スロット", () => {
    const s = makeSched(1, "2026/06/08-10:00", "2026/06/15-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s]);
    const result = computeDaySlots(dates, [s], [s], range);

    for (let d = 8; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].schedule!.id).toBe(1);
    }
    // 期間外（6/7）: 予定なし
    expect(result.get("2026-06-07")!.slots).toHaveLength(0);
  });

  it("複数の複数日またぎ予定: 開始前はプレースホルダーなし", () => {
    // s1: 6/7-6/10, s2: 6/9-6/17
    // アクティブ期間: 6/7〜6/17
    // 6/7-8: s1のみ（s2未開始→プレースホルダーなし）
    // 6/9-10: 両方アクティブ
    // 6/11-13: s2のみ（s1終了→プレースホルダーあり）
    const s1 = makeSched(1, "2026/06/07-10:00", "2026/06/10-11:00");
    const s2 = makeSched(2, "2026/06/09-10:00", "2026/06/17-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1, s2]);
    const multiSorted = [s1, s2];
    const result = computeDaySlots(dates, [s1, s2], multiSorted, range);

    // 6/7-8: s1のみ、s2は未開始なのでスロットなし
    for (let d = 7; d <= 8; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].schedule!.id).toBe(1);
    }

    // 6/9-10: 両方アクティブ
    for (let d = 9; d <= 10; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots[0].schedule!.id).toBe(1);
      expect(day.slots[1].schedule!.id).toBe(2);
    }

    // 6/11-13: s2のみ（s1終了済み）、s1は開始済みなのでプレースホルダー維持
    for (let d = 11; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots[0].schedule).toBeUndefined(); // placeholder for s1
      expect(day.slots[1].schedule!.id).toBe(2); // s2 at slot 1
    }
  });

  it("入れ違いの複数日またぎ: s2が後から開始 → 開始前は空き", () => {
    // s1: 6/7-6/10, s2: 6/12-6/17
    // アクティブ期間: 6/7〜6/17
    // 6/7-10: s1のみ、s2は6/12開始→プレースホルダーなし
    // 6/11: 両方不活性→s1 placeholder, s2未開始→スキップ
    // 6/12-13: s2のみ、s1 placeholderあり
    const s1 = makeSched(1, "2026/06/07-10:00", "2026/06/10-11:00");
    const s2 = makeSched(2, "2026/06/12-10:00", "2026/06/17-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1, s2]);
    const multiSorted = [s1, s2];
    const result = computeDaySlots(dates, [s1, s2], multiSorted, range);

    // 6/7-10: s1のみ
    for (let d = 7; d <= 10; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].schedule!.id).toBe(1);
    }

    // 6/11: s1終了済み→placeholder, s2未開始→スキップ
    {
      const day = result.get("2026-06-11")!;
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].schedule).toBeUndefined(); // placeholder for s1
    }

    // 6/12-13: s2のみ、s1 placeholderあり
    for (let d = 12; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(2);
      expect(day.slots[0].schedule).toBeUndefined(); // placeholder for s1
      expect(day.slots[1].schedule!.id).toBe(2); // s2 at slot 1
    }
  });

  it("複数日またぎ + 単日予定: 単日は複数日またぎの後ろ", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/15-11:00");
    const s2 = makeSched(2, "2026/06/11-09:00", "2026/06/11-10:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1]);
    const result = computeDaySlots(dates, [s1, s2], [s1], range);

    const day = result.get("2026-06-11")!;
    expect(day.slots[0].schedule!.id).toBe(1);
    expect(day.slots[1].schedule!.id).toBe(2);
  });

  it("アクティブ期間外: プレースホルダーなし", () => {
    // s1(6/8-10) のアクティブ期間は 6/8〜6/10
    // 週の日付は 6/7(日)〜6/13(土) → 6/7, 6/11-13 は期間外
    const s1 = makeSched(1, "2026/06/08-10:00", "2026/06/10-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1]);
    const result = computeDaySlots(dates, [s1], [s1], range);

    expect(result.get("2026-06-07")!.slots).toHaveLength(0);
    expect(result.get("2026-06-08")!.slots[0].schedule!.id).toBe(1);
    for (let d = 11; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      expect(result.get(key)!.slots).toHaveLength(0);
    }
  });

  it("複数日またぎがない: 単純に単日のみ", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/10-11:00");
    const s2 = makeSched(2, "2026/06/11-09:00", "2026/06/11-10:00");
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, [s1, s2], [], null);

    expect(result.get("2026-06-10")!.slots[0].schedule!.id).toBe(1);
    expect(result.get("2026-06-11")!.slots[0].schedule!.id).toBe(2);
  });

  it("日付に予定がない: 空配列", () => {
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, [], [], null);
    expect(result.get("2026-06-07")!.slots).toHaveLength(0);
  });

  it("overflow: 超過分をカウント", () => {
    const schedules = [1, 2, 3, 4].map((i) =>
      makeSched(i, "2026/06/10-10:00", "2026/06/10-11:00"),
    );
    const dates = weekDates(2026, 5, 7);
    const result = computeDaySlots(dates, schedules, [], null);

    const day = result.get("2026-06-10")!;
    expect(day.slots).toHaveLength(MAX_VISIBLE_SLOTS);
    expect(day.overflowCount).toBe(1);
  });

  it("アクティブ期間内で複数日またぎ + 単日でオーバーフロー", () => {
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/12-11:00");
    const singles = [2, 3, 4].map((i) =>
      makeSched(i, "2026/06/11-10:00", "2026/06/11-11:00"),
    );
    const dates = weekDates(2026, 5, 7);
    const allSchedules = [s1, ...singles];
    const range = findActiveRange([s1]);
    const result = computeDaySlots(dates, allSchedules, [s1], range);

    const day = result.get("2026-06-11")!;
    expect(day.slots).toHaveLength(MAX_VISIBLE_SLOTS);
    expect(day.slots[0].schedule!.id).toBe(1);
    expect(day.overflowCount).toBe(1);
  });

  it("開始前の複数日またぎ: プレースホルダーを表示しない", () => {
    // s1: 6/10-6/15, s2: 6/7-6/9
    // アクティブ期間: 6/7〜6/15
    // 6/7-9: s2のみ（s1未開始→スキップ）
    // 6/10-13: s1のみ（s2終了→placeholderあり）
    const s1 = makeSched(1, "2026/06/10-10:00", "2026/06/15-11:00");
    const s2 = makeSched(2, "2026/06/07-10:00", "2026/06/09-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1, s2]);
    // 開始日順ソート: s2(6/7), s1(6/10)
    const multiSorted = [s2, s1];
    const result = computeDaySlots(dates, [s1, s2], multiSorted, range);

    // 6/7-9: s2のみ、s1未開始→スキップ
    for (let d = 7; d <= 9; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].schedule!.id).toBe(2); // s2 at slot 0
    }

    // 6/10-13: s1のみ、s2終了→placeholder at slot 0, s1 at slot 1
    for (let d = 10; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(2);
      expect(day.slots[0].schedule).toBeUndefined(); // placeholder for s2
      expect(day.slots[1].schedule!.id).toBe(1); // s1 at slot 1
    }
  });

  it("アクティブ期間内のオーバーフロー: プレースホルダーがスロットを消費", () => {
    // s1: 6/7-6/10, s2: 6/9-6/17
    // アクティブ期間: 6/7〜6/17
    // MAX_VISIBLE_SLOTS=3
    // 3つの単日予定を6/11に追加→s1 placeholder + s2 + 単日1つ → overflow 1
    const s1 = makeSched(1, "2026/06/07-10:00", "2026/06/10-11:00");
    const s2 = makeSched(2, "2026/06/09-10:00", "2026/06/17-11:00");
    const singles = [3, 4, 5].map((i) =>
      makeSched(i, "2026/06/11-10:00", "2026/06/11-11:00"),
    );
    const dates = weekDates(2026, 5, 7);
    const allSchedules = [s1, s2, ...singles];
    const range = findActiveRange([s1, s2]);
    const multiSorted = [s1, s2];
    const result = computeDaySlots(dates, allSchedules, multiSorted, range);

    // 6/11: placeholder + s2 = 2 slots → 単日は1つだけ入る
    const day = result.get("2026-06-11")!;
    expect(day.slots).toHaveLength(MAX_VISIBLE_SLOTS);
    expect(day.slots[0].schedule).toBeUndefined(); // placeholder for s1
    expect(day.slots[1].schedule!.id).toBe(2);
    expect(day.slots[2].schedule!.id).toBe(3);
    expect(day.overflowCount).toBe(2); // 2 singles overflow
  });

  it("今週より前に終了した予定: プレースホルダーを表示しない", () => {
    // s1(古い): 6/1-6/5, 週: 6/7-6/13
    // s1は週の開始(6/7)より前に終了 → アクティブ期間内でもプレースホルダーなし
    const s1 = makeSched(1, "2026/06/01-10:00", "2026/06/05-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1]);
    const result = computeDaySlots(dates, [], [s1], range);

    for (let d = 7; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      expect(result.get(key)!.slots).toHaveLength(0);
    }
  });

  it("今週より前に終了した予定 + アクティブな予定: 古い予定のプレースホルダーなし", () => {
    // s1(古い): 6/1-6/5, s2: 6/10-6/15
    // アクティブ期間: 6/1〜6/15、週: 6/7-6/13
    // 6/10-13: s2のみ、s1は今週より前に終了→placeholderなし
    const s1 = makeSched(1, "2026/06/01-10:00", "2026/06/05-11:00");
    const s2 = makeSched(2, "2026/06/10-10:00", "2026/06/15-11:00");
    const dates = weekDates(2026, 5, 7);
    const range = findActiveRange([s1, s2]);
    const multiSorted = [s1, s2];
    const result = computeDaySlots(dates, [s2], multiSorted, range);

    // 6/7-9: 予定なし（s2未開始）
    for (let d = 7; d <= 9; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      expect(result.get(key)!.slots).toHaveLength(0);
    }

    // 6/10-13: s2のみ（s1のプレースホルダーなし）
    for (let d = 10; d <= 13; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      const day = result.get(key)!;
      expect(day.slots).toHaveLength(1);
      expect(day.slots[0].schedule!.id).toBe(2);
    }
  });
});
