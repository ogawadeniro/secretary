package com.rogawa.secretary.infrastructure.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.rememberme.PersistentTokenBasedRememberMeServices;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;

/**
 * カスタム Remember-Me サービス。
 * JSON API（AuthController）から手動で loginSuccess() を呼び出すため、
 * リクエストパラメータ "remember-me" のチェックをスキップする。
 */
public class CustomRememberMeServices extends PersistentTokenBasedRememberMeServices {

    public CustomRememberMeServices(String key, UserDetailsService userDetailsService,
                                    PersistentTokenRepository tokenRepository) {
        super(key, userDetailsService, tokenRepository);
    }

    @Override
    protected boolean rememberMeRequested(HttpServletRequest request, String parameter) {
        // AuthController 側で request.isRememberMe() の判定をしているので常に true
        return true;
    }
}