package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiMetricsDTO {

    private String timeframe; // TODAY, 7DAYS, 30DAYS, ALL

    // Overview & Traffic
    private long totalPageViews;
    private long uniqueDevices;
    private long mobileDevices;
    private long desktopDevices;

    // Order & Conversion Metrics
    private long totalOrders;
    private long paidOrders;
    private long pendingOrders;
    private long cancelledOrders;
    private double totalRevenue;
    private double conversionRate; // (paid / total) * 100
    private double abandonmentRate; // (pending / total) * 100

    // Friction & Pain Point Signals
    private long keyStockoutIncidents;
    private long lookupNotFoundIncidents;
    private long couponFailureIncidents;
    private long paymentTimeoutIncidents;
    private long checkoutAbandonedIncidents;

    // Customer Sentiment & Feedback
    private long totalFeedbacks;
    private double avgRating;
    private long bugReportsCount;
    private long complaintsCount;
    private long negativeFeedbacksCount; // <= 2 stars

    // UX Health Score & Breakdown
    private int calculatedUxHealthScore; // 0 - 100
    private String healthStatus; // EXCELLENT, GOOD, NEEDS_ATTENTION, CRITICAL

    // Aggregations
    private List<Map<String, Object>> topFrictionPoints;
    private List<Map<String, Object>> topAppsPerformance;
    private List<String> recentCustomerComplaints;
}
