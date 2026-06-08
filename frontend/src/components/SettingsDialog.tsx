import { useState } from "react";
import type { UserSettings } from "../types/settings";
import { saveSettings, resetSettings } from "../api/settingsApi";
import { textColorFromBg, dayOfWeekLabel, CHIP_COLORS } from "../utils/colorUtils";

interface SettingsDialogProps {
  settings: UserSettings;
  onClose: () => void;
  onSaved: (settings: UserSettings) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}

/** 設定ダイアログ */
export default function SettingsDialog({
  settings: initial,
  onClose,
  onSaved,
  onNotify,
}: SettingsDialogProps) {
  const [chipBgColor, setChipBgColor] = useState(initial.chipBgColor);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(initial.firstDayOfWeek);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
      });
      onSaved(saved);
      onNotify("設定を保存したよ");
      handleClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setShowResetConfirm(false);
    try {
      const saved = await resetSettings();
      setChipBgColor(saved.chipBgColor);
      setFirstDayOfWeek(saved.firstDayOfWeek);
      onSaved(saved);
      onNotify("設定をデフォルトに戻したよ");
      handleClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
          </div>

          <div className="form-actions">
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
            <button className="cancel-btn" onClick={handleClose}>
              キャンセル
            </button>
          </div>

          <section className="settings-section">
            <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
              <button className="reset-btn" onClick={() => setShowResetConfirm(true)} disabled={saving} style={{ width: "70%" }}>
                デフォルトに戻す
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>

      {showResetConfirm && (
        <div className="dialog-overlay dialog-overlay-center" onClick={() => setShowResetConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>設定をデフォルトに戻してもいいですか？</p>
            <div className="confirm-actions">
              <button className="confirm-btn-yes" onClick={handleReset}>うん</button>
              <button className="confirm-btn-no" onClick={() => setShowResetConfirm(false)}>やめる</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
