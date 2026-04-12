import { useRef } from 'react'

interface FileUploadDropZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number
  disabled?: boolean
}

export function FileUploadDropZone({
  onFilesSelected,
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  disabled = false,
}: FileUploadDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      dropZoneRef.current?.classList.add('border-emerald-400', 'bg-emerald-50')
      dropZoneRef.current?.classList.remove('border-slate-300', 'bg-slate-50')
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      dropZoneRef.current?.classList.remove('border-emerald-400', 'bg-emerald-50')
      dropZoneRef.current?.classList.add('border-slate-300', 'bg-slate-50')
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      dropZoneRef.current?.classList.remove('border-emerald-400', 'bg-emerald-50')
      dropZoneRef.current?.classList.add('border-slate-300', 'bg-slate-50')

      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFilesSelected(files)
      }
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  return (
    <div
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-slate-400 hover:bg-slate-100'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
        multiple
      />

      <svg
        className="mx-auto h-12 w-12 text-slate-400"
        stroke="currentColor"
        fill="none"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-14-8v12m0 0l-4-4m4 4l4-4"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p className="mt-2 text-sm font-semibold text-slate-900">
        Drag & drop file here, or click to select
      </p>
      <p className="mt-1 text-xs text-slate-600">
        Foto, PDF, atau dokumen (up to 10MB)
      </p>
    </div>
  )
}
