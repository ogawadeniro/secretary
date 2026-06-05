package com.rogawa.secretary.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.rogawa.secretary.domain.exception.ScheduleNotFoundException;
import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import java.time.LocalDateTime;
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
        when(scheduleRepository.findAll()).thenReturn(List.of(testSchedule));
        List<Schedule> result = scheduleService.getSchedules();
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
        Schedule result = scheduleService.createSchedule(testSchedule);
        assertNotNull(result.getUpdateTime());
        assertEquals("test", result.getTitle());
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
