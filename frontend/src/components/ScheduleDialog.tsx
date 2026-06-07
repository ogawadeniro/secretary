import { useState, useEffect, useRef } from "react";
import { Schedule, ScheduleMember as ScheduleMemberType } from "../types/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/scheduleApi";
import { getMembers, addMember, removeMember } from "../api/memberApi";
import { adjustEndByStart, adjustStartByEnd } from "../utils/dateUtils";
import { PartyPopper } from "lucide-react";

interface ScheduleDialogProps {
  date: Date;
  schedules: Schedule[];
  holidayName: string | null;
  onClose: () => void;
  onSchedulesChanged: () => void;
  currentUsername: string;
}

/** 選択した日付の予定一覧を表示し、追加・編集・削除を行うダイアログ */
export default function ScheduleDialog({
  date,
  schedules: initialSchedules,
  holidayName,
  onClose,
  onSchedulesChanged,
  currentUsername,
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
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleteTarget(null);
    }
  };

  /** 削除確認を表示 */
  const handleDeleteRequest = (s: Schedule) => {
    setDeleteTarget(s);
  };

  /** 予定を保存（新規 or 更新）。保存した予定を返す */
  const handleSave = async (form: ScheduleFormData): Promise<Schedule | void> => {
    setError(null);
    try {
      if (editing?.id) {
        await updateSchedule(editing.id, form);
        onSchedulesChanged();
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
        // 新規作成後は編集モードに切り替え（メンバー追加のため）
        setEditing(saved);
        onSchedulesChanged();
        return saved;
      }
    } catch {
      setError("保存に失敗しました");
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
            <p className="empty-msg">予定はありません</p>
          )}

          {!showForm && !deleteTarget &&
            schedules.map((s) => (
              <div key={s.id} className="schedule-card">
                <div className="schedule-card-info">
                  <strong>{s.title}</strong>
                  <span className="schedule-time">
                    {s.isAllDay
                      ? "終日"
                      : `${s.startDatetime.slice(11)} ~ ${s.endDatetime.slice(11)}`}
                  </span>
                  <span className="schedule-owner">{s.owner}</span>
                  {/* メンバー表示 */}
                  {s.memberUsernames && s.memberUsernames.length > 0 && (
                    <span className="schedule-members">
                      {s.memberUsernames.map((u) => `@${u}`).join(", ")}
                    </span>
                  )}
                </div>
                <div className="schedule-card-actions">
                  {(s.owner === currentUsername) && (
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
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
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
  onSave,
  onCancel,
}: {
  initial: Schedule | null;
  date: Date;
  onSave: (data: ScheduleFormData) => Promise<Schedule | void>;
  onCancel: () => void;
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
  const [memberInput, setMemberInput] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const isEditing = initial !== null;
  const scheduleId = initial?.id;

  // adjustingRef: プログラムによる補正中はフラグを立てて相互発火を防止
  const adjustingRef = useRef(false);

  // 既存予定の編集時はメンバー一覧をロード
  useEffect(() => {
    if (!scheduleId) return;
    setMemberLoading(true);
    getMembers(scheduleId)
      .then(setMembers)
      .catch(() => setMemberError("メンバーの読み込みに失敗しました"))
      .finally(() => setMemberLoading(false));
  }, [scheduleId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
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
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    const username = memberInput.trim();
    if (!username || !scheduleId) return;
    setMemberError(null);
    try {
      const m = await addMember(scheduleId, username);
      setMembers((prev) => [...prev, m]);
      setMemberInput("");
    } catch {
      setMemberError("メンバーの追加に失敗しました");
    }
  };

  const handleRemoveMember = async (username: string) => {
    if (!scheduleId) return;
    setMemberError(null);
    try {
      await removeMember(scheduleId, username);
      setMembers((prev) => prev.filter((m) => m.username !== username));
    } catch {
      setMemberError("メンバーの削除に失敗しました");
    }
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label>
        タイトル
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", color: "var(--color-text-muted)", flex: 1 }}>
          終日
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(e) => setIsAllDay(e.target.checked)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", color: "var(--color-text-muted)", flex: 1 }}>
          他のユーザーと共有する
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
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
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label>
            終了時刻
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>
      )}
      <label>
        説明
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {/* メンバー管理（既存予定のみ） */}
      {scheduleId && (
        <div className="settings-section">
          <div className="settings-section-title">メンバー</div>
          {memberLoading && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>読み込み中...</p>
          )}
          {memberError && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-holiday)" }}>{memberError}</p>
          )}
          {members.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    background: "var(--color-surface2)",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span>@{m.username}</span>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-sun)",
                      padding: "2px",
                      display: "flex",
                    }}
                    onClick={() => handleRemoveMember(m.username)}
                    title="メンバーを削除"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="追加するユーザー名..."
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMember(); } }}
              style={{
                flex: 1,
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                padding: "6px 8px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontFamily: "inherit",
              }}
            />
            <button
              type="button"
              className="save-btn"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              disabled={!memberInput.trim()}
              onClick={handleAddMember}
            >
              追加
            </button>
          </div>
        </div>
      )}

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
