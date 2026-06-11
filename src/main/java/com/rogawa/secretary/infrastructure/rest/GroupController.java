package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.application.service.GroupService;
import com.rogawa.secretary.domain.model.Group;
import com.rogawa.secretary.domain.model.GroupMember;
import com.rogawa.secretary.domain.model.UserSetting;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.domain.repository.UserSettingRepository;
import com.rogawa.secretary.infrastructure.rest.dto.GroupMemberResponse;
import com.rogawa.secretary.infrastructure.rest.dto.GroupResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GroupController {

    private final GroupService groupService;
    private final UserRepository userRepository;
    private final UserSettingRepository userSettingRepository;

    public GroupController(GroupService groupService, UserRepository userRepository, UserSettingRepository userSettingRepository) {
        this.groupService = groupService;
        this.userRepository = userRepository;
        this.userSettingRepository = userSettingRepository;
    }

    /** 自分のグループ一覧（オーナー＋メンバー） */
    @GetMapping("/api/v1/groups")
    public ResponseEntity<List<GroupResponse>> getGroups(Authentication auth) {
        List<Group> owned = groupService.getMyGroups(auth.getName());
        List<Group> member = groupService.getMemberGroups(auth.getName());
        Set<Long> seen = owned.stream().map(Group::getId).collect(Collectors.toSet());
        for (Group g : member) {
            if (!seen.contains(g.getId())) {
                owned.add(g);
            }
        }
        return ResponseEntity.ok(owned.stream().map(GroupResponse::fromDomain).collect(Collectors.toList()));
    }

    /** 自分への招待一覧 */
    @GetMapping("/api/v1/groups/invitations")
    public ResponseEntity<List<GroupResponse>> getInvitations(Authentication auth) {
        return ResponseEntity.ok(
                groupService.getInvitations(auth.getName()).stream()
                        .map(GroupResponse::fromDomain)
                        .collect(Collectors.toList()));
    }

    /** グループ作成 */
    @PostMapping("/api/v1/groups")
    public ResponseEntity<?> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Authentication auth) {
        if (request.getIconData() == null || request.getIconData().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "アイコン画像は必須です"));
        }
        Group saved = groupService.create(request.getName(), request.getIconData(), auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(GroupResponse.fromDomain(saved));
    }

    /** グループ更新 */
    @PatchMapping("/api/v1/groups/{id}")
    public ResponseEntity<?> updateGroup(
            @PathVariable Long id,
            @Valid @RequestBody CreateGroupRequest request,
            Authentication auth) {
        try {
            Group updated = groupService.update(id, request.getName(), request.getIconData(), auth.getName());
            return ResponseEntity.ok(GroupResponse.fromDomain(updated));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** グループ削除 */
    @DeleteMapping("/api/v1/groups/{id}")
    public ResponseEntity<Void> deleteGroup(
            @PathVariable Long id, Authentication auth) {
        try {
            groupService.delete(id, auth.getName());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** グループメンバー一覧 */
    @GetMapping("/api/v1/groups/{id}/members")
    public ResponseEntity<List<GroupMemberResponse>> getMembers(
            @PathVariable Long id) {
        List<GroupMember> members = groupService.getMembers(id);
        Map<String, String> displayNames = loadDisplayNames(
                members.stream().map(GroupMember::getUsername).collect(Collectors.toSet()));
        Map<String, String> chipBgColors = loadChipBgColors(
                members.stream().map(GroupMember::getUsername).collect(Collectors.toList()));
        return ResponseEntity.ok(members.stream()
                .map(m -> GroupMemberResponse.fromDomain(m, displayNames.get(m.getUsername()), chipBgColors.get(m.getUsername())))
                .collect(Collectors.toList()));
    }

    /** グループ招待を承諾 */
    @PatchMapping("/api/v1/groups/{id}/accept")
    public ResponseEntity<?> acceptInvitation(
            @PathVariable Long id, Authentication auth) {
        try {
            GroupMember member = groupService.acceptInvitation(id, auth.getName());
            String displayName = userRepository.findByUsername(auth.getName())
                    .map(u -> u.getDisplayName()).orElse(null);
            String chipBgColor = userSettingRepository.findByUsername(auth.getName())
                    .map(UserSetting::getChipBgColor).orElse(null);
            return ResponseEntity.ok(GroupMemberResponse.fromDomain(member, displayName, chipBgColor));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** グループメンバー追加（招待） */
    @PostMapping("/api/v1/groups/{id}/members")
    public ResponseEntity<?> addMember(
            @PathVariable Long id,
            @Valid @RequestBody AddMemberRequest request,
            Authentication auth) {
        try {
            GroupMember member = groupService.addMember(id, request.getUsername(), auth.getName());
            String displayName = userRepository.findByUsername(request.getUsername())
                    .map(u -> u.getDisplayName()).orElse(null);
            String chipBgColor = userSettingRepository.findByUsername(request.getUsername())
                    .map(UserSetting::getChipBgColor).orElse(null);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(GroupMemberResponse.fromDomain(member, displayName, chipBgColor));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** グループメンバー削除 */
    @DeleteMapping("/api/v1/groups/{id}/members")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long id,
            @RequestParam String username,
            Authentication auth) {
        try {
            groupService.removeMember(id, username, auth.getName());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private Map<String, String> loadDisplayNames(Set<String> usernames) {
        if (usernames.isEmpty()) return Map.of();
        return userRepository.findByUsernames(List.copyOf(usernames)).stream()
                .collect(HashMap::new,
                        (map, u) -> map.put(u.getUsername(), u.getDisplayName()),
                        HashMap::putAll);
    }

    private Map<String, String> loadChipBgColors(List<String> usernames) {
        if (usernames.isEmpty()) return Map.of();
        return userSettingRepository.findByUsernameIn(usernames).stream()
                .collect(HashMap::new,
                        (map, s) -> map.put(s.getUsername(), s.getChipBgColor()),
                        HashMap::putAll);
    }

    @Data
    public static class CreateGroupRequest {
        @NotBlank
        private String name;
        private String iconData;
    }

    @Data
    public static class AddMemberRequest {
        @NotBlank
        private String username;
    }
}
