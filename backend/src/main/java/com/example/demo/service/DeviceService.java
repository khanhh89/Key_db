package com.example.demo.service;

import com.example.demo.dto.DeviceSyncDTO;
import com.example.demo.model.DeviceUserEntity;
import com.example.demo.repository.DeviceUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class DeviceService {

    @Autowired
    private DeviceUserRepository deviceUserRepository;

    @Transactional
    public DeviceUserEntity syncDevice(String deviceId, String ipAddress, String userAgent, DeviceSyncDTO syncDTO) {
        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new IllegalArgumentException("Device ID cannot be null or empty.");
        }

        Optional<DeviceUserEntity> existingOpt = deviceUserRepository.findById(deviceId);
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));

        if (existingOpt.isPresent()) {
            DeviceUserEntity device = existingOpt.get();
            device.setIpAddress(ipAddress);
            device.setUserAgent(userAgent);
            if (syncDTO != null && syncDTO.getFingerprint() != null) {
                device.setDeviceFingerprint(syncDTO.getFingerprint());
            }
            device.setLastSeenAt(now);
            return deviceUserRepository.save(device);
        } else {
            DeviceUserEntity newDevice = DeviceUserEntity.builder()
                    .id(deviceId)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .deviceFingerprint(syncDTO != null ? syncDTO.getFingerprint() : null)
                    .isBlocked(false)
                    .firstSeenAt(now)
                    .lastSeenAt(now)
                    .build();
            return deviceUserRepository.save(newDevice);
        }
    }

    public boolean isBlocked(String deviceId) {
        if (deviceId == null) return false;
        return deviceUserRepository.findById(deviceId)
                .map(device -> Boolean.TRUE.equals(device.getIsBlocked()))
                .orElse(false);
    }

    @Transactional
    public DeviceUserEntity setDeviceBlockedStatus(String deviceId, boolean isBlocked) {
        DeviceUserEntity device = deviceUserRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
        device.setIsBlocked(isBlocked);
        return deviceUserRepository.save(device);
    }

    public Optional<DeviceUserEntity> getDeviceById(String deviceId) {
        return deviceUserRepository.findById(deviceId);
    }
}
