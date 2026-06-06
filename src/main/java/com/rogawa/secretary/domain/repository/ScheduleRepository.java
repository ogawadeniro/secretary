package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.Schedule;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository {
    List<Schedule> findAll();

    List<Schedule> findByOwner(String owner);

    Optional<Schedule> findById(Long id);

    List<Schedule> findAllByDateRange(LocalDateTime start, LocalDateTime end);

    List<Schedule> findByOwnerAndDateRange(String owner, LocalDateTime start, LocalDateTime end);

    Schedule save(Schedule schedule);

    void deleteById(Long id);
}
