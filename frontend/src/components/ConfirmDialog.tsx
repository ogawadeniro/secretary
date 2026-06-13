interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "うん",
  cancelLabel = "やめる",
}: ConfirmDialogProps) {
  return (
    <div className="dialog-overlay dialog-overlay-center" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn-yes" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="confirm-btn-no" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
