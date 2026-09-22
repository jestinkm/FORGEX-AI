package com.ticket.model.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAdmissionRateRequest {
    @Min(value = 1, message = "Batch size must be at least 1")
    private int batchSize;
}
