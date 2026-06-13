import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { ScheduleMember as ScheduleMemberType } from "../types/schedule";
import { getMembers } from "../api/memberApi";
import { useMemberCandidates } from "../hooks/useMemberCandidates";
import MemberAutocomplete from "./MemberAutocomplete";

export interface MemberManagerHandle {
  /** 新規予定作成時にフォームに渡す保留中のメンバー一覧 */
  getPendingMembers: () => string[];
  /** 編集時に削除予定のメンバー一覧 */
  getRemovedMembers: () => string[];
  /** グループ変更時、新しいグループに含まれないメンバーを削除予定にする */
  onGroupChanged: (newGroupMembers: string[]) => void;
}

interface MemberManagerProps {
  scheduleId?: number;
  groupId?: number;
  currentUsername: string;
  ownerUsername: string;
  ownerDisplayName?: string;
  ownerChipBgColor?: string;
  existingMemberDisplayNames?: Record<string, string>;
  existingMemberChipBgColors?: Record<string, string>;
  onNotify: (message: string, type?: "success" | "error") => void;
}

/**
 * 予定メンバーの追加・削除UIを提供するコンポーネント。
 * 新規作成時は保留メンバーを内部管理し、編集時はAPI経由で直接操作する。
 */
export const MemberManager = forwardRef<MemberManagerHandle, MemberManagerProps>(
  function MemberManager({
    scheduleId,
    groupId,
    currentUsername,
    ownerUsername,
    ownerDisplayName: ownerDisplayNameProp,
    ownerChipBgColor: ownerChipBgColorProp,
    existingMemberDisplayNames,
    existingMemberChipBgColors,
    onNotify,
  }, ref) {
    const [members, setMembers] = useState<ScheduleMemberType[]>([]);
    const [pendingMembers, setPendingMembers] = useState<string[]>([]);
    const [pendingRemoves, setPendingRemoves] = useState<string[]>([]);
    const [memberInput, setMemberInput] = useState("");
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberError, setMemberError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const memberInputRef = useRef<HTMLInputElement>(null);
    const isNew = !scheduleId;

    useImperativeHandle(ref, () => ({
      getPendingMembers: () => pendingMembers,
      getRemovedMembers: () => pendingRemoves,
      onGroupChanged: (newGroupMembers: string[]) => {
        const newGroupSet = new Set(newGroupMembers);
        // 現在の有効なメンバー一覧
        const currentActive: string[] = [
          ...members
            .filter((m) => !pendingRemoves.includes(m.username))
            .map((m) => m.username),
          ...pendingMembers,
        ];
        // 新しいグループに含まれないメンバーを削除対象にする
        const toRemove = currentActive.filter((u) => !newGroupSet.has(u));
        setPendingMembers((prev) => prev.filter((u) => newGroupSet.has(u)));
        setPendingRemoves((prev) => {
          const existing = new Set(prev);
          toRemove.forEach((u) => existing.add(u));
          return [...existing];
        });
      },
    }), [members, pendingMembers, pendingRemoves]);

    // 補完候補を管理
    const { displayNameMap, chipBgColorMap, filteredSuggestions } = useMemberCandidates({
      groupId,
      excludeUsername: currentUsername,
      memberInput,
      isMember: (username) => {
        if (isNew) return pendingMembers.includes(username);
        return members.some((m) => m.username === username && !pendingRemoves.includes(m.username))
          || pendingMembers.includes(username);
      },
      existingDisplayNames: existingMemberDisplayNames,
      existingChipBgColors: existingMemberChipBgColors,
    });

    // 既存予定の編集時はメンバー一覧をロード
    useEffect(() => {
      if (!scheduleId) return;
      setMemberLoading(true);
      getMembers(scheduleId)
        .then(setMembers)
        .catch(() => setMemberError("メンバーの読み込みに失敗したよ"))
        .finally(() => setMemberLoading(false));
    }, [scheduleId]);

    // メンバー追加（新規/編集とも遅延）
    const handleAddMember = async (username: string) => {
      const trimmed = username.trim();
      if (!trimmed) return;
      setMemberError(null);

      const alreadyMember = isNew
        ? pendingMembers.includes(trimmed)
        : members.some((m) => m.username === trimmed && !pendingRemoves.includes(m.username))
          || pendingMembers.includes(trimmed);
      if (alreadyMember) {
        setMemberError("すでにメンバーです");
        return;
      }
      if (trimmed === currentUsername) {
        setMemberError("自分自身はメンバーに追加できないよ");
        return;
      }

      if (!isNew) {
        setPendingRemoves((prev) => prev.filter((u) => u !== trimmed));
      }
      setPendingMembers((prev) => [...prev, trimmed]);
      setMemberInput("");
      setShowSuggestions(true);
      memberInputRef.current?.focus();
    };

    // メンバー削除（遅延）
    const handleRemoveMember = async (username: string) => {
      setMemberError(null);
      if (!isNew) {
        if (pendingMembers.includes(username)) {
          setPendingMembers((prev) => prev.filter((u) => u !== username));
        } else {
          setPendingRemoves((prev) => [...prev, username]);
        }
      } else {
        setPendingMembers((prev) => prev.filter((u) => u !== username));
      }
    };

    // 表示用メンバー一覧（作成者を先頭に固定）
    const displayMembers = [
      {
        key: "owner",
        username: ownerUsername,
        displayName: ownerDisplayNameProp ?? ownerUsername,
        isOwner: true,
        pending: false,
        chipBgColor: ownerChipBgColorProp,
      },
      // 既存メンバー（削除予定のものを除外）
      ...(scheduleId
        ? members
            .filter((m) => m.username !== ownerUsername && !pendingRemoves.includes(m.username))
            .map((m) => ({
              key: m.id.toString(),
              username: m.username,
              displayName: displayNameMap[m.username] ?? m.username,
              isOwner: false,
              pending: false,
              chipBgColor: chipBgColorMap[m.username],
            }))
        : []),
      // 保留中の追加メンバー
      ...pendingMembers
        .filter((u) => u !== ownerUsername && !(scheduleId && members.some((m) => m.username === u && !pendingRemoves.includes(m.username))))
        .map((u) => ({
          key: u,
          username: u,
          displayName: displayNameMap[u] ?? u,
          isOwner: false,
          pending: true,
          chipBgColor: chipBgColorMap[u],
        })),
    ];

    return (
      <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div className="settings-section-title">メンバー</div>
        {memberLoading && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>読み込み中...</p>
        )}
        {memberError && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-holiday)" }}>{memberError}</p>
        )}

        {displayMembers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {displayMembers.map((m) => (
              <span
                key={m.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: m.isOwner ? "2px 10px" : "2px 4px 2px 10px",
                  background: m.chipBgColor ?? "var(--color-surface2)",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                }}
              >
                {m.displayName}
                {!m.isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.username)}
                    title="メンバーを削除"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "18px",
                      height: "18px",
                      padding: 0,
                      border: "none",
                      borderRadius: "50%",
                      background: "var(--color-border)",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      fontSize: "11px",
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        <MemberAutocomplete
          value={memberInput}
          onChange={(v) => { setMemberInput(v); setShowSuggestions(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredSuggestions.length > 0) {
                handleAddMember(filteredSuggestions[0].username);
              }
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          suggestions={filteredSuggestions}
          showSuggestions={showSuggestions}
          onSelect={(username) => handleAddMember(username)}
          onClose={() => setShowSuggestions(false)}
          inputRef={memberInputRef}
          suggestionsRef={suggestionsRef}
        />
      </div>
    );
  }
);
