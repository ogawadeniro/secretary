import { useState, useRef, useEffect } from "react";
import { Schedule } from "../types/schedule";
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from "../api/scheduleApi";
import { addMember, removeMember } from "../api/memberApi";
import { fetchGroups } from "../api/groupApi";
import type { Group } from "../types/group";
import { ownerColor } from "../utils/colorUtils";
import { PartyPopper } from "lucide-react";
import TimePicker from "./TimePicker";
import { useDateTimeCorrection } from "../hooks/useDateTimeCorrection";
import { MemberManager, type MemberManagerHandle } from "./MemberManager";

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
}

/** 予定のタイトル背景色を計算（DayCellのチップ色と一致させる） */
function scheduleTitleColor(s: Schedule, currentUsername: string, chipBgColor: string): string {
  const memberColors = (s.memberUsernames ?? []).map(
    (u) => s.memberChipBgColors?.[u] ?? ownerColor(u)
  );
  if (memberColors.length > 1) return "var(--color-surface2)";
  return s.owner === currentUsername
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
  timeInterval,
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
                      <span style={{ marginRight: "4px", verticalAlign: "middle", fontSize: "0.85rem" }} />
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
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                      </button>
                      <button className="icon-btn delete-btn-icon" title="削除" onClick={() => handleDeleteRequest(s)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
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
                <button className="delete-btn" onClick={() => deleteTarget.id !== null && handleDelete(deleteTarget.id)}>削除する</button>
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

interface ScheduleFormData {
  title?: string;
  isAllDay?: boolean;
  startDatetime?: string;
  endDatetime?: string;
  description?: string;
  shared?: boolean;
  groupIds?: number[];
}

/** 予定の新規作成・編集フォーム */
function ScheduleFormComponent({
  initial,
  date,
  currentUsername,
  onSave,
  onCancel,
  onNotify,
  timeInterval,
}: {
  initial: Schedule | null;
  date: Date;
  currentUsername: string;
  onSave: (data: ScheduleFormData, pendingMembers?: string[], removedMembers?: string[]) => Promise<void>;
  onCancel: () => void;
  onNotify: (message: string, type?: "success" | "error") => void;
  timeInterval: number;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [isAllDay, setIsAllDay] = useState(initial?.isAllDay ?? false);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
    initial?.groupIds && initial.groupIds.length > 0 ? initial.groupIds[0] : undefined
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialStartDate = initial
    ? initial.startDatetime.slice(0, 10).replace(/\//g, "-")
    : dateStr.replace(/\//g, "-");
  const initialEndDate = initial
    ? initial.endDatetime.slice(0, 10).replace(/\//g, "-")
    : dateStr.replace(/\//g, "-");
  const initialStartTime = initial?.startDatetime?.slice(11) ?? "09:00";
  const initialEndTime = initial?.endDatetime?.slice(11) ?? "10:00";

  const {
    startDate, setStartDate,
    endDate, setEndDate,
    startTime, setStartTime,
    endTime, setEndTime,
  } = useDateTimeCorrection(initialStartDate, initialEndDate, initialStartTime, initialEndTime);

  // 所属グループ一覧を取得
  useEffect(() => {
    fetchGroups().then(setGroups).catch(() => { });
  }, []);

  const scheduleId = initial?.id;
  const isNew = !scheduleId;
  const memberManagerRef = useRef<MemberManagerHandle>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // グループドロップダウンの外側クリックで閉じる
  useEffect(() => {
    if (!showGroupDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowGroupDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showGroupDropdown]);

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
          shared: true,
          groupIds: selectedGroupId ? [selectedGroupId] : [],
        },
        isNew ? memberManagerRef.current?.getPendingMembers() : memberManagerRef.current?.getPendingMembers(),
        isNew ? undefined : memberManagerRef.current?.getRemovedMembers(),
      );
    } finally {
      setSaving(false);
    }
  };

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
            <TimePicker value={startTime} onChange={setStartTime} stepMinutes={timeInterval} />
          </label>
          <label>
            終了時刻
            <TimePicker value={endTime} onChange={setEndTime} stepMinutes={timeInterval} />
          </label>
        </div>
      )}
      <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="settings-section-title">共有グループ</div>
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            style={{
              width: "100%", background: "var(--color-surface2)",
              border: "1px solid var(--color-border)", color: "var(--color-text)",
              padding: "6px 8px", borderRadius: "6px", fontFamily: "inherit",
              cursor: "pointer", fontSize: "0.85rem",
            }}
            onClick={() => setShowGroupDropdown((p) => !p)}
          >
            {(() => {
              if (selectedGroupId === undefined) return "プライベート";
              const g = groups.find((gr) => gr.id === selectedGroupId);
              return (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {g?.iconData && <img src={g.iconData} alt="" style={{ width: "16px", height: "16px", borderRadius: "3px", objectFit: "cover" }} />}
                  {g?.name ?? "共有グループ"}
                </span>
              );
            })()}
          </div>
          {showGroupDropdown && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "var(--color-surface2)", border: "1px solid var(--color-border)",
              borderRadius: "6px", marginTop: "4px", maxHeight: "200px", overflowY: "auto",
            }}>
              <div style={{
                padding: "8px 10px", cursor: "pointer", fontSize: "0.85rem",
                borderBottom: "1px solid var(--color-border)",
                background: selectedGroupId === undefined ? "var(--color-hover)" : "transparent",
              }}
                onMouseDown={(e) => { e.preventDefault(); setSelectedGroupId(undefined); setShowGroupDropdown(false); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selectedGroupId === undefined ? "var(--color-hover)" : "transparent"; }}
              >プライベート</div>
              {groups.map((g) => (
                <div key={g.id} style={{
                  padding: "8px 10px", cursor: "pointer", fontSize: "0.85rem",
                  borderBottom: "1px solid var(--color-border)",
                  background: selectedGroupId === g.id ? "var(--color-hover)" : "transparent",
                }}
                  onMouseDown={(e) => { e.preventDefault(); setSelectedGroupId(g.id); setShowGroupDropdown(false); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selectedGroupId === g.id ? "var(--color-hover)" : "transparent"; }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {g.iconData && <img src={g.iconData} alt="" style={{ width: "16px", height: "16px", borderRadius: "3px", objectFit: "cover" }} />}
                    {g.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {selectedGroupId && (
        <MemberManager
          ref={memberManagerRef}
          scheduleId={scheduleId ?? undefined}
          groupId={selectedGroupId}
          currentUsername={currentUsername}
          ownerUsername={initial?.owner ?? currentUsername}
          ownerDisplayName={initial?.ownerDisplayName}
          ownerChipBgColor={initial?.ownerChipBgColor}
          existingMemberDisplayNames={initial?.memberDisplayNames}
          existingMemberChipBgColors={initial?.memberChipBgColors}
          onNotify={onNotify}
        />
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
