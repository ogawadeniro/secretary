import { useState, useEffect, useMemo } from "react";
import { X, Trash2, Check } from "lucide-react";
import type { Shareman } from "../types/group";
import {
  fetchMySharemen,
  fetchIncomingSharemen,
  inviteShareman,
  acceptShareman,
  removeShareman,
} from "../api/sharemanApi";
import ShareInviteForm from "./ShareInviteForm";

interface ShareDialogProps {
  onClose: () => void;
  onError?: (msg: string) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

/** 表示名を「表示名<ユーザ名>」形式に整形 */
function formatDisplay(name: string | undefined | null, username: string): string {
  if (name && name !== username) {
    return `${name}<${username}>`;
  }
  return username;
}

export default function ShareDialog({ onClose, onError, onNotify }: ShareDialogProps) {
  const [myInvitations, setMyInvitations] = useState<Shareman[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<Shareman[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    onError?.(msg);
  };

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  /** 承諾済み（自分→相手） */
  const acceptedOutgoing = useMemo(
    () => myInvitations.filter((s) => s.status === "ACCEPTED"),
    [myInvitations],
  );

  /** 保留中（自分→相手） */
  const pendingOutgoing = useMemo(
    () => myInvitations.filter((s) => s.status === "PENDING"),
    [myInvitations],
  );

  /** 保留中（相手→自分） */
  const pendingIncoming = useMemo(
    () => incomingInvitations.filter((s) => s.status === "PENDING"),
    [incomingInvitations],
  );

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

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const sharemanItem = (
    shareman: Shareman,
    actions?: React.ReactNode,
  ) => (
    <div
      key={shareman.id}
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
    <div className="dialog-overlay" onClick={handleClose}>
      <div className={`dialog${closing ? " closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>シェアメン管理</h2>
          <button className="close-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="dialog-body" style={{ gap: "16px" }}>
          {error && <div className="dialog-error">{error}</div>}

          <ShareInviteForm onInvite={handleInvite} adding={adding} />

          {/* 承認済みシェアメン */}
          {acceptedOutgoing.length > 0 && (
            <div className="settings-section">
              <div className="settings-section-title">シェアメン</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {acceptedOutgoing.map((s) =>
                  sharemanItem(s, (
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

          {/* 送信した招待（保留中） */}
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

          {/* 受信した招待 */}
          {pendingIncoming.length > 0 && (
            <div className="settings-section">
              <div className="settings-section-title">受信した招待</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {pendingIncoming.map((s) =>
                  sharemanItem(s, (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        className="icon-btn"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-accent)",
                          padding: "4px",
                          display: "flex",
                        }}
                        onClick={() => handleAccept(s.id)}
                        title="承諾"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-sun)",
                          padding: "4px",
                          display: "flex",
                        }}
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
        </div>
      </div>
    </div>
  );
}
