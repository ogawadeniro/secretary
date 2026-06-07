package com.rogawa.secretary.infrastructure.rest.dto;

import com.rogawa.secretary.domain.model.CalendarShare;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ShareResponse {
    private Long id;
    private String ownerUsername;
    private String sharedWithUsername;
    private String ownerDisplayName;
    private String sharedWithDisplayName;
    private String permission;
    private LocalDateTime createdAt;

    public static ShareResponse fromDomain(CalendarShare share, String ownerDisplayName, String sharedWithDisplayName) {
        ShareResponse res = new ShareResponse();
        res.setId(share.getId());
        res.setOwnerUsername(share.getOwnerUsername());
        res.setSharedWithUsername(share.getSharedWithUsername());
        res.setOwnerDisplayName(ownerDisplayName);
        res.setSharedWithDisplayName(sharedWithDisplayName);
        res.setPermission(share.getPermission());
        res.setCreatedAt(share.getCreatedAt());
        return res;
    }
}
