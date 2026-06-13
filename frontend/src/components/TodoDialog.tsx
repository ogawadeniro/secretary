import { useState, useEffect } from "react";
import { X } from "lucide-react";
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

export default function TodoDialog({ item, groups, onClose, onSaved, onNotify }: TodoDialogProps) {
    const isEditing = item !== null;
    const [title, setTitle] = useState(item?.title ?? "");
    const [description, setDescription] = useState(item?.description ?? "");
    const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
        item?.groupIds && item.groupIds.length > 0 ? item.groupIds[0] : undefined
    );
    const [memberUsername, setMemberUsername] = useState("");
    const [members, setMembers] = useState<string[]>(item?.memberUsernames ?? []);
    const [sharemen, setSharemen] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        fetchAcceptedUsernames().then(setSharemen).catch(() => {});
    }, []);

    const availableSharemen = selectedGroupId
        ? []  // グループ選択時はグループメンバーから選ぶ想定（一旦シェアメン候補は表示しない）
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

    const handleSave = async () => {
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
        <div className="dialog-overlay" onClick={handleClose}>
            <div className={`dialog${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>{isEditing ? "やることを編集" : "やることを追加"}</h2>
                    <button className="close-btn" onClick={handleClose}><X size={20} /></button>
                </div>
                <div className="dialog-body" style={{ gap: "12px" }}>
                    {error && <div className="dialog-error">{error}</div>}

                    <label>
                        タイトル
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="やることのタイトル"
                            autoFocus
                        />
                    </label>

                    <label>
                        詳細
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="詳細（省略可）"
                            rows={3}
                            style={{
                                background: "var(--color-surface2)",
                                color: "var(--color-text)",
                                border: "1px solid var(--color-border)",
                                padding: "8px",
                                borderRadius: "4px",
                                fontFamily: "inherit",
                                fontSize: "0.85rem",
                                width: "100%",
                                resize: "vertical",
                            }}
                        />
                    </label>

                    {/* 共有グループ選択 */}
                    <label>
                        共有グループ
                        <select
                            value={selectedGroupId ?? ""}
                            onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : undefined)}
                            style={{
                                width: "100%",
                                background: "var(--color-surface2)",
                                color: "var(--color-text)",
                                border: "1px solid var(--color-border)",
                                padding: "8px",
                                borderRadius: "4px",
                                fontFamily: "inherit",
                                fontSize: "0.85rem",
                            }}
                        >
                            <option value="">選択しない（個人のやること）</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.iconData && `[icon] `}{g.name}
                                </option>
                            ))}
                        </select>
                    </label>

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
                                            borderRadius: "4px",
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

                    <div className="form-actions">
                        <button className="save-btn" onClick={handleSave} disabled={saving}>
                            {saving ? "保存中..." : "保存"}
                        </button>
                        <button className="cancel-btn" onClick={handleClose}>
                            キャンセル
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
