import { useState, useEffect, useCallback } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import type { TodoItem } from "../types/todo";
import type { Group } from "../types/group";
import { fetchTodos, deleteTodo } from "../api/todoApi";
import { fetchGroups } from "../api/groupApi";
import TodoDialog from "./TodoDialog";
import TodoDetailDialog from "./TodoDetailDialog";
import ConfirmDialog from "./ConfirmDialog";

interface TodoScreenProps {
    onNavigateToCalendar: () => void;
    onNotify: (message: string, type?: "success" | "error") => void;
}

function formatDeadline(iso?: string): string {
    if (!iso) return "";
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

export default function TodoScreen({ onNavigateToCalendar, onNotify }: TodoScreenProps) {
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [detailItem, setDetailItem] = useState<TodoItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<TodoItem | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [data, groupsData] = await Promise.all([
                fetchTodos(),
                fetchGroups(),
            ]);
            setTodos(data);
            setGroups(groupsData);
            setError(null);
        } catch (e) {
            setError("やること一覧を読み込めなかったよ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = () => {
        setEditItem(null);
        setDialogOpen(true);
    };

    const handleShowDetail = (item: TodoItem) => {
        setDetailItem(item);
    };

    const handleDetailEdit = (item: TodoItem) => {
        setDetailItem(null);
        setEditItem(item);
        setDialogOpen(true);
    };

    const handleDetailDelete = (id: number) => {
        setDetailItem(null);
        setConfirmDeleteId(id);
    };

    const handleDialogEdit = (item: TodoItem) => {
        setEditItem(item);
        setDialogOpen(true);
    };

    const handleSaved = () => {
        setDialogOpen(false);
        setEditItem(null);
        load();
    };

    const handleDeleteClick = (id: number) => {
        setConfirmDeleteId(id);
    };

    const handleDeleteConfirmed = async () => {
        if (confirmDeleteId === null) return;
        try {
            await deleteTodo(confirmDeleteId);
            onNotify("やることを削除したよ");
            load();
        } catch {
            onNotify("削除に失敗したよ", "error");
        } finally {
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="todo-screen">
            <div className="todo-header">
                <button className="icon-btn" onClick={onNavigateToCalendar} title="カレンダーに戻る">
                    <ArrowLeft size={20} />
                </button>
                <h1>やることリスト</h1>
                <button className="todo-add-btn" onClick={handleCreate} title="やることを追加">
                    <Plus size={20} />
                </button>
            </div>

            {error && <div className="dialog-error">{error}</div>}

            <div className="todo-body">
                {loading ? (
                    <p className="todo-empty">読み込み中...</p>
                ) : todos.length === 0 ? (
                    <p className="todo-empty">やることがまだないよ。追加してみよう！</p>
                ) : (
                    <div className="todo-list">
                        {todos.map((item) => (
                            <div key={item.id} className="schedule-card" style={{ cursor: "pointer" }}>
                                <div
                                    className="schedule-card-info"
                                    onClick={() => handleShowDetail(item)}
                                >
                                    <strong>{item.title}</strong>
                                    {item.description && (
                                        <span className="schedule-owner-members">
                                            {item.description}
                                        </span>
                                    )}
                                    <span className="schedule-owner-members">
                                        {item.ownerDisplayName ?? item.owner}
                                        {item.deadline && (
                                            <span style={{ marginLeft: 8 }}>
                                                期限: {formatDeadline(item.deadline)}
                                            </span>
                                        )}
                                        {item.groupIds.length > 0 && (
                                            <span style={{ marginLeft: 8 }}>
                                                {item.groupIds.map((gid) => {
                                                    const g = groups.find((gr) => gr.id === gid);
                                                    return g?.name ?? `グループ#${gid}`;
                                                }).join(", ")}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="schedule-card-actions">
                                    {item.canEdit && (
                                        <>
                                            <button
                                                className="icon-btn"
                                                title="編集"
                                                onClick={() => handleDialogEdit(item)}
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                                </svg>
                                            </button>
                                            <button
                                                className="icon-btn delete-btn-icon"
                                                title="削除"
                                                onClick={() => handleDeleteClick(item.id)}
                                            >
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
                        ))}
                    </div>
                )}
            </div>

            {/* 詳細ダイアログ */}
            {detailItem && (
                <TodoDetailDialog
                    item={detailItem}
                    groups={groups}
                    onClose={() => setDetailItem(null)}
                    onEdit={handleDetailEdit}
                    onDelete={handleDetailDelete}
                />
            )}

            {/* 作成・編集ダイアログ */}
            {dialogOpen && (
                <TodoDialog
                    item={editItem}
                    groups={groups}
                    onClose={() => { setDialogOpen(false); setEditItem(null); }}
                    onSaved={handleSaved}
                    onNotify={onNotify}
                />
            )}

            {confirmDeleteId !== null && (
                <ConfirmDialog
                    message="本当にこのやることを削除する？"
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setConfirmDeleteId(null)}
                />
            )}
        </div>
    );
}
