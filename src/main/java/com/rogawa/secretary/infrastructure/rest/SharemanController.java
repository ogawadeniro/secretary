package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.application.service.SharemanService;
import com.rogawa.secretary.domain.model.Shareman;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.infrastructure.rest.dto.SharemanResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SharemanController {

    private final SharemanService sharemanService;
    private final UserRepository userRepository;

    public SharemanController(SharemanService sharemanService, UserRepository userRepository) {
        this.sharemanService = sharemanService;
        this.userRepository = userRepository;
    }

    /** 自分が招待したシェアメン一覧 */
    @GetMapping("/api/v1/shares")
    public ResponseEntity<List<SharemanResponse>> getMyInvitations(Authentication auth) {
        List<Shareman> list = sharemanService.getMyInvitations(auth.getName());
        Map<String, String> displayNames = loadDisplayNames(
                list.stream().map(Shareman::getInviteeUsername).collect(Collectors.toSet()));
        return ResponseEntity.ok(list.stream()
                .map(s -> SharemanResponse.fromDomain(s, null, displayNames.get(s.getInviteeUsername())))
                .collect(Collectors.toList()));
    }

    /** 自分が招待されたシェアメン一覧 */
    @GetMapping("/api/v1/shares/incoming")
    public ResponseEntity<List<SharemanResponse>> getIncomingInvitations(Authentication auth) {
        List<Shareman> list = sharemanService.getIncomingInvitations(auth.getName());
        Map<String, String> displayNames = loadDisplayNames(
                list.stream().map(Shareman::getInviterUsername).collect(Collectors.toSet()));
        return ResponseEntity.ok(list.stream()
                .map(s -> SharemanResponse.fromDomain(s, displayNames.get(s.getInviterUsername()), null))
                .collect(Collectors.toList()));
    }

    /** シェアメン招待を作成 */
    @PostMapping("/api/v1/shares")
    public ResponseEntity<?> createInvitation(
            @Valid @RequestBody InviteRequest request,
            Authentication auth) {
        String currentUser = auth.getName();
        if (currentUser.equals(request.getUsername())) {
            return ResponseEntity.badRequest().body(Map.of("message", "自分自身を招待できません"));
        }
        if (userRepository.findByUsername(request.getUsername()).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "ユーザーが見つかりません"));
        }
        try {
            Shareman saved = sharemanService.invite(currentUser, request.getUsername());
            String displayName = userRepository.findByUsername(request.getUsername())
                    .map(u -> u.getDisplayName()).orElse(null);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(SharemanResponse.fromDomain(saved, null, displayName));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** 招待を承諾 */
    @PatchMapping("/api/v1/shares/{id}/accept")
    public ResponseEntity<?> acceptInvitation(
            @PathVariable Long id, Authentication auth) {
        try {
            Shareman saved = sharemanService.accept(id, auth.getName());
            return ResponseEntity.ok(SharemanResponse.fromDomain(saved, null, null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** 招待を削除 */
    @DeleteMapping("/api/v1/shares/{id}")
    public ResponseEntity<Void> removeInvitation(
            @PathVariable Long id, Authentication auth) {
        try {
            sharemanService.remove(id, auth.getName());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** 承諾済みシェアメンのユーザー名一覧 */
    @GetMapping("/api/v1/shares/accepted")
    public ResponseEntity<List<String>> getAcceptedUsernames(Authentication auth) {
        return ResponseEntity.ok(sharemanService.getAcceptedUsernames(auth.getName()));
    }

    private Map<String, String> loadDisplayNames(Set<String> usernames) {
        if (usernames.isEmpty()) return Map.of();
        return userRepository.findByUsernames(List.copyOf(usernames)).stream()
                .collect(Collectors.toMap(u -> u.getUsername(), u -> u.getDisplayName(), (a, b) -> a));
    }

    @Data
    public static class InviteRequest {
        @NotBlank
        private String username;
    }
}
