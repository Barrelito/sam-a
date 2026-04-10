"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB } from "@/lib/overtime/config"

interface UploadResult {
  report: { id: string; filename: string; period_start: string; period_end: string }
  matchedCount: number
  unmatchedCount: number
  warnings: string[]
  entryCount: number
}

interface OvertimeUploadFormProps {
  onUploadComplete: (result: UploadResult) => void
}

export default function OvertimeUploadForm({ onUploadComplete }: OvertimeUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const validateFile = (f: File): string | null => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Otillåten filtyp (${ext}). Tillåtna: ${ALLOWED_EXTENSIONS.join(", ")}`
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `Filen är för stor (${(f.size / 1024 / 1024).toFixed(1)} MB). Max: ${MAX_FILE_SIZE_MB} MB`
    }
    return null
  }

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      setFile(null)
    } else {
      setError(null)
      setFile(f)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/overtime/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        const detail = data.details?.join(", ") ?? data.error
        setError(detail || "Uppladdningen misslyckades")
        return
      }

      onUploadComplete(data)
    } catch (e) {
      setError("Nätverksfel vid uppladdning")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
          ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
        onClick={() => document.getElementById("overtime-file-input")?.click()}
      >
        <input
          id="overtime-file-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-1">
          Dra och släpp HERCMA-export här
        </p>
        <p className="text-sm text-muted-foreground">
          eller klicka för att välja fil (.xlsx, max {MAX_FILE_SIZE_MB} MB)
        </p>
      </div>

      {/* Selected file preview */}
      {file && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bearbetar...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ladda upp & analysera
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Fel vid uppladdning</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p><strong>Filformat:</strong> HERCMA Övertidsjournal (.xlsx)</p>
        <p><strong>Filnamn:</strong> Overtidsjournal_YY-MM-DD_YY-MM-DD.xlsx</p>
        <p>Filen parsas automatiskt och medarbetare matchas mot befintligt personalregister.</p>
      </div>
    </div>
  )
}
