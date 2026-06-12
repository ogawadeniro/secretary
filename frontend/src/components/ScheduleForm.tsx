import { useState, useRef, useEffect } from "react";
import { Schedule } from "../types/schedule";
import type { Group } from "../types/group";
import { fetchGroups } from "../api/groupApi";
import TimePicker from "./TimePicker";
import { useDateTimeCorrection } from "../hooks/useDateTimeCorrection";
import { MemberManager, type MemberManagerHandle } from "./MemberManager";

export interface ScheduleFormData {
  title?: string;
  isAllDay?: boolean;
  startDatetime?: string;
  endDatetime?: string;
  description?: string;
  shared?: boolean;
  groupIds?: number[];
}

interface ScheduleFormProps {
  initial: Schedule | null;
  date: Date;
  currentUsername: string;
  onSave: (data: ScheduleFormData, pendingMembers?: string[], removedMembers?: string[]) => Promise<void>;
  onCancel: () => void;
  onNotify: (message: string, type?: "success" | "error") => void;
  timeInterval: number;
}

/** 予定の新規作成・編集フォーム */
export default function ScheduleForm({
  initial,
  date,
  currentUsername,
  onSave,
  onCancel,
  onNotify,
  timeInterval,
}: ScheduleFormProps) {
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
