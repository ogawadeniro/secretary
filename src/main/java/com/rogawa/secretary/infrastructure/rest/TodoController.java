package com.rogawa.secretary.infrastructure.rest;

import com.rogawa.secretary.application.service.TodoService;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/todos")
public class TodoController {

    private final TodoService todoService;

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    /** やること一覧を取得 */
    @GetMapping
    public ResponseEntity<List<TodoDto>> getTodos(Authentication authentication) {
        List<TodoDto> dtos = todoService.getTodos(authentication.getName()).stream()
                .map(TodoDto::fromDomain)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /** やことを作成 */
    @PostMapping
    public ResponseEntity<TodoDto> createTodo(
            @Validated @RequestBody TodoDto request,
            Authentication authentication) {
        var created = todoService.create(request.toDomain(), authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(TodoDto.fromDomain(created));
    }

    /** やことを更新 */
    @PatchMapping("/{id}")
    public ResponseEntity<TodoDto> updateTodo(
            @PathVariable Long id,
            @RequestBody TodoDto request,
            Authentication authentication) {
        var updated = todoService.update(id, request.toDomain(), authentication.getName());
        return ResponseEntity.ok(TodoDto.fromDomain(updated));
    }

    /** やことを削除 */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(
            @PathVariable Long id,
            Authentication authentication) {
        todoService.delete(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /** やことにメンバーを追加 */
    @PostMapping("/{id}/members")
    public ResponseEntity<TodoDto> addMember(
            @PathVariable Long id,
            @RequestBody MemberRequest request,
            Authentication authentication) {
        var updated = todoService.addMember(id, request.getUsername(), authentication.getName());
        return ResponseEntity.ok(TodoDto.fromDomain(updated));
    }

    /** やことからメンバーを削除 */
    @DeleteMapping("/{id}/members/{username}")
    public ResponseEntity<TodoDto> removeMember(
            @PathVariable Long id,
            @PathVariable String username,
            Authentication authentication) {
        var updated = todoService.removeMember(id, username, authentication.getName());
        return ResponseEntity.ok(TodoDto.fromDomain(updated));
    }

    /** メンバー追加リクエスト */
    public static class MemberRequest {
        private String username;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }
}
