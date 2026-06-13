import { useState } from "react";
import { X, Pencil, Trash2, Users, Calendar, Clock } from "lucide-react";
import type { TodoItem } from "../types/todo";
import type { Group } from "../types/group";

interface TodoDetailDialogProps {
    item: TodoItem;
    groups: Group[];
    onClose: () => void;
    onEdit: (item: TodoItem) => void;
    onDelete: (id: number) => void;
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const h = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${y}/${m}/${day} ${h}:${min}`;
    } catch {
        return iso;
    }
}

export default function TodoDetailDialog({ item, groups, onClose, onEdit, onDelete }: TodoDetailDialogProps) {
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 200);
    };

    const groupName = (gid: number): string => {
        const g = groups.find((gr) => gr.id === gid);
        return g?.name ?? `グループ#${gid}`;
    };

    return (
        <div className="dialog-overlay" onClick={handleClose}>
            <div className={`dialog${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>{item.title}</h2>
                    <button className="close-btn" onClick={handleClose}><X size={20} /></button>
                </div>

                <div className="dialog-body" style={{ gap: "16px" }}>
                    {/* 説明 */}
                    <div className="detail-field">
                        <span className="detail-label">説明</span>
                        <span className="detail-value">
                            {item.description || "（説明なし）"}
                        </span>
                    </div>

                    {/* オーナー */}
                    <div className="detail-field">
                        <span className="detail-label">作成者</span>
                        <span className="detail-value">
                            {item.ownerDisplayName ?? item.owner}
                        </span>
                    </div>

                    {/* 作成日時 */}
                    <div className="detail-field">
                        <span className="detail-label">
                            <Calendar size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            作成日時
                        </span>
                        <span className="detail-value">{formatDate(item.createdAt)}</span>
                    </div>

                    {/* 更新日時 */}
                    <div className="detail-field">
                        <span className="detail-label">
                            <Clock size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                            更新日時
                        </span>
                        <span className="detail-value">{formatDate(item.updatedAt)}</span>
                    </div>

                    {/* 共有グループ */}
                    {item.groupIds.length > 0 && (
                        <div className="detail-field">
                            <span className="detail-label">
                                <Users size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                共有グループ
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: 4 }}>
                                {item.groupIds.map((gid) => (
                                    <span key={gid} className="detail-badge">{groupName(gid)}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* メンバー */}
                    {item.memberUsernames.length > 0 && (
                        <div className="detail-field">
                            <span className="detail-label">
                                <Users size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                メンバー
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: 4 }}>
                                {item.memberUsernames.map((uname) => (
                                    <span
                                        key={uname}
                                        className="detail-badge"
                                        style={{
                                            background: item.memberChipBgColors?.[uname]
                                                ? `${item.memberChipBgColors[uname]}44`
                                                : "var(--color-surface2)",
                                        }}
                                    >
                                        {item.memberDisplayNames?.[uname] ?? uname}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* アクションボタン */}
                    {item.canEdit && (
                        <div className="form-actions" style={{ marginTop: 8 }}>
                            <button
                                className="save-btn"
                                onClick={() => onEdit(item)}
                                style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <Pencil size={16} />
                                編集
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => onDelete(item.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    color: "var(--color-sun)",
                                    borderColor: "var(--color-sun)",
                                }}
                            >
                                <Trash2 size={16} />
                                削除
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
