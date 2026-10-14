export type IconName =
  | 'player'
  | 'ball'
  | 'select'
  | 'pencil'
  | 'line'
  | 'eraser'
  | 'text'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'download'
  | 'settings'
  | 'sun'
  | 'moon'
  | 'rotate'
  | 'plus'
  | 'minus'
  | 'fit'
  | 'close'
  | 'globe'
  | 'play'
  | 'pause'
  | 'stop'
  | 'file'
  | 'share'
  | 'more'
  | 'back'
  | 'forward'

const PATHS: Record<IconName, string[]> = {
  player: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21c0-4 3.6-6 8-6s8 2 8 6'],
  ball: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    'M3.6 9.2c5.2 2 11.6 2 16.8 0',
    'M3.6 14.8c5.2-2 11.6-2 16.8 0',
  ],
  select: ['M4 3l7 17 2.5-6.4L20 11 4 3Z'],
  pencil: ['M4 20h4L20 8l-4-4L4 16v4Z', 'M14 6l4 4'],
  line: ['M5 19L19 5'],
  eraser: ['M4 16l8-8 6 6-5 5H7l-3-3Z', 'M9 11l6 6'],
  text: ['M5 6h14', 'M12 6v13', 'M8 19h8'],
  undo: ['M9 14L4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10H9'],
  redo: ['M15 14l5-5-5-5', 'M20 9H9a5 5 0 0 0 0 10h6'],
  clear: [
    'M4 7h16',
    'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
    'M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  ],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 21h16'],
  settings: [
    'M6 4v6',
    'M6 14v6',
    'M12 4v10',
    'M12 18v2',
    'M18 4v2',
    'M18 10v10',
    'M4 10h4',
    'M10 14h4',
    'M16 8h4',
  ],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    'M12 2v2',
    'M12 20v2',
    'M2 12h2',
    'M20 12h2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  moon: ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z'],
  rotate: ['M21 12a9 9 0 1 1-3-6.7', 'M21 3v5h-5'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  fit: [
    'M8 3H5a2 2 0 0 0-2 2v3',
    'M16 3h3a2 2 0 0 1 2 2v3',
    'M8 21H5a2 2 0 0 1-2-2v-3',
    'M16 21h3a2 2 0 0 0 2-2v-3',
  ],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  play: ['M8 5l11 7-11 7V5Z'],
  pause: ['M9 5v14', 'M15 5v14'],
  stop: ['M7 7h10v10H7Z'],
  file: [
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h4',
  ],
  share: ['M12 16V4', 'M8 8l4-4 4 4', 'M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  back: ['M15 6l-6 6 6 6'],
  forward: ['M9 6l6 6-6 6'],
  globe: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    'M3 12h18',
    'M12 3a14 14 0 0 1 0 18',
    'M12 3a14 14 0 0 0 0 18',
  ],
}

export interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  )
}
