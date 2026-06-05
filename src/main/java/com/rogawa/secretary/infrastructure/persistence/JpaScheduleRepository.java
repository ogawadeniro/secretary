package com.rogawa.secretary.infrastructure.persistence;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaScheduleRepository extends JpaRepository<JpaSchedule, Long> {

    List<JpaSchedule> findAllByOrderByStartDatetime();

    @Query("SELECT s FROM JpaSchedule s WHERE s.endDatetime >= ?1 AND s.startDatetime <= ?2 ORDER BY s.startDatetime")
    List<JpaSchedule> findAllByDateRange(LocalDateTime start, LocalDateTime end);
}
