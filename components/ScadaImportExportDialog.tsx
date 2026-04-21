"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Upload,
    X,
    CheckCircle,
    AlertCircle,
    FileText,
    Loader2,
    FileInput,
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";

interface ScadaImportExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImportResult {
    success: boolean;
    layoutsImported: number;
    itemsImported: number;
    errors: string[];
    warnings: string[];
}

export default function ScadaImportExportDialog({
    open,
    onOpenChange,
}: ScadaImportExportDialogProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drag & drop handlers
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
            const file = e.dataTransfer.files[0];
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file: File) => {
        if (!file.name.toLowerCase().endsWith('.json')) {
            showToast.error('Invalid file type', 'Please select a JSON file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showToast.error('File too large', 'Please select a file smaller than 10MB.');
            return;
        }

        showToast.success('File selected', `Selected: ${file.name}`);
        setSelectedFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const simulateImport = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            // Simulate reading file
            setProgress(25);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Simulate parsing and validation
            setProgress(50);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate importing layouts
            setProgress(75);
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Simulate finalizing import
            setProgress(100);
            await new Promise(resolve => setTimeout(resolve, 500));

            const result: ImportResult = {
                success: true,
                layoutsImported: 1,
                itemsImported: 12,
                errors: [],
                warnings: []
            };

            setImportResult(result);
            showToast.success('Import completed', `${result.layoutsImported} SCADA layout imported successfully`);

        } catch (error) {
            setImportResult({
                success: false,
                layoutsImported: 0,
                itemsImported: 0,
                errors: ['Failed to parse file or network error occurred'],
                warnings: []
            });
            showToast.error('Import failed', 'Please check your file and try again');
        } finally {
            setIsProcessing(false);
        }
    };

    const resetDialog = () => {
        setIsProcessing(false);
        setProgress(0);
        setImportResult(null);
        setSelectedFile(null);
        setDragActive(false);
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            resetDialog();
        }
        onOpenChange(open);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleDialogClose}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader className="text-center">
                        <DialogTitle className="flex items-center justify-center gap-2">
                            <FileInput className="h-5 w-5" />
                            Import SCADA Layout
                        </DialogTitle>
                        <DialogDescription>
                            Import SCADA system configurations from a JSON file
                        </DialogDescription>
                    </DialogHeader>

                    {/* Import Panel Only */}
                    <div className="space-y-4 mt-4">
                        {!importResult ? (
                            <>
                                {/* File Upload Area */}
                                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    <div
                                        className={`transition-colors ${dragActive ? 'bg-primary/5 border-primary/50' : 'hover:bg-muted/50'
                                            } ${selectedFile ? 'py-4' : 'py-8'}`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        {selectedFile ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <FileText className="h-8 w-8 text-primary" />
                                                    <div className="text-left">
                                                        <p className="font-medium">{selectedFile.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={removeFile}
                                                    disabled={isProcessing}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                                <div className="space-y-2">
                                                    <p className="font-medium">Drop your JSON file here</p>
                                                    <p className="text-sm text-muted-foreground">or click to browse files</p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isProcessing}
                                                    >
                                                        Choose File
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Import Button */}
                                <Button
                                    className="w-full"
                                    onClick={simulateImport}
                                    disabled={!selectedFile || isProcessing}
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <FileInput className="h-4 w-4 mr-2" />
                                            Import SCADA
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            /* Import Results */
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    {importResult.success ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <h3 className="font-medium">
                                        {importResult.success ? 'Import Successful' : 'Import Failed'}
                                    </h3>
                                </div>

                                {importResult.success && (
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-muted/50 rounded p-3 text-center">
                                            <p className="font-semibold text-lg">{importResult.layoutsImported}</p>
                                            <p className="text-muted-foreground">Layouts</p>
                                        </div>
                                        <div className="bg-muted/50 rounded p-3 text-center">
                                            <p className="font-semibold text-lg">{importResult.itemsImported}</p>
                                            <p className="text-muted-foreground">Items</p>
                                        </div>
                                    </div>
                                )}

                                {importResult.warnings.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                        <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h4>
                                        <ul className="text-xs text-yellow-700 space-y-1">
                                            {importResult.warnings.map((warning, i) => (
                                                <li key={i}>• {warning}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {importResult.errors.length > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded p-3">
                                        <h4 className="text-sm font-medium text-red-800 mb-2">Errors</h4>
                                        <ul className="text-xs text-red-700 space-y-1">
                                            {importResult.errors.map((error, i) => (
                                                <li key={i}>• {error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isProcessing && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Processing...</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="w-full" />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleDialogClose(false)}
                            className="w-full sm:w-auto"
                        >
                            Close
                        </Button>

                        {importResult && (
                            <Button
                                variant="outline"
                                onClick={resetDialog}
                                className="w-full sm:w-auto"
                            >
                                Import Another
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
