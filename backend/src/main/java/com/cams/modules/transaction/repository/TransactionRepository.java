package com.cams.modules.transaction.repository;

import com.cams.modules.transaction.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {

    @Query(value = "SELECT nextval('transaction_num_seq')", nativeQuery = true)
    Long getNextTransactionSequence();

    Optional<Transaction> findByTransactionNumber(String transactionNumber);

    boolean existsByCategoryId(UUID categoryId);

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.createdBy.id = :userId AND t.status != com.cams.modules.transaction.model.TransactionStatus.ARCHIVED")
    long countByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.createdBy.id = :userId AND t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT AND t.status != com.cams.modules.transaction.model.TransactionStatus.ARCHIVED")
    java.math.BigDecimal sumAmountSpentByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @Query("SELECT DISTINCT t.payerFrom FROM Transaction t WHERE t.payerFrom IS NOT NULL AND LENGTH(TRIM(t.payerFrom)) > 0 ORDER BY t.payerFrom ASC")
    java.util.List<String> findDistinctPayers();

    @Query("SELECT DISTINCT t.recipientTo FROM Transaction t WHERE t.recipientTo IS NOT NULL AND LENGTH(TRIM(t.recipientTo)) > 0 ORDER BY t.recipientTo ASC")
    java.util.List<String> findDistinctRecipients();
}
