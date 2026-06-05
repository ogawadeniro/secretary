package com.rogawa.secretary.application.service;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService implements ScheduleUseCase {

    private final ScheduleRepository scheduleRepository;

    public ScheduleService(ScheduleRepository scheduleRepository) {
        this.scheduleRepository = scheduleRepository;
    }

    @Override
    public List<Schedule> getSchedules() {
        return scheduleRepository.findAll();
    }

    @Override
    public Schedule getSchedule(Long id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new ScheduleNotFoundException("予定が存在しません。"));
    }

    @Override
    @Transactional
    public Schedule createSchedule(Schedule schedule) {
        schedule.setUpdateTime(LocalDateTime.now());
        return scheduleRepository.save(schedule);
    }

    @Override
    @Transactional
    public Schedule updateSchedule(Long id, Schedule requestBody) {
        Schedule schedule = getSchedule(id);

        if (requestBody.getTitle() != null) {
            schedule.setTitle(requestBody.getTitle());
        }
        if (requestBody.getIsAllDay() != null) {
            schedule.setIsAllDay(requestBody.getIsAllDay());
        }
        if (requestBody.getStartDatetime() != null) {
            schedule.setStartDatetime(requestBody.getStartDatetime());
        }
        if (requestBody.getEndDatetime() != null) {
            schedule.setEndDatetime(requestBody.getEndDatetime());
        }
        if (requestBody.getOwner() != null) {
            schedule.setOwner(requestBody.getOwner());
        }
        if (requestBody.getDescription() != null) {
            schedule.setDescription(requestBody.getDescription());
        }

        schedule.setUpdateTime(LocalDateTime.now());
        return scheduleRepository.save(schedule);
    }

    @Override
    @Transactional
    public void deleteSchedule(Long id) {
        getSchedule(id);
        scheduleRepository.deleteById(id);
    }
}
