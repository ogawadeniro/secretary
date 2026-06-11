import { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import { ScheduleMember as ScheduleMemberType } from "../types/schedule";
import { getMembers } from "../api/memberApi";
import { fetchAcceptedUsernames } from "../api/sharemanApi";
import { fetchGroupMembers } from "../api/groupApi";
import { searchUsers } from "../api/userApi";

export interface MemberManagerHandle {
  /** 新規予定作成時にフォームに渡す保留中のメンバー一覧 */
  getPendingMembers: () => string[];
  /** 編集時に削除予定のメンバー一覧 */
  getRemovedMembers: () => string[];
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
    const [shareCandidates, setShareCandidates] = useState<
      { username: string; displayName: string; chipBgColor?: string }[]
    >([]);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const isNew = !scheduleId;

    useImperativeHandle(ref, () => ({
      getPendingMembers: () => pendingMembers,
      getRemovedMembers: () => pendingRemoves,
    }), [pendingMembers, pendingRemoves]);

    // シェアメン一覧を取得（承諾済みユーザーを候補として表示）
    useEffect(() => {
      (async () => {
        try {
          if (groupId) {
            // グループが選択されている場合はグループメンバーを候補にする
            const members = await fetchGroupMembers(groupId);
            const candidates = members
              .filter((m) => m.username !== currentUsername)
              .sort((a, b) => a.username.localeCompare(b.username))
              .map((m) => ({
                username: m.username,
                displayName: m.displayName ?? m.username,
                chipBgColor: m.chipBgColor,
              }));
            setShareCandidates(candidates);
          } else {
            const [accepted, allUsers] = await Promise.all([
              fetchAcceptedUsernames(),
              searchUsers(""),
            ]);
            const candidates = accepted.filter((u) => u !== currentUsername).sort().map((username) => ({
              username,
              displayName: allUsers.find((u) => u.username === username)?.displayName ?? username,
              chipBgColor: allUsers.find((u) => u.username === username)?.chipBgColor,
            }));
            setShareCandidates(candidates);
          }
        } catch {
          // 候補一覧がなくても機能に影響なし
        }
      })();
    }, [currentUsername, groupId]);

    // 既存予定の編集時はメンバー一覧をロード
    useEffect(() => {
      if (!scheduleId) return;
      setMemberLoading(true);
      getMembers(scheduleId)
        .then(setMembers)
        .catch(() => setMemberError("メンバーの読み込みに失敗したよ"))
        .finally(() => setMemberLoading(false));
    }, [scheduleId]);

    // 候補リストの外側クリックで閉じる
    useEffect(() => {
      if (!showSuggestions) return;
      const handleClick = (e: MouseEvent) => {
        if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
          setShowSuggestions(false);
        }
      };
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [showSuggestions]);

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

    // 補完候補（フィルタ済み）
    const filteredSuggestions = shareCandidates.filter((c) => {
      const query = memberInput.trim().toLowerCase();
      const matchesQuery = query === "" ||
        c.username.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query);
      const alreadyAdded = isNew
        ? pendingMembers.includes(c.username)
        : members.some((m) => m.username === c.username && !pendingRemoves.includes(m.username))
          || pendingMembers.includes(c.username);
      return matchesQuery && !alreadyAdded;
    });

    // 表示名マップ（補完候補から生成）
    const memberDisplayNameMap = useMemo(() => {
      const map = new Map<string, string>();
      shareCandidates.forEach((c) => map.set(c.username, c.displayName));
      return map;
    }, [shareCandidates]);

    // チップ背景色マップ（補完候補から生成）
    const memberChipBgColorMap = useMemo(() => {
      const map = new Map<string, string | undefined>();
      shareCandidates.forEach((c) => map.set(c.username, c.chipBgColor));
      return map;
    }, [shareCandidates]);

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
              displayName: existingMemberDisplayNames?.[m.username] ?? memberDisplayNameMap.get(m.username) ?? m.username,
              isOwner: false,
              pending: false,
              chipBgColor: existingMemberChipBgColors?.[m.username] ?? memberChipBgColorMap.get(m.username),
            }))
        : []),
      // 保留中の追加メンバー
      ...pendingMembers
        .filter((u) => u !== ownerUsername && !(scheduleId && members.some((m) => m.username === u && !pendingRemoves.includes(m.username))))
        .map((u) => ({
          key: u,
          username: u,
          displayName: memberDisplayNameMap.get(u) ?? u,
          isOwner: false,
          pending: true,
          chipBgColor: memberChipBgColorMap.get(u),
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
                  background: m.isOwner ? "var(--color-surface2)" : (m.chipBgColor ?? "var(--color-surface2)"),
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

        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="追加するユーザー名を入力..."
            value={memberInput}
            onChange={(e) => {
              setMemberInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filteredSuggestions.length > 0) {
                  handleAddMember(filteredSuggestions[0].username);
                }
              }
            }}
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
          {/* 補完候補ドロップダウン */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
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
              {filteredSuggestions.map((c) => (
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
                    handleAddMember(c.username);
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
      </div>
    );
  }
);
