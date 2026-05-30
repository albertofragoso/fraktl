'use strict'

const React = require('react')
const { View } = require('react-native')

const NOOP = () => {}
const NOOP_FACTORY = () => NOOP
const ID = (t) => t

// Minimal shared value proxy
function useSharedValue(init) {
  const ref = { value: init }
  return ref
}

function useDerivedValue(fn) {
  let result
  try {
    result = fn()
  } catch {
    result = 0
  }
  return { value: result }
}

function useAnimatedStyle(fn) {
  try {
    return fn()
  } catch {
    return {}
  }
}

function useAnimatedReaction(getter, reaction) {
  // Defer to avoid calling state setters during render
  const React = require('react')
  React.useEffect(() => {
    let val
    try {
      val = getter()
    } catch {
      val = 0
    }
    try {
      reaction(val)
    } catch {
      // noop
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

function useAnimatedScrollHandler() {
  return NOOP
}

function interpolate(value, inputRange, outputRange) {
  const [inMin, inMax] = inputRange
  const [outMin, outMax] = outputRange
  const clamped = Math.min(Math.max(value, inMin), inMax)
  const ratio = inMax === inMin ? 0 : (clamped - inMin) / (inMax - inMin)
  return outMin + ratio * (outMax - outMin)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function runOnJS(fn) {
  return fn
}

// Animated namespace — Animated.FlatList, Animated.View, etc.
const AnimatedView = View
const AnimatedFlatList = require('react-native').FlatList

const Animated = {
  View: AnimatedView,
  FlatList: AnimatedFlatList,
  Text: require('react-native').Text,
  Image: require('react-native').Image,
  ScrollView: require('react-native').ScrollView,
  createAnimatedComponent: (C) => C,
}

module.exports = {
  default: Animated,
  ...Animated,
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedProps: (fn) => { try { return fn() } catch { return {} } },
  useAnimatedRef: () => ({ current: null }),
  useAnimatedSensor: NOOP_FACTORY,
  useEvent: NOOP_FACTORY,
  interpolate,
  clamp,
  runOnJS,
  withTiming: ID,
  withSpring: ID,
  withDelay: (_, anim) => anim,
  withRepeat: ID,
  withSequence: (...args) => args[args.length - 1],
  cancelAnimation: NOOP,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Easing: {
    linear: ID,
    ease: ID,
    quad: ID,
    cubic: ID,
    bezier: () => ID,
    in: ID,
    out: ID,
    inOut: ID,
  },
  createAnimatedComponent: (C) => C,
}
