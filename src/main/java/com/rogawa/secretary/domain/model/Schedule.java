package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
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

    /** オーナーのチップ背景色（API応答用、永続化しない） */
    private String ownerChipBgColor;

    /** メンバーのユーザー名一覧（API応答用、永続化しない） */
    private List<String> memberUsernames;

    /** メンバーごとのチップ背景色（API応答用、永続化しない） */
    private Map<String, String> memberChipBgColors;

    public Schedule copy() {
        Schedule s = new Schedule();
        s.setId(this.id);
        s.setTitle(this.title);
        s.setIsAllDay(this.isAllDay);
        s.setStartDatetime(this.startDatetime);
        s.setEndDatetime(this.endDatetime);
        s.setOwner(this.owner);
        s.setDescription(this.description);
        s.setUpdateTime(this.updateTime);
        s.setShared(this.shared);
        s.setOwnerChipBgColor(this.ownerChipBgColor);
        s.setMemberUsernames(this.memberUsernames);
        s.setMemberChipBgColors(this.memberChipBgColors);
        return s;
    }

    public void logWrite() {
        System.out.println("# Schedule properties");
        System.out.println("    id: " + id);
        System.out.println("    title: " + title);
        System.out.println("    isAllDay: " + isAllDay);
        System.out.println("    startDatetime: " + startDatetime);
        System.out.println("    endDatetime: " + endDatetime);
        System.out.println("    owner: " + owner);
        System.out.println("    description: " + description);
        System.out.println("    updateTime: " + updateTime);
        System.out.println("    shared: " + shared);
        System.out.println("    ownerChipBgColor: " + ownerChipBgColor);
        System.out.println("    memberUsernames: " + memberUsernames);
        System.out.println("    memberChipBgColors: " + memberChipBgColors);
    }
}
