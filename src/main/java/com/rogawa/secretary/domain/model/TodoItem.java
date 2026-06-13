package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class TodoItem {
    private Long id;
    private String title;
    private String description;
    private String owner;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** 締め切り（null=期限なし） */
    private LocalDateTime deadline;

    /** 所属グループID一覧（空=個人のやること） */
    private List<Long> groupIds = new ArrayList<>();

    /** オーナーの表示名（API応答用、永続化しない） */
    private String ownerDisplayName;

    /** メンバーのユーザー名一覧（API応答用、永続化しない） */
    private List<String> memberUsernames;

    /** メンバーごとのチップ背景色（API応答用、永続化しない） */
    private Map<String, String> memberChipBgColors;

    /** メンバーごとの表示名（API応答用、永続化しない） */
    private Map<String, String> memberDisplayNames;

    /** 現在のユーザーが編集可能か（API応答用、永続化しない） */
    private Boolean canEdit;
}
