import { useState } from "react";
import { Schedule } from "../types/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/scheduleApi";
import { addMember, removeMember } from "../api/memberApi";
import type { Group } from "../types/group";
import { PartyPopper, ArrowLeft, X, Pencil, Trash2, Users, Calendar, Clock, Globe } from "lucide-react";
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
  const [viewing, setViewing] = useState<Schedule | null>(null);

  const ANIMATION_DURATION = 200;

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, ANIMATION_DURATION);
  };

  function fmt(iso: string): string {
      try {
          const parts = iso.split(/[-/:]/);
          // format: yyyy/MM/dd-HH:mm:ss → parts: [yyyy, MM, dd, HH, mm, ss]
          const d = new Date(+parts[0], +parts[1] - 1, +parts[2], +parts[3], +parts[4], +parts[5]);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const h = String(d.getHours()).padStart(2, "0");
          const min = String(d.getMinutes()).padStart(2, "0");
          return `${y}/${m}/${day} ${h}:${min}`;
      } catch {
          return iso;
      }
  }

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

          {!showForm && !deleteTarget && !viewing &&
            schedules.map((s) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                groups={groups}
                onClick={() => setViewing(s)}
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

          {viewing && !showForm && !deleteTarget && (() => {
            const s = viewing;
            const sd = s.startDatetime.slice(0, 10);
            const ed = s.endDatetime.slice(0, 10);
            const multiDay = sd !== ed;
            const members = s.memberUsernames ?? [];

            const groupName = (gid: number): string => {
                const g = groups.find((gr) => gr.id === gid);
                return g?.name ?? `グループ#${gid}`;
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="detail-field">
                  <span className="detail-label">説明</span>
                  <span className="detail-value">{s.description || "（説明なし）"}</span>
                </div>

                <div className="detail-field">
                  <span className="detail-label">
                    <Calendar size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    日時
                  </span>
                  <span className="detail-value">
                    {s.isAllDay
                      ? multiDay ? `${sd} 終日 ~ ${ed} 終日` : `${sd} 終日`
                      : multiDay
                        ? `${sd} ${s.startDatetime.slice(11, 16)} ~ ${ed} ${s.endDatetime.slice(11, 16)}`
                        : `${sd} ${s.startDatetime.slice(11, 16)} ~ ${s.endDatetime.slice(11, 16)}`}
                  </span>
                </div>

                <div className="detail-field">
                  <span className="detail-label">
                    <Globe size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    共有
                  </span>
                  <span className="detail-value">{s.shared ? "他のユーザーと共有する" : "共有しない"}</span>
                </div>

                <div className="detail-field">
                  <span className="detail-label">作成者</span>
                  <span className="detail-value">{s.ownerDisplayName ?? s.owner}</span>
                </div>

                {s.updateTime && (
                  <div className="detail-field">
                    <span className="detail-label">
                      <Clock size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      更新日時
                    </span>
                    <span className="detail-value">{fmt(s.updateTime)}</span>
                  </div>
                )}

                {(s.groupIds ?? []).length > 0 && (
                  <div className="detail-field">
                    <span className="detail-label">
                      <Users size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      共有グループ
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: 4 }}>
                      {(s.groupIds ?? []).map((gid) => (
                        <span key={gid} className="detail-badge">{groupName(gid)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {members.length > 0 && (
                  <div className="detail-field">
                    <span className="detail-label">
                      <Users size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      メンバー
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: 4 }}>
                      {members.map((uname) => (
                        <span
                          key={uname}
                          className="detail-badge"
                          style={{
                            background: s.memberChipBgColors?.[uname]
                              ? `${s.memberChipBgColors[uname]}44`
                              : "var(--color-surface2)",
                          }}
                        >
                          {s.memberDisplayNames?.[uname] ?? uname}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-actions" style={{ marginTop: 8 }}>
                  <button className="cancel-btn" onClick={() => setViewing(null)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ArrowLeft size={16} />
                    戻る
                  </button>
                  {s.canEdit && (
                    <>
                      <button
                        className="save-btn"
                        onClick={() => {
                          setEditing(s);
                          setShowForm(true);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <Pencil size={16} />
                        編集
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setViewing(null);
                          setDeleteTarget(s);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-sun)", borderColor: "var(--color-sun)" }}
                      >
                        <Trash2 size={16} />
                        削除
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

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

          {!showForm && !viewing && (
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
