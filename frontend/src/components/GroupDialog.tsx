import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import type { Group, GroupMember } from "../types/group";
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  fetchGroupMembers,
  addGroupMember,
  removeGroupMember,
} from "../api/groupApi";
import { fetchAcceptedUsernames } from "../api/sharemanApi";

interface GroupDialogProps {
  onClose: () => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

export default function GroupDialog({ onClose, onNotify }: GroupDialogProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sharemen, setSharemen] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const load = async () => {
    try {
      const [g, s] = await Promise.all([
        fetchGroups(),
        fetchAcceptedUsernames(),
      ]);
      setGroups(g);
      setSharemen(s);
    } catch {
      setError("グループ一覧を読み込めなかったよ");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadMembers = async (groupId: number) => {
    try {
      setMembers(await fetchGroupMembers(groupId));
    } catch {
      setError("メンバー一覧を読み込めなかったよ");
    }
  };

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const g = await createGroup(trimmed);
      setGroupName("");
      await load();
      setSelectedGroup(g);
      await loadMembers(g.id);
      onNotify("グループを作成したよ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗したよ");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("本当にこのグループを削除する？")) return;
    try {
      await deleteGroup(id);
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
        setMembers([]);
      }
      await load();
      onNotify("グループを削除したよ");
    } catch {
      setError("削除に失敗したよ");
    }
  };

  const selectGroup = async (g: Group) => {
    setSelectedGroup(g);
    setMemberUsername("");
    await loadMembers(g.id);
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !memberUsername.trim()) return;
    try {
      await addGroupMember(selectedGroup.id, memberUsername.trim());
      setMemberUsername("");
      await loadMembers(selectedGroup.id);
      onNotify("メンバーを追加したよ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "追加に失敗したよ");
    }
  };

  const handleRemoveMember = async (username: string) => {
    if (!selectedGroup) return;
    try {
      await removeGroupMember(selectedGroup.id, username);
      await loadMembers(selectedGroup.id);
      onNotify("メンバーを削除したよ");
    } catch {
      setError("削除に失敗したよ");
    }
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const availableSharemen = sharemen.filter(
    (u) => !members.some((m) => m.username === u),
  );

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className={`dialog${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>グループ管理</h2>
          <button className="close-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="dialog-body" style={{ gap: "16px" }}>
          {error && <div className="dialog-error">{error}</div>}

          {/* グループ作成 */}
          <div className="settings-section">
            <div className="settings-section-title">グループを作成</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="グループ名を入力..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                style={{
                  flex: 1,
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontFamily: "inherit",
                }}
              />
              <button
                className="save-btn"
                style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                disabled={creating || !groupName.trim()}
                onClick={handleCreate}
              >
                {creating ? "作成中..." : "作成"}
              </button>
            </div>
          </div>

          {/* グループ一覧 */}
          <div className="settings-section">
            <div className="settings-section-title">グループ一覧</div>
            {groups.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                まだグループがないよ
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {groups.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: selectedGroup?.id === g.id
                        ? "var(--color-accent)"
                        : "var(--color-surface2)",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                    onClick={() => selectGroup(g)}
                  >
                    <span style={{ fontSize: "0.85rem" }}>{g.name}</span>
                    <button
                      className="icon-btn delete-btn-icon"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-sun)",
                        padding: "4px",
                        display: "flex",
                      }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                      title="グループを削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 選択中のグループのメンバー管理 */}
          {selectedGroup && (
            <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <div className="settings-section-title">
                {selectedGroup.name} のメンバー
              </div>

              {/* メンバー追加 */}
              {availableSharemen.length > 0 && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <select
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    style={{
                      flex: 1,
                      background: "var(--color-surface2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                      padding: "8px 10px",
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
                    className="save-btn"
                    style={{ padding: "8px 16px", fontSize: "0.85rem" }}
                    disabled={!memberUsername}
                    onClick={handleAddMember}
                  >
                    追加
                  </button>
                </div>
              )}

              {members.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  メンバーがいないよ。シェアメンを追加しよう！
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {members.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        background: "var(--color-surface2)",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem" }}>
                        {m.displayName ? `${m.displayName}<${m.username}>` : m.username}
                        {m.role === "OWNER" && (
                          <span style={{
                            fontSize: "0.7rem",
                            color: "var(--color-accent)",
                            marginLeft: "6px",
                          }}>
                            オーナー
                          </span>
                        )}
                      </span>
                      {m.role !== "OWNER" && (
                        <button
                          className="icon-btn delete-btn-icon"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--color-sun)",
                            padding: "4px",
                            display: "flex",
                          }}
                          onClick={() => handleRemoveMember(m.username)}
                          title="メンバーを削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
