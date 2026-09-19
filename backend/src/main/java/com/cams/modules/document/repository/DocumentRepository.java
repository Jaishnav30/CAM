package com.cams.modules.document.repository;

import com.cams.modules.document.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByTransactionIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID transactionId);

    List<Document> findByTransactionIdInAndDeletedAtIsNull(Collection<UUID> transactionIds);

    Optional<Document> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByTransactionIdAndDeletedAtIsNull(UUID transactionId);

    List<Document> findByFileHashSha256(String fileHashSha256);
}
