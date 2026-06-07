package com.rogawa.secretary.infrastructure.rest.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateShareRequest {
    @NotBlank
    private String sharedWithUsername;
}
