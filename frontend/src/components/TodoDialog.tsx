import { useState, useEffect, useRef } from "react";
import type { TodoItem } from "../types/todo";
import type { Group } from "../types/group";
import { createTodo, updateTodo } from "../api/todoApi";
import { fetchAcceptedUsernames } from "../api/sharemanApi";
import { fetchGroupMembers } from "../api/groupApi";
import { searchUsers } from "../api/userApi";
import MemberAutocomplete from "./MemberAutocomplete";

interface TodoDialogProps {
    item: TodoItem | null;
    groups: Group[];
    currentUsername: string;
    onClose: () => void;
    onSaved: () => void;
    onNotify: (message: string, type?: "success" | "error") => void;
}

/**
 * deadline の ISO 文字列 → "yyyy-MM-dd" の date 部分を取り出す
 */
function deadlineToDate(iso?: string): string {
    if (!iso) return "";
    return iso.slice(0, 10);
}

/**
 * deadline の ISO 文字列 → "HH:mm" の time 部分を取り出す
 */
function deadlineToTime(iso?: string): string {
    if (!iso || iso.length < 16) return "";
    return iso.slice(11, 16);
}

/**
 * date ("yyyy-MM-dd") + time ("HH:mm") → ISO 文字列
 */
function toDeadlineISO(date: string, time: string): string | null {
    if (!date) return null;
    return `${date}T${time || "00:00"}:00`;
}

