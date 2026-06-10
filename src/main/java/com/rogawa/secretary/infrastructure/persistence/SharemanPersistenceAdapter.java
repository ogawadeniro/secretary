package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.Shareman;
import com.rogawa.secretary.domain.repository.SharemanRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Repository;

@Repository
public class SharemanPersistenceAdapter implements SharemanRepository {

    private final JpaSharemanRepository jpaSharemanRepository;

    public SharemanPersistenceAdapter(JpaSharemanRepository jpaSharemanRepository) {
        this.jpaSharemanRepository = jpaSharemanRepository;
    }

    @Override
    public List<Shareman> findByInviterUsername(String inviterUsername) {
        return jpaSharemanRepository.findByInviterUsernameOrderByCreatedAtDesc(inviterUsername)
                .stream().map(JpaShareman::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<Shareman> findByInviteeUsername(String inviteeUsername) {
        return jpaSharemanRepository.findByInviteeUsernameOrderByCreatedAtDesc(inviteeUsername)
                .stream().map(JpaShareman::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<String> findAcceptedUsernames(String username) {
        List<String> invited = jpaSharemanRepository.findAcceptedInviteeUsernames(username);
        List<String> invitedBy = jpaSharemanRepository.findAcceptedInviterUsernames(username);
        return Stream.concat(invited.stream(), invitedBy.stream())
                .distinct().collect(Collectors.toList());
    }

    @Override
    public Optional<Shareman> findById(Long id) {
        return jpaSharemanRepository.findById(id).map(JpaShareman::toDomain);
    }

    @Override
    public Optional<Shareman> findByInviterUsernameAndInviteeUsername(
            String inviterUsername, String inviteeUsername) {
        return jpaSharemanRepository.findByInviterUsernameAndInviteeUsername(
                inviterUsername, inviteeUsername).map(JpaShareman::toDomain);
    }

    @Override
    public Shareman save(Shareman shareman) {
        JpaShareman entity = JpaShareman.fromDomain(shareman);
        JpaShareman saved = jpaSharemanRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteById(Long id) {
        jpaSharemanRepository.deleteById(id);
    }
}
