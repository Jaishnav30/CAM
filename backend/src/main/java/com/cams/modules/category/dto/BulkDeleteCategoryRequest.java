package com.cams.modules.category.dto;

import jakarta.validation.constraints.NotEmpty;
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
public class BulkDeleteCategoryRequest {

    @NotEmpty(message = "Category IDs list must not be empty")
    private List<UUID> ids;
}
