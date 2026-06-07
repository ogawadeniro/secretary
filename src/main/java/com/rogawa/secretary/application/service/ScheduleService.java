package com.rogawa.secretary.application.service;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService implements ScheduleUseCase {

    private final ScheduleRepository scheduleRepository;
    private final CalendarShareRepository calendarShareRepository;

    public ScheduleService(
            ScheduleRepository scheduleRepository,
            CalendarShareRepository calendarShareRepository) {
        this.scheduleRepository = scheduleRepository;
        this.calendarShareRepository = calendarShareRepository;
    }

    @Override
    public List<Schedule> getSchedules(String owner) {
        // 自分の予定（公開・非公開含む全て）
        List<Schedule> ownSchedules = scheduleRepository.findByOwner(owner);
        // 共有ユーザーの予定（shared=true のみ）
        List<String> sharedOwners = calendarShareRepository.findSharedOwnerUsernames(owner);
        List<Schedule> sharedSchedules = scheduleRepository.findByOwnersShared(sharedOwners);

        // マージして開始日時順にソート
        List<Schedule> all = new ArrayList<>(ownSchedules);
        all.addAll(sharedSchedules);
        all.sort(Comparator.comparing(Schedule::getStartDatetime));
        return all;
    }

    @Override
    public Schedule getSchedule(Long id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new ScheduleNotFoundException("予定が存在しません。"));
    }

    @Override
    @Transactional
    public Schedule createSchedule(Schedule schedule, String owner) {
        schedule.setOwner(owner);
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
        if (requestBody.getDescription() != null) {
            schedule.setDescription(requestBody.getDescription());
        }
        if (requestBody.getShared() != null) {
            schedule.setShared(requestBody.getShared());
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
