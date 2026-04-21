import React, { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/lib/toast-utils";

interface ImportExportButtonsProps {
    exportUrl: string;
    importUrl: string;
    onImportSuccess: () => void;
    exportFileName?: string; // Optional: purely for tracking
    itemName?: string;
}

export function ImportExportButtons({
    exportUrl,
    importUrl,
    onImportSuccess,
    itemName = "data",
}: ImportExportButtonsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const tokenResult = await fetch("/api/auth/session"); // Or whatever auth logic if required

            const response = await fetch(exportUrl, {
                method: "GET",
            });

            if (!response.ok) {
                throw new Error("Failed to export " + itemName);
            }

            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Get filename from header if possible
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = `export-${new Date().toISOString().split('T')[0]}.json`;
            if (contentDisposition && contentDisposition.includes("filename=")) {
                filename = contentDisposition.split("filename=")[1].replace(/["']/g, "");
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast.success(`Successfully exported ${itemName}`);
        } catch (error: any) {
            console.error("Export Error:", error);
            showToast.error(error.message || `Failed to export ${itemName}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".json")) {
            showToast.error("Please select a valid JSON file");
            e.target.value = "";
            return;
        }

        setIsImporting(true);
        try {
            const fileContent = await file.text();
            const jsonData = JSON.parse(fileContent);

            const response = await fetch(importUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(jsonData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || `Failed to import ${itemName}`);
            }

            showToast.success(result.message || `Successfully imported ${itemName}`);
            onImportSuccess();
        } catch (error: any) {
            console.error("Import Error:", error);
            showToast.error(error.message || `Invalid JSON structure or import failed`);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />
            <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full sm:w-auto"
            >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? "Importing..." : "Import"}
            </Button>
            <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto"
            >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? "Exporting..." : "Export"}
            </Button>
        </div>
    );
}
