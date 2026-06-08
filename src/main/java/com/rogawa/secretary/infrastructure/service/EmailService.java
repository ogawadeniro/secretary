package com.rogawa.secretary.infrastructure.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /** パスワードリセット用のメールを送信 */
    public void sendPasswordResetEmail(String to, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Secretary - パスワードリセット");
        message.setText(
                """
                パスワードリセットのリクエストを受け付けました。

                以下のリンクから新しいパスワードを設定してください。
                %s

                このリンクは30分間有効です。
                心当たりがない場合は、このメールを無視してください。
                """.formatted(resetLink));
        mailSender.send(message);
    }
}
