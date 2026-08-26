package com.example.demo.dto;

import lombok.Data;
import java.util.List;

@Data
public class FeedbackCreateDTO {
    private String category;
    private String title;
    private String content;
    private Integer rating;
    private String contactInfo;
    private List<String> attachmentUrls;
}
