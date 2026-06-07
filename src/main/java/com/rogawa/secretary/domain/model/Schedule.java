package com.rogawa.secretary.domain.model;

import java.time.LocalDateTime;
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
    }
}
