import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  stepMinutes?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

function generateMinutes(step: number): string[] {
  const minutes: string[] = [];
  for (let m = 0; m < 60; m += step) {
    minutes.push(String(m).padStart(2, "0"));
  }
  return minutes;
}

export default function TimePicker({ value, onChange, stepMinutes = 5 }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const MINUTES = useMemo(() => generateMinutes(stepMinutes), [stepMinutes]);

  const [h, m] = value.split(":").map(Number);
  const displayHour = String(h).padStart(2, "0");
  const displayMin = String(Math.round(m / stepMinutes) * stepMinutes % 60).padStart(2, "0");

  const select = useCallback((hour: string, minute: string) => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const scrollTo = (ref: HTMLDivElement | null, val: string) => {
      if (!ref) return;
      const el = ref.querySelector(`[data-value="${val}"]`) as HTMLElement | null;
      if (el) el.scrollIntoView({ block: "center" });
    };
    requestAnimationFrame(() => {
      scrollTo(hoursRef.current, displayHour);
      scrollTo(minutesRef.current, displayMin);
    });
  }, [open, displayHour, displayMin]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const [focusIndex, setFocusIndex] = useState<{ col: "hours" | "minutes"; idx: number } | null>(null);

  const handlePopoverKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.focus();
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const col = focusIndex?.col ?? "hours";
      const list = col === "hours" ? HOURS : MINUTES;
      const idx = focusIndex?.idx ?? list.indexOf(col === "hours" ? displayHour : displayMin);
      const next = e.key === "ArrowDown"
        ? (idx + 1) % list.length
        : (idx - 1 + list.length) % list.length;
      setFocusIndex({ col, idx: next });
      const val = list[next];
      const el = (col === "hours" ? hoursRef : minutesRef).current
        ?.querySelector(`[data-value="${val}"]`) as HTMLElement | null;
      el?.scrollIntoView({ block: "center" });
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const nextCol = e.key === "ArrowRight" ? "minutes" : "hours";
      const list = nextCol === "hours" ? HOURS : MINUTES;
      const idx = list.indexOf(nextCol === "hours" ? displayHour : displayMin);
      setFocusIndex({ col: nextCol, idx: Math.max(0, idx) });
    }
    if (e.key === "Enter") {
      const hVal = focusIndex?.col === "hours" ? HOURS[focusIndex.idx] : displayHour;
      const mVal = focusIndex?.col === "minutes" ? MINUTES[focusIndex.idx] : displayMin;
      select(hVal, mVal);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={`${displayHour}:${displayMin}`}
        onFocus={() => setOpen(true)}
        onKeyDown={handleInputKeyDown}
        style={{
          width: "100%",
          background: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          padding: "6px 8px",
          borderRadius: "6px",
          fontSize: "16px",
          fontFamily: "inherit",
          cursor: "pointer",
          caretColor: "transparent",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      />
      {open && (
        <div
          tabIndex={-1}
          onKeyDown={handlePopoverKeyDown}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            marginTop: "4px",
            display: "flex",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <div
            ref={hoursRef}
            style={{
              flex: 1,
              maxHeight: "200px",
              overflowY: "auto",
              borderRight: "1px solid var(--color-border)",
            }}
          >
            {HOURS.map((hour, i) => (
              <div
                key={hour}
                data-value={hour}
                onClick={() => select(hour, displayMin)}
                onMouseEnter={() => setFocusIndex({ col: "hours", idx: i })}
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  background: hour === displayHour
                    ? "var(--color-accent)"
                    : focusIndex?.col === "hours" && focusIndex.idx === i
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color: hour === displayHour ? "#fff" : "var(--color-text)",
                  transition: "background 0.1s",
                }}
              >
                {hour}
              </div>
            ))}
          </div>
          <div
            ref={minutesRef}
            style={{
              flex: 1,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {MINUTES.map((min, i) => (
              <div
                key={min}
                data-value={min}
                onClick={() => select(displayHour, min)}
                onMouseEnter={() => setFocusIndex({ col: "minutes", idx: i })}
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  background: min === displayMin
                    ? "var(--color-accent)"
                    : focusIndex?.col === "minutes" && focusIndex.idx === i
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color: min === displayMin ? "#fff" : "var(--color-text)",
                  transition: "background 0.1s",
                }}
              >
                {min}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
