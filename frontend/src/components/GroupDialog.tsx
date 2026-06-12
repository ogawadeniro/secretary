import { useState, useEffect, useRef } from "react";
import { X, Trash2, Check, UserPlus } from "lucide-react";
import type { Group, GroupMember } from "../types/group";
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  fetchGroupMembers,
  addGroupMember,
  removeGroupMember,
  fetchGroupInvitations,
  acceptGroupInvitation,
} from "../api/groupApi";
import { fetchAcceptedUsernames } from "../api/sharemanApi";
import GroupCreateForm from "./GroupCreateForm";

interface GroupDialogProps {
  onClose: () => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

export default function GroupDialog({ onClose, onNotify }: GroupDialogProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sharemen, setSharemen] = useState<string[]>([]);
  const [memberUsername, setMemberUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const load = async () => {
    try {
      const [g, inv, s] = await Promise.all([
        fetchGroups(),
        fetchGroupInvitations(),
        fetchAcceptedUsernames(),
      ]);
      setGroups(g);
      setInvitations(inv);
      setSharemen(s);
    } catch {
      setError("共有グループ一覧を読み込めなかったよ");
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

  const handleCreate = async (name: string, icon: string) => {
    setCreating(true);
    setError(null);
    try {
      const g = await createGroup(name, icon);
      await load();
      setSelectedGroup(g);
      await loadMembers(g.id);
      onNotify("共有グループを作成したよ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗したよ");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("本当にこの共有グループを削除する？")) return;
    try {
      await deleteGroup(id);
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
        setMembers([]);
      }
      await load();
      onNotify("共有グループを削除したよ");
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
      onNotify("メンバーを招待したよ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "招待に失敗したよ");
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

  const handleAccept = async (groupId: number) => {
    setAccepting(groupId);
    try {
      await acceptGroupInvitation(groupId);
      await load();
      onNotify("共有グループに参加したよ");
    } catch (e) {
      setError(e instanceof Error ? e.message : "承諾に失敗したよ");
    } finally {
      setAccepting(null);
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
          <h2>共有グループ管理</h2>
          <button className="close-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="dialog-body" style={{ gap: "16px" }}>
          {error && <div className="dialog-error">{error}</div>}

          {/* 招待（自分が招待されたもの） */}
          {invitations.length > 0 && (
            <div className="settings-section">
              <div className="settings-section-title">
                <UserPlus size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                共有グループ招待
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {invitations.map((g) => (
                  <div key={g.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", background: "var(--color-surface2)",
                    borderRadius: "6px",
                  }}>
                    <span style={{ fontSize: "0.85rem" }}>
                      {g.name}<span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginLeft: "6px" }}>by {g.ownerUsername}</span>
                    </span>
                    <button
                      className="save-btn"
                      style={{ padding: "4px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                      disabled={accepting === g.id}
                      onClick={() => handleAccept(g.id)}
                    >
                      <Check size={14} />
                      {accepting === g.id ? "..." : "承諾"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <GroupCreateForm onCreate={handleCreate} creating={creating} />

          {/* グループ一覧 */}
          <div className="settings-section">
            <div className="settings-section-title">共有グループ一覧</div>
            {groups.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                まだ共有グループがないよ
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
                    <span style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      {g.iconData && <img src={g.iconData} alt="" style={{ width: "20px", height: "20px", borderRadius: "3px", objectFit: "cover" }} />}
                      {g.name}
                    </span>
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
                      title="共有グループを削除"
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

              {/* メンバー招待 */}
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
                    招待
                  </button>
                </div>
              )}

              {members.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  メンバーがいないよ。シェアメンを招待しよう！
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
                        opacity: m.status === "INVITED" ? 0.5 : 1,
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
                        {m.status === "INVITED" && (
                          <span style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-muted)",
                            marginLeft: "6px",
                          }}>
                            （招待中）
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
