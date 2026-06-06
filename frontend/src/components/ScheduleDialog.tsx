import { useState } from "react";
import { Schedule } from "../types/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/scheduleApi";

interface ScheduleDialogProps {
  date: Date;
  schedules: Schedule[];
  onClose: () => void;
  onSchedulesChanged: () => void;
}

/** 選択した日付の予定一覧を表示し、追加・編集・削除を行うダイアログ */
export default function ScheduleDialog({
  date,
  schedules: initialSchedules,
  onClose,
  onSchedulesChanged,
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
    } catch (e) {
      setError("削除に失敗しました");
    } finally {
      setDeleteTarget(null);
    }
  };

  /** 削除確認を表示 */
  const handleDeleteRequest = (s: Schedule) => {
    setDeleteTarget(s);
  };

  /** 予定を保存（新規 or 更新） */
  const handleSave = async (form: ScheduleFormData) => {
    setError(null);
    try {
      if (editing?.id) {
        await updateSchedule(editing.id, form);
      } else {
        // updateTime はサーバー側で自動設定されるため送らない
        await createSchedule({
          id: null,
          title: form.title ?? "",
          isAllDay: form.isAllDay ?? false,
          startDatetime: form.startDatetime ?? "",
          endDatetime: form.endDatetime ?? "",
          owner: form.owner ?? "",
          description: form.description ?? "",
        });
      }
      onSchedulesChanged();
      handleClose();
    } catch (e) {
      setError("保存に失敗しました");
    }
  };

  return (
    <div className={`dialog-overlay ${closing ? "closing" : ""}`} onClick={handleClose}>
      <div className={`dialog ${closing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>
            {date.getMonth() + 1}月{date.getDate()}日の予定
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
                </div>
                <div className="schedule-card-actions">
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
  owner?: string;
  description?: string;
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
  onSave: (data: ScheduleFormData) => Promise<void>;
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
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  const isEditing = initial !== null;

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
        owner,
        description,
      });
    } finally {
      setSaving(false);
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
      <label>
        作成者
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          required
        />
      </label>
      <label>
        終日
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
        />
      </label>
      {isEditing && (
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
      )}
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
