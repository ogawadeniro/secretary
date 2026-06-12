import { useState } from "react";
import { Schedule } from "../types/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/scheduleApi";
import { addMember, removeMember } from "../api/memberApi";
import type { Group } from "../types/group";
import { PartyPopper } from "lucide-react";
import ScheduleCard from "./ScheduleCard";
import ScheduleForm, { type ScheduleFormData } from "./ScheduleForm";

interface ScheduleDialogProps {
  date: Date;
  schedules: Schedule[];
  holidayName: string | null;
  onClose: () => void;
  onSchedulesChanged: () => void;
  currentUsername: string;
  chipBgColor: string;
  timeInterval: number;
  onNotify: (message: string, type?: "success" | "error") => void;
  groups: Group[];
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
  timeInterval,
  onNotify,
  groups,
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

  /** 予定を保存（新規 or 更新） */
  const handleSave = async (form: ScheduleFormData, pendingMembers?: string[], removedMembers?: string[]): Promise<void> => {
    setError(null);
    try {
      if (editing?.id) {
        await updateSchedule(editing.id, form);
        // 編集時に保留中のメンバー変更を反映
        if (removedMembers && removedMembers.length > 0) {
          for (const username of removedMembers) {
            try {
              await removeMember(editing.id, username);
            } catch {
              // 個別の削除失敗は無視
            }
          }
        }
        if (pendingMembers && pendingMembers.length > 0) {
          for (const username of pendingMembers) {
            try {
              await addMember(editing.id, username);
            } catch {
              // 個別の追加失敗は無視
            }
          }
        }
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
          groupIds: form.groupIds,
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
            {date.getFullYear()}年 {date.getMonth() + 1}月 {date.getDate()}日の予定
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
              <ScheduleCard
                key={s.id}
                schedule={s}
                groups={groups}
                onEdit={() => {
                  setEditing(s);
                  setShowForm(true);
                }}
                onDelete={() => setDeleteTarget(s)}
              />
            ))}

          {deleteTarget && (
            <div className="delete-confirm">
              <p>「{deleteTarget.title}」を削除してもいいですか？</p>
              <div className="delete-confirm-actions">
                <button className="delete-btn" onClick={() => deleteTarget.id !== null && handleDelete(deleteTarget.id)}>削除する</button>
                <button className="cancel-btn" onClick={() => setDeleteTarget(null)}>キャンセル</button>
              </div>
            </div>
          )}

          {showForm && (
            <ScheduleForm
              initial={editing}
              date={date}
              currentUsername={currentUsername}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
              timeInterval={timeInterval}
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
