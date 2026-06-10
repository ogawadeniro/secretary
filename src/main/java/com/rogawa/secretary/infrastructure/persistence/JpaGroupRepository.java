package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaGroupRepository extends JpaRepository<JpaGroup, Long> {

    List<JpaGroup> findByOwnerUsernameOrderByCreatedAtDesc(String ownerUsername);

    @Query("SELECT g FROM JpaGroup g JOIN JpaGroupMember m ON g.id = m.groupId "
            + "WHERE m.username = :username ORDER BY g.createdAt DESC")
    List<JpaGroup> findByMemberUsername(@Param("username") String username);
}
