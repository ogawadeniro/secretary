package com.rogawa.secretary.infrastructure.rest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.model.Schedule;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ScheduleController.class)
public class ScheduleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ScheduleUseCase scheduleUseCase;

    @Test
    @WithMockUser
    public void testGetSchedules() throws Exception {
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setTitle("test");
        schedule.setIsAllDay(false);
        schedule.setStartDatetime(LocalDateTime.of(2025, 3, 7, 12, 30));
        schedule.setEndDatetime(LocalDateTime.of(2025, 3, 7, 13, 30));
        schedule.setOwner("rogawa");
        schedule.setDescription("desc");

        when(scheduleUseCase.getSchedules(anyString())).thenReturn(List.of(schedule));

        mockMvc.perform(get("/api/v1/schedules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(1))
                .andExpect(jsonPath("$[0].title").value("test"));
    }

    @Test
    @WithMockUser
    public void testGetSchedule() throws Exception {
        Schedule schedule = new Schedule();
        schedule.setId(1L);
        schedule.setTitle("detail");
        schedule.setIsAllDay(false);
        schedule.setStartDatetime(LocalDateTime.of(2025, 3, 7, 12, 30));
        schedule.setEndDatetime(LocalDateTime.of(2025, 3, 7, 13, 30));
        schedule.setOwner("rogawa");

        when(scheduleUseCase.getSchedule(1L)).thenReturn(schedule);

        mockMvc.perform(get("/api/v1/schedules/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("detail"));
    }

    @Test
    @WithMockUser
    public void testCreateSchedule() throws Exception {
        ScheduleDto request = new ScheduleDto();
        request.setTitle("new-schedule");
        request.setIsAllDay(false);
        request.setStartDatetime(LocalDateTime.of(2025, 6, 1, 10, 0));
        request.setEndDatetime(LocalDateTime.of(2025, 6, 1, 11, 0));
        request.setOwner("rogawa");
        request.setDescription("new");

        Schedule created = request.toDomain();
        created.setId(1L);

        when(scheduleUseCase.createSchedule(any(Schedule.class), anyString())).thenReturn(created);

        mockMvc.perform(post("/api/v1/schedules")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("new-schedule"));
    }

    @Test
    @WithMockUser
    public void testDeleteSchedule() throws Exception {
        mockMvc.perform(delete("/api/v1/schedules/1")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }
}
