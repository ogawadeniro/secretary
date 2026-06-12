import { useState, useRef } from "react";
import { X, Image as ImageIcon } from "lucide-react";

interface GroupCreateFormProps {
  onCreate: (name: string, icon: string) => Promise<void>;
  creating: boolean;
}

/** 共有グループ作成フォーム（名前＋アイコン画像） */
export default function GroupCreateForm({ onCreate, creating }: GroupCreateFormProps) {
  const [groupName, setGroupName] = useState("");
  const [groupIcon, setGroupIcon] = useState("");
  const iconInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    if (!groupIcon) return;
    await onCreate(trimmed, groupIcon);
    setGroupName("");
    setGroupIcon("");
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">共有グループを作成</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="共有グループ名を入力..."
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
            disabled={creating || !groupName.trim() || !groupIcon}
            onClick={handleCreate}
          >
            {creating ? "作成中..." : "作成"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setGroupIcon(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
          <button
            type="button"
            onClick={() => iconInputRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", background: "var(--color-surface2)",
              border: "1px solid var(--color-border)", borderRadius: "6px",
              color: "var(--color-text)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem",
            }}
          >
            <ImageIcon size={16} />
            {groupIcon ? "画像を変更" : "アイコン画像を選択"}
          </button>
          {groupIcon && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <img src={groupIcon} alt="" style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover" }} />
              <button
                type="button"
                onClick={() => setGroupIcon("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-sun)", padding: "2px", display: "flex" }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
