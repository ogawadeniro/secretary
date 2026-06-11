package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaGroupMemberRepository extends JpaRepository<JpaGroupMember, Long> {

    List<JpaGroupMember> findByGroupId(Long groupId);

    List<JpaGroupMember> findByGroupIdAndStatus(Long groupId, String status);

    Optional<JpaGroupMember> findByGroupIdAndUsername(Long groupId, String username);

    List<JpaGroupMember> findByUsernameAndStatus(String username, String status);

    void deleteByGroupIdAndUsername(Long groupId, String username);
}
