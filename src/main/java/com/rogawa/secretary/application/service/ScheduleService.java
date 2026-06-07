package com.rogawa.secretary.application.service;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.exception.ScheduleAuthorizationException;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService implements ScheduleUseCase {

    private final ScheduleRepository scheduleRepository;
    private final CalendarShareRepository calendarShareRepository;
    private final UserSettingRepository userSettingRepository;

    public ScheduleService(
            ScheduleRepository scheduleRepository,
            CalendarShareRepository calendarShareRepository,
            UserSettingRepository userSettingRepository) {
        this.scheduleRepository = scheduleRepository;
        this.calendarShareRepository = calendarShareRepository;
        this.userSettingRepository = userSettingRepository;
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

        // オーナーのチップ背景色を設定
        Map<String, String> ownerChipColors = buildOwnerChipColorMap(all);
        for (Schedule s : all) {
            String color = ownerChipColors.get(s.getOwner());
            if (color != null) {
                s.setOwnerChipBgColor(color);
            }
        }

        return all;
    }

    /** 予定リストに含まれる全オーナーのチップ背景色をまとめて取得 */
    private Map<String, String> buildOwnerChipColorMap(List<Schedule> schedules) {
        List<String> owners = schedules.stream()
                .map(Schedule::getOwner)
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> map = new HashMap<>();
        for (String username : owners) {
            userSettingRepository.findByUsername(username)
                    .ifPresent(us -> {
                        if (us.getChipBgColor() != null) {
                            map.put(username, us.getChipBgColor());
                        }
                    });
        }
        return map;
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
    public Schedule updateSchedule(Long id, Schedule requestBody, String owner) {
        Schedule schedule = getSchedule(id);
        if (!schedule.getOwner().equals(owner)) {
            throw new ScheduleAuthorizationException("他のユーザーの予定は編集できません");
        }

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
    public void deleteSchedule(Long id, String owner) {
        Schedule schedule = getSchedule(id);
        if (!schedule.getOwner().equals(owner)) {
            throw new ScheduleAuthorizationException("他のユーザーの予定は削除できません");
        }
        scheduleRepository.deleteById(id);
    }
}
