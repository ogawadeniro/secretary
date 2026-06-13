export interface TodoItem {
    id: number;
    title: string;
    description: string;
    owner: string;
    ownerDisplayName?: string;
    createdAt: string;
    updatedAt: string;
    canEdit: boolean;
    groupIds: number[];
    memberUsernames: string[];
    memberDisplayNames?: Record<string, string>;
    memberChipBgColors?: Record<string, string>;
}
