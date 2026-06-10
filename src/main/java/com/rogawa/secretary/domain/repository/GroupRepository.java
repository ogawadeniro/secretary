package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.Group;
import com.rogawa.secretary.domain.model.GroupMember;
import java.util.List;
import java.util.Optional;

/** グループリポジトリポート */
public interface GroupRepository {
    List<Group> findByOwnerUsername(String ownerUsername);

    /** 自分がメンバーとして参加しているグループ一覧 */
    List<Group> findByMemberUsername(String username);

    Optional<Group> findById(Long id);

    Group save(Group group);

    void deleteById(Long id);

    // GroupMember
    List<GroupMember> findMembersByGroupId(Long groupId);

    Optional<GroupMember> findGroupMember(Long groupId, String username);

    GroupMember saveMember(GroupMember member);

    void deleteMember(Long groupId, String username);
}
