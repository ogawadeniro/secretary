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
  /** メンバーのユーザー名一覧 */
  memberUsernames?: string[];
}
