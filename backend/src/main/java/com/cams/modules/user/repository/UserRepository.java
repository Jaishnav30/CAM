package com.cams.modules.user.repository;

import com.cams.modules.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    java.util.List<User> findByApprovalStatusOrderByCreatedAtDesc(com.cams.modules.user.model.ApprovalStatus status);

    java.util.List<User> findAllByOrderByCreatedAtDesc();

    long countByApprovalStatus(com.cams.modules.user.model.ApprovalStatus status);

    @Query("SELECT COUNT(u) > 0 FROM User u JOIN u.roles r WHERE r.name = :roleName AND u.isActive = true")
    boolean existsActiveAdminUser(@Param("roleName") String roleName);
}
