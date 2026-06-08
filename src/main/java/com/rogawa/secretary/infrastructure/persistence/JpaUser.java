package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "users")
public class JpaUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "display_name")
    private String displayName;

    @Column(unique = true)
    private String email;

    public static JpaUser fromDomain(User user) {
        JpaUser entity = new JpaUser();
        entity.setId(user.getId());
        entity.setUsername(user.getUsername());
        entity.setPassword(user.getPassword());
        entity.setDisplayName(user.getDisplayName());
        entity.setEmail(user.getEmail());
        return entity;
    }

    public User toDomain() {
        User user = new User();
        user.setId(this.id);
        user.setUsername(this.username);
        user.setPassword(this.password);
        user.setDisplayName(this.displayName);
        user.setEmail(this.email);
        return user;
    }
}
