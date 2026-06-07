import { useState, useEffect, useRef } from "react";
import { X, Trash2, UserPlus, Search } from "lucide-react";
import type { CalendarShare } from "../types/share";
import type { AuthUser } from "../api/authApi";
import { fetchMyShares, fetchIncomingShares, createShare, deleteShare } from "../api/shareApi";
import { searchUsers } from "../api/userApi";

interface ShareDialogProps {
  onClose: () => void;
  onError?: (msg: string) => void;
}

export default function ShareDialog({ onClose, onError }: ShareDialogProps) {
  const [myShares, setMyShares] = useState<CalendarShare[]>([]);
  const [incomingShares, setIncomingShares] = useState<CalendarShare[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    } catch (e) {
      showError("共有設定の読み込みに失敗しました");
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  // ユーザー検索（debounce 300ms）
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  const handleAdd = async (username: string) => {
    setAdding(true);
    setError(null);
    try {
      await createShare(username);
      setSearchQuery("");
      setSearchResults([]);
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
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="text"
                  placeholder="ユーザー名を入力..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                  }}
                />
                {searching && (
                  <span style={{ position: "absolute", right: 8, top: 8, fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                    検索中...
                  </span>
                )}
              </div>
            </div>
            {searchResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {searchResults.map((u) => {
                  const alreadyShared = myShares.some((s) => s.sharedWithUsername === u.username);
                  return (
                    <div
                      key={u.username}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        background: "var(--color-surface2)",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem" }}>
                        {u.displayName} (@{u.username})
                      </span>
                      <button
                        className="save-btn"
                        style={{
                          padding: "4px 12px",
                          fontSize: "0.75rem",
                          opacity: alreadyShared ? 0.5 : 1,
                        }}
                        disabled={alreadyShared || adding}
                        onClick={() => handleAdd(u.username)}
                      >
                        {alreadyShared ? "共有済み" : "追加"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
