/** シェアメン招待 */
export interface Shareman {
  id: number;
  inviterUsername: string;
  inviteeUsername: string;
  inviterDisplayName: string | null;
  inviteeDisplayName: string | null;
  status: "PENDING" | "ACCEPTED";
  createdAt: string;
}

/** グループ */
export interface Group {
  id: number;
  name: string;
  ownerUsername: string;
  createdAt: string;
}

/** グループメンバー */
export interface GroupMember {
  id: number;
  groupId: number;
  username: string;
  displayName: string | null;
  role: "OWNER" | "MEMBER";
  createdAt: string;
}
