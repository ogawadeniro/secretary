package com.rogawa.secretary.application.service;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.exception.ScheduleAuthorizationException;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.model.ScheduleMember;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import com.rogawa.secretary.domain.repository.ScheduleMemberRepository;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService implements ScheduleUseCase {

    private final ScheduleRepository scheduleRepository;
    private final CalendarShareRepository calendarShareRepository;
    private final UserSettingRepository userSettingRepository;
    private final ScheduleMemberRepository scheduleMemberRepository;

    public ScheduleService(
            ScheduleRepository scheduleRepository,
            CalendarShareRepository calendarShareRepository,
            UserSettingRepository userSettingRepository,
            ScheduleMemberRepository scheduleMemberRepository) {
        this.scheduleRepository = scheduleRepository;
        this.calendarShareRepository = calendarShareRepository;
        this.userSettingRepository = userSettingRepository;
        this.scheduleMemberRepository = scheduleMemberRepository;
    }

    @Override
    public List<Schedule> getSchedules(String owner) {
        // 自分の予定（公開・非公開含む全て）
        List<Schedule> ownSchedules = scheduleRepository.findByOwner(owner);
        // 共有ユーザーの予定（shared=true のみ）
        List<String> sharedOwners = calendarShareRepository.findSharedOwnerUsernames(owner);
        List<Schedule> sharedSchedules = scheduleRepository.findByOwnersShared(sharedOwners);
        // メンバーとして参加している予定
        List<Long> memberScheduleIds = scheduleMemberRepository.findScheduleIdsByUsername(owner);
        List<Schedule> memberSchedules = scheduleRepository.findByIds(memberScheduleIds);

        // マージして開始日時順にソート
        Set<Long> seen = new java.util.HashSet<>();
        List<Schedule> all = new ArrayList<>();
        for (Schedule s : ownSchedules) { all.add(s); seen.add(s.getId()); }
        for (Schedule s : sharedSchedules) { if (!seen.contains(s.getId())) { all.add(s); seen.add(s.getId()); } }
        for (Schedule s : memberSchedules) { if (!seen.contains(s.getId())) { all.add(s); seen.add(s.getId()); } }
        all.sort(Comparator.comparing(Schedule::getStartDatetime));

        // オーナーのチップ背景色とメンバー情報を設定
        Map<String, String> ownerChipColors = buildOwnerChipColorMap(all);
        Map<Long, List<String>> memberUsernamesMap = buildMemberUsernamesMap(all);
        for (Schedule s : all) {
            String color = ownerChipColors.get(s.getOwner());
            if (color != null) {
                s.setOwnerChipBgColor(color);
            }
            s.setMemberUsernames(memberUsernamesMap.getOrDefault(s.getId(), List.of()));
        }

        return all;
    }

    /** 予定リストに含まれる全スケジュールのメンバー情報をまとめて取得 */
    private Map<Long, List<String>> buildMemberUsernamesMap(List<Schedule> schedules) {
        List<Long> ids = schedules.stream().map(Schedule::getId).collect(Collectors.toList());
        Map<Long, List<String>> map = new HashMap<>();
        scheduleMemberRepository.findByScheduleIdIn(ids)
                .forEach(m -> {
                    List<String> list = map.computeIfAbsent(m.getScheduleId(), k -> new ArrayList<>());
                    list.add(m.getUsername());
                });
        return map;
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
        if (!canEditSchedule(schedule, owner)) {
            throw new ScheduleAuthorizationException("この予定を編集する権限がありません");
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
        if (!canEditSchedule(schedule, owner)) {
            throw new ScheduleAuthorizationException("この予定を削除する権限がありません");
        }
        scheduleRepository.deleteById(id);
    }

    private boolean canEditSchedule(Schedule schedule, String username) {
        if (schedule.getOwner().equals(username)) {
            return true;
        }
        return scheduleMemberRepository.findByScheduleId(schedule.getId())
                .stream()
                .anyMatch(m -> m.getUsername().equals(username));
    }

    @Override
    public List<ScheduleMember> getScheduleMembers(Long scheduleId) {
        return scheduleMemberRepository.findByScheduleId(scheduleId);
    }

    @Override
    @Transactional
    public ScheduleMember addScheduleMember(Long scheduleId, String memberUsername, String owner) {
        Schedule schedule = getSchedule(scheduleId);
        if (!schedule.getOwner().equals(owner)) {
            throw new ScheduleAuthorizationException("メンバーを追加できるのは予定のオーナーのみです");
        }
        if (memberUsername.equals(owner)) {
            throw new IllegalArgumentException("オーナー自身をメンバーに追加できません");
        }
        ScheduleMember member = new ScheduleMember();
        member.setScheduleId(scheduleId);
        member.setUsername(memberUsername);
        member.setCreatedAt(LocalDateTime.now());
        return scheduleMemberRepository.save(member);
    }

    @Override
    @Transactional
    public void removeScheduleMember(Long scheduleId, String memberUsername, String owner) {
        Schedule schedule = getSchedule(scheduleId);
        if (!schedule.getOwner().equals(owner)) {
            throw new ScheduleAuthorizationException("メンバーを削除できるのは予定のオーナーのみです");
        }
        scheduleMemberRepository.deleteByScheduleIdAndUsername(scheduleId, memberUsername);
    }
}
