package com.rogawa.secretary.application.port;

import com.rogawa.secretary.domain.model.Schedule;
import java.util.List;

public interface ScheduleUseCase {
    List<Schedule> getSchedules();

    Schedule getSchedule(Long id);

    Schedule createSchedule(Schedule schedule);

    Schedule updateSchedule(Long id, Schedule requestBody);

    void deleteSchedule(Long id);
}
