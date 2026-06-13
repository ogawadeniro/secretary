package com.rogawa.secretary.application.service;

import com.rogawa.secretary.domain.model.TodoItem;
import com.rogawa.secretary.domain.model.Group;
import com.rogawa.secretary.domain.repository.GroupRepository;
import com.rogawa.secretary.domain.repository.TodoItemRepository;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TodoService {

    private final TodoItemRepository todoItemRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;

    public TodoService(
            TodoItemRepository todoItemRepository,
            GroupRepository groupRepository,
            UserRepository userRepository,
            UserSettingRepository userSettingRepository) {
        this.todoItemRepository = todoItemRepository;
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.userSettingRepository = userSettingRepository;
    }

    /** 現在のユーザーが閲覧可能なやること一覧を取得 */
    public List<TodoItem> getTodos(String username) {
        // 自分のやること
        List<TodoItem> ownItems = todoItemRepository.findByOwner(username);

        // グループに属するやること（そのグループのメンバーであれば閲覧可能）
        List<Group> myGroups = groupRepository.findByMemberUsername(username);
        List<Long> groupIds = myGroups.stream().map(Group::getId).collect(Collectors.toList());
        List<TodoItem> groupItems = groupIds.isEmpty()
                ? List.of() : todoItemRepository.findByGroupIds(groupIds);

        // 重複除去（IDでユニーク）
        Set<Long> seen = ownItems.stream().map(TodoItem::getId).collect(Collectors.toSet());
        List<TodoItem> all = new ArrayList<>(ownItems);
        for (TodoItem item : groupItems) {
            if (seen.add(item.getId())) {
                all.add(item);
            }
        }

        // API応用情報を付与
        enrichItems(all, username);
        return all;
    }

    /** 新しいやことを作成 */
    @Transactional
    public TodoItem create(TodoItem item, String username) {
        item.setId(null);
        item.setOwner(username);
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(LocalDateTime.now());
        if (item.getGroupIds() == null) {
            item.setGroupIds(new ArrayList<>());
        }
        if (item.getMemberUsernames() == null) {
            item.setMemberUsernames(new ArrayList<>());
        }
        // 作成者は自動でメンバーに含める
        if (!item.getMemberUsernames().contains(username)) {
            item.getMemberUsernames().add(username);
        }
        TodoItem saved = todoItemRepository.save(item);
        enrichItem(saved, username);
        return saved;
    }

    /** やことを更新 */
    @Transactional
    public TodoItem update(Long id, TodoItem updated, String username) {
        TodoItem existing = todoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("やることが見つからないよ"));

        if (!existing.getOwner().equals(username)) {
            throw new RuntimeException("編集権限がないよ");
        }

        if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
        if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
        if (updated.getGroupIds() != null) existing.setGroupIds(updated.getGroupIds());
        if (updated.getMemberUsernames() != null) {
            // オーナーは常にメンバーに含める
            if (!updated.getMemberUsernames().contains(existing.getOwner())) {
                updated.getMemberUsernames().add(existing.getOwner());
            }
            existing.setMemberUsernames(updated.getMemberUsernames());
        }
        existing.setDeadline(updated.getDeadline());
        existing.setUpdatedAt(LocalDateTime.now());

        TodoItem saved = todoItemRepository.save(existing);
        enrichItem(saved, username);
        return saved;
    }

    /** やことを削除 */
    @Transactional
    public void delete(Long id, String username) {
        TodoItem existing = todoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("やることが見つからないよ"));

        if (!existing.getOwner().equals(username)) {
            // グループメンバーにも削除権限を与える
            List<Long> groupIds = existing.getGroupIds();
            if (groupIds != null && !groupIds.isEmpty()) {
                boolean isMember = groupRepository.findByMemberUsername(username).stream()
                        .anyMatch(g -> groupIds.contains(g.getId()));
                if (!isMember) {
                    throw new RuntimeException("削除権限がないよ");
                }
            } else {
                throw new RuntimeException("削除権限がないよ");
            }
        }

        todoItemRepository.deleteById(id);
    }

    /** やることの完了状態をトグルする */
    @Transactional
    public TodoItem toggleComplete(Long id, String username) {
        TodoItem existing = todoItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("やることが見つからないよ"));

        if (!existing.getOwner().equals(username)) {
            // グループメンバーにもトグル権限を与える
            List<Long> groupIds = existing.getGroupIds();
            if (groupIds != null && !groupIds.isEmpty()) {
                boolean isMember = groupRepository.findByMemberUsername(username).stream()
                        .anyMatch(g -> groupIds.contains(g.getId()));
                if (!isMember) {
                    throw new RuntimeException("権限がないよ");
                }
            } else {
                throw new RuntimeException("権限がないよ");
            }
        }

        existing.setCompleted(!existing.isCompleted());
        existing.setUpdatedAt(LocalDateTime.now());

        TodoItem saved = todoItemRepository.save(existing);
        enrichItem(saved, username);
        return saved;
    }

    /** やことにメンバーを追加 */
    @Transactional
    public TodoItem addMember(Long todoId, String memberUsername, String currentUsername) {
        TodoItem item = todoItemRepository.findById(todoId)
                .orElseThrow(() -> new RuntimeException("やることが見つからないよ"));

        if (!item.getOwner().equals(currentUsername)) {
            throw new RuntimeException("編集権限がないよ");
        }

        if (item.getMemberUsernames() == null) {
            item.setMemberUsernames(new ArrayList<>());
        }
        if (!item.getMemberUsernames().contains(memberUsername)) {
            item.getMemberUsernames().add(memberUsername);
        }
        item.setUpdatedAt(LocalDateTime.now());

        TodoItem saved = todoItemRepository.save(item);
        enrichItem(saved, currentUsername);
        return saved;
    }

    /** やことからメンバーを削除 */
    @Transactional
    public TodoItem removeMember(Long todoId, String memberUsername, String currentUsername) {
        TodoItem item = todoItemRepository.findById(todoId)
                .orElseThrow(() -> new RuntimeException("やることが見つからないよ"));

        if (!item.getOwner().equals(currentUsername)) {
            throw new RuntimeException("編集権限がないよ");
        }

        if (item.getMemberUsernames() != null) {
            item.getMemberUsernames().remove(memberUsername);
        }
        item.setUpdatedAt(LocalDateTime.now());

        TodoItem saved = todoItemRepository.save(item);
        enrichItem(saved, currentUsername);
        return saved;
    }

    /** 各アイテムに表示名・色・権限を付与 */
    private void enrichItems(List<TodoItem> items, String currentUsername) {
        for (TodoItem item : items) {
            enrichItem(item, currentUsername);
        }
    }

    private void enrichItem(TodoItem item, String currentUsername) {
        // オーナー表示名
        userRepository.findByUsername(item.getOwner()).ifPresent(u -> {
            item.setOwnerDisplayName(u.getDisplayName());
        });

        // メンバー情報（オーナーを含む全メンバー）
        List<String> members = item.getMemberUsernames();
        if (members != null) {
            Map<String, String> displayNames = new HashMap<>();
            Map<String, String> chipBgColors = new HashMap<>();
            for (String m : members) {
                userRepository.findByUsername(m).ifPresent(u -> {
                    displayNames.put(m, u.getDisplayName());
                });
                userSettingRepository.findByUsername(m).ifPresent(s -> {
                    chipBgColors.put(m, s.getChipBgColor());
                });
            }
            // オーナーも確実に含める
            displayNames.putIfAbsent(item.getOwner(), item.getOwnerDisplayName());
            userSettingRepository.findByUsername(item.getOwner()).ifPresent(s -> {
                chipBgColors.putIfAbsent(item.getOwner(), s.getChipBgColor());
            });
            item.setMemberDisplayNames(displayNames);
            item.setMemberChipBgColors(chipBgColors);
        }

        // 編集権限
        item.setCanEdit(item.getOwner().equals(currentUsername));
    }
}
