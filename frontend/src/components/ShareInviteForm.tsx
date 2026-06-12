import { useState } from "react";

interface ShareInviteFormProps {
  onInvite: (username: string) => Promise<void>;
  adding: boolean;
}

/** シェアメン招待フォーム */
export default function ShareInviteForm({ onInvite, adding }: ShareInviteFormProps) {
  const [username, setUsername] = useState("");

  const handleInvite = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    await onInvite(trimmed);
    setUsername("");
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">シェアメンを招待</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          placeholder="ユーザー名を入力..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
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
          onClick={handleInvite}
        >
          {adding ? "送信中..." : "招待"}
        </button>
      </div>
    </div>
  );
}
