/** ユーザー設定 */
export interface UserSettings {
  id?: number | null;
  username?: string;
  displayName?: string;
  chipBgColor: string;
  firstDayOfWeek: number;
}
