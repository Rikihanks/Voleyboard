import { create } from 'zustand'

import type { ReceiverCount, RotationNumber, RotationSystem } from '@/domain/rotations'

interface RotationStore {
  system: RotationSystem
  rotation: RotationNumber
  receivers: ReceiverCount
  checking: boolean
  setSystem: (system: RotationSystem) => void
  setRotation: (rotation: RotationNumber) => void
  setReceivers: (receivers: ReceiverCount) => void
  setChecking: (checking: boolean) => void
}

/** Estado del panel de rotaciones (no se persiste). */
export const useRotationStore = create<RotationStore>()((set) => ({
  system: '5-1',
  rotation: 1,
  receivers: 5,
  checking: false,
  setSystem: (system) => set({ system }),
  setRotation: (rotation) => set({ rotation }),
  setReceivers: (receivers) => set({ receivers }),
  setChecking: (checking) => set({ checking }),
}))
