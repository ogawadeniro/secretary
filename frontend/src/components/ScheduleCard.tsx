import { Schedule } from "../types/schedule";
import type { Group } from "../types/group";

interface ScheduleCardProps {
  schedule: Schedule;
  groups: Group[];
  onEdit: () => void;
  onDelete: () => void;
}

/** 予定のカード背景色（常に surface2） */
function cardBg(): string {
  return "var(--color-surface2)";
}

/** 1件の予定を表示するカード */
export default function ScheduleCard({ schedule, groups, onEdit, onDelete }: ScheduleCardProps) {
  const s = schedule;
  const sd = s.startDatetime.slice(0, 10);
  const ed = s.endDatetime.slice(0, 10);
  const multiDay = sd !== ed;
  const members = s.memberUsernames ?? [];

  return (
    <div className="schedule-card">
      <div className="schedule-card-info">
        <strong
          style={{
            background: cardBg(),
            borderRadius: "4px",
            padding: "2px 6px",
            color: "var(--color-text)",
            alignSelf: "flex-start",
          }}
        >
          {(s.groupIds ?? []).length > 0 && (() => {
            const g = groups.find((gr) => gr.id === s.groupIds![0]);
            return g?.iconData ? (
              <img
                src={g.iconData}
                alt=""
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "2px",
                  objectFit: "cover",
                  marginRight: "3px",
                  verticalAlign: "middle",
                }}
              />
            ) : null;
          })()}
          {s.title}
        </strong>
        <span className="schedule-time">
          {s.isAllDay
            ? multiDay
              ? `${sd} 終日 ~ ${ed} 終日`
              : "終日"
            : multiDay
              ? `${sd} ${s.startDatetime.slice(11)} ~ ${ed} ${s.endDatetime.slice(11)}`
              : `${s.startDatetime.slice(11)} ~ ${s.endDatetime.slice(11)}`}
        </span>
        <span className="schedule-owner-members">
          {members.length > 1
            ? [s.ownerDisplayName ?? s.owner, ...members.filter((u) => u !== s.owner).map((u) => s.memberDisplayNames?.[u] ?? u)].join(", ")
            : s.ownerDisplayName ?? s.owner}
        </span>
      </div>
      <div className="schedule-card-actions">
        {s.canEdit && (
          <>
            <button className="icon-btn" title="編集" onClick={onEdit}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
            <button className="icon-btn delete-btn-icon" title="削除" onClick={onDelete}>
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
  );
}
