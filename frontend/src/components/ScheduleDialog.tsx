import { useState, useEffect, useRef, useMemo } from "react";
import { Schedule, ScheduleMember as ScheduleMemberType } from "../types/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/scheduleApi";
import { getMembers, addMember, removeMember } from "../api/memberApi";
import { fetchMyShares, fetchIncomingShares } from "../api/shareApi";
import { searchUsers } from "../api/userApi";
import { adjustEndByStart, adjustStartByEnd } from "../utils/dateUtils";
import { ownerColor, scheduleColor } from "../utils/colorUtils";
import { PartyPopper, Users } from "lucide-react";

interface ScheduleDialogProps {
  date: Date;
  schedules: Schedule[];
  holidayName: string | null;
  onClose: () => void;
  onSchedulesChanged: () => void;
  currentUsername: string;
  chipBgColor: string;
  onNotify: (message: string, type?: "success" | "error") => void;
}

/** 予定のタイトル背景色を計算（DayCellのチップ色と一致させる） */
function scheduleTitleColor(s: Schedule, currentUsername: string, chipBgColor: string): string {
  const memberColors = (s.memberUsernames ?? []).map(
    (u) => s.memberChipBgColors?.[u] ?? ownerColor(u)
  );
  return memberColors.length > 1
    ? scheduleColor(memberColors)
    : s.owner === currentUsername
      ? chipBgColor
      : (s.ownerChipBgColor ?? ownerColor(s.owner));
}

