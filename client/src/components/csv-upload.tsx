import { useState, useCallback } from "react";
import { Upload, FileUp, CheckCircle2, XCircle, AlertCircle, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Papa from "papaparse";
import { csvCandidateRowSchema, type CSVCandidate, type Candidate } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

interface CSVUploadProps {
  onUpload: (candidates: CSVCandidate[]) => void;
  uploadResponse?: UploadResponse | null;
}

interface ParsedRow {
  rowNumber: number;
  data: any;
  validated?: CSVCandidate;
  error?: string;
  isDuplicate?: boolean;
  duplicateEmail?: string;
}

interface UploadResponse {
  imported: number;
  duplicates: string[];
  errors: Array<{ row: number; message: string }>;
  linksSent?: number;
  message: string;
}

export function CSVUpload({ onUpload, uploadResponse: externalUploadResponse }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  
  // Use external upload response if provided
  const uploadResponse = externalUploadResponse;

  // Fetch existing candidates for duplicate detection
  const { data: existingCandidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await fetch('/api/candidates/template', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'candidate-upload-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  }, []);

  const processFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setIsProcessing(true);

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows: ParsedRow[] = [];
          const existingEmails = new Set(
            existingCandidates.map(c => c.email.toLowerCase())
          );
          const seenEmails = new Set<string>();

          results.data.forEach((row, index) => {
            const rowNumber = index + 2; // +2 for header row and 0-indexing

            // Parse name field - Indeed format has single "name" column
            let firstName = "";
            let lastName = "";
            
            if (row["name"] || row["Name"]) {
              const fullName = (row["name"] || row["Name"] || "").trim();
              const nameParts = fullName.split(/\s+/);
              firstName = nameParts[0] || "";
              lastName = nameParts.slice(1).join(" ") || "";
            } else {
              // Fallback to separate First Name/Last Name columns
              firstName = row["First Name"] || row["first_name"] || "";
              lastName = row["Last Name"] || row["last_name"] || "";
            }

            // Extract screening answers from Indeed qualification columns
            const screeningAnswers: Record<string, string> = {};
            for (let i = 1; i <= 10; i++) {
              const questionKey = `Qualification ${i}`;
              const answerKey = `Qualification ${i} Answer`;
              
              if (row[questionKey] && row[answerKey]) {
                screeningAnswers[row[questionKey]] = row[answerKey];
              }
            }

            // Clean phone number - remove leading apostrophe from Indeed CSV
            let phone = row["phone"] || row["Phone"] || "";
            if (phone.startsWith("'")) {
              phone = phone.substring(1);
            }
            // Normalize phone number (remove spaces, dashes, parentheses)
            phone = phone.replace(/[\s\-().]/g, '').trim();

            // Map CSV columns to our schema - support Indeed format
            const candidateData = {
              firstName,
              lastName,
              email: row["email"] || row["Email"] || "",
              phone: phone.trim(),
              roleType: (row["job title"] || row["Job Title"] || row["Role Type"] || row["role_type"] || "").toLowerCase().includes("driver") ? "driver" : "non-driver",
              screeningAnswers,
            };

            let parsedRow: ParsedRow = {
              rowNumber,
              data: candidateData,
            };

            try {
              // Validate with enhanced schema
              const validated = csvCandidateRowSchema.parse(candidateData);
              parsedRow.validated = validated;

              const emailLower = validated.email.toLowerCase().trim();
              
              // Normalize phone for duplicate detection
              const normalizedPhone = validated.phone?.replace(/[\s\-().]/g, '').toLowerCase();

              // Check for duplicates within the file first
              if (seenEmails.has(emailLower)) {
                parsedRow.isDuplicate = true;
                parsedRow.duplicateEmail = validated.email;
                parsedRow.error = "Duplicate email within file";
              } 
              // Check for duplicates against existing candidates by email
              else if (existingEmails.has(emailLower)) {
                parsedRow.isDuplicate = true;
                parsedRow.duplicateEmail = validated.email;
                parsedRow.error = `Duplicate - ${validated.email} already exists`;
              }
              // Check for duplicate phone numbers if phone exists
              else if (normalizedPhone && existingCandidates.some(c => 
                c.phone && c.phone.replace(/[\s\-().]/g, '').toLowerCase() === normalizedPhone
              )) {
                parsedRow.isDuplicate = true;
                parsedRow.error = `Duplicate - phone number ${validated.phone} already exists`;
              }
              // Valid and unique - add to seen emails
              else {
                seenEmails.add(emailLower);
              }
            } catch (error) {
              if (error instanceof z.ZodError) {
                parsedRow.error = error.errors[0].message;
              } else {
                parsedRow.error = "Unknown validation error";
              }
            }

            rows.push(parsedRow);
          });

          setParsedRows(rows);
          setIsProcessing(false);
          setShowPreview(true);
        },
        error: () => {
          setIsProcessing(false);
          setParsedRows([]);
        },
      });
    },
    [existingCandidates]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type === "text/csv") {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleConfirmUpload = useCallback(() => {
    // Only upload valid, non-duplicate rows
    const validCandidates = parsedRows
      .filter(row => row.validated && !row.isDuplicate && !row.error)
      .map(row => row.validated!);

    if (validCandidates.length > 0) {
      onUpload(validCandidates);
      setShowPreview(false);
    }
  }, [parsedRows, onUpload]);

  const handleCancelPreview = useCallback(() => {
    setShowPreview(false);
    setParsedRows([]);
    setFileName(null);
  }, []);

  // Calculate statistics
  const validCount = parsedRows.filter(r => r.validated && !r.isDuplicate && !r.error).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;
  const errorCount = parsedRows.filter(r => r.error && !r.isDuplicate).length;

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                Upload Candidates from Indeed
              </CardTitle>
              <CardDescription>
                Import your Indeed CSV export to automatically screen and process candidates
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-md p-12 transition-all
              ${isDragging ? "border-primary bg-primary/5" : "border-border"}
              hover-elevate
            `}
            data-testid="dropzone-csv"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`
                rounded-full p-4 transition-colors
                ${isDragging ? "bg-primary/10" : "bg-muted"}
              `}>
                <Upload className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragging ? "Drop your CSV file here" : "Drag and drop your CSV file"}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer"
                data-testid="input-csv-file"
              />
            </div>
          </div>

          {isProcessing && (
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              <div className="text-center">
                <p className="text-sm font-medium">Processing {fileName}</p>
                <p className="text-xs text-muted-foreground mt-1">Validating candidates and checking for duplicates...</p>
              </div>
            </div>
          )}

          {uploadResponse && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
                <span className="text-sm font-medium">Upload Complete</span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Badge variant="default" className="gap-1.5 bg-chart-2 hover:bg-chart-2/90" data-testid="badge-imported">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="font-mono">{uploadResponse.imported}</span>
                  Imported
                </Badge>
                {uploadResponse.duplicates && uploadResponse.duplicates.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5" data-testid="badge-duplicates">
                    <AlertCircle className="h-3 w-3" />
                    <span className="font-mono">{uploadResponse.duplicates.length}</span>
                    Duplicates
                  </Badge>
                )}
                {uploadResponse.errors && uploadResponse.errors.length > 0 && (
                  <Badge variant="destructive" className="gap-1.5" data-testid="badge-errors">
                    <XCircle className="h-3 w-3" />
                    <span className="font-mono">{uploadResponse.errors.length}</span>
                    Errors
                  </Badge>
                )}
              </div>

              {uploadResponse.duplicates && uploadResponse.duplicates.length > 0 && (
                <div className="p-3 rounded-md bg-muted text-sm">
                  <p className="font-medium mb-2">Duplicates skipped:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {uploadResponse.duplicates.map((dup, i) => (
                      <li key={i} data-testid={`duplicate-${i}`}>{dup}</li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResponse.errors && uploadResponse.errors.length > 0 && (
                <div className="p-3 rounded-md bg-destructive/10 text-sm">
                  <p className="font-medium mb-2 text-destructive">Validation errors:</p>
                  <ul className="list-disc list-inside space-y-1 text-destructive">
                    {uploadResponse.errors.map((err, i) => (
                      <li key={i} data-testid={`error-${i}`}>
                        Row {err.row}: {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-preview">
          <DialogHeader>
            <DialogTitle>Preview CSV Import</DialogTitle>
            <DialogDescription>
              Review the parsed data before uploading. Rows with errors or duplicates will be skipped.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Badge variant="default" className="bg-chart-2" data-testid="badge-preview-valid">
              {validCount} Valid
            </Badge>
            {duplicateCount > 0 && (
              <Badge variant="secondary" data-testid="badge-preview-duplicates">
                {duplicateCount} Duplicates
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive" data-testid="badge-preview-errors">
                {errorCount} Errors
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row) => (
                  <TableRow key={row.rowNumber} data-testid={`row-preview-${row.rowNumber}`}>
                    <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                    <TableCell>{row.data.firstName}</TableCell>
                    <TableCell>{row.data.lastName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.data.email}</TableCell>
                    <TableCell className="font-mono text-xs">{row.data.phone || '-'}</TableCell>
                    <TableCell>{row.data.roleType}</TableCell>
                    <TableCell>
                      {row.error ? (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span className="text-xs text-destructive" data-testid={`error-row-${row.rowNumber}`}>
                            {row.error}
                          </span>
                        </div>
                      ) : row.isDuplicate ? (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-xs text-amber-600 dark:text-amber-400" data-testid={`duplicate-row-${row.rowNumber}`}>
                            Duplicate
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-chart-2" />
                          <span className="text-xs text-muted-foreground">Valid</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelPreview}
              data-testid="button-cancel-preview"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={validCount === 0}
              data-testid="button-confirm-upload"
            >
              <FileText className="h-4 w-4 mr-2" />
              Upload {validCount} Valid Row{validCount !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