export default function TodoDialog({ item, groups, currentUsername, onClose, onSaved, onNotify }: TodoDialogProps) {
    const isEditing = item !== null;
    const [title, setTitle] = useState(item?.title ?? "");
    const [description, setDescription] = useState(item?.description ?? "");
    const [deadlineDate, setDeadlineDate] = useState(deadlineToDate(item?.deadline));
    const [deadlineTime, setDeadlineTime] = useState(deadlineToTime(item?.deadline));
    const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
        item?.groupIds && item.groupIds.length > 0 ? item.groupIds[0] : undefined
    );
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [members, setMembers] = useState<string[]>(() => {
        if (!item) {
            // 作成時は自分をメンバーに含める
            return currentUsername ? [currentUsername] : [];
        }
        const initial = [...(item.memberUsernames ?? [])];
        // オーナーをメンバーに含める
        if (item.owner && !initial.includes(item.owner)) {
            initial.push(item.owner);
        }
        return initial;
    });
    const [memberInput, setMemberInput] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [shareCandidates, setShareCandidates] = useState<
        { username: string; displayName: string; chipBgColor?: string }[]
    >([]);
    const memberInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);

    // 編集中、初期値で高さを調整
    useEffect(() => {
        if (descRef.current) {
            descRef.current.style.height = "auto";
            descRef.current.style.height = `${descRef.current.scrollHeight}px`;
        }
    }, []);

    // グループ選択に応じて候補を取得
    useEffect(() => {
        (async () => {
            try {
                if (selectedGroupId) {
                    const groupMembers = await fetchGroupMembers(selectedGroupId);
                    const candidates = groupMembers
                        .filter((m) => m.username !== item?.owner)
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
                    const currentOwner = item?.owner;
                    const candidates = accepted
                        .filter((u) => u !== currentOwner)
                        .sort()
                        .map((username) => ({
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
    }, [selectedGroupId, item?.owner]);

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

    // 補完候補（フィルタ済み）
    const filteredSuggestions = shareCandidates.filter((c) => {
        const query = memberInput.trim().toLowerCase();
        const matchesQuery = query === "" ||
            c.username.toLowerCase().includes(query) ||
            c.displayName.toLowerCase().includes(query);
        return matchesQuery && !members.includes(c.username);
    });

    const handleAddMember = (username: string) => {
        const trimmed = username.trim();
        if (!trimmed || members.includes(trimmed)) return;
        setMembers((prev) => [...prev, trimmed]);
        setMemberInput("");
        setShowSuggestions(true);
        memberInputRef.current?.focus();
    };

    const handleRemoveMember = (username: string) => {
        // 作成者は削除不可
        if (username === item?.owner) return;
        // 作成中の場合は現在のユーザーも削除不可
        if (!item && username === currentUsername) return;
        setMembers((prev) => prev.filter((m) => m !== username));
    };

    // 表示名・チップ色マップ（候補＋既存メンバーデータから生成）
    const memberDisplayNameMap: Record<string, string> = {};
    const memberChipBgColorMap: Record<string, string | undefined> = {};
    // 編集モードでは API から返された既存データを優先
    if (item?.memberDisplayNames) {
        Object.assign(memberDisplayNameMap, item.memberDisplayNames);
    }
    if (item?.memberChipBgColors) {
        Object.assign(memberChipBgColorMap, item.memberChipBgColors);
    }
    // 現在のユーザー（作成者）をフォールバックとして追加
    if (currentUsername && !(currentUsername in memberDisplayNameMap)) {
        memberDisplayNameMap[currentUsername] = currentUsername;
    }
    // 候補データで補完（既存データを上書きしない）
    shareCandidates.forEach((c) => {
        if (!(c.username in memberDisplayNameMap)) {
            memberDisplayNameMap[c.username] = c.displayName;
        }
        if (!(c.username in memberChipBgColorMap)) {
            memberChipBgColorMap[c.username] = c.chipBgColor;
        }
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("タイトルを入力してね");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const data: Partial<TodoItem> = {
                title: title.trim(),
                description: description.trim(),
                deadline: toDeadlineISO(deadlineDate, deadlineTime) ?? undefined,
                groupIds: selectedGroupId ? [selectedGroupId] : [],
                memberUsernames: members,
            };
            if (isEditing && item) {
                await updateTodo(item.id, data);
                onNotify("やることを更新したよ");
            } else {
                await createTodo(data);
                onNotify("やることを追加したよ");
            }
            onSaved();
        } catch (e) {
            setError(e instanceof Error ? e.message : "保存に失敗したよ");
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    return (
        <div className={`dialog-overlay${closing ? " closing" : ""}`} onClick={handleClose}>
            <div className={`dialog${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>{isEditing ? "やることを編集" : "やることを追加"}</h2>
                    <button className="close-btn" onClick={handleClose}>
                        ✕
                    </button>
                </div>
                <form className="schedule-form dialog-body" onSubmit={handleSave}>
                    {error && <div className="dialog-error">{error}</div>}

                    <label>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            タイトル
                            <span style={{
                                width: "8px", height: "8px",
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
                            placeholder="やることのタイトル"
                        />
                    </label>

                    <label>
                        やることの詳細
                        <textarea
                            ref={descRef}
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            placeholder="詳細（省略可）"
                            style={{ overflow: "hidden", resize: "none", minHeight: "50px" }}
                        />
                    </label>

                    {/* 締め切り */}
                    <div className="date-fields">
                        <label>
                            締切日
                            <input
                                type="date"
                                value={deadlineDate}
                                onChange={(e) => setDeadlineDate(e.target.value)}
                            />
                        </label>
                        <label>
                            締切時刻
                            <input
                                type="time"
                                value={deadlineTime}
                                onChange={(e) => setDeadlineTime(e.target.value)}
                            />
                        </label>
                    </div>

                    {/* 共有グループ */}
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

                    {/* メンバー管理 */}
                    {selectedGroupId && (
                        <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
                            <div className="settings-section-title">メンバー</div>

                            {/* バッジ一覧（作成者を常に先頭に） */}
                            {members.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {[...members].sort((a, b) => {
                                        const ownerKey = item?.owner ?? currentUsername;
                                        if (a === ownerKey) return -1;
                                        if (b === ownerKey) return 1;
                                        return 0;
                                    }).map((m) => {
                                        const isOwner = m === item?.owner || (!item && m === currentUsername);
                                        return (
                                            <span
                                                key={m}
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    padding: isOwner ? "2px 10px" : "2px 4px 2px 10px",
                                                    background: memberChipBgColorMap[m] ?? "var(--color-surface2)",
                                                    borderRadius: "999px",
                                                    fontSize: "0.8rem",
                                                }}
                                            >
                                                {memberDisplayNameMap[m] ?? m}
                                                {!isOwner && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMember(m)}
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
                                        );
                                    })}
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
                    )}

                    <div className="form-actions">
                        <button type="submit" disabled={saving}>
                            {saving ? "保存中..." : "保存"}
                        </button>
                        <button type="button" onClick={handleClose}>
                            キャンセル
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
