import React, { useContext, useState } from "react";
import { Model } from "../types";
import { parseCSV, safeJsonFromText, parseTSV } from "../utils/format";
import { X, Upload, AlertTriangle, Download, FileText, Globe, Clipboard } from "lucide-react";
import ThemeContext from "../context/ThemeContext";
import * as XLSX from "xlsx";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (models: Model[]) => void;
  addConsoleLog: (msg: string) => void;
}

export function ImportModal({ isOpen, onClose, onImport, addConsoleLog }: ImportModalProps) {
  const { theme } = useContext(ThemeContext);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "url" | "paste">("file");

  if (!isOpen) return null;

  const parseWorkbookToRows = (wb: XLSX.WorkBook) => {
    const all: any[] = [];
    wb.SheetNames.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      rows.forEach(r => all.push({ ...r, __sheetName: sheetName }));
    });
    return all;
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");

      const f = e.target.files[0];
      const isBinary = /\.(xlsx|ods)$/i.test(f.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          if (!evt.target) return;
          let data: any[] = [];
          if (isBinary) {
            const buf = evt.target.result as ArrayBuffer;
            const wb = XLSX.read(buf, { type: 'array' });
            data = parseWorkbookToRows(wb);
          } else if (typeof evt.target.result === 'string') {
            const text = evt.target.result as string;
            if (f.name.endsWith('.csv')) {
              data = parseCSV(text);
            } else if (f.name.endsWith('.tsv')) {
              data = parseTSV(text);
            } else if (f.name.endsWith('.json')) {
              data = JSON.parse(text);
            } else {
              try { data = JSON.parse(text); } catch { data = parseCSV(text); }
            }
          }
          setPreview(Array.isArray(data) ? data : []);
        } catch (err) {
          setError("Failed to parse file: " + (err as Error).message);
        }
      };
      if (isBinary) reader.readAsArrayBuffer(f); else reader.readAsText(f);
    }
  };

  // Handle URL import
  const handleUrlImport = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      setError("");
      let effectiveUrl = url;
      // Support Google Sheets multi-tab by exporting the entire workbook as XLSX
      try {
        const u = new URL(url);
        if (u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/')) {
          const idMatch = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
          const sheetId = idMatch?.[1];
          if (sheetId) {
            effectiveUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
          }
        }
      } catch { }

      if (/\.(xlsx|ods)$/i.test(effectiveUrl) || effectiveUrl.includes('/export?format=xlsx')) {
        const resp = await fetch(effectiveUrl);
        const buf = await resp.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const rows = parseWorkbookToRows(wb);
        setPreview(rows);
        return;
      }

      const response = await fetch(effectiveUrl);
      const text = await response.text();
      let data;
      if (effectiveUrl.endsWith('.csv')) {
        data = parseCSV(text);
      } else if (effectiveUrl.endsWith('.tsv')) {
        data = parseTSV(text);
      } else if (effectiveUrl.endsWith('.json')) {
        data = JSON.parse(text);
      } else {
        try { data = JSON.parse(text); } catch { data = parseCSV(text); }
      }
      setPreview(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch or parse URL: " + (err as Error).message);
    }
  };

  // Handle paste
  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      setError("Please paste some content");
      return;
    }

    try {
      setError("");
      let data;

      // Try JSON first
      try {
        data = safeJsonFromText(pasteText);
      } catch (e) {
        // Try CSV
        data = parseCSV(pasteText);
      }

      setPreview(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to parse pasted content: " + (err as Error).message);
    }
  };

  // Confirm import
  const handleConfirmImport = () => {
    if (preview && preview.length > 0) {
      addConsoleLog(`ImportModal: Imported ${preview.length} models`);
      onImport(preview as Model[]);
      onClose();
    } else {
      addConsoleLog('ImportModal: No valid data to import');
      setError("No valid data to import");
    }
  };

  // Styling - forced dark mode with visible borders
  const bgInput = "border border-zinc-700 bg-zinc-900/60";
  const tabStyle = theme === "dark"
    ? "px-4 py-2 hover:bg-zinc-800 cursor-pointer"
    : "px-4 py-2 hover:bg-gray-100 cursor-pointer";
  const tabActiveStyle = "border-b-2 border-violet-500 font-medium";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4" onClick={onClose}>
      <div className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black" : "border-zinc-200 bg-white"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={18} />
            <h3 className="text-base font-semibold">Import Models</h3>
          </div>
          <button onClick={onClose} className={`rounded-xl ${bgInput} px-3 py-1 text-xs`}>Close</button>
        </div>

        <div className="space-y-4">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Import models from multiple sources. Supports CSV, TSV, JSON, XLSX, ODS formats.
          </p>

          {/* Tab navigation */}
          <div className="flex border-b mb-4" style={{ borderColor: theme === "dark" ? "#27272a" : "#e4e4e7" }}>
            <button
              className={`${tabStyle} ${activeTab === "file" ? tabActiveStyle : ""} flex items-center gap-1`}
              onClick={() => setActiveTab("file")}
            >
              <FileText size={16} />
              File Upload
            </button>
            <button
              className={`${tabStyle} ${activeTab === "url" ? tabActiveStyle : ""} flex items-center gap-1`}
              onClick={() => setActiveTab("url")}
            >
              <Globe size={16} />
              From URL
            </button>
            <button
              className={`${tabStyle} ${activeTab === "paste" ? tabActiveStyle : ""} flex items-center gap-1`}
              onClick={() => setActiveTab("paste")}
            >
              <Clipboard size={16} />
              Paste
            </button>
          </div>

          {/* File Upload Tab */}
          {activeTab === "file" && (
            <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv,.tsv,.json,.xlsx,.ods"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex-1">
                  {file ? (
                    <div className={`rounded-lg ${bgInput} p-2 flex items-center justify-between`}>
                      <span>{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-600">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={`rounded-lg ${bgInput} p-4 text-center`}>
                      <p className="mb-2">Drag & drop a file here, or click to select</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">CSV, TSV, JSON, XLSX, ODS formats supported</p>
                    </div>
                  )}
                </div>
                <button
                  className={`rounded-xl ${bgInput} px-3 py-2 flex items-center gap-1 whitespace-nowrap hover:bg-zinc-800`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload size={16} />
                  Browse Files
                </button>
              </div>

              {file && (
                <button
                  className={`rounded-xl ${bgInput} px-4 py-2 w-full flex items-center justify-center gap-1 hover:bg-zinc-800`}
                  onClick={() => {
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        if (evt.target && typeof evt.target.result === 'string') {
                          try {
                            const text = evt.target.result;
                            let data;

                            if (file.name.endsWith('.csv')) {
                              data = parseCSV(text);
                            } else if (file.name.endsWith('.tsv')) {
                              data = parseTSV(text);
                            } else if (file.name.endsWith('.json')) {
                              data = JSON.parse(text);
                            } else {
                              // Try to auto-detect format
                              try {
                                data = JSON.parse(text);
                              } catch (e) {
                                data = parseCSV(text);
                              }
                            }

                            setPreview(Array.isArray(data) ? data : []);
                            setError("");
                          } catch (err) {
                            setError("Failed to parse file: " + (err as Error).message);
                          }
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                >
                  <Upload size={16} />
                  Process File
                </button>
              )}
            </div>
          )}

          {/* URL Tab */}
          {activeTab === "url" && (
            <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
              <div className="mb-2">
                <label className="block text-xs mb-1">Enter URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/models.json"
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm`}
                />
              </div>
              <p className="text-xs mb-3 text-gray-500 dark:text-gray-400">
                Enter a direct URL to a CSV, TSV, or JSON file containing model data
              </p>
              <button
                className={`rounded-xl ${bgInput} px-4 py-2 w-full flex items-center justify-center gap-1 hover:bg-zinc-800 disabled:opacity-50`}
                onClick={handleUrlImport}
                disabled={!url.trim()}
              >
                <Globe size={16} />
                Fetch from URL
              </button>
            </div>
          )}

          {/* Paste Tab */}
          {activeTab === "paste" && (
            <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
              <div className="mb-3">
                <label className="block text-xs mb-1">Paste Data</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste JSON or CSV data here..."
                  className={`w-full rounded-lg ${bgInput} px-2 py-1.5 text-sm h-40 font-mono`}
                />
              </div>
              <button
                className={`rounded-xl ${bgInput} px-4 py-2 w-full flex items-center justify-center gap-1 hover:bg-zinc-800 disabled:opacity-50`}
                onClick={handlePasteImport}
                disabled={!pasteText.trim()}
              >
                <Clipboard size={16} />
                Process Pasted Data
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg flex items-center gap-2" style={{
              backgroundColor: theme === "dark" ? "rgba(220, 38, 38, 0.1)" : "#fee2e2",
              color: theme === "dark" ? "#f87171" : "#b91c1c"
            }}>
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {preview && (
            <div className={`rounded-xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-black/40" : "border-zinc-200 bg-zinc-50"}`}>
              <h4 className="mb-3 font-medium flex items-center gap-2">
                <FileText size={18} />
                Preview ({preview.length} items found)
              </h4>

              <div className={`max-h-40 overflow-y-auto rounded-lg ${bgInput} p-2 mb-3`}>
                {preview.slice(0, 5).map((item, i) => (
                  <div key={i} className="text-xs font-mono mb-1 overflow-hidden text-ellipsis">
                    {JSON.stringify(item)}
                  </div>
                ))}
                {preview.length > 5 && <div className="text-xs text-gray-500 dark:text-gray-400">...and {preview.length - 5} more</div>}
              </div>

              <div className="flex justify-end">
                <button
                  className={`rounded-xl ${bgInput} px-4 py-2 disabled:opacity-50 flex items-center gap-1 hover:bg-zinc-800`}
                  disabled={preview.length === 0}
                  onClick={handleConfirmImport}
                >
                  <Download size={16} />
                  Import {preview.length} Models
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 mt-4 flex justify-between" style={{ borderColor: theme === "dark" ? "#27272a" : "#e4e4e7" }}>
          <div className="text-sm">
            <span className="opacity-70">Supported formats:</span> CSV, TSV, JSON, XLSX, ODS
          </div>
          <button
            className={`rounded-xl ${bgInput} px-4 py-2 text-sm`}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

