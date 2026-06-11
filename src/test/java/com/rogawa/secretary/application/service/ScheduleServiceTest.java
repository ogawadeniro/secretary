package com.rogawa.secretary.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.rogawa.secretary.domain.exception.ScheduleAuthorizationException;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.GroupMember;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.GroupRepository;
import com.rogawa.secretary.domain.repository.ScheduleMemberRepository;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class ScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserSettingRepository userSettingRepository;

    @Mock
    private ScheduleMemberRepository scheduleMemberRepository;

    @InjectMocks
    private ScheduleService scheduleService;

    private Schedule testSchedule;

    @BeforeEach
    void setUp() {
        testSchedule = new Schedule();
        testSchedule.setId(1L);
        testSchedule.setTitle("test");
        testSchedule.setIsAllDay(false);
        testSchedule.setStartDatetime(LocalDateTime.of(2025, 3, 7, 12, 30));
        testSchedule.setEndDatetime(LocalDateTime.of(2025, 3, 7, 13, 30));
        testSchedule.setOwner("rogawa");
        testSchedule.setDescription("description");
    }

    @Test
    public void testGetSchedules() {
        when(scheduleRepository.findByOwner("rogawa")).thenReturn(List.of(testSchedule));
        when(userRepository.findByUsername("rogawa")).thenReturn(Optional.empty());
        when(userSettingRepository.findByUsername("rogawa")).thenReturn(Optional.empty());
        when(scheduleMemberRepository.findScheduleIdsByUsername("rogawa")).thenReturn(Collections.emptyList());
        when(scheduleMemberRepository.findByScheduleIdIn(any())).thenReturn(Collections.emptyList());
        when(groupRepository.findByMemberUsername("rogawa")).thenReturn(Collections.emptyList());
        List<Schedule> result = scheduleService.getSchedules("rogawa");
        assertEquals(1, result.size());
        assertEquals("test", result.get(0).getTitle());
    }

    @Test
    public void testGetScheduleFound() {
        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));
        Schedule result = scheduleService.getSchedule(1L);
        assertEquals("test", result.getTitle());
    }

    @Test
    public void testGetScheduleNotFound() {
        when(scheduleRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ScheduleNotFoundException.class, () -> scheduleService.getSchedule(99L));
    }

    @Test
    public void testCreateSchedule() {
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(inv -> inv.getArgument(0));
        Schedule result = scheduleService.createSchedule(testSchedule, "rogawa");
        assertNotNull(result.getUpdateTime());
        assertEquals("test", result.getTitle());
        assertEquals("rogawa", result.getOwner());
    }

    @Test
    public void testUpdateSchedule() {
        Schedule existing = new Schedule();
        existing.setId(1L);
        existing.setTitle("original");
        existing.setIsAllDay(false);
        existing.setOwner("rogawa");
        existing.setDescription("original");

        Schedule request = new Schedule();
        request.setTitle("updated");

        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(inv -> inv.getArgument(0));

        Schedule result = scheduleService.updateSchedule(1L, request, "rogawa");
        assertEquals("updated", result.getTitle());
        assertEquals("rogawa", result.getOwner());
        assertNotNull(result.getUpdateTime());
    }

    @Test
    public void testUpdateScheduleNotOwner() {
        Schedule existing = new Schedule();
        existing.setId(1L);
        existing.setTitle("original");
        existing.setIsAllDay(false);
        existing.setOwner("other_user");
        existing.setDescription("original");

        Schedule request = new Schedule();
        request.setTitle("hacked");

        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(ScheduleAuthorizationException.class,
                () -> scheduleService.updateSchedule(1L, request, "rogawa"));
    }

    @Test
    public void testDeleteSchedule() {
        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));
        scheduleService.deleteSchedule(1L, "rogawa");
        verify(scheduleRepository).deleteById(1L);
    }

    @Test
    public void testDeleteScheduleNotOwner() {
        Schedule existing = new Schedule();
        existing.setId(1L);
        existing.setTitle("original");
        existing.setOwner("other_user");

        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(ScheduleAuthorizationException.class,
                () -> scheduleService.deleteSchedule(1L, "rogawa"));
    }

    @Test
    public void testUpdateScheduleAsGroupMember() {
        Schedule existing = new Schedule();
        existing.setId(1L);
        existing.setTitle("original");
        existing.setIsAllDay(false);
        existing.setOwner("other_user");
        existing.setGroupIds(List.of(10L));

        Schedule request = new Schedule();
        request.setTitle("updated");

        GroupMember gm = new GroupMember();
        gm.setGroupId(10L);
        gm.setUsername("rogawa");

        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(groupRepository.findGroupMember(10L, "rogawa")).thenReturn(Optional.of(gm));
        when(scheduleRepository.save(any(Schedule.class))).thenAnswer(inv -> inv.getArgument(0));

        Schedule result = scheduleService.updateSchedule(1L, request, "rogawa");
        assertEquals("updated", result.getTitle());
    }

    @Test
    public void testUpdateScheduleAsMemberNotInGroup() {
        Schedule existing = new Schedule();
        existing.setId(1L);
        existing.setTitle("original");
        existing.setIsAllDay(false);
        existing.setOwner("other_user");

        Schedule request = new Schedule();
        request.setTitle("hacked");

        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(existing));

        assertThrows(ScheduleAuthorizationException.class,
                () -> scheduleService.updateSchedule(1L, request, "rogawa"));
    }
}
