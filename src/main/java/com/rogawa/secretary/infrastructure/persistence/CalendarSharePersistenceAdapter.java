package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.CalendarShare;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class CalendarSharePersistenceAdapter implements CalendarShareRepository {

    private final JpaCalendarShareRepository jpaCalendarShareRepository;

    public CalendarSharePersistenceAdapter(JpaCalendarShareRepository jpaCalendarShareRepository) {
        this.jpaCalendarShareRepository = jpaCalendarShareRepository;
    }

    @Override
    public List<CalendarShare> findByOwnerUsername(String ownerUsername) {
        return jpaCalendarShareRepository
                .findByOwnerUsernameOrderByCreatedAt(ownerUsername)
                .stream()
                .map(JpaCalendarShare::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<CalendarShare> findBySharedWithUsername(String sharedWithUsername) {
        return jpaCalendarShareRepository
                .findBySharedWithUsernameOrderByCreatedAt(sharedWithUsername)
                .stream()
                .map(JpaCalendarShare::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public List<String> findSharedOwnerUsernames(String sharedWithUsername) {
        return jpaCalendarShareRepository
                .findBySharedWithUsernameOrderByCreatedAt(sharedWithUsername)
                .stream()
                .map(JpaCalendarShare::getOwnerUsername)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<CalendarShare> findById(Long id) {
        return jpaCalendarShareRepository.findById(id).map(JpaCalendarShare::toDomain);
    }

    @Override
    public CalendarShare save(CalendarShare share) {
        JpaCalendarShare entity = JpaCalendarShare.fromDomain(share);
        JpaCalendarShare saved = jpaCalendarShareRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteById(Long id) {
        jpaCalendarShareRepository.deleteById(id);
    }
}
