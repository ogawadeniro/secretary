import { useState } from "react";
import type { UserSettings } from "../types/settings";
import { saveSettings, resetSettings } from "../api/settingsApi";
import { textColorFromBg, dayOfWeekLabel, CHIP_COLORS } from "../utils/colorUtils";

interface SettingsDialogProps {
  settings: UserSettings;
  onClose: () => void;
  onSaved: (settings: UserSettings) => void;
}

/** 設定ダイアログ */
export default function SettingsDialog({
  settings: initial,
  onClose,
  onSaved,
}: SettingsDialogProps) {
  const [chipBgColor, setChipBgColor] = useState(initial.chipBgColor);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(initial.firstDayOfWeek);
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSettings({
        chipBgColor,
        firstDayOfWeek,
        displayName: displayName || undefined,
      });
      onSaved(saved);
      handleClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const saved = await resetSettings();
      setChipBgColor(saved.chipBgColor);
      setFirstDayOfWeek(saved.firstDayOfWeek);
      setDisplayName(saved.displayName ?? "");
      onSaved(saved);
      handleClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`dialog-overlay ${closing ? "closing" : ""}`} onClick={handleClose}>
      <div className={`dialog ${closing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>設定</h2>
          <button className="close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>
        <div className="dialog-body">
          <div className="settings-form">

            {/* 色設定 */}
            <section className="settings-section">
              <h3 className="settings-section-title">色設定</h3>
              <label>
                マイカラー
                <div className="chip-color-swatches">
                  {CHIP_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`chip-color-swatch${chipBgColor === color ? " selected" : ""}`}
                      style={{
                        background: color,
                        outline: chipBgColor === color ? `2px solid ${textColorFromBg(color)}` : "none",
                      }}
                      onClick={() => setChipBgColor(color)}
                      title={color}
                    />
                  ))}
                </div>
                <span
                  className="color-preview"
                  style={{
                    background: chipBgColor,
                    color: textColorFromBg(chipBgColor),
                    marginTop: "8px",
                  }}
                >
                  見本テキスト
                </span>
              </label>
            </section>

            {/* 表示設定 */}
            <section className="settings-section">
              <h3 className="settings-section-title">表示設定</h3>
              <label>
                週の開始曜日
                <select
                  value={firstDayOfWeek}
                  onChange={(e) => setFirstDayOfWeek(Number(e.target.value))}
                >
                  {Array.from({ length: 7 }, (_, i) => (
                    <option key={i} value={i}>
                      {dayOfWeekLabel(i)}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            {/* アカウント設定 */}
            <section className="settings-section">
              <h3 className="settings-section-title">アカウント設定</h3>
              <label>
                表示名
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="表示名を入力"
                />
              </label>
            </section>

            {/* リセット */}
            <section className="settings-section">
              <button className="reset-btn" onClick={handleReset} disabled={saving}>
                デフォルトに戻す
              </button>
            </section>
          </div>

          <div className="form-actions">
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
            <button className="cancel-btn" onClick={handleClose}>
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
