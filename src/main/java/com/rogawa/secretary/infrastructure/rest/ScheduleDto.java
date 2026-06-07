package com.rogawa.secretary.infrastructure.rest;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.rogawa.secretary.domain.model.Schedule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class ScheduleDto {

    private Long id;

    @NotBlank
    private String title;

    @NotNull
    private Boolean isAllDay;

    @JsonFormat(pattern = "yyyy/MM/dd-HH:mm")
    private LocalDateTime startDatetime;

    @JsonFormat(pattern = "yyyy/MM/dd-HH:mm")
    private LocalDateTime endDatetime;

    private String owner;

    @NotNull
    private String description;

    @JsonFormat(pattern = "yyyy/MM/dd-HH:mm:ss")
    private LocalDateTime updateTime;

    /** 他のユーザーと共有するかどうか（デフォルト true） */
    private Boolean shared = true;

    /** オーナーのチップ背景色 */
    private String ownerChipBgColor;

    /** メンバーのユーザー名一覧 */
    private List<String> memberUsernames;

    public static ScheduleDto fromDomain(Schedule schedule) {
        ScheduleDto dto = new ScheduleDto();
        dto.setId(schedule.getId());
        dto.setTitle(schedule.getTitle());
        dto.setIsAllDay(schedule.getIsAllDay());
        dto.setStartDatetime(schedule.getStartDatetime());
        dto.setEndDatetime(schedule.getEndDatetime());
        dto.setOwner(schedule.getOwner());
        dto.setDescription(schedule.getDescription());
        dto.setUpdateTime(schedule.getUpdateTime());
        dto.setShared(schedule.getShared());
        dto.setOwnerChipBgColor(schedule.getOwnerChipBgColor());
        dto.setMemberUsernames(schedule.getMemberUsernames());
        return dto;
    }

    public Schedule toDomain() {
        Schedule schedule = new Schedule();
        schedule.setId(this.id);
        schedule.setTitle(this.title);
        schedule.setIsAllDay(this.isAllDay);
        schedule.setStartDatetime(this.startDatetime);
        schedule.setEndDatetime(this.endDatetime);
        schedule.setOwner(this.owner);
        schedule.setDescription(this.description);
        schedule.setUpdateTime(this.updateTime);
        schedule.setShared(this.shared);
        return schedule;
    }
}
