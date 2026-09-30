package com.example.demo.service;

import com.example.demo.model.IpFilterRuleEntity;
import com.example.demo.repository.IpFilterRuleRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FirewallService {

    @Autowired
    private IpFilterRuleRepository ipFilterRuleRepository;

    private final ConcurrentHashMap<String, String> ipRulesCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void initCache() {
        refreshCache();
    }

    public void refreshCache() {
        ipRulesCache.clear();
        List<IpFilterRuleEntity> rules = ipFilterRuleRepository.findAll();
        for (IpFilterRuleEntity rule : rules) {
            ipRulesCache.put(rule.getIpAddress(), rule.getAction());
        }
    }

    /**
     * Checks if the IP is allowed.
     * Returns true if allowed or no rule is found.
     * Returns false if explicitly blocked.
     */
    public boolean isAllowed(String ipAddress) {
        String action = ipRulesCache.get(ipAddress);
        if (action != null) {
            return !"BLOCK".equalsIgnoreCase(action);
        }
        return true; // Default allow if not in DB
    }

    public void addRule(String ipAddress, String action, String notes) {
        IpFilterRuleEntity rule = ipFilterRuleRepository.findByIpAddress(ipAddress).orElse(new IpFilterRuleEntity());
        rule.setIpAddress(ipAddress);
        rule.setAction(action.toUpperCase());
        rule.setNotes(notes);
        ipFilterRuleRepository.save(rule);
        ipRulesCache.put(ipAddress, action.toUpperCase());
    }

    public void removeRule(String ipAddress) {
        ipFilterRuleRepository.findByIpAddress(ipAddress).ifPresent(ipFilterRuleRepository::delete);
        ipRulesCache.remove(ipAddress);
    }
}
