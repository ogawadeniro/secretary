import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import type { CalendarShare } from "../types/share";
import { fetchMyShares, fetchIncomingShares, createShare, deleteShare } from "../api/shareApi";

interface ShareDialogProps {
  onClose: () => void;
  onError?: (msg: string) => void;
}

export default function ShareDialog({ onClose, onError }: ShareDialogProps) {
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
      showError("共有設定の読み込みに失敗しました");
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  const handleAdd = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      await createShare(trimmed);
      setUsername("");
      await loadShares();
    } catch (e) {
      showError(e instanceof Error ? e.message : "共有の追加に失敗しました");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: number) => {
    setError(null);
    try {
      await deleteShare(id);
      await loadShares();
    } catch {
      showError("共有の解除に失敗しました");
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

          {/* 共有している相手 */}
          <div className="settings-section">
            <div className="settings-section-title">共有している相手</div>
            {myShares.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                まだ誰とも共有していません
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {myShares.map((share) => (
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
                    <span style={{ fontSize: "0.85rem" }}>@{share.sharedWithUsername}</span>
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
            )}
          </div>

          {/* 共有してくれている相手 */}
          <div className="settings-section" style={{ borderBottom: "none", paddingBottom: 0 }}>
            <div className="settings-section-title">共有してくれている相手</div>
            {incomingShares.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                まだ誰も共有してくれていません
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {incomingShares.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--color-surface2)",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                    }}
                  >
                    @{share.ownerUsername}
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
