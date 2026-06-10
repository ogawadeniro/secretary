package com.rogawa.secretary.domain.repository;

import com.rogawa.secretary.domain.model.Shareman;
import java.util.List;
import java.util.Optional;

/** シェアメンリポジトリポート */
public interface SharemanRepository {
    /** 自分が招待したシェアメン一覧 */
    List<Shareman> findByInviterUsername(String inviterUsername);

    /** 自分が招待されたシェアメン一覧 */
    List<Shareman> findByInviteeUsername(String inviteeUsername);

    /** 承諾済みのシェアメン（両方向）の相手ユーザー名一覧 */
    List<String> findAcceptedUsernames(String username);

    Optional<Shareman> findById(Long id);

    Optional<Shareman> findByInviterUsernameAndInviteeUsername(
            String inviterUsername, String inviteeUsername);

    Shareman save(Shareman shareman);

    void deleteById(Long id);
}
