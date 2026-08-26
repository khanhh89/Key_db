package com.example.demo.dto;

import lombok.Data;

@Data
public class FeedbackReplyDTO {
    private String status;
    private String adminReply;
    private Boolean isApprovedForHome;
}
