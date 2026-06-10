package com.rogawa.secretary.infrastructure.persistence;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaScheduleRepository extends JpaRepository<JpaSchedule, Long> {

    List<JpaSchedule> findByOwnerOrderByStartDatetime(String owner);

    @Query("SELECT s FROM JpaSchedule s WHERE s.endDatetime >= ?1 AND s.startDatetime <= ?2 ORDER BY s.startDatetime")
    List<JpaSchedule> findAllByDateRange(LocalDateTime start, LocalDateTime end);

    @Query("SELECT s FROM JpaSchedule s WHERE s.owner IN ?1 AND s.shared = true ORDER BY s.startDatetime")
    List<JpaSchedule> findByOwnersShared(List<String> owners);

    List<JpaSchedule> findByIdIn(List<Long> ids);

    List<JpaSchedule> findByGroupIdIn(List<Long> groupIds);
}
