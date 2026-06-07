package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaScheduleMemberRepository extends JpaRepository<JpaScheduleMember, Long> {

    List<JpaScheduleMember> findByScheduleId(Long scheduleId);

    List<JpaScheduleMember> findByScheduleIdIn(List<Long> scheduleIds);

    List<JpaScheduleMember> findByUsername(String username);

    void deleteByScheduleIdAndUsername(Long scheduleId, String username);
}
