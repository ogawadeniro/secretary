package com.rogawa.secretary.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JpaCalendarShareRepository extends JpaRepository<JpaCalendarShare, Long> {

    List<JpaCalendarShare> findByOwnerUsernameOrderByCreatedAt(String ownerUsername);

    List<JpaCalendarShare> findBySharedWithUsernameOrderByCreatedAt(String sharedWithUsername);
}
