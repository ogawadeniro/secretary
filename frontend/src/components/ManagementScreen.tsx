import { useState, useEffect, useCallback } from "react";
import { X, Trash2, Check, UserPlus, Users, Share2, ArrowLeft } from "lucide-react";
import type { Shareman } from "../types/group";
import type { Group, GroupMember } from "../types/group";
import {
  fetchMySharemen,
  fetchIncomingSharemen,
  inviteShareman,
  acceptShareman,
  removeShareman,
} from "../api/sharemanApi";
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
import ShareInviteForm from "./ShareInviteForm";
import GroupCreateForm from "./GroupCreateForm";

interface ManagementScreenProps {
  onNavigateToCalendar: () => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

/** 表示名を「表示名<ユーザ名>」形式に整形 */
function formatDisplay(name: string | undefined | null, username: string): string {
  if (name && name !== username) {
    return `${name}<${username}>`;
  }
  return username;
}

type MgmtTab = "sharemen" | "groups";

export default function ManagementScreen({ onNavigateToCalendar, onNotify }: ManagementScreenProps) {
  const [activeTab, setActiveTab] = useState<MgmtTab>("sharemen");

  return (
    <div className="management-screen">
      <div className="management-header">
        <button className="icon-btn" onClick={onNavigateToCalendar} title="カレンダーに戻る">
          <ArrowLeft size={20} />
        </button>
        <h1>管理</h1>
        <div style={{ width: "36px" }} />
      </div>

      <div className="management-tabs">
        <button
          className={`management-tab${activeTab === "sharemen" ? " active" : ""}`}
          onClick={() => setActiveTab("sharemen")}
        >
          <Share2 size={16} />
          <span>シェアメン</span>
        </button>
        <button
          className={`management-tab${activeTab === "groups" ? " active" : ""}`}
          onClick={() => setActiveTab("groups")}
        >
          <Users size={16} />
          <span>共有グループ</span>
        </button>
      </div>

      <div className="management-body">
        {activeTab === "sharemen" ? (
          <SharemenPanel onNotify={onNotify} />
        ) : (
          <GroupsPanel onNotify={onNotify} />
        )}
      </div>
    </div>
  );
}

/* ────────── シェアメンパネル ────────── */

function SharemenPanel({ onNotify }: { onNotify: ManagementScreenProps["onNotify"] }) {
  const [myInvitations, setMyInvitations] = useState<Shareman[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<Shareman[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = (msg: string) => setError(msg);

  const load = useCallback(async () => {
    try {
      const [my, incoming] = await Promise.all([
        fetchMySharemen(),
        fetchIncomingSharemen(),
      ]);
      setMyInvitations(my);
      setIncomingInvitations(incoming);
    } catch {
      showError("シェアメン一覧を読み込めなかったよ");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const acceptedOutgoing = myInvitations.filter((s) => s.status === "ACCEPTED");
  const pendingOutgoing = myInvitations.filter((s) => s.status === "PENDING");
  const pendingIncoming = incomingInvitations.filter((s) => s.status === "PENDING");

  const handleInvite = async (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      await inviteShareman(trimmed);
      await load();
      onNotify("招待を送信したよ");
    } catch (e) {
      showError(e instanceof Error ? e.message : "招待に失敗したよ");
    } finally {
      setAdding(false);
    }
  };

  const handleAccept = async (id: number) => {
    setError(null);
    try {
      await acceptShareman(id);
      await load();
      onNotify("シェアメンを承諾したよ");
    } catch {
      showError("承諾に失敗したよ");
    }
  };

  const handleRemove = async (id: number) => {
    setError(null);
    try {
      await removeShareman(id);
      await load();
      onNotify("削除したよ");
    } catch {
      showError("削除に失敗したよ");
    }
  };

  const sharemanItem = (shareman: Shareman, actions?: React.ReactNode) => (
    <div
      key={shareman.id}
      className="management-list-item"
    >
      <span style={{ fontSize: "0.85rem" }}>
        {formatDisplay(
          shareman.inviterUsername === shareman.inviteeUsername
            ? shareman.inviteeDisplayName
            : shareman.inviteeDisplayName ?? shareman.inviterDisplayName,
          shareman.inviterUsername === shareman.inviteeUsername
            ? shareman.inviteeUsername
            : shareman.inviteeUsername ?? shareman.inviterUsername,
        )}
      </span>
      {actions}
    </div>
  );

  return (
    <>
      {error && <div className="dialog-error">{error}</div>}

      <ShareInviteForm onInvite={handleInvite} adding={adding} />

      {acceptedOutgoing.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">シェアメン</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {acceptedOutgoing.map((s) =>
              sharemanItem(s, (
                <button
                  className="icon-btn"
                  style={{ color: "var(--color-sun)", padding: "4px", display: "flex" }}
                  onClick={() => handleRemove(s.id)}
                  title="削除"
                >
                  <Trash2 size={16} />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {pendingOutgoing.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">送信した招待（承認待ち）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {pendingOutgoing.map((s) =>
              sharemanItem(s, (
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  承認待ち
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {pendingIncoming.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">受信した招待</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {pendingIncoming.map((s) =>
              sharemanItem(s, (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="icon-btn"
                    style={{ color: "var(--color-accent)", padding: "4px", display: "flex" }}
                    onClick={() => handleAccept(s.id)}
                    title="承諾"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ color: "var(--color-sun)", padding: "4px", display: "flex" }}
                    onClick={() => handleRemove(s.id)}
                    title="拒否"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {myInvitations.length === 0 && incomingInvitations.length === 0 && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
          まだシェアメンがいないよ。ユーザー名を入力して招待しよう！
        </p>
      )}
    </>
  );
}

/* ────────── 共有グループパネル ────────── */

function GroupsPanel({ onNotify }: { onNotify: ManagementScreenProps["onNotify"] }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sharemen, setSharemen] = useState<string[]>([]);
  const [memberUsername, setMemberUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { load(); }, []);

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

  const availableSharemen = sharemen.filter(
    (u) => !members.some((m) => m.username === u),
  );

  return (
    <>
      {error && <div className="dialog-error">{error}</div>}

      {invitations.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">
            <UserPlus size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            共有グループ招待
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {invitations.map((g) => (
              <div key={g.id} className="management-list-item">
                <span style={{ fontSize: "0.85rem" }}>
                  {g.name}
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginLeft: "6px" }}>
                    招待者: {g.ownerUsername}
                  </span>
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
                className={`management-list-item${selectedGroup?.id === g.id ? " selected" : ""}`}
                onClick={() => selectGroup(g)}
              >
                <span style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  {g.iconData && <img src={g.iconData} alt="" style={{ width: "20px", height: "20px", borderRadius: "3px", objectFit: "cover" }} />}
                  {g.name}
                </span>
                <button
                  className="icon-btn"
                  style={{ color: "var(--color-sun)", padding: "4px", display: "flex" }}
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

      {selectedGroup && (
        <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div className="settings-section-title">
            {selectedGroup.name} のメンバー
          </div>

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
                <div key={m.id} className="management-list-item" style={{ opacity: m.status === "INVITED" ? 0.5 : 1 }}>
                  <span style={{ fontSize: "0.85rem" }}>
                    {m.displayName ? `${m.displayName}<${m.username}>` : m.username}
                    {m.role === "OWNER" && (
                      <span style={{ fontSize: "0.7rem", color: "var(--color-accent)", marginLeft: "6px" }}>
                        オーナー
                      </span>
                    )}
                    {m.status === "INVITED" && (
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginLeft: "6px" }}>
                        （招待中）
                      </span>
                    )}
                  </span>
                  {m.role !== "OWNER" && (
                    <button
                      className="icon-btn"
                      style={{ color: "var(--color-sun)", padding: "4px", display: "flex" }}
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
    </>
  );
}
