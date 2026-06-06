package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.Schedule;
import com.rogawa.secretary.domain.repository.ScheduleRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class SchedulePersistenceAdapter implements ScheduleRepository {

    private final JpaScheduleRepository jpaScheduleRepository;

    public SchedulePersistenceAdapter(JpaScheduleRepository jpaScheduleRepository) {
        this.jpaScheduleRepository = jpaScheduleRepository;
    }

    @Override
    public List<Schedule> findAll() {
        return jpaScheduleRepository.findAll().stream()
                .map(JpaSchedule::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Schedule> findByOwner(String owner) {
        return jpaScheduleRepository.findByOwnerOrderByStartDatetime(owner).stream()
                .map(JpaSchedule::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Schedule> findById(Long id) {
        return jpaScheduleRepository.findById(id).map(JpaSchedule::toDomain);
    }

    @Override
    public List<Schedule> findAllByDateRange(LocalDateTime start, LocalDateTime end) {
        return jpaScheduleRepository.findAllByDateRange(start, end).stream()
                .map(JpaSchedule::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Schedule> findByOwnerAndDateRange(String owner, LocalDateTime start, LocalDateTime end) {
        return jpaScheduleRepository.findByOwnerAndDateRange(owner, start, end).stream()
                .map(JpaSchedule::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Schedule save(Schedule schedule) {
        JpaSchedule entity = JpaSchedule.fromDomain(schedule);
        JpaSchedule saved = jpaScheduleRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteById(Long id) {
        jpaScheduleRepository.deleteById(id);
    }
}
