import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, ArrowLeft } from "lucide-react";
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

    /** カードクリック → 詳細表示 */
    const handleShowDetail = (item: TodoItem) => {
        setDetailItem(item);
    };

    /** 詳細の編集ボタン → 編集ダイアログ */
    const handleDetailEdit = (item: TodoItem) => {
        setDetailItem(null);
        setEditItem(item);
        setDialogOpen(true);
    };

    /** 詳細の削除ボタン → 確認 */
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
                            <div key={item.id} className="todo-card">
                                <div
                                    className="todo-card-body"
                                    onClick={() => handleShowDetail(item)}
                                    style={{ cursor: "pointer" }}
                                >
                                    <div className="todo-card-title">
                                        {item.title}
                                    </div>
                                    {item.description && (
                                        <div className="todo-card-desc">{item.description}</div>
                                    )}
                                    <div className="todo-card-meta">
                                        {item.ownerDisplayName ?? item.owner}
                                        {item.groupIds.length > 0 && (
                                            <span className="todo-card-group">
                                                {item.groupIds.map((gid) => {
                                                    const g = groups.find((gr) => gr.id === gid);
                                                    return g?.name ?? `グループ#${gid}`;
                                                }).join(", ")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="todo-card-actions">
                                    {item.canEdit && (
                                        <>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleDialogEdit(item)}
                                                title="編集"
                                                style={{ color: "var(--color-accent)", padding: "4px" }}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleDeleteClick(item.id)}
                                                title="削除"
                                                style={{ color: "var(--color-sun)", padding: "4px" }}
                                            >
                                                <Trash2 size={16} />
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
