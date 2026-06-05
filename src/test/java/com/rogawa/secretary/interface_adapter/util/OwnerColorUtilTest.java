package com.rogawa.secretary.interface_adapter.util;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

public class OwnerColorUtilTest {

    @Test
    public void testGenerateColorIsDeterministic() {
        String owner = "rogawa";
        String first = OwnerColorUtil.generateOwnerColorCode(owner);
        String second = OwnerColorUtil.generateOwnerColorCode(owner);
        assertEquals(first, second);
    }

    @Test
    public void testDifferentOwnersProduceDifferentColors() {
        String color1 = OwnerColorUtil.generateOwnerColorCode("rogawa");
        String color2 = OwnerColorUtil.generateOwnerColorCode("nana");
        assertNotEquals(color1, color2);
    }

    @Test
    public void testColorFormatStartsWithHash() {
        String color = OwnerColorUtil.generateOwnerColorCode("test");
        assertTrue(color.startsWith("#"));
        assertEquals(7, color.length());
    }

    @Test
    public void testEmptyOwnerReturnsColor() {
        String color = OwnerColorUtil.generateOwnerColorCode("");
        assertNotNull(color);
        assertTrue(color.startsWith("#"));
    }
}
