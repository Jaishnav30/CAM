package com.cams.modules.report.util;

public final class CsvExportUtil {

    private CsvExportUtil() {}

    public static String escapeCsvCell(Object value) {
        if (value == null) {
            return "";
        }
        String str = value.toString().trim();
        if (str.isEmpty()) {
            return "";
        }

        // Neutralize spreadsheet formula injection (=, +, -, @, \t, \r)
        char firstChar = str.charAt(0);
        if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@' || firstChar == '\t' || firstChar == '\r') {
            str = "'" + str;
        }

        // Standard RFC-4180 escaping for commas, double quotes, and newlines
        if (str.contains(",") || str.contains("\"") || str.contains("\n") || str.contains("\r")) {
            str = "\"" + str.replace("\"", "\"\"") + "\"";
        }

        return str;
    }

    public static String buildCsvRow(Object... cells) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cells.length; i++) {
            sb.append(escapeCsvCell(cells[i]));
            if (i < cells.length - 1) {
                sb.append(",");
            }
        }
        sb.append("\r\n");
        return sb.toString();
    }
}
