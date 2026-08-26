package com.example.demo.service;

import com.example.demo.dto.FeedbackCreateDTO;
import com.example.demo.dto.FeedbackReplyDTO;
import com.example.demo.model.FeedbackEntity;
import com.example.demo.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private DeviceService deviceService;

    private static final int MAX_FEEDBACKS_PER_10_MINUTES = 5;

    @Transactional
    public FeedbackEntity createFeedback(String deviceId, FeedbackCreateDTO dto, String ipAddress, String userAgent) {
        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new IllegalArgumentException("Device ID is required to send feedback.");
        }

        // 1. Check if device is blocked
        if (deviceService.isBlocked(deviceId)) {
            throw new IllegalStateException("Device is blocked from submitting feedbacks.");
        }

        // 2. Rate limiting check (max 5 feedbacks in last 10 mins)
        LocalDateTime tenMinutesAgo = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).minusMinutes(10);
        long recentCount = feedbackRepository.countByDeviceIdAndCreatedAtAfter(deviceId, tenMinutesAgo);
        if (recentCount >= MAX_FEEDBACKS_PER_10_MINUTES) {
            throw new IllegalStateException("Rate limit exceeded. Please wait before submitting more feedback.");
        }

        // 3. Ensure device entity exists in database
        deviceService.syncDevice(deviceId, ipAddress, userAgent, null);

        // 4. Validate input
        if (dto.getTitle() == null || dto.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty.");
        }
        if (dto.getContent() == null || dto.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("Content cannot be empty.");
        }

        String attachmentUrlsStr = null;
        if (dto.getAttachmentUrls() != null && !dto.getAttachmentUrls().isEmpty()) {
            attachmentUrlsStr = String.join(",", dto.getAttachmentUrls());
        }

        FeedbackEntity feedback = FeedbackEntity.builder()
                .deviceId(deviceId)
                .category(dto.getCategory() != null ? dto.getCategory() : "GENERAL_FEEDBACK")
                .title(dto.getTitle().trim())
                .content(dto.getContent().trim())
                .rating(dto.getRating())
                .contactInfo(dto.getContactInfo() != null ? dto.getContactInfo().trim() : null)
                .attachmentUrls(attachmentUrlsStr)
                .status("PENDING")
                .build();

        return feedbackRepository.save(feedback);
    }

    public List<FeedbackEntity> getFeedbacksByDevice(String deviceId) {
        if (deviceId == null || deviceId.trim().isEmpty()) {
            return List.of();
        }
        return feedbackRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId);
    }

    public Page<FeedbackEntity> getAdminFeedbacks(String status, String category, Pageable pageable) {
        boolean hasStatus = status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status);
        boolean hasCategory = category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category);

        if (hasStatus && hasCategory) {
            return feedbackRepository.findByStatusAndCategory(status, category, pageable);
        } else if (hasStatus) {
            return feedbackRepository.findByStatus(status, pageable);
        } else if (hasCategory) {
            return feedbackRepository.findByCategory(category, pageable);
        } else {
            return feedbackRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
    }

    public List<FeedbackEntity> getApprovedPublicFeedbacks() {
        return feedbackRepository.findByIsApprovedForHomeTrueOrderByCreatedAtDesc();
    }

    @Transactional
    public FeedbackEntity replyFeedback(Long feedbackId, FeedbackReplyDTO dto) {
        FeedbackEntity feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found with ID: " + feedbackId));

        if (dto.getStatus() != null && !dto.getStatus().trim().isEmpty()) {
            feedback.setStatus(dto.getStatus().trim().toUpperCase());
        }
        if (dto.getAdminReply() != null) {
            feedback.setAdminReply(dto.getAdminReply().trim());
            feedback.setRepliedAt(LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
        }
        if (dto.getIsApprovedForHome() != null) {
            feedback.setIsApprovedForHome(dto.getIsApprovedForHome());
        }

        return feedbackRepository.save(feedback);
    }
}
