import { Filter, Check } from "lucide-react";
import type { Group } from "../types/group";

interface FilterBarProps {
  groups: Group[];
  scheduleFilter: Set<string | number>;
  showFilterDropdown: boolean;
  filterDropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleFilterDropdown: () => void;
  onCloseFilterDropdown: () => void;
  onFilterChange: (newFilter: Set<string | number>) => void;
}

export default function FilterBar({
  groups,
  scheduleFilter,
  showFilterDropdown,
  filterDropdownRef,
  onToggleFilterDropdown,
  onCloseFilterDropdown,
  onFilterChange,
}: FilterBarProps) {
  const selectedGroupIds = [...scheduleFilter].filter(
    (v) => v !== "personal"
  ) as number[];

  return (
    <div
      className="calendar-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        paddingTop: "4px",
        paddingBottom: "8px",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            background: "var(--color-surface2)",
            borderRadius: "999px",
            fontSize: "0.8rem",
          }}
        >
          プライベート
        </span>
        {selectedGroupIds.map((gid) => {
          const g = groups.find((gr) => gr.id === gid);
          return (
            <span
              key={gid}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                background: "var(--color-surface2)",
                borderRadius: "999px",
                fontSize: "0.8rem",
              }}
            >
              {g?.iconData && (
                <img
                  src={g.iconData}
                  alt=""
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "3px",
                    objectFit: "cover",
                  }}
                />
              )}
              {g?.name ?? gid}
            </span>
          );
        })}
      </div>

      <div style={{ position: "relative" }} ref={filterDropdownRef as React.Ref<HTMLDivElement>}>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleFilterDropdown}
          title="フィルター"
          style={{
            display: "flex",
            padding: "4px",
            borderRadius: "6px",
            cursor: "pointer",
            border: "none",
            background: "var(--color-surface2)",
            color: "var(--color-text)",
          }}
        >
          <Filter size={18} />
        </button>
        {showFilterDropdown && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99 }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCloseFilterDropdown();
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                zIndex: 100,
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                marginTop: "4px",
                minWidth: "180px",
                overflow: "hidden",
              }}
            >
              {groups.length === 0 ? (
                <div
                  style={{
                    padding: "12px",
                    fontSize: "0.8rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  参加している共有グループはありません
                </div>
              ) : (
                groups.map((g) => {
                  const isActive = scheduleFilter.has(g.id);
                  return (
                    <div
                      key={g.id}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        background: isActive
                          ? "var(--color-hover)"
                          : "transparent",
                        borderBottom: "1px solid var(--color-border)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const next = new Set(scheduleFilter);
                        if (isActive) {
                          next.delete(g.id);
                        } else {
                          next.add(g.id);
                        }
                        onFilterChange(next);
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--color-hover)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          isActive ? "var(--color-hover)" : "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "3px",
                          border: "2px solid var(--color-border)",
                          background: isActive
                            ? "var(--color-accent)"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isActive && (
                          <Check size={10} style={{ color: "#fff" }} />
                        )}
                      </div>
                      {g.name}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
