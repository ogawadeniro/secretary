package com.rogawa.secretary.application.service;

import com.rogawa.secretary.domain.model.Group;
import com.rogawa.secretary.domain.model.GroupMember;
import com.rogawa.secretary.domain.repository.GroupRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {

    private final GroupRepository groupRepository;

    public GroupService(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    /** 自分がオーナーのグループ一覧 */
    public List<Group> getMyGroups(String username) {
        return groupRepository.findByOwnerUsername(username);
    }

    /** 自分がメンバーのグループ一覧 */
    public List<Group> getMemberGroups(String username) {
        return groupRepository.findByMemberUsername(username);
    }

    /** グループ作成 */
    @Transactional
    public Group create(String name, String ownerUsername) {
        Group group = new Group();
        group.setName(name);
        group.setOwnerUsername(ownerUsername);
        group.setCreatedAt(LocalDateTime.now());
        group.setUpdatedAt(LocalDateTime.now());
        Group saved = groupRepository.save(group);
        // オーナーを自動的にメンバー追加（承諾済み）
        GroupMember ownerMember = new GroupMember();
        ownerMember.setGroupId(saved.getId());
        ownerMember.setUsername(ownerUsername);
        ownerMember.setRole("OWNER");
        ownerMember.setStatus("ACCEPTED");
        ownerMember.setCreatedAt(LocalDateTime.now());
        groupRepository.saveMember(ownerMember);
        return saved;
    }

    /** グループ更新 */
    @Transactional
    public Group update(Long id, String name, String username) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("グループが見つかりません"));
        if (!group.getOwnerUsername().equals(username)) {
            throw new IllegalArgumentException("グループを編集できるのはオーナーのみです");
        }
        group.setName(name);
        group.setUpdatedAt(LocalDateTime.now());
        return groupRepository.save(group);
    }

    /** グループ削除 */
    @Transactional
    public void delete(Long id, String username) {
        Group group = groupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("グループが見つかりません"));
        if (!group.getOwnerUsername().equals(username)) {
            throw new IllegalArgumentException("グループを削除できるのはオーナーのみです");
        }
        groupRepository.deleteById(id);
    }

    /** グループメンバー一覧 */
    public List<GroupMember> getMembers(Long groupId) {
        return groupRepository.findMembersByGroupId(groupId);
    }

    /** グループメンバー追加（招待） */
    @Transactional
    public GroupMember addMember(Long groupId, String memberUsername, String username) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("グループが見つかりません"));
        if (!group.getOwnerUsername().equals(username)) {
            throw new IllegalArgumentException("メンバーを追加できるのはオーナーのみです");
        }
        if (groupRepository.findGroupMember(groupId, memberUsername).isPresent()) {
            throw new IllegalArgumentException("既にメンバーです");
        }
        GroupMember member = new GroupMember();
        member.setGroupId(groupId);
        member.setUsername(memberUsername);
        member.setRole("MEMBER");
        member.setStatus("INVITED");
        member.setCreatedAt(LocalDateTime.now());
        return groupRepository.saveMember(member);
    }

    /** グループ招待を承諾 */
    @Transactional
    public GroupMember acceptInvitation(Long groupId, String username) {
        GroupMember member = groupRepository.findGroupMember(groupId, username)
                .orElseThrow(() -> new IllegalArgumentException("招待が見つかりません"));
        if (!"INVITED".equals(member.getStatus())) {
            throw new IllegalArgumentException("承諾可能な招待がありません");
        }
        member.setStatus("ACCEPTED");
        return groupRepository.saveMember(member);
    }

    /** 自分への招待一覧 */
    public List<Group> getInvitations(String username) {
        return groupRepository.findByInvitedUsername(username);
    }

    /** グループメンバー削除 */
    @Transactional
    public void removeMember(Long groupId, String memberUsername, String username) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("グループが見つかりません"));
        if (!group.getOwnerUsername().equals(username)) {
            throw new IllegalArgumentException("メンバーを削除できるのはオーナーのみです");
        }
        if (memberUsername.equals(group.getOwnerUsername())) {
            throw new IllegalArgumentException("オーナーをメンバーから削除できません");
        }
        groupRepository.deleteMember(groupId, memberUsername);
    }

    /** ユーザーがグループの承諾済みメンバーか判定 */
    public boolean isGroupMember(Long groupId, String username) {
        return groupRepository.findGroupMember(groupId, username)
                .filter(m -> "ACCEPTED".equals(m.getStatus()))
                .isPresent();
    }
}
