package com.example.demo.dto.bypass;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BypassRotationConfigDTO {
    private String linkPool;
    private String rotationMode; // "DAILY_SEQUENTIAL" or "DAILY_RANDOM"
    private List<String> targetAppIds;
    private Boolean autoRotateEnabled;
}
