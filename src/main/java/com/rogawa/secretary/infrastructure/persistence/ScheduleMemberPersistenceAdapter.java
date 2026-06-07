package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.ScheduleMember;
import com.rogawa.secretary.domain.repository.ScheduleMemberRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class ScheduleMemberPersistenceAdapter implements ScheduleMemberRepository {

    private final JpaScheduleMemberRepository jpaScheduleMemberRepository;

    public ScheduleMemberPersistenceAdapter(JpaScheduleMemberRepository jpaScheduleMemberRepository) {
        this.jpaScheduleMemberRepository = jpaScheduleMemberRepository;
    }

    @Override
    public List<ScheduleMember> findByScheduleId(Long scheduleId) {
        return jpaScheduleMemberRepository.findByScheduleId(scheduleId)
                .stream()
                .map(JpaScheduleMember::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<ScheduleMember> findByScheduleIdIn(List<Long> scheduleIds) {
        return jpaScheduleMemberRepository.findByScheduleIdIn(scheduleIds)
                .stream()
                .map(JpaScheduleMember::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<ScheduleMember> findByUsername(String username) {
        return jpaScheduleMemberRepository.findByUsername(username)
                .stream()
                .map(JpaScheduleMember::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<Long> findScheduleIdsByUsername(String username) {
        return jpaScheduleMemberRepository.findByUsername(username)
                .stream()
                .map(JpaScheduleMember::getScheduleId)
                .collect(Collectors.toList());
    }

    @Override
    public ScheduleMember save(ScheduleMember member) {
        JpaScheduleMember entity = JpaScheduleMember.fromDomain(member);
        JpaScheduleMember saved = jpaScheduleMemberRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteByScheduleIdAndUsername(Long scheduleId, String username) {
        jpaScheduleMemberRepository.deleteByScheduleIdAndUsername(scheduleId, username);
    }
}
