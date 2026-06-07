package com.rogawa.secretary.application.port;

import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.model.ScheduleMember;
import java.util.List;

public interface ScheduleUseCase {
    List<Schedule> getSchedules(String owner);

    Schedule getSchedule(Long id);

    Schedule createSchedule(Schedule schedule, String owner);

    Schedule updateSchedule(Long id, Schedule requestBody, String owner);

    void deleteSchedule(Long id, String owner);

    List<ScheduleMember> getScheduleMembers(Long scheduleId);

    ScheduleMember addScheduleMember(Long scheduleId, String memberUsername, String owner);

    void removeScheduleMember(Long scheduleId, String memberUsername, String owner);
}
