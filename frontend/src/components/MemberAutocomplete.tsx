import { useRef, useEffect } from "react";



interface Candidate {
  username: string;
  displayName: string;
  chipBgColor?: string;
}

interface MemberAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus: () => void;
  suggestions: Candidate[];
  showSuggestions: boolean;
  onSelect: (username: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  suggestionsRef: React.RefObject<HTMLDivElement | null>;
  placeholder?: string;
}

/** ユーザー名入力＋補完候補ドロップダウン */
export default function MemberAutocomplete({
  value,
  onChange,
  onKeyDown,
  onFocus,
  suggestions,
  showSuggestions,
  onSelect,
  onClose,
  inputRef,
  suggestionsRef,
  placeholder = "追加するユーザー名を入力...",
}: MemberAutocompleteProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 外側クリックで候補を閉じる
  useEffect(() => {
    if (!showSuggestions) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inputEl = inputRef.current;
      if (inputEl?.contains(target)) return;
      if (suggestionsRef.current && suggestionsRef.current.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSuggestions, inputRef, suggestionsRef]);

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        style={{
          width: "100%",
          background: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
          padding: "6px 8px",
          borderRadius: "6px",
          fontFamily: "inherit",
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef as React.Ref<HTMLDivElement>}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            marginTop: "4px",
            maxHeight: "160px",
            overflowY: "auto",
          }}
        >
          {suggestions.slice(0, 5).map((c) => (
            <div
              key={c.username}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                borderBottom: "1px solid var(--color-border)",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.nativeEvent.stopPropagation();
                onSelect(c.username);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--color-hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {c.displayName}<span style={{ color: "var(--color-text-muted)" }}>&lt;{c.username}&gt;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
