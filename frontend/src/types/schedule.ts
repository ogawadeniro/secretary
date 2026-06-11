/** 予定データ（REST APIのScheduleDtoに対応） */
export interface Schedule {
  id: number | null;
  title: string;
  isAllDay: boolean;
  startDatetime: string;   // 形式: yyyy/MM/dd-HH:mm
  endDatetime: string;     // 形式: yyyy/MM/dd-HH:mm
  owner: string;
  description: string;
  /** 他のユーザーと共有するかどうか（デフォルト true） */
  shared: boolean;
  /** 作成/更新日時（サーバー側で自動設定、新規作成時は省略可） */
  updateTime?: string;     // 形式: yyyy/MM/dd-HH:mm:ss
  /** オーナーのチップ背景色（API応答用） */
  ownerChipBgColor?: string;
  /** オーナーの表示名（API応答用） */
  ownerDisplayName?: string;
  /** メンバーのユーザー名一覧 */
  memberUsernames?: string[];
  /** メンバーごとのチップ背景色（username → hexColor） */
  memberChipBgColors?: Record<string, string>;
  /** メンバーごとの表示名（username → displayName） */
  memberDisplayNames?: Record<string, string>;
  /** グループID一覧（グループ予定の場合のみ設定） */
  groupIds?: number[];
  /** 現在のユーザーが編集可能か */
  canEdit?: boolean;
}

/** メンバーデータ（GET/POST /api/v1/schedules/{id}/members のレスポンス） */
export interface ScheduleMember {
  id: number;
  scheduleId: number;
  username: string;
  createdAt: string;
}
