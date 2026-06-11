package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class Schedule {
    private Long id;
    private String title;
    private Boolean isAllDay;
    private LocalDateTime startDatetime;
    private LocalDateTime endDatetime;
    private String owner;
    private String description;
    private LocalDateTime updateTime;
    /** 他のユーザーと共有するかどうか（デフォルト true） */
    private Boolean shared = true;

    /** 所属グループID一覧（空=個人予定） */
    private List<Long> groupIds = new ArrayList<>();

    /** オーナーのチップ背景色（API応答用、永続化しない） */
    private String ownerChipBgColor;

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
