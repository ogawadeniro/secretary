import { useState, useEffect, useMemo } from "react";
import { X, Trash2 } from "lucide-react";
import type { CalendarShare } from "../types/share";
import { fetchMyShares, fetchIncomingShares, createShare, deleteShare } from "../api/shareApi";

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
  const [myShares, setMyShares] = useState<CalendarShare[]>([]);
  const [incomingShares, setIncomingShares] = useState<CalendarShare[]>([]);
  const [username, setUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    onError?.(msg);
  };

  const loadShares = async () => {
    try {
      const [my, incoming] = await Promise.all([
        fetchMyShares(),
        fetchIncomingShares(),
      ]);
      setMyShares(my);
      setIncomingShares(incoming);
    } catch {
      showError("共有設定の読み込みに失敗したよ");
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  /** 相互共有（自分→相手 かつ 相手→自分 の両方が存在） */
  const mutualUsernames = useMemo(() => {
    const myTargets = new Set(myShares.map((s) => s.sharedWithUsername));
    const incomingOwners = new Set(incomingShares.map((s) => s.ownerUsername));
    const mutual = new Set<string>();
    for (const u of myTargets) {
      if (incomingOwners.has(u)) mutual.add(u);
    }
    return mutual;
  }, [myShares, incomingShares]);

  /** 相互共有でない自分→相手のみの一覧 */
  const outgoingOnly = useMemo(
    () => myShares.filter((s) => !mutualUsernames.has(s.sharedWithUsername)),
    [myShares, mutualUsernames],
  );

  /** 相互共有でない相手→自分のみの一覧 */
  const incomingOnly = useMemo(
    () => incomingShares.filter((s) => !mutualUsernames.has(s.ownerUsername)),
    [incomingShares, mutualUsernames],
  );

  /** 相互共有の詳細情報（myShares 側のエントリを使う） */
  const mutualShares = useMemo(
    () => myShares.filter((s) => mutualUsernames.has(s.sharedWithUsername)),
    [myShares, mutualUsernames],
  );

  const handleAdd = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      await createShare(trimmed);
      setUsername("");
      await loadShares();
      onNotify("カレンダーを共有したよ");
    } catch (e) {
      showError(e instanceof Error ? e.message : "共有の追加に失敗したよ");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: number) => {
    setError(null);
    try {
      await deleteShare(id);
      await loadShares();
      onNotify("共有を解除したよ");
    } catch {
      showError("共有の解除に失敗したよ");
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
          <h2>カレンダー共有</h2>
          <button className="close-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="dialog-body" style={{ gap: "16px" }}>
          {error && <div className="dialog-error">{error}</div>}

          {/* 共有追加 */}
          <div className="settings-section">
            <div className="settings-section-title">共有を追加</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="共有するユーザー名を入力..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
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
                disabled={adding || !username.trim()}
                onClick={handleAdd}
              >
                {adding ? "追加中..." : "追加"}
              </button>
            </div>
          </div>

          {/* 相互共有している相手 */}
          {mutualShares.length > 0 && (
            <div className="settings-section">
              <div className="settings-section-title">相互共有している相手</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {mutualShares.map((share) => (
                  <div
                    key={share.id}
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
                      {formatDisplay(share.sharedWithDisplayName, share.sharedWithUsername)}
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
                      onClick={() => handleRemove(share.id)}
                      title="共有を解除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 共有している相手（相互以外） */}
          {outgoingOnly.length > 0 && (
            <div className="settings-section">
              <div className="settings-section-title">共有している相手</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {outgoingOnly.map((share) => (
                  <div
                    key={share.id}
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
                      {formatDisplay(share.sharedWithDisplayName, share.sharedWithUsername)}
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
                      onClick={() => handleRemove(share.id)}
                      title="共有を解除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myShares.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              まだ誰とも共有していないよ
            </p>
          )}

          {/* 共有してくれている相手（相互以外） */}
          <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <div className="settings-section-title">共有してくれている相手</div>
            {incomingShares.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                まだ誰も共有してくれていないよ
              </p>
            ) : incomingOnly.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                共有してくれている相手はいないよ
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {incomingOnly.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--color-surface2)",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                    }}
                  >
                    {formatDisplay(share.ownerDisplayName, share.ownerUsername)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
