package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.TodoItem;
import java.util.List;
import java.util.Optional;

public interface TodoItemRepository {
    List<TodoItem> findByOwner(String owner);

    List<TodoItem> findByGroupIds(List<Long> groupIds);

    Optional<TodoItem> findById(Long id);

    TodoItem save(TodoItem item);

    void deleteById(Long id);
}
