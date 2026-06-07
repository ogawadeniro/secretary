package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.UserSetting;
import lombok.Data;

@Data
public class UserSettingDto {

    private Long id;
    private String username;
    private String displayName;
    private String chipBgColor;
    private Integer firstDayOfWeek;

    public static UserSettingDto fromDomain(UserSetting domain) {
        UserSettingDto dto = new UserSettingDto();
        dto.setId(domain.getId());
        dto.setUsername(domain.getUsername());
        dto.setChipBgColor(domain.getChipBgColor());
        dto.setFirstDayOfWeek(domain.getFirstDayOfWeek());
        return dto;
    }
}