/** 選択した日付の予定一覧を表示し、追加・編集・削除を行うダイアログ */
export default function ScheduleDialog({
  date,
  schedules: initialSchedules,
  holidayName,
  onClose,
  onSchedulesChanged,
  currentUsername,
  chipBgColor,
  onNotify,
}: ScheduleDialogProps) {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const ANIMATION_DURATION = 200;

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, ANIMATION_DURATION);
  };

  /** 予定を削除 */
  const handleDelete = async (id: number) => {
    try {
      await deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      onSchedulesChanged();
      onNotify("予定を削除したよ");
    } catch {
      setError("削除に失敗したよ");
    } finally {
      setDeleteTarget(null);
    }
  };

  /** 削除確認を表示 */
  const handleDeleteRequest = (s: Schedule) => {
    setDeleteTarget(s);
  };

  /** 予定を保存（新規 or 更新）。保存した予定を返す */
  const handleSave = async (form: ScheduleFormData, pendingMembers?: string[]): Promise<Schedule | void> => {
    setError(null);
    try {
      if (editing?.id) {
        await updateSchedule(editing.id, form);
        onSchedulesChanged();
        onNotify("予定を編集したよ");
        handleClose();
        return;
      } else {
        const saved = await createSchedule({
          id: null,
          title: form.title ?? "",
          isAllDay: form.isAllDay ?? false,
          startDatetime: form.startDatetime ?? "",
          endDatetime: form.endDatetime ?? "",
          owner: "",
          description: form.description ?? "",
          shared: form.shared ?? true,
        });
        // 新規作成後に保留中のメンバーを追加
        if (pendingMembers && pendingMembers.length > 0) {
          for (const username of pendingMembers) {
            try {
              await addMember(saved.id!, username);
            } catch {
              // 個別の追加失敗は無視
            }
          }
        }
        onSchedulesChanged();
        onNotify("予定を作成したよ");
        handleClose();
        return;
      }
    } catch {
      setError("保存に失敗したよ");
    }
  };

  return (
    <div className={`dialog-overlay ${closing ? "closing" : ""}`} onClick={handleClose}>
      <div className={`dialog ${closing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>
            {date.getMonth() + 1}月{date.getDate()}日の予定
            {holidayName && (
              <span className="dialog-holiday-name">
                <PartyPopper size={12} />
                {holidayName}
              </span>
            )}
          </h2>
          <button className="close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="dialog-body">
          {error && <p className="dialog-error">{error}</p>}

          {schedules.length === 0 && !showForm && (
            <p className="empty-msg">予定が入っていないよ</p>
          )}

          {!showForm && !deleteTarget &&
            schedules.map((s) => (
              <div key={s.id} className="schedule-card">
                <div className="schedule-card-info">
                  <strong
                    style={{
                      background: scheduleTitleColor(s, currentUsername, chipBgColor),
                      borderRadius: "4px",
                      padding: "2px 6px",
                      color: "#e0e0e0",
                      alignSelf: "flex-start",
                    }}
                  >
                    {(s.memberUsernames ?? []).length > 1 && (
                      <Users size={14} fill="currentColor" style={{ marginRight: "4px", verticalAlign: "middle" }} />
                    )}
                    {s.title}
                  </strong>
                  <span className="schedule-time">
                    {(() => {
                      const sd = s.startDatetime.slice(0, 10);
                      const ed = s.endDatetime.slice(0, 10);
                      const multiDay = sd !== ed;
                      if (s.isAllDay) {
                        return multiDay ? `${sd} 終日 ~ ${ed} 終日` : "終日";
                      }
                      return multiDay
                        ? `${sd} ${s.startDatetime.slice(11)} ~ ${ed} ${s.endDatetime.slice(11)}`
                        : `${s.startDatetime.slice(11)} ~ ${s.endDatetime.slice(11)}`;
                    })()}
                  </span>
                  <span className="schedule-owner-members">{(() => {
                    const members = s.memberUsernames ?? [];
                    return members.length > 1
                      ? [s.ownerDisplayName ?? s.owner, ...members.filter((u) => u !== s.owner).map((u) => s.memberDisplayNames?.[u] ?? u)].join(", ")
                      : s.ownerDisplayName ?? s.owner;
                  })()}</span>
                </div>
                <div className="schedule-card-actions">
                  {s.canEdit && (
                    <>
                      <button
                        className="icon-btn"
                        title="編集"
                        onClick={() => {
                          setEditing(s);
                          setShowForm(true);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                      </button>
                      <button className="icon-btn delete-btn-icon" title="削除" onClick={() => handleDeleteRequest(s)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

          {deleteTarget && (
            <div className="delete-confirm">
              <p>「{deleteTarget.title}」を削除してもいいですか？</p>
              <div className="delete-confirm-actions">
                <button className="delete-btn" onClick={() => handleDelete(deleteTarget.id!)}>削除する</button>
                <button className="cancel-btn" onClick={() => setDeleteTarget(null)}>キャンセル</button>
              </div>
            </div>
          )}

          {showForm && (
            <ScheduleFormComponent
              initial={editing}
              date={date}
              currentUsername={currentUsername}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
              onNotify={onNotify}
            />
          )}

          {!showForm && (
            <button
              className="add-btn"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              ＋ 予定を追加
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ScheduleFormData {
  title?: string;
  isAllDay?: boolean;
  startDatetime?: string;
  endDatetime?: string;
  description?: string;
  shared?: boolean;
}

/** 予定の新規作成・編集フォーム */
function ScheduleFormComponent({
  initial,
  date,
  currentUsername,
  onSave,
  onCancel,
  onNotify,
}: {
  initial: Schedule | null;
  date: Date;
  currentUsername: string;
  onSave: (data: ScheduleFormData, pendingMembers?: string[]) => Promise<Schedule | void>;
  onCancel: () => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [isAllDay, setIsAllDay] = useState(initial?.isAllDay ?? false);
  const [startDate, setStartDate] = useState(
    initial ? initial.startDatetime.slice(0, 10).replace(/\//g, "-") : dateStr.replace(/\//g, "-")
  );
  const [endDate, setEndDate] = useState(
    initial ? initial.endDatetime.slice(0, 10).replace(/\//g, "-") : dateStr.replace(/\//g, "-")
  );
  const [startTime, setStartTime] = useState(
    initial?.startDatetime?.slice(11) ?? "09:00"
  );
  const [endTime, setEndTime] = useState(
    initial?.endDatetime?.slice(11) ?? "10:00"
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [shared, setShared] = useState(initial?.shared ?? true);
  const [saving, setSaving] = useState(false);

  // メンバー管理 state
  const [members, setMembers] = useState<ScheduleMemberType[]>([]);
  const [pendingMembers, setPendingMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [shareCandidates, setShareCandidates] = useState<{ username: string; displayName: string; chipBgColor?: string }[]>([]);
  const scheduleId = initial?.id;
  const isNew = !scheduleId;

  const adjustingRef = useRef(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const lastStartTimeRef = useRef(startTime);
  const lastEndTimeRef = useRef(endTime);

  const roundInDirection = (raw: string, last: string): string => {
    const [rh, rm] = raw.split(":").map(Number);
    const [lh, lm] = last.split(":").map(Number);
    const rawMin = rh * 60 + rm;
    const lastMin = lh * 60 + lm;
    const direction = rawMin >= lastMin ? 1 : -1;
    const nearest5 = Math.round(rawMin / 5) * 5;
    if (nearest5 === rawMin) {
      return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
    }
    if (direction > 0) {
      const rounded = Math.ceil(rawMin / 5) * 5;
      return `${String(Math.floor(rounded / 60) % 24).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
    }
    const rounded = Math.floor(rawMin / 5) * 5;
    return `${String(Math.floor(rounded / 60) % 24).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const rounded = roundInDirection(raw, lastStartTimeRef.current);
    lastStartTimeRef.current = rounded;
    setStartTime(rounded);
  };
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const rounded = roundInDirection(raw, lastEndTimeRef.current);
    lastEndTimeRef.current = rounded;
    setEndTime(rounded);
  };

  // 相互共有ユーザー一覧を取得（表示名付き）
  useEffect(() => {
    (async () => {
      try {
        const [myShares, incomingShares, allUsers] = await Promise.all([
          fetchMyShares(),
          fetchIncomingShares(),
          searchUsers(""),
        ]);
        const usernames = new Set<string>();
        myShares.forEach((s) => usernames.add(s.sharedWithUsername));
        incomingShares.forEach((s) => usernames.add(s.ownerUsername));
        usernames.delete(currentUsername);
        // 全ユーザー情報から表示名をマップ
        const displayNameMap = new Map<string, string>();
        allUsers.forEach((u) => displayNameMap.set(u.username, u.displayName));
        const candidates = Array.from(usernames).sort().map((username) => ({
          username,
          displayName: displayNameMap.get(username) ?? username,
          chipBgColor: allUsers.find((u) => u.username === username)?.chipBgColor,
        }));
        setShareCandidates(candidates);
      } catch {
        // 候補一覧がなくても機能に影響なし
      }
    })();
  }, [currentUsername]);

  // 既存予定の編集時はメンバー一覧をロード
  useEffect(() => {
    if (!scheduleId) return;
    setMemberLoading(true);
    getMembers(scheduleId)
      .then(setMembers)
      .catch(() => setMemberError("メンバーの読み込みに失敗したよ"))
      .finally(() => setMemberLoading(false));
  }, [scheduleId]);

  // 候補リストの外側クリックで閉じる
  useEffect(() => {
    if (!showSuggestions) return;
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSuggestions]);

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

  // メンバー追加（新規: pending, 既存: API）
  const handleAddMember = async (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setMemberError(null);
    setShowSuggestions(false);

    // 重複チェック
    const alreadyMember = scheduleId
      ? members.some((m) => m.username === trimmed)
      : pendingMembers.includes(trimmed);
    if (alreadyMember) {
      setMemberError("すでにメンバーです");
      return;
    }
    if (trimmed === currentUsername) {
      setMemberError("自分自身はメンバーに追加できないよ");
      return;
    }

    if (scheduleId) {
      try {
        const m = await addMember(scheduleId, trimmed);
        setMembers((prev) => [...prev, m]);
      } catch {
        setMemberError("メンバーの追加に失敗したよ");
        return;
      }
    } else {
      setPendingMembers((prev) => [...prev, trimmed]);
    }
    setMemberInput("");
  };

  const handleRemoveMember = async (username: string) => {
    setMemberError(null);
    if (scheduleId) {
      try {
        await removeMember(scheduleId, username);
        setMembers((prev) => prev.filter((m) => m.username !== username));
        onNotify("メンバーを削除したよ");
      } catch {
        setMemberError("メンバーの削除に失敗したよ");
      }
    } else {
      setPendingMembers((prev) => prev.filter((u) => u !== username));
    }
  };

  // 補完候補（フィルタ済み）
  const filteredSuggestions = shareCandidates.filter(
    (c) => {
      const query = memberInput.trim().toLowerCase();
      const matchesQuery = query === "" ||
        c.username.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query);
      const alreadyAdded = scheduleId
        ? members.some((m) => m.username === c.username)
        : pendingMembers.includes(c.username);
      return matchesQuery && !alreadyAdded;
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(
        {
          title,
          isAllDay,
          startDatetime: isAllDay
            ? `${startDate.replace(/-/g, "/")}-00:00`
            : `${startDate.replace(/-/g, "/")}-${startTime}`,
          endDatetime: isAllDay
            ? `${endDate.replace(/-/g, "/")}-00:00`
            : `${endDate.replace(/-/g, "/")}-${endTime}`,
          description,
          shared,
        },
        isNew ? pendingMembers : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  // 表示用のメンバー一覧（作成者を先頭に固定 + 既存メンバー + pending）
  const ownerUsername = initial?.owner ?? currentUsername;
  const memberDisplayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    shareCandidates.forEach((c) => map.set(c.username, c.displayName));
    return map;
  }, [shareCandidates]);
  const memberChipBgColorMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    shareCandidates.forEach((c) => map.set(c.username, c.chipBgColor));
    return map;
  }, [shareCandidates]);
  const displayMembers = [
    {
      key: "owner",
      username: ownerUsername,
      displayName: initial?.ownerDisplayName ?? ownerUsername,
      isOwner: true,
      pending: false,
      chipBgColor: initial?.ownerChipBgColor,
    },
    ...(scheduleId
      ? members
          .filter((m) => m.username !== ownerUsername)
          .map((m) => ({
            key: m.id.toString(),
            username: m.username,
            displayName: initial?.memberDisplayNames?.[m.username] ?? memberDisplayNameMap.get(m.username) ?? m.username,
            isOwner: false,
            pending: false,
            chipBgColor: initial?.memberChipBgColors?.[m.username] ?? memberChipBgColorMap.get(m.username),
          }))
      : pendingMembers
          .filter((u) => u !== ownerUsername)
          .map((u) => ({
            key: u,
            username: u,
            displayName: memberDisplayNameMap.get(u) ?? u,
            isOwner: false,
            pending: true,
            chipBgColor: memberChipBgColorMap.get(u),
          }))),
  ];

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          タイトル
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#e87a40",
            display: "inline-block",
            flexShrink: 0,
          }} />
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="タイトルを入力"
        />
      </label>
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
            style={{ margin: 0 }}
          />
          終日
        </label>
        <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "4px", fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            style={{ margin: 0 }}
          />
          他のユーザーと共有する
        </label>
      </div>
      <div className="date-fields">
        <label>
          開始日
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          終了日
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      {!isAllDay && (
        <div className="time-fields">
          <label>
            開始時刻
            <input
              type="time"
              step="300"
              ref={startTimeRef}
              value={startTime}
              onChange={handleStartTimeChange}
            />
          </label>
          <label>
            終了時刻
            <input
              type="time"
              step="300"
              ref={endTimeRef}
              value={endTime}
              onChange={handleEndTimeChange}
            />
          </label>
        </div>
      )}

      {/* メンバー管理 */}
      <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="settings-section-title">メンバー</div>
        {memberLoading && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>読み込み中...</p>
        )}
        {memberError && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-holiday)" }}>{memberError}</p>
        )}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="追加するユーザー名を入力..."
            value={memberInput}
            onChange={(e) => {
              setMemberInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filteredSuggestions.length > 0) {
                  handleAddMember(filteredSuggestions[0].username);
                }
              }
            }}
            style={{
              width: "100%",
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              padding: "6px 8px",
              borderRadius: "6px",
              fontFamily: "inherit",
            }}
          />
          {/* 補完候補ドロップダウン */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 100,
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                marginTop: "4px",
                maxHeight: "160px",
                overflowY: "auto",
              }}
            >
              {filteredSuggestions.map((c) => (
                <div
                  key={c.username}
                  style={{
                    padding: "8px 10px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddMember(c.username);
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--color-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {c.displayName}<span style={{ color: "var(--color-text-muted)" }}>&lt;{c.username}&gt;</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {displayMembers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {displayMembers.map((m) => (
              <span
                key={m.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: m.isOwner ? "2px 10px" : "2px 4px 2px 10px",
                  background: m.isOwner ? "var(--color-surface2)" : (m.chipBgColor ?? "var(--color-surface2)"),
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                }}
              >
                {m.displayName}
                {!m.isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.username)}
                    title="メンバーを削除"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "18px",
                      height: "18px",
                      padding: 0,
                      border: "none",
                      borderRadius: "50%",
                      background: "var(--color-border)",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      fontSize: "11px",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <label>
        説明
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </button>
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
