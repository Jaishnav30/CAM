package com.cams.modules.reimbursement.repository;

import com.cams.modules.reimbursement.model.Reimbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReimbursementRepository extends JpaRepository<Reimbursement, UUID>, JpaSpecificationExecutor<Reimbursement> {

    Optional<Reimbursement> findByTransactionId(UUID transactionId);

    boolean existsByTransactionId(UUID transactionId);

    Optional<Reimbursement> findByClaimNumberIgnoreCase(String claimNumber);

    @Query(value = "SELECT nextval('claim_num_seq')", nativeQuery = true)
    Long getNextClaimNumberSequence();

    @Query("SELECT COUNT(r) FROM Reimbursement r WHERE r.claimant.id = :userId")
    long countByClaimantId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(r.transaction.amount), 0) FROM Reimbursement r WHERE r.claimant.id = :userId")
    java.math.BigDecimal sumClaimAmountByClaimantId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @Query("SELECT COUNT(r) FROM Reimbursement r WHERE r.claimant.id = :userId AND r.status = :status")
    long countByClaimantIdAndStatus(@org.springframework.data.repository.query.Param("userId") UUID userId,
                                   @org.springframework.data.repository.query.Param("status") com.cams.modules.reimbursement.model.ReimbursementStatus status);

    @Query("SELECT COALESCE(SUM(r.transaction.amount), 0) FROM Reimbursement r WHERE r.claimant.id = :userId AND r.status = :status")
    java.math.BigDecimal sumClaimAmountByClaimantIdAndStatus(@org.springframework.data.repository.query.Param("userId") UUID userId,
                                                           @org.springframework.data.repository.query.Param("status") com.cams.modules.reimbursement.model.ReimbursementStatus status);
}
