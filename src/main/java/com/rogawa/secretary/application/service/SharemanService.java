package com.rogawa.secretary.application.service;

import com.rogawa.secretary.domain.model.Shareman;
import com.rogawa.secretary.domain.repository.SharemanRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SharemanService {

    private final SharemanRepository sharemanRepository;

    public SharemanService(SharemanRepository sharemanRepository) {
        this.sharemanRepository = sharemanRepository;
    }

    /** 自分が招待したシェアメン一覧 */
    public List<Shareman> getMyInvitations(String username) {
        return sharemanRepository.findByInviterUsername(username);
    }

    /** 自分が招待されたシェアメン一覧 */
    public List<Shareman> getIncomingInvitations(String username) {
        return sharemanRepository.findByInviteeUsername(username);
    }

    /** 承諾済みシェアメンのユーザー名一覧 */
    public List<String> getAcceptedUsernames(String username) {
        return sharemanRepository.findAcceptedUsernames(username);
    }

    /** シェアメン招待を作成 */
    @Transactional
    public Shareman invite(String inviterUsername, String inviteeUsername) {
        if (inviterUsername.equals(inviteeUsername)) {
            throw new IllegalArgumentException("自分自身を招待できません");
        }
        // 既存の招待をチェック（どちらの方向にも）
        if (sharemanRepository.findByInviterUsernameAndInviteeUsername(
                inviterUsername, inviteeUsername).isPresent()) {
            throw new IllegalArgumentException("既に招待済みです");
        }
        if (sharemanRepository.findByInviterUsernameAndInviteeUsername(
                inviteeUsername, inviterUsername).isPresent()) {
            throw new IllegalArgumentException("相手から既に招待されています");
        }
        Shareman shareman = new Shareman();
        shareman.setInviterUsername(inviterUsername);
        shareman.setInviteeUsername(inviteeUsername);
        shareman.setStatus("PENDING");
        shareman.setCreatedAt(LocalDateTime.now());
        shareman.setUpdatedAt(LocalDateTime.now());
        return sharemanRepository.save(shareman);
    }

    /** 招待を承諾 */
    @Transactional
    public Shareman accept(Long id, String username) {
        Shareman shareman = sharemanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("招待が見つかりません"));
        if (!shareman.getInviteeUsername().equals(username)) {
            throw new IllegalArgumentException("この招待を承諾する権限がありません");
        }
        if (!"PENDING".equals(shareman.getStatus())) {
            throw new IllegalArgumentException("この招待は既に処理されています");
        }
        shareman.setStatus("ACCEPTED");
        shareman.setUpdatedAt(LocalDateTime.now());
        return sharemanRepository.save(shareman);
    }

    /** 招待を削除（招待者・被招待者どちらも可） */
    @Transactional
    public void remove(Long id, String username) {
        Shareman shareman = sharemanRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("招待が見つかりません"));
        if (!shareman.getInviterUsername().equals(username)
                && !shareman.getInviteeUsername().equals(username)) {
            throw new IllegalArgumentException("この招待を削除する権限がありません");
        }
        sharemanRepository.deleteById(id);
    }
}
