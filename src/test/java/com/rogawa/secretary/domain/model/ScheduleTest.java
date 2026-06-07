package com.rogawa.secretary.domain.model;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

public class ScheduleTest {

    @Test
    public void testCopy() {
        Schedule original = new Schedule();
        original.setId(1L);
        original.setTitle("test");
        original.setIsAllDay(false);
        original.setStartDatetime(LocalDateTime.of(2025, 3, 7, 12, 30));
        original.setEndDatetime(LocalDateTime.of(2025, 3, 7, 13, 30));
        original.setOwner("rogawa");
        original.setDescription("test description");
        original.setUpdateTime(LocalDateTime.of(2025, 3, 7, 12, 0));
        original.setShared(false);

        Schedule copy = original.copy();

        assertNotSame(original, copy);
        assertEquals(original.getId(), copy.getId());
        assertEquals(original.getTitle(), copy.getTitle());
        assertEquals(original.getIsAllDay(), copy.getIsAllDay());
        assertEquals(original.getStartDatetime(), copy.getStartDatetime());
        assertEquals(original.getEndDatetime(), copy.getEndDatetime());
        assertEquals(original.getOwner(), copy.getOwner());
        assertEquals(original.getDescription(), copy.getDescription());
        assertEquals(original.getUpdateTime(), copy.getUpdateTime());
        assertEquals(original.getShared(), copy.getShared());
    }

    @Test
    public void testCopyIsIndependent() {
        Schedule original = new Schedule();
        original.setTitle("original");

        Schedule copy = original.copy();
        copy.setTitle("modified");

        assertEquals("original", original.getTitle());
        assertEquals("modified", copy.getTitle());
    }
}
