package com.rogawa.secretary.infrastructure.rest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private Long id;
    private String username;
    private String displayName;
    private String chipBgColor;
    private String email;

    public AuthResponse(Long id, String username, String displayName) {
        this(id, username, displayName, null, null);
    }

    public AuthResponse(Long id, String username, String displayName, String chipBgColor) {
        this(id, username, displayName, chipBgColor, null);
    }
}
