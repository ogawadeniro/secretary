package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.Schedule;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository {
    List<Schedule> findByOwner(String owner);

    Optional<Schedule> findById(Long id);

    /** ID一覧で予定を取得 */
    List<Schedule> findByIds(List<Long> ids);

    /** グループID一覧で予定を取得 */
    List<Schedule> findByGroupIds(List<Long> groupIds);

    Schedule save(Schedule schedule);

    void deleteById(Long id);
}
