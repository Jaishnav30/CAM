package com.cams.modules.report.controller;

import com.cams.common.ApiResponse;
import com.cams.modules.reimbursement.dto.ReimbursementResponse;
import com.cams.modules.report.dto.ReimbursementReportFilterParams;
import com.cams.modules.report.dto.TransactionReportFilterParams;
import com.cams.modules.report.service.ReportService;
import com.cams.modules.transaction.dto.TransactionResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyAuthority('reports:read', 'reports:generate')")
    public ResponseEntity<?> getTransactionsReport(
            TransactionReportFilterParams params,
            HttpServletRequest request
    ) {
        boolean isCsv = "csv".equalsIgnoreCase(params.getFormat()) ||
                        (request.getHeader(HttpHeaders.ACCEPT) != null && request.getHeader(HttpHeaders.ACCEPT).contains("text/csv"));

        if (isCsv) {
            byte[] csvBytes = reportService.generateTransactionCsv(params);
            String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
            String filename = "transactions_report_" + dateStr + ".csv";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .body(csvBytes);
        }

        List<TransactionResponse> data = reportService.getTransactionsReportData(params);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/reimbursements")
    @PreAuthorize("hasAnyAuthority('reports:read', 'reports:generate')")
    public ResponseEntity<?> getReimbursementsReport(
            ReimbursementReportFilterParams params,
            HttpServletRequest request
    ) {
        boolean isCsv = "csv".equalsIgnoreCase(params.getFormat()) ||
                        (request.getHeader(HttpHeaders.ACCEPT) != null && request.getHeader(HttpHeaders.ACCEPT).contains("text/csv"));

        if (isCsv) {
            byte[] csvBytes = reportService.generateReimbursementCsv(params);
            String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
            String filename = "reimbursements_report_" + dateStr + ".csv";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                    .body(csvBytes);
        }

        List<ReimbursementResponse> data = reportService.getReimbursementsReportData(params);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
