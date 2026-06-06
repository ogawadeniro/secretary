package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScheduleController {

    private final ScheduleUseCase scheduleUseCase;

    public ScheduleController(ScheduleUseCase scheduleUseCase) {
        this.scheduleUseCase = scheduleUseCase;
    }

    @GetMapping("/api/v1/schedules")
    public ResponseEntity<List<ScheduleDto>> getSchedules(Authentication authentication) {
        List<ScheduleDto> dtos = scheduleUseCase.getSchedules(authentication.getName()).stream()
                .map(ScheduleDto::fromDomain)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/api/v1/schedules/{id}")
    public ResponseEntity<ScheduleDto> getSchedule(@PathVariable Long id) {
        ScheduleDto dto = ScheduleDto.fromDomain(scheduleUseCase.getSchedule(id));
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/api/v1/schedules")
    public ResponseEntity<ScheduleDto> createSchedule(
            @Validated @RequestBody ScheduleDto request,
            Authentication authentication) {
        var created = scheduleUseCase.createSchedule(request.toDomain(), authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(ScheduleDto.fromDomain(created));
    }

    @PatchMapping("/api/v1/schedules/{id}")
    public ResponseEntity<ScheduleDto> updateSchedule(
            @RequestBody ScheduleDto request,
            @PathVariable Long id) {
        var updated = scheduleUseCase.updateSchedule(id, request.toDomain());
        return ResponseEntity.status(HttpStatus.CREATED).body(ScheduleDto.fromDomain(updated));
    }

    @DeleteMapping("/api/v1/schedules/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long id) {
        scheduleUseCase.deleteSchedule(id);
        return ResponseEntity.noContent().build();
    }
}
