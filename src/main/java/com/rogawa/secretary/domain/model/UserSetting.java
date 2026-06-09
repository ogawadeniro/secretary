package com.rogawa.secretary.domain.model;

import lombok.Data;

@Data
public class UserSetting {
    private Long id;
    private String username;
    private String chipBgColor;
    private Integer firstDayOfWeek;
    private Integer timeInterval;
}
