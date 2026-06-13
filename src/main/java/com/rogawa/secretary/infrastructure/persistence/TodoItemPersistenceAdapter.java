package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.TodoItem;
import com.rogawa.secretary.domain.repository.TodoItemRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class TodoItemPersistenceAdapter implements TodoItemRepository {

    private final JpaTodoItemRepository jpaTodoItemRepository;

    public TodoItemPersistenceAdapter(JpaTodoItemRepository jpaTodoItemRepository) {
        this.jpaTodoItemRepository = jpaTodoItemRepository;
    }

    @Override
    public List<TodoItem> findByOwner(String owner) {
        return jpaTodoItemRepository.findByOwnerOrderByUpdatedAtDesc(owner).stream()
                .map(JpaTodoItem::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<TodoItem> findByGroupIds(List<Long> groupIds) {
        return jpaTodoItemRepository.findByGroupIds(groupIds).stream()
                .map(JpaTodoItem::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<TodoItem> findById(Long id) {
        return jpaTodoItemRepository.findById(id).map(JpaTodoItem::toDomain);
    }

    @Override
    @Transactional
    public TodoItem save(TodoItem item) {
        JpaTodoItem entity = JpaTodoItem.fromDomain(item);
        JpaTodoItem saved = jpaTodoItemRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        jpaTodoItemRepository.deleteById(id);
    }
}
