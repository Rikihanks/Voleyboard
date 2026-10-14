import { useEffect, useRef } from 'react'

export interface TextPromptDialogProps {
  open: boolean
  title: string
  label: string
  initialValue: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

/** Dialogo sencillo para pedir un texto corto (renombrar, nueva carpeta...). */
export function TextPromptDialog({
  open,
  title,
  label,
  initialValue,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: TextPromptDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm(inputRef.current?.value ?? '')
        }}
      >
        <h2>{title}</h2>
        <label className="field grow">
          <span>{label}</span>
          <input ref={inputRef} type="text" defaultValue={initialValue} />
        </label>
        <div className="confirm-actions">
          <button type="button" className="button ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="submit" className="button primary">
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
