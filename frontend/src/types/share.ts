/** 共有設定 */
export interface CalendarShare {
  id: number;
  ownerUsername: string;
  sharedWithUsername: string;
  ownerDisplayName?: string;
  sharedWithDisplayName?: string;
  permission: string;
  createdAt: string;
}
