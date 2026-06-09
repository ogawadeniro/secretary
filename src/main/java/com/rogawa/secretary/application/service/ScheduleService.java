package com.rogawa.secretary.application.service;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.exception.ScheduleAuthorizationException;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.CalendarShare;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.model.ScheduleMember;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import com.rogawa.secretary.domain.repository.ScheduleMemberRepository;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
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
    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;
    private final ScheduleMemberRepository scheduleMemberRepository;

    public ScheduleService(
            ScheduleRepository scheduleRepository,
            CalendarShareRepository calendarShareRepository,
            UserRepository userRepository,
            UserSettingRepository userSettingRepository,
            ScheduleMemberRepository scheduleMemberRepository) {
        this.scheduleRepository = scheduleRepository;
        this.calendarShareRepository = calendarShareRepository;
        this.userRepository = userRepository;
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
        Set<Long> seen = new HashSet<>();
        List<Schedule> all = new ArrayList<>();
        for (Schedule s : ownSchedules) { all.add(s); seen.add(s.getId()); }
        for (Schedule s : sharedSchedules) { if (!seen.contains(s.getId())) { all.add(s); seen.add(s.getId()); } }
        for (Schedule s : memberSchedules) { if (!seen.contains(s.getId())) { all.add(s); seen.add(s.getId()); } }
        all.sort(Comparator.comparing(Schedule::getStartDatetime));

        // オーナーとメンバーのチップ背景色・表示名を収集
        Map<String, String> ownerChipColors = buildOwnerChipColorMap(all);
        Map<String, String> ownerDisplayNames = buildOwnerDisplayNameMap(all);
        Map<Long, List<String>> memberUsernamesMap = buildMemberUsernamesMap(all);
        Map<String, String> memberChipColorMap = buildMemberChipColorMap(all, memberUsernamesMap);
        Map<String, String> memberDisplayNamesMap = buildMemberDisplayNameMap(all, memberUsernamesMap);
        // オーナーも各マップに追加（暗黙のメンバーとして）
        for (Map.Entry<String, String> e : ownerChipColors.entrySet()) {
            memberChipColorMap.putIfAbsent(e.getKey(), e.getValue());
        }
        for (Map.Entry<String, String> e : ownerDisplayNames.entrySet()) {
            memberDisplayNamesMap.putIfAbsent(e.getKey(), e.getValue());
        }
        for (Schedule s : all) {
            String color = ownerChipColors.get(s.getOwner());
            if (color != null) {
                s.setOwnerChipBgColor(color);
            }
            String displayName = ownerDisplayNames.get(s.getOwner());
            if (displayName != null) {
                s.setOwnerDisplayName(displayName);
            }
            // オーナーを暗黙のメンバーとして先頭に追加
            List<String> memberUsernames = memberUsernamesMap.getOrDefault(s.getId(), List.of());
            List<String> usernames = new ArrayList<>();
            usernames.add(s.getOwner());
            usernames.addAll(memberUsernames);
            s.setMemberUsernames(usernames);
            // メンバーごとのチップ背景色と表示名を設定（オーナー含む）
            Map<String, String> colors = new HashMap<>();
            Map<String, String> names = new HashMap<>();
            for (String username : usernames) {
                String c = memberChipColorMap.get(username);
                if (c != null) {
                    colors.put(username, c);
                }
                String n = memberDisplayNamesMap.get(username);
                if (n != null) {
                    names.put(username, n);
                }
            }
            s.setMemberChipBgColors(colors);
            s.setMemberDisplayNames(names);
            s.setCanEdit(canEditSchedule(s, owner));
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

    /** 全メンバーのチップ背景色をまとめて取得 */
    private Map<String, String> buildMemberChipColorMap(
            List<Schedule> schedules, Map<Long, List<String>> memberUsernamesMap) {
        Set<String> allMembers = memberUsernamesMap.values().stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet());
        Map<String, String> map = new HashMap<>();
        for (String username : allMembers) {
            userSettingRepository.findByUsername(username)
                    .ifPresent(us -> {
                        if (us.getChipBgColor() != null) {
                            map.put(username, us.getChipBgColor());
                        }
                    });
        }
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

    /** 予定リストに含まれる全オーナーの表示名をまとめて取得 */
    private Map<String, String> buildOwnerDisplayNameMap(List<Schedule> schedules) {
        List<String> owners = schedules.stream()
                .map(Schedule::getOwner)
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> map = new HashMap<>();
        for (String username : owners) {
            userRepository.findByUsername(username)
                    .ifPresent(u -> {
                        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) {
                            map.put(username, u.getDisplayName());
                        }
                    });
        }
        return map;
    }

    /** 全メンバーの表示名をまとめて取得 */
    private Map<String, String> buildMemberDisplayNameMap(
            List<Schedule> schedules, Map<Long, List<String>> memberUsernamesMap) {
        Set<String> allMembers = memberUsernamesMap.values().stream()
                .flatMap(List::stream)
                .collect(Collectors.toSet());
        Map<String, String> map = new HashMap<>();
        for (String username : allMembers) {
            userRepository.findByUsername(username)
                    .ifPresent(u -> {
                        if (u.getDisplayName() != null && !u.getDisplayName().isBlank()) {
                            map.put(username, u.getDisplayName());
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

    /**
     * 編集権限を判定する。
     * 以下の3条件を全て満たす場合のみ編集を許可:
     * 1. 予定のメンバーに自分が含まれている
     * 2. 予定に含まれるメンバー全員に予定を共有している
     * 3. 予定に含まれるメンバー全員から予定を共有されている
     * 自分自身は共有チェック対象から除外する。
     * オーナーは常に編集可能（上記チェックよりも優先）。
     */
    private boolean canEditSchedule(Schedule schedule, String username) {
        // 条件1: 自分がオーナー
        if (schedule.getOwner().equals(username)) {
            return true;
        }
        // 条件2: メンバーに含まれている AND 全メンバーと相互共有
        List<ScheduleMember> members = scheduleMemberRepository.findByScheduleId(schedule.getId());
        boolean isMember = members.stream().anyMatch(m -> m.getUsername().equals(username));
        if (!isMember) {
            return false;
        }
        // 全メンバー（オーナー含む、自分を除く）のユーザー名一覧
        Set<String> allUsernames = members.stream()
                .map(ScheduleMember::getUsername)
                .collect(Collectors.toSet());
        allUsernames.add(schedule.getOwner());
        allUsernames.remove(username);
        Set<String> sharedTo = calendarShareRepository.findByOwnerUsername(username)
                .stream()
                .map(CalendarShare::getSharedWithUsername)
                .collect(Collectors.toSet());
        Set<String> sharedFrom = calendarShareRepository.findSharedOwnerUsernames(username)
                .stream().collect(Collectors.toSet());
        return allUsernames.stream().allMatch(u -> sharedTo.contains(u) && sharedFrom.contains(u));
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
