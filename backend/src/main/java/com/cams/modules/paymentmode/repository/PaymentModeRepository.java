package com.cams.modules.paymentmode.repository;

import com.cams.modules.paymentmode.model.PaymentMode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentModeRepository extends JpaRepository<PaymentMode, UUID> {

    List<PaymentMode> findByIsActiveTrueOrderByCodeAsc();

    Optional<PaymentMode> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
