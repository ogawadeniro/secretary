package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.ScheduleMember;
import java.util.List;

public interface ScheduleMemberRepository {
    List<ScheduleMember> findByScheduleId(Long scheduleId);

    List<ScheduleMember> findByScheduleIdIn(List<Long> scheduleIds);

    List<ScheduleMember> findByUsername(String username);

    List<Long> findScheduleIdsByUsername(String username);

    ScheduleMember save(ScheduleMember member);

    void deleteByScheduleIdAndUsername(Long scheduleId, String username);
}
