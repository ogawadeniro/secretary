package com.rogawa.secretary.infrastructure.rest.dto;

import com.rogawa.secretary.domain.model.ScheduleMember;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MemberResponse {
    private Long id;
    private Long scheduleId;
    private String username;
    private LocalDateTime createdAt;

    public static MemberResponse fromDomain(ScheduleMember member) {
        MemberResponse res = new MemberResponse();
        res.setId(member.getId());
        res.setScheduleId(member.getScheduleId());
        res.setUsername(member.getUsername());
        res.setCreatedAt(member.getCreatedAt());
        return res;
    }
}
