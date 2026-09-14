package com.cams.modules.category.dto;

import com.cams.modules.category.model.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCategoryRequest {

    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Category name must not exceed 100 characters")
    private String name;

    @NotNull(message = "Category type is required (INCOME, EXPENSE, BOTH)")
    private CategoryType type;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
}
