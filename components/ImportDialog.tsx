"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { showToast } from "@/lib/toast-utils";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportSuccess: () => void;
    title: string;
    endpoint: string;
    typeLabel: string;
}

export default function ImportDialog({
    open,
    onOpenChange,
    onImportSuccess,
    title,
    endpoint,
    typeLabel,
}: ImportDialogProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const validateAndSetFile = (file: File) => {
        if (file.type !== "application/json" && !file.name.endsWith(".json")) {
            showToast.error("Invalid file type", "Please select a .json file");
            return;
        }
        setSelectedFile(file);
        setImportResult(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setProgress(10);

        try {
            const content = await selectedFile.text();
            let jsonData;
            try {
                jsonData = JSON.parse(content);
            } catch (e) {
                throw new Error("Invalid JSON file format");
            }

            setProgress(40);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jsonData),
            });

            setProgress(80);

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to import ${typeLabel}`);
            }

            setProgress(100);
            setImportResult({ success: true, message: result.message || `${typeLabel} imported successfully` });
            showToast.success(`${typeLabel} Imported`, result.message);
            onImportSuccess();

        } catch (error: any) {
            console.error("Import error:", error);
            setImportResult({ success: false, message: error.message || "An unknown error occurred" });
            showToast.error(`Import Failed`, error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetDialog = () => {
        setSelectedFile(null);
        setImportResult(null);
        setProgress(0);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDialogClose = (newOpen: boolean) => {
        if (!newOpen) {
            resetDialog();
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                {!importResult ? (
                    <div className="space-y-4 py-4">
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
                                ${dragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"}
                                ${selectedFile ? "bg-muted/30 border-primary/30" : ""}
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".json"
                                onChange={handleFileSelect}
                                disabled={isProcessing}
                            />

                            {selectedFile ? (
                                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <div className="bg-primary/10 p-4 rounded-full mb-3">
                                        <FileJson className="h-10 w-10 text-primary" />
                                    </div>
                                    <p className="font-semibold text-foreground text-center line-clamp-1 max-w-[300px]">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile();
                                        }}
                                        className="mt-3 text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                                        disabled={isProcessing}
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Remove file
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-muted p-4 rounded-full mb-4 group-hover:bg-primary/10 transition-colors">
                                        <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground text-center">
                                        Click or drag and drop your export file
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Support only .json files exported from Smartrack
                                    </p>
                                </>
                            )}
                        </div>

                        {isProcessing && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-muted-foreground">Processing...</span>
                                    <span className="text-primary">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        {importResult.success ? (
                            <>
                                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-4">
                                    <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">
                                    Import Successful
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {importResult.message}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
                                    <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">
                                    Import Failed
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                    {importResult.message}
                                </p>
                            </>
                        )}
                    </div>
                )}

                <DialogFooter className="sm:justify-between flex-row gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => handleDialogClose(false)}
                        disabled={isProcessing}
                        className="flex-1"
                    >
                        {importResult ? "Close" : "Cancel"}
                    </Button>

                    {!importResult && (
                        <Button
                            onClick={handleImport}
                            disabled={!selectedFile || isProcessing}
                            className="flex-1"
                        >
                            {isProcessing ? "Importing..." : "Start Import"}
                        </Button>
                    ) || (
                            <Button
                                onClick={resetDialog}
                                variant="outline"
                                className="flex-1"
                            >
                                Import Another
                            </Button>
                        )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
