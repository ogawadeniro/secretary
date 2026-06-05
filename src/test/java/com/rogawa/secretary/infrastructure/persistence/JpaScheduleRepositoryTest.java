package com.rogawa.secretary.infrastructure.persistence;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
public class JpaScheduleRepositoryTest {

    @Autowired
    private JpaScheduleRepository jpaScheduleRepository;

    @Test
    public void testSaveAndFind() {
        JpaSchedule schedule = new JpaSchedule();
        schedule.setTitle("meeting");
        schedule.setIsAllDay(false);
        schedule.setStartDatetime(LocalDateTime.of(2025, 6, 1, 10, 0));
        schedule.setEndDatetime(LocalDateTime.of(2025, 6, 1, 11, 0));
        schedule.setOwner("rogawa");
        schedule.setDescription("test");
        schedule.setUpdateTime(LocalDateTime.now());

        JpaSchedule saved = jpaScheduleRepository.save(schedule);
        assertNotNull(saved.getId());

        JpaSchedule found = jpaScheduleRepository.findById(saved.getId()).orElse(null);
        assertNotNull(found);
        assertEquals("meeting", found.getTitle());
    }

    @Test
    public void testFindAllByDateRange() {
        JpaSchedule s1 = createSchedule("s1", "2025-06-01T10:00", "2025-06-01T11:00");
        JpaSchedule s2 = createSchedule("s2", "2025-06-05T10:00", "2025-06-05T11:00");
        jpaScheduleRepository.save(s1);
        jpaScheduleRepository.save(s2);

        LocalDateTime start = LocalDateTime.of(2025, 6, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2025, 6, 3, 0, 0);
        List<JpaSchedule> result = jpaScheduleRepository.findAllByDateRange(start, end);

        assertEquals(1, result.size());
        assertEquals("s1", result.get(0).getTitle());
    }

    @Test
    public void testDelete() {
        JpaSchedule schedule = createSchedule("delete-me", "2025-06-01T10:00", "2025-06-01T11:00");
        JpaSchedule saved = jpaScheduleRepository.save(schedule);
        jpaScheduleRepository.deleteById(saved.getId());
        assertFalse(jpaScheduleRepository.findById(saved.getId()).isPresent());
    }

    private JpaSchedule createSchedule(String title, String startStr, String endStr) {
        JpaSchedule s = new JpaSchedule();
        s.setTitle(title);
        s.setIsAllDay(false);
        s.setStartDatetime(LocalDateTime.parse(startStr));
        s.setEndDatetime(LocalDateTime.parse(endStr));
        s.setOwner("rogawa");
        s.setDescription("");
        s.setUpdateTime(LocalDateTime.now());
        return s;
    }
}
