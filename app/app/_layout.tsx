import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { FontList } from '../constants/theme'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // In dev, skip auth guard and start as null (not undefined) so render isn't blocked
  const [session, setSession] = useState<Session | null | undefined>(__DEV__ ? null : undefined)
  const segments = useSegments()
  const router = useRouter()

  const [fontsLoaded] = useFonts(FontList)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!fontsLoaded) return
    SplashScreen.hideAsync()
  }, [fontsLoaded])

  useEffect(() => {
    if (__DEV__) return
    if (session === undefined) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) {
      router.replace('/(auth)')
    } else if (session && inAuth) {
      router.replace('/(app)')
    }
  }, [session, segments])

  if (!fontsLoaded || session === undefined) return null

  return <Slot />
}
