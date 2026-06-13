package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.TodoItem;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class TodoDto {

    private Long id;

    @NotBlank
    private String title;

    private String description;

    private String owner;

    private String ownerDisplayName;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** 締め切り（null=期限なし） */
    private LocalDateTime deadline;

    /** 完了フラグ */
    private boolean completed;

    /** 所属グループID一覧 */
    private List<Long> groupIds = new ArrayList<>();

    /** メンバーのユーザー名一覧 */
    private List<String> memberUsernames = new ArrayList<>();

    /** メンバーごとのチップ背景色（username → hexColor） */
    private Map<String, String> memberChipBgColors;

    /** メンバーごとの表示名（username → displayName） */
    private Map<String, String> memberDisplayNames;

    /** 現在のユーザーが編集可能か */
    private Boolean canEdit;

    public static TodoDto fromDomain(TodoItem item) {
        TodoDto dto = new TodoDto();
        dto.setId(item.getId());
        dto.setTitle(item.getTitle());
        dto.setDescription(item.getDescription());
        dto.setOwner(item.getOwner());
        dto.setOwnerDisplayName(item.getOwnerDisplayName());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        dto.setDeadline(item.getDeadline());
        dto.setCompleted(item.isCompleted());
        dto.setGroupIds(item.getGroupIds() != null
                ? new ArrayList<>(item.getGroupIds()) : new ArrayList<>());
        dto.setMemberUsernames(item.getMemberUsernames() != null
                ? new ArrayList<>(item.getMemberUsernames()) : new ArrayList<>());
        dto.setMemberChipBgColors(item.getMemberChipBgColors());
        dto.setMemberDisplayNames(item.getMemberDisplayNames());
        dto.setCanEdit(item.getCanEdit());
        return dto;
    }

    public TodoItem toDomain() {
        TodoItem item = new TodoItem();
        item.setId(this.id);
        item.setTitle(this.title);
        item.setDescription(this.description);
        item.setOwner(this.owner);
        item.setDeadline(this.deadline);
        item.setCompleted(this.completed);
        item.setGroupIds(this.groupIds != null
                ? new ArrayList<>(this.groupIds) : new ArrayList<>());
        item.setMemberUsernames(this.memberUsernames != null
                ? new ArrayList<>(this.memberUsernames) : new ArrayList<>());
        return item;
    }
}
