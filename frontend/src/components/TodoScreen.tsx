import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus, Circle, CheckCircle2, CalendarCheck, Users } from "lucide-react";
import type { TodoItem } from "../types/todo";
import type { Group } from "../types/group";
import type { UserSettings } from "../types/settings";
import { fetchTodos, deleteTodo, toggleComplete } from "../api/todoApi";
import { fetchGroups } from "../api/groupApi";
import { fetchSettings } from "../api/settingsApi";
import TodoDialog from "./TodoDialog";
import TodoDetailDialog from "./TodoDetailDialog";
import ConfirmDialog from "./ConfirmDialog";
import FilterBar from "./FilterBar";
import UserAccountSection from "./UserAccountSection";
import SettingsDialog from "./SettingsDialog";
import AccountDialog from "./AccountDialog";
import { useAuth } from "../context/AuthContext";

const DEFAULT_SETTINGS: UserSettings = {
    chipBgColor: "#4a6fa5",
    firstDayOfWeek: 0,
    timeInterval: 5,
};

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
    const { user, logout } = useAuth();
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [detailItem, setDetailItem] = useState<TodoItem | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<TodoItem | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmCompleteId, setConfirmCompleteId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [showSettings, setShowSettings] = useState(false);
    const [showAccount, setShowAccount] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

    useEffect(() => {
        fetchSettings().then(setSettings).catch(() => {});
    }, []);

    const allDoneMessages = [
        "全部終わったよ！おつかれさま〜",
        "いつもありがとうね。",
        "なんだかスッキリしたね！",
        "おわった！ぱや、ぱやぱや！！",
        "きもちいい！今日はパーティーだ",
    ];
    const [allDoneMessage] = useState(() =>
        allDoneMessages[Math.floor(Math.random() * allDoneMessages.length)]
    );

    const [scheduleFilter, setScheduleFilter] = useState<Set<string | number>>(() => {
        try {
            const saved = localStorage.getItem("calendar_filter");
            if (saved) return new Set(JSON.parse(saved));
        } catch { /* ignore */ }
        return new Set(["personal"]);
    });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);

    // フィルターを localStorage に保存
    useEffect(() => {
        localStorage.setItem("calendar_filter", JSON.stringify([...scheduleFilter]));
    }, [scheduleFilter]);

    // フィルタードロップダウンの外側クリックで閉じる
    useEffect(() => {
        if (!showFilterDropdown) return;
        const handleClick = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showFilterDropdown]);

    // フィルター適用
    const filteredTodos = useMemo(() => {
        if (scheduleFilter.size === 0) return [];
        return todos.filter((t) => {
            if (scheduleFilter.has("personal") && t.groupIds.length === 0) return true;
            if (t.groupIds.some((gid) => scheduleFilter.has(gid))) return true;
            return false;
        });
    }, [todos, scheduleFilter]);

    const incompleteTodos = filteredTodos
        .filter((t) => !t.completed)
        .sort((a, b) => {
            // 期限が迫っている順（期限なしは最下位）
            if (!a.deadline && !b.deadline) return 0;
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        });
    const completedTodos = filteredTodos.filter((t) => t.completed);

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

    const handleCompleteClick = (id: number) => {
        setConfirmCompleteId(id);
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

    const handleToggleComplete = async (id: number, completed: boolean) => {
        try {
            await toggleComplete(id);
            onNotify(completed ? "やることを未完了に戻したよ" : "やることを完了したよ！");
            load();
        } catch {
            onNotify("完了状態の変更に失敗したよ", "error");
        }
    };

    const handleCompleteConfirmed = async () => {
        if (confirmCompleteId === null) return;
        await handleToggleComplete(confirmCompleteId, false);
        setConfirmCompleteId(null);
    };

    function renderCard(item: TodoItem) {
        return (
            <div key={item.id} className="schedule-card" style={{ cursor: "pointer" }}>
                <button
                    className="icon-btn"
                    title={item.completed ? "未完了に戻す" : "完了"}
                    onClick={() => item.completed ? handleToggleComplete(item.id, true) : handleCompleteClick(item.id)}
                    style={{ color: item.completed ? "var(--color-text-muted)" : "var(--color-accent)" }}
                >
                    {item.completed
                        ? <CheckCircle2 size={16} />
                        : <Circle size={16} />
                    }
                </button>
                <div
                    className="schedule-card-info"
                    onClick={() => handleShowDetail(item)}
                >
                    <strong style={item.completed ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                        {item.groupIds.length > 0 && (() => {
                            const g = groups.find((gr) => gr.id === item.groupIds[0]);
                            return g?.iconData ? (
                                <img
                                    src={g.iconData}
                                    alt=""
                                    style={{
                                        width: "14px",
                                        height: "14px",
                                        borderRadius: "3px",
                                        objectFit: "cover",
                                        marginRight: "4px",
                                        verticalAlign: "middle",
                                    }}
                                />
                            ) : null;
                        })()}
                        {item.title}
                    </strong>
                    {item.description && (
                        <span className="schedule-owner-members">
                            {item.description}
                        </span>
                    )}
                    <span className="schedule-owner-members" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <CalendarCheck size={12} />
                            {item.deadline ? formatDeadline(item.deadline) : "—"}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Users size={12} />
                            {item.memberUsernames.length > 0
                                ? item.memberUsernames.map((u) => item.memberDisplayNames?.[u] ?? u).join(", ")
                                : "—"
                            }
                        </span>
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
        );
    }

    return (
        <div className="todo-screen">
            <FilterBar
                groups={groups}
                scheduleFilter={scheduleFilter}
                showFilterDropdown={showFilterDropdown}
                filterDropdownRef={filterDropdownRef}
                onToggleFilterDropdown={() => setShowFilterDropdown((p) => !p)}
                onCloseFilterDropdown={() => setShowFilterDropdown(false)}
                onFilterChange={(next) => setScheduleFilter(next)}
            />
            <div className="todo-header">
                <h1>やることリスト</h1>
                <UserAccountSection
                    settings={settings}
                    user={user}
                    onShowSettings={() => setShowSettings(true)}
                    onShowAccount={() => setShowAccount(true)}
                    onLogoutClick={() => setShowLogoutConfirm(true)}
                />
            </div>

            {error && <div className="dialog-error">{error}</div>}

            <div className="todo-body">
                {loading ? (
                    <p className="todo-empty">読み込み中...</p>
                ) : (
                    <div className="todo-list">
                        
                        {/* 未完了セクション */}
                        <div className="todo-section-header">
                            <Circle size={18} />
                            <span>これからやること</span>
                            <div style={{ marginLeft: "auto" }}>
                                <button className="todo-add-btn" onClick={handleCreate} title="やることを追加">
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                        {incompleteTodos.length === 0 ? (
                            <p className="todo-empty" style={{ marginTop: 8 }}>
                                {todos.length === 0 ? "やることがまだないよ。追加してみよう！" : allDoneMessage}
                            </p>
                        ) : (
                            incompleteTodos.map(renderCard)
                        )}

                        {/* 完了セクション */}
                        {completedTodos.length > 0 && (
                            <>
                                <div className="todo-section-header" style={{ marginTop: 24 }}>
                                    <CheckCircle2 size={18} />
                                    <span>やったこと</span>
                                </div>
                                {completedTodos.map(renderCard)}
                            </>
                        )}
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
                    currentUsername={user?.username ?? ""}
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

            {confirmCompleteId !== null && (
                <ConfirmDialog
                    message="やったことにする？？"
                    confirmLabel="うん"
                    cancelLabel="まだ"
                    onConfirm={handleCompleteConfirmed}
                    onCancel={() => setConfirmCompleteId(null)}
                />
            )}

            {showSettings && (
                <SettingsDialog
                    settings={settings}
                    onClose={() => setShowSettings(false)}
                    onSaved={(s) => { setSettings(s); setShowSettings(false); }}
                    onNotify={onNotify}
                />
            )}

            {showAccount && (
                <AccountDialog
                    settings={settings}
                    onClose={() => setShowAccount(false)}
                    onSaved={(s) => { setSettings(s); setShowAccount(false); }}
                    onNotify={onNotify}
                />
            )}

            {showLogoutConfirm && (
                <ConfirmDialog
                    message="ログアウトするよ？"
                    confirmLabel="ログアウト"
                    onConfirm={async () => { setShowLogoutConfirm(false); await logout(); }}
                    onCancel={() => setShowLogoutConfirm(false)}
                />
            )}
        </div>
    );
}
