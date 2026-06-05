package com.rogawa.secretary.interface_adapter.util;

import java.awt.Color;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class OwnerColorUtil {

    private OwnerColorUtil() {
    }

    public static String generateOwnerColorCode(String ownerTxt) {
        int hash = 0;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(ownerTxt.getBytes(StandardCharsets.UTF_8));
            hash = ByteBuffer.wrap(digest, 0, 4).getInt();
        } catch (NoSuchAlgorithmException e) {
            System.err.println("### SHA-256 algorithm not available" + e);
        }

        float hue = (hash & 0xFFFFFF) % 360;
        float saturation = 0.6f + (Math.abs(hash) % 30) / 100f;
        float brightness = 0.4f + (Math.abs(hash * 0.6f) % 30) / 100f;
        Color color = Color.getHSBColor(hue / 360f, saturation, brightness);
        String colorCode = String.format("#%02X%02X%02X", color.getRed(), color.getGreen(), color.getBlue());

        switch (colorCode) {
            case "#198A24":
                colorCode = "#A52A2A";
                break;
            case "#68258F":
                colorCode = "#D2691E";
                break;
            case "#22476B":
                colorCode = "#008080";
                break;
            case "#738A27":
                colorCode = "#DB7093";
                break;
            default:
                break;
        }
        return colorCode;
    }
}
