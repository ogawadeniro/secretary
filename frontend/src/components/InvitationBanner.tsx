import { useState, useEffect, useCallback } from "react";
import { fetchIncomingSharemen } from "../api/sharemanApi";
import { fetchGroupInvitations } from "../api/groupApi";

interface InvitationBannerProps {
  onNavigateToManagement: (subTab?: "sharemen" | "groups") => void;
}

export default function InvitationBanner({ onNavigateToManagement }: InvitationBannerProps) {
  const [sharemanCount, setSharemanCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);

  const check = useCallback(async () => {
    try {
      const [sharemen, groups] = await Promise.all([
        fetchIncomingSharemen(),
        fetchGroupInvitations(),
      ]);
      setSharemanCount(sharemen.filter((s) => s.status === "PENDING").length);
      setGroupCount(groups.length);
    } catch {
      // 静かに失敗
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  const total = sharemanCount + groupCount;
  if (total === 0) return null;

  let message: string;
  let subTab: "sharemen" | "groups" | undefined;
  if (sharemanCount > 0 && groupCount > 0) {
    message = `${sharemanCount}件 のシェアメン招待、${groupCount}件 のグループ招待が来ているよ`;
    subTab = "sharemen";
  } else if (sharemanCount > 0) {
    message = `${sharemanCount}件 のシェアメン招待が来ているよ`;
    subTab = "sharemen";
  } else {
    message = `${groupCount}件 のグループ招待が来ているよ`;
    subTab = "groups";
  }

  return (
    <div className="invitation-banner" onClick={() => onNavigateToManagement(subTab)}>
      <span>{message}</span>
      <span className="invitation-banner-arrow">›</span>
    </div>
  );
}
