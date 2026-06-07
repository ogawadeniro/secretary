package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.CalendarShare;
import java.util.List;
import java.util.Optional;

public interface CalendarShareRepository {
    /** 自分が誰と共有しているか一覧 */
    List<CalendarShare> findByOwnerUsername(String ownerUsername);

    /** 誰が自分と共有してくれているか一覧 */
    List<CalendarShare> findBySharedWithUsername(String sharedWithUsername);

    /** 自分と共有してくれているユーザーのユーザー名一覧 */
    List<String> findSharedOwnerUsernames(String sharedWithUsername);

    Optional<CalendarShare> findById(Long id);

    CalendarShare save(CalendarShare share);

    void deleteById(Long id);
}
