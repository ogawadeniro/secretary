import { useState, useEffect, useRef } from "react";
import type { TodoItem } from "../types/todo";
import type { Group } from "../types/group";
import { createTodo, updateTodo } from "../api/todoApi";
import { fetchAcceptedUsernames } from "../api/sharemanApi";

interface TodoDialogProps {
    item: TodoItem | null;
    groups: Group[];
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

export default function TodoDialog({ item, groups, onClose, onSaved, onNotify }: TodoDialogProps) {
    const isEditing = item !== null;
    const [title, setTitle] = useState(item?.title ?? "");
    const [description, setDescription] = useState(item?.description ?? "");
    const [deadlineDate, setDeadlineDate] = useState(deadlineToDate(item?.deadline));
    const [deadlineTime, setDeadlineTime] = useState(deadlineToTime(item?.deadline));
    const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
        item?.groupIds && item.groupIds.length > 0 ? item.groupIds[0] : undefined
    );
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [members, setMembers] = useState<string[]>(item?.memberUsernames ?? []);
    const [memberUsername, setMemberUsername] = useState("");
    const [sharemen, setSharemen] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAcceptedUsernames().then(setSharemen).catch(() => {});
    }, []);

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

    const availableSharemen = selectedGroupId
        ? []
        : sharemen.filter((u) => !members.includes(u) && u !== item?.owner);

    const handleAddMember = () => {
        const trimmed = memberUsername.trim();
        if (!trimmed || members.includes(trimmed)) return;
        setMembers((prev) => [...prev, trimmed]);
        setMemberUsername("");
    };

    const handleRemoveMember = (username: string) => {
        setMembers((prev) => prev.filter((m) => m !== username));
    };

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
                            autoFocus
                        />
                    </label>

                    {/* 締め切り */}
                    <label>
                        締め切り
                    </label>
                    <div className="date-fields">
                        <label>
                            日付
                            <input
                                type="date"
                                value={deadlineDate}
                                onChange={(e) => setDeadlineDate(e.target.value)}
                            />
                        </label>
                        <label>
                            時刻
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
                    {!selectedGroupId && (
                        <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
                            <div className="settings-section-title">メンバー</div>
                            {members.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                                    {members.map((m) => (
                                        <span
                                            key={m}
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
                                            {m}
                                            <button
                                                type="button"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "var(--color-sun)",
                                                    padding: "0",
                                                    fontSize: "0.8rem",
                                                    lineHeight: 1,
                                                }}
                                                onClick={() => handleRemoveMember(m)}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {availableSharemen.length > 0 && (
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <select
                                        value={memberUsername}
                                        onChange={(e) => setMemberUsername(e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: "var(--color-surface2)",
                                            color: "var(--color-text)",
                                            border: "1px solid var(--color-border)",
                                            padding: "8px",
                                            borderRadius: "6px",
                                            fontFamily: "inherit",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        <option value="">シェアメンを選択...</option>
                                        {availableSharemen.map((u) => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="save-btn"
                                        style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                                        disabled={!memberUsername}
                                        onClick={handleAddMember}
                                    >
                                        追加
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <label>
                        説明
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="詳細（省略可）"
                        />
                    </label>

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
