package com.cams.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Username or email is required")
    @JsonAlias({"username", "identifier"})
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @Override
    public String toString() {
        return "LoginRequest(email=" + email + ", password=[PROTECTED])";
    }
}
