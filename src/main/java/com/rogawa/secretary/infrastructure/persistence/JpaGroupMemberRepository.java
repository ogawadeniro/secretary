package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaGroupMemberRepository extends JpaRepository<JpaGroupMember, Long> {

    List<JpaGroupMember> findByGroupId(Long groupId);

    Optional<JpaGroupMember> findByGroupIdAndUsername(Long groupId, String username);

    void deleteByGroupIdAndUsername(Long groupId, String username);
}
