package com.example.demo.controller;

import com.example.demo.model.FreeKeyNoteEntity;
import com.example.demo.service.FreeKeyNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class FreeKeyNoteController {

    private final FreeKeyNoteService noteService;

    @Autowired
    public FreeKeyNoteController(FreeKeyNoteService noteService) {
        this.noteService = noteService;
    }

    // ==========================================
    // PUBLIC APIS
    // ==========================================

    @GetMapping("/public/{slug}")
    public ResponseEntity<?> getPublicNote(
            @PathVariable String slug,
            @RequestParam(value = "password", required = false) String password) {
        return noteService.getPublicNoteBySlug(slug, password);
    }

    @PostMapping("/public/{slug}/verify")
    public ResponseEntity<?> verifyPassword(
            @PathVariable String slug,
            @RequestBody(required = false) Map<String, String> body) {
        return noteService.verifyPassword(slug, body);
    }

    // ==========================================
    // ADMIN APIS
    // ==========================================

    @GetMapping("/admin")
    public ResponseEntity<?> getAllAdminNotes(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth) {
        return noteService.getAllAdminNotes(adminAuth);
    }

    @PostMapping("/admin")
    public ResponseEntity<?> createNote(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @RequestBody FreeKeyNoteEntity note) {
        return noteService.createNote(adminAuth, note);
    }

    @PutMapping("/admin/{id}")
    public ResponseEntity<?> updateNote(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id,
            @RequestBody FreeKeyNoteEntity note) {
        return noteService.updateNote(adminAuth, id, note);
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> deleteNote(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        return noteService.deleteNote(adminAuth, id);
    }

    @PatchMapping("/admin/{id}/toggle")
    public ResponseEntity<?> toggleActive(
            @RequestHeader(value = "X-Admin-Auth", required = false) String adminAuth,
            @PathVariable String id) {
        return noteService.toggleActive(adminAuth, id);
    }
}
