package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.UserSetting;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "user_settings")
public class JpaUserSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "chip_bg_color")
    private String chipBgColor;

    @Column(name = "first_day_of_week")
    private Integer firstDayOfWeek;

    public static JpaUserSetting fromDomain(UserSetting domain) {
        JpaUserSetting entity = new JpaUserSetting();
        entity.setId(domain.getId());
        entity.setUsername(domain.getUsername());
        entity.setChipBgColor(domain.getChipBgColor());
        entity.setFirstDayOfWeek(domain.getFirstDayOfWeek());
        return entity;
    }

    public UserSetting toDomain() {
        UserSetting setting = new UserSetting();
        setting.setId(this.id);
        setting.setUsername(this.username);
        setting.setChipBgColor(this.chipBgColor);
        setting.setFirstDayOfWeek(this.firstDayOfWeek);
        return setting;
    }
}
