import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { API_URL } from '../constants/api'

export type DetectionHint =
  | 'Árbol detectado'
  | 'Busca mejor iluminación'
  | 'Imagen borrosa, mantén la cámara estable'
  | 'Apunta al tronco del árbol'
  | string

export interface FrameDetectionOptions {
  onValidFrame: (imageUri: string) => void
  intervalMs?: number
}

export interface FrameDetectionState {
  hint: DetectionHint
  isDetecting: boolean
  startDetection: (captureFrame: () => Promise<string | null>) => void
  stopDetection: () => void
}

export async function detectFrame(imageUri: string, token: string): Promise<{ valid: boolean; hint: string }> {
  const form = new FormData()
  form.append('image', { uri: imageUri, type: 'image/jpeg', name: 'frame.jpg' } as any)

  const res = await fetch(`${API_URL}/scan/detect`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  if (!res.ok) return { valid: false, hint: 'Apunta al tronco del árbol' }
  return res.json()
}

export function useFrameDetection({
  onValidFrame,
  intervalMs = 1000,
}: FrameDetectionOptions): FrameDetectionState {
  const [hint, setHint] = useState<DetectionHint>('Apunta al tronco del árbol')
  const [isDetecting, setIsDetecting] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const captureRef = useRef<(() => Promise<string | null>) | null>(null)
  const activeRef = useRef(false)

  const stopDetection = useCallback(() => {
    activeRef.current = false
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsDetecting(false)
  }, [])

  const startDetection = useCallback(
    (captureFrame: () => Promise<string | null>) => {
      if (activeRef.current) return
      captureRef.current = captureFrame
      activeRef.current = true
      setIsDetecting(true)

      intervalRef.current = setInterval(async () => {
        if (!activeRef.current || captureRef.current == null) return

        const imageUri = await captureRef.current()
        if (imageUri == null) return

        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session == null) return
          const result = await detectFrame(imageUri, session.access_token)
          setHint(result.hint)
          if (result.valid) {
            stopDetection()
            onValidFrame(imageUri)
          }
        } catch {
          // keep polling on network errors
        }
      }, intervalMs)
    },
    [intervalMs, onValidFrame, stopDetection]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false
      if (intervalRef.current != null) clearInterval(intervalRef.current)
    }
  }, [])

  return { hint, isDetecting, startDetection, stopDetection }
}
