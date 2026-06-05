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

export default function ScheduleDialog({
  date,
  schedules: initialSchedules,
  onClose,
  onSchedulesChanged,
}: ScheduleDialogProps) {
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);

  const handleDelete = async (id: number) => {
    await deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    onSchedulesChanged();
  };

  const handleSave = async (form: ScheduleFormData) => {
    if (editing?.id) {
      await updateSchedule(editing.id, form);
    } else {
      await createSchedule({
        id: null,
        title: form.title ?? "",
        isAllDay: form.isAllDay ?? false,
        startDatetime: form.startDatetime ?? "",
        endDatetime: form.endDatetime ?? "",
        owner: form.owner ?? "",
        description: form.description ?? "",
        updateTime: new Date().toISOString(),
      });
    }
    setShowForm(false);
    setEditing(null);
    onSchedulesChanged();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>
            {date.getMonth() + 1}月{date.getDate()}日の予定
          </h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="dialog-body">
          {schedules.length === 0 && !showForm && (
            <p className="empty-msg">予定はありません</p>
          )}

          {schedules.map((s) => (
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
                  onClick={() => {
                    setEditing(s);
                    setShowForm(true);
                  }}
                >
                  編集
                </button>
                <button onClick={() => handleDelete(s.id!)}>削除</button>
              </div>
            </div>
          ))}

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
  const [title, setTitle] = useState(initial?.title ?? "");
  const [isAllDay, setIsAllDay] = useState(initial?.isAllDay ?? false);
  const [startTime, setStartTime] = useState(
    initial?.startDatetime?.slice(11) ?? "09:00"
  );
  const [endTime, setEndTime] = useState(
    initial?.endDatetime?.slice(11) ?? "10:00"
  );
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [saving, setSaving] = useState(false);

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title,
        isAllDay,
        startDatetime: isAllDay
          ? `${dateStr}-00:00`
          : `${dateStr}-${startTime}`,
        endDatetime: isAllDay
          ? `${dateStr}-00:00`
          : `${dateStr}-${endTime}`,
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
        終日
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setIsAllDay(e.target.checked)}
        />
      </label>
      {!isAllDay && (
        <>
          <label>
            開始
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label>
            終了
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </>
      )}
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
