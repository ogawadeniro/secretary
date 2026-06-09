import { useState, useEffect, useRef } from "react";
import { adjustEndByStart, adjustStartByEnd } from "../utils/dateUtils";

/**
 * 開始日時と終了日時の状態を管理し、相互に補正するカスタムフック。
 * 開始を変更したら終了を、終了を変更したら開始を自動補正し、
 * adjustingRef で相互発火を防止する。
 */
export function useDateTimeCorrection(
  initialStartDate: string,
  initialEndDate: string,
  initialStartTime: string,
  initialEndTime: string,
) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const adjustingRef = useRef(false);

  // 開始を変更 → 終了を補正
  useEffect(() => {
    if (adjustingRef.current) return;
    const adjusted = adjustEndByStart(startDate, startTime, endDate, endTime);
    if (adjusted.endDate !== endDate || adjusted.endTime !== endTime) {
      adjustingRef.current = true;
      setEndDate(adjusted.endDate);
      setEndTime(adjusted.endTime);
    }
  }, [startDate, startTime]);

  // 終了を変更 → 開始を補正
  useEffect(() => {
    if (adjustingRef.current) return;
    const adjusted = adjustStartByEnd(startDate, startTime, endDate, endTime);
    if (adjusted.startDate !== startDate || adjusted.startTime !== startTime) {
      adjustingRef.current = true;
      setStartDate(adjusted.startDate);
      setStartTime(adjusted.startTime);
    }
  }, [endDate, endTime]);

  // 補正フラグをリセット
  useEffect(() => {
    adjustingRef.current = false;
  });

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
  };
}
