package com.rogawa.secretary.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
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
    private CalendarShareRepository calendarShareRepository;

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
        when(calendarShareRepository.findSharedOwnerUsernames("rogawa")).thenReturn(Collections.emptyList());
        when(scheduleRepository.findByOwner("rogawa")).thenReturn(List.of(testSchedule));
        List<Schedule> result = scheduleService.getSchedules("rogawa");
        assertEquals(1, result.size());
        assertEquals("test", result.get(0).getTitle());
    }

    @Test
    public void testGetSchedulesWithShared() {
        // 共有ユーザー "user2" がいる場合、自分の予定＋共有ユーザーの予定が返る
        Schedule sharedSchedule = new Schedule();
        sharedSchedule.setId(2L);
        sharedSchedule.setTitle("shared event");
        sharedSchedule.setStartDatetime(LocalDateTime.of(2025, 3, 7, 14, 0));
        sharedSchedule.setEndDatetime(LocalDateTime.of(2025, 3, 7, 15, 0));
        sharedSchedule.setOwner("user2");

        when(calendarShareRepository.findSharedOwnerUsernames("rogawa")).thenReturn(List.of("user2"));
        when(scheduleRepository.findByOwner("rogawa")).thenReturn(List.of(testSchedule));
        when(scheduleRepository.findByOwnersShared(List.of("user2"))).thenReturn(List.of(sharedSchedule));

        List<Schedule> result = scheduleService.getSchedules("rogawa");
        assertEquals(2, result.size());
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

        Schedule result = scheduleService.updateSchedule(1L, request);
        assertEquals("updated", result.getTitle());
        assertEquals("rogawa", result.getOwner());
        assertNotNull(result.getUpdateTime());
    }

    @Test
    public void testDeleteSchedule() {
        when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));
        scheduleService.deleteSchedule(1L);
        verify(scheduleRepository).deleteById(1L);
    }
}
