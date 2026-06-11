package com.rogawa.secretary.infrastructure.persistence;

import com.rogawa.secretary.domain.model.Group;
import com.rogawa.secretary.domain.model.GroupMember;
import com.rogawa.secretary.domain.repository.GroupRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class GroupPersistenceAdapter implements GroupRepository {

    private final JpaGroupRepository jpaGroupRepository;
    private final JpaGroupMemberRepository jpaGroupMemberRepository;

    public GroupPersistenceAdapter(
            JpaGroupRepository jpaGroupRepository,
            JpaGroupMemberRepository jpaGroupMemberRepository) {
        this.jpaGroupRepository = jpaGroupRepository;
        this.jpaGroupMemberRepository = jpaGroupMemberRepository;
    }

    @Override
    public List<Group> findByOwnerUsername(String ownerUsername) {
        return jpaGroupRepository.findByOwnerUsernameOrderByCreatedAtDesc(ownerUsername)
                .stream().map(JpaGroup::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<Group> findByMemberUsername(String username) {
        return jpaGroupRepository.findByMemberUsername(username)
                .stream().map(JpaGroup::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<Group> findByInvitedUsername(String username) {
        return jpaGroupRepository.findByInvitedUsername(username)
                .stream().map(JpaGroup::toDomain).collect(Collectors.toList());
    }

    @Override
    public Optional<Group> findById(Long id) {
        return jpaGroupRepository.findById(id).map(JpaGroup::toDomain);
    }

    @Override
    public Group save(Group group) {
        JpaGroup entity = JpaGroup.fromDomain(group);
        JpaGroup saved = jpaGroupRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteById(Long id) {
        jpaGroupRepository.deleteById(id);
    }

    @Override
    public List<GroupMember> findMembersByGroupId(Long groupId) {
        return jpaGroupMemberRepository.findByGroupId(groupId)
                .stream().map(JpaGroupMember::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<GroupMember> findAcceptedMembersByGroupId(Long groupId) {
        return jpaGroupMemberRepository.findByGroupIdAndStatus(groupId, "ACCEPTED")
                .stream().map(JpaGroupMember::toDomain).collect(Collectors.toList());
    }

    @Override
    public Optional<GroupMember> findGroupMember(Long groupId, String username) {
        return jpaGroupMemberRepository.findByGroupIdAndUsername(groupId, username)
                .map(JpaGroupMember::toDomain);
    }

    @Override
    public GroupMember saveMember(GroupMember member) {
        JpaGroupMember entity = JpaGroupMember.fromDomain(member);
        JpaGroupMember saved = jpaGroupMemberRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public void deleteMember(Long groupId, String username) {
        jpaGroupMemberRepository.deleteByGroupIdAndUsername(groupId, username);
    }
}
