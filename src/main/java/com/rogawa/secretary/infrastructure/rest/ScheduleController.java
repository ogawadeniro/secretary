package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.application.port.ScheduleUseCase;
import com.rogawa.secretary.domain.model.ScheduleMember;
import com.rogawa.secretary.infrastructure.rest.dto.MemberResponse;
import java.util.List;
import java.util.Map;
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
import org.springframework.web.bind.annotation.RequestParam;
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
            @PathVariable Long id,
            Authentication authentication) {
        var updated = scheduleUseCase.updateSchedule(id, request.toDomain(), authentication.getName());
        return ResponseEntity.ok(ScheduleDto.fromDomain(updated));
    }

    @DeleteMapping("/api/v1/schedules/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long id, Authentication authentication) {
        scheduleUseCase.deleteSchedule(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    // ---- メンバー管理 ----

    @GetMapping("/api/v1/schedules/{id}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable Long id) {
        List<MemberResponse> members = scheduleUseCase.getScheduleMembers(id).stream()
                .map(MemberResponse::fromDomain)
                .collect(Collectors.toList());
        return ResponseEntity.ok(members);
    }

    @PostMapping("/api/v1/schedules/{id}/members")
    public ResponseEntity<MemberResponse> addMember(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String memberUsername = body.get("username");
        if (memberUsername == null || memberUsername.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ScheduleMember member = scheduleUseCase.addScheduleMember(id, memberUsername, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(MemberResponse.fromDomain(member));
    }

    @DeleteMapping("/api/v1/schedules/{id}/members")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @RequestParam String username,
            Authentication authentication) {
        scheduleUseCase.removeScheduleMember(id, username, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
