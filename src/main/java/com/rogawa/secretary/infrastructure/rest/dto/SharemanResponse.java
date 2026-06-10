package com.rogawa.secretary.infrastructure.rest.dto;

import com.rogawa.secretary.domain.model.Shareman;
import java.time.LocalDateTime;
import lombok.Data;

/** シェアメン招待レスポンス */
@Data
public class SharemanResponse {
    private Long id;
    private String inviterUsername;
    private String inviteeUsername;
    private String inviterDisplayName;
    private String inviteeDisplayName;
    private String status;
    private LocalDateTime createdAt;

    public static SharemanResponse fromDomain(
            Shareman shareman, String inviterDisplayName, String inviteeDisplayName) {
        SharemanResponse res = new SharemanResponse();
        res.setId(shareman.getId());
        res.setInviterUsername(shareman.getInviterUsername());
        res.setInviteeUsername(shareman.getInviteeUsername());
        res.setInviterDisplayName(inviterDisplayName);
        res.setInviteeDisplayName(inviteeDisplayName);
        res.setStatus(shareman.getStatus());
        res.setCreatedAt(shareman.getCreatedAt());
        return res;
    }
}
