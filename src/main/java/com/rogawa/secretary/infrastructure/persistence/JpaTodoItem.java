package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.TodoItem;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Entity
@Data
@Table(name = "todo_items")
public class JpaTodoItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String title;

    @NotNull
    private String description;

    @NotBlank
    private String owner;

    private LocalDateTime deadline;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** 所属グループID一覧 */
    @ElementCollection
    @CollectionTable(name = "todo_item_groups", joinColumns = @JoinColumn(name = "todo_item_id"))
    @Column(name = "group_id")
    private List<Long> groupIds = new ArrayList<>();

    /** メンバーのユーザー名一覧 */
    @ElementCollection
    @CollectionTable(name = "todo_item_members", joinColumns = @JoinColumn(name = "todo_item_id"))
    @Column(name = "username")
    private List<String> memberUsernames = new ArrayList<>();

    public static JpaTodoItem fromDomain(TodoItem item) {
        JpaTodoItem entity = new JpaTodoItem();
        entity.setId(item.getId());
        entity.setTitle(item.getTitle());
        entity.setDescription(item.getDescription());
        entity.setOwner(item.getOwner());
        entity.setDeadline(item.getDeadline());
        entity.setCreatedAt(item.getCreatedAt());
        entity.setUpdatedAt(item.getUpdatedAt());
        entity.setGroupIds(item.getGroupIds());
        entity.setMemberUsernames(item.getMemberUsernames());
        return entity;
    }

    public TodoItem toDomain() {
        TodoItem item = new TodoItem();
        item.setId(this.id);
        item.setTitle(this.title);
        item.setDescription(this.description);
        item.setOwner(this.owner);
        item.setDeadline(this.deadline);
        item.setCreatedAt(this.createdAt);
        item.setUpdatedAt(this.updatedAt);
        item.setGroupIds(this.groupIds == null ? new ArrayList<>() : new ArrayList<>(this.groupIds));
        item.setMemberUsernames(this.memberUsernames == null ? new ArrayList<>() : new ArrayList<>(this.memberUsernames));
        return item;
    }
}
