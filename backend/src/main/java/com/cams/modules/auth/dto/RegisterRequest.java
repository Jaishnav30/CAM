package com.cams.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    private String avatarUrl;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String fullName;

    private String batch;

    private String committee;

    @jakarta.validation.constraints.Pattern(
        regexp = "^$|^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$",
        message = "Invalid UPI ID format (e.g. username@okhdfcbank or 9876543210@paytm)"
    )
    private String upiId;

    @NotBlank(message = "Password is required")
    @Size(min = 7, message = "Password must be at least 7 characters long")
    private String password;

    private String confirmPassword;

    @NotBlank(message = "Requested role is required")
    private String requestedRole;

    @NotBlank(message = "6-digit verification code is required")
    @Size(min = 6, max = 6, message = "Verification code must be 6 digits")
    private String otp;

    @Override
    public String toString() {
        return "RegisterRequest(username=" + username + ", email=" + email + ", role=" + requestedRole + ")";
    }
}
