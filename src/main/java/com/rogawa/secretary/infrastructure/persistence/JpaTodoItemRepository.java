package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaTodoItemRepository extends JpaRepository<JpaTodoItem, Long> {

    List<JpaTodoItem> findByOwnerOrderByUpdatedAtDesc(String owner);

    @Query("SELECT t FROM JpaTodoItem t JOIN t.groupIds gid WHERE gid IN :groupIds ORDER BY t.updatedAt DESC")
    List<JpaTodoItem> findByGroupIds(@Param("groupIds") List<Long> groupIds);
}
