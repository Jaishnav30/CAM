package com.cams.modules.category.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkDeleteCategoryResponse {

    private int deletedCount;
    private List<UUID> deletedIds;
    private List<String> deletedNames;
    private int failedCount;
    private List<String> failedReasons;
}
