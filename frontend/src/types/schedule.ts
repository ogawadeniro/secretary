export interface Schedule {
  id: number | null;
  title: string;
  isAllDay: boolean;
  startDatetime: string;
  endDatetime: string;
  owner: string;
  description: string;
  updateTime: string;
}
