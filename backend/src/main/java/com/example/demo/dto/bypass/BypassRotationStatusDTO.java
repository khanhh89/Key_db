package com.example.demo.dto.bypass;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BypassRotationStatusDTO {
    private String activeLink;
    private Integer currentIndex;
    private Integer totalLinks;
    private String lastRotatedDate;
    private Boolean autoRotateEnabled;
    private String rotationMode;
    private List<String> pool;
    private String poolRaw;
    private List<String> targetAppIds;
    private Boolean isAllApps;
    private Integer updatedAppsCount;
    private String message;
}
