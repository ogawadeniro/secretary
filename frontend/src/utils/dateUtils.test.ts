import { describe, it, expect } from "vitest";
import { adjustEndByStart, adjustStartByEnd, getSchedulePosition, shouldShowTitle } from "./dateUtils";
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
