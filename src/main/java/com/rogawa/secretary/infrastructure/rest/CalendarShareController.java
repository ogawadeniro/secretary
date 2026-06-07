package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.domain.model.CalendarShare;
import com.rogawa.secretary.domain.repository.CalendarShareRepository;
import com.rogawa.secretary.domain.repository.UserRepository;
import com.rogawa.secretary.infrastructure.rest.dto.CreateShareRequest;
import com.rogawa.secretary.infrastructure.rest.dto.ShareResponse;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CalendarShareController {

    private final CalendarShareRepository calendarShareRepository;
    private final UserRepository userRepository;

    public CalendarShareController(
            CalendarShareRepository calendarShareRepository,
            UserRepository userRepository) {
        this.calendarShareRepository = calendarShareRepository;
        this.userRepository = userRepository;
    }

    /** 自分が誰と共有しているか一覧 */
    @GetMapping("/api/v1/shares")
    public ResponseEntity<List<ShareResponse>> getMyShares(Authentication authentication) {
        List<ShareResponse> shares = calendarShareRepository
                .findByOwnerUsername(authentication.getName())
                .stream()
                .map(ShareResponse::fromDomain)
                .collect(Collectors.toList());
        return ResponseEntity.ok(shares);
    }

    /** 誰が自分と共有してくれているか一覧 */
    @GetMapping("/api/v1/shares/incoming")
    public ResponseEntity<List<ShareResponse>> getIncomingShares(Authentication authentication) {
        List<ShareResponse> shares = calendarShareRepository
                .findBySharedWithUsername(authentication.getName())
                .stream()
                .map(ShareResponse::fromDomain)
                .collect(Collectors.toList());
        return ResponseEntity.ok(shares);
    }

    /** 共有設定を作成 */
    @PostMapping("/api/v1/shares")
    public ResponseEntity<?> createShare(
            @Valid @RequestBody CreateShareRequest request,
            Authentication authentication) {
        String currentUser = authentication.getName();

        // 自分自身との共有は禁止
        if (currentUser.equals(request.getSharedWithUsername())) {
            return ResponseEntity.badRequest().body("自分自身とは共有できません");
        }

        // 相手が存在するか確認
        if (userRepository.findByUsername(request.getSharedWithUsername()).isEmpty()) {
            return ResponseEntity.badRequest().body("ユーザーが見つかりません");
        }

        // 重複チェック
        List<CalendarShare> existing = calendarShareRepository.findByOwnerUsername(currentUser);
        boolean duplicate = existing.stream()
                .anyMatch(s -> s.getSharedWithUsername().equals(request.getSharedWithUsername()));
        if (duplicate) {
            return ResponseEntity.badRequest().body("既に共有設定が存在します");
        }

        CalendarShare share = new CalendarShare();
        share.setOwnerUsername(currentUser);
        share.setSharedWithUsername(request.getSharedWithUsername());
        share.setPermission("READ");
        share.setCreatedAt(LocalDateTime.now());

        CalendarShare saved = calendarShareRepository.save(share);
        return ResponseEntity.status(HttpStatus.CREATED).body(ShareResponse.fromDomain(saved));
    }

    /** 共有設定を削除 */
    @DeleteMapping("/api/v1/shares/{id}")
    public ResponseEntity<Void> deleteShare(
            @PathVariable Long id,
            Authentication authentication) {
        CalendarShare share = calendarShareRepository.findById(id).orElse(null);
        if (share == null) {
            return ResponseEntity.notFound().build();
        }
        // 所有者のみ削除可能
        if (!share.getOwnerUsername().equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        calendarShareRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
