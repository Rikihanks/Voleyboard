import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  children: ReactNode
}

/** Boton cuadrado con objetivo tactil >= 44px y aria-label obligatorio. */
export function IconButton({
  label,
  active = false,
  children,
  className,
  ...rest
}: IconButtonProps) {
  const classes = ['icon-button', active ? 'is-active' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  )
}
