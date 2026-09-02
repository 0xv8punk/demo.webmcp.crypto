import { useEffect, useRef } from 'react'

const COLORS = ['#e8ecf1', '#9aa7b4', '#7fa0c9']
const DOT_DENSITY = 9000
const BASE_SPEED = 3.4
const SPLASH_PARTICLES = 4
const SPLASH_LIFE_FRAMES = 20

interface Drop {
  x: number
  y: number
  w: number
  h: number
  speed: number
  color: string
  alpha: number
}

interface Splash {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface Props {
  stopped: boolean
}

export function PixelRain({ stopped }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stoppedRef = useRef(stopped)
  stoppedRef.current = stopped

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let drops: Drop[] = []
    let splashes: Splash[] = []

    function makeDrop(randomizeY: boolean): Drop {
      return {
        x: Math.round(Math.random() * width),
        y: randomizeY ? Math.random() * height : -8,
        w: 2,
        h: 4 + Math.round(Math.random() * 3),
        speed: BASE_SPEED * (0.6 + Math.random() * 0.7),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.35 + Math.random() * 0.45,
      }
    }

    function spawnSplash(x: number, color: string) {
      for (let i = 0; i < SPLASH_PARTICLES; i++) {
        splashes.push({
          x,
          y: height,
          vx: (Math.random() - 0.5) * 3.2,
          vy: -(1 + Math.random() * 1.6),
          life: SPLASH_LIFE_FRAMES,
          color,
        })
      }
    }

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = width
      canvas!.height = height
      const count = Math.max(40, Math.min(140, Math.round((width * height) / DOT_DENSITY)))
      drops = Array.from({ length: count }, () => makeDrop(true))
      splashes = []
    }

    resize()
    window.addEventListener('resize', resize)

    function drawFrame(speedMultiplier: number) {
      ctx!.clearRect(0, 0, width, height)

      for (const drop of drops) {
        ctx!.globalAlpha = drop.alpha
        ctx!.fillStyle = drop.color
        ctx!.fillRect(Math.round(drop.x), Math.round(drop.y), drop.w, drop.h)

        const step = drop.speed * speedMultiplier
        drop.y += step
        if (drop.y > height) {
          if (step > 0.05) spawnSplash(drop.x, drop.color)
          Object.assign(drop, makeDrop(false))
        }
      }

      splashes = splashes.filter((splash) => splash.life > 0)
      for (const splash of splashes) {
        const fade = splash.life / SPLASH_LIFE_FRAMES
        ctx!.globalAlpha = fade * 0.8
        ctx!.fillStyle = splash.color
        ctx!.fillRect(Math.round(splash.x), Math.round(splash.y), 2, 2)
        splash.x += splash.vx
        splash.y += splash.vy
        splash.vy += 0.25
        splash.life -= 1
      }

      ctx!.globalAlpha = 1
    }

    if (reduceMotion) {
      drawFrame(0)
      return () => window.removeEventListener('resize', resize)
    }

    let speedMultiplier = 1
    let frameId: number
    function tick() {
      const target = stoppedRef.current ? 0 : 1
      speedMultiplier += (target - speedMultiplier) * 0.02
      drawFrame(speedMultiplier)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`rain-canvas${stopped ? ' is-stopped' : ''}`}
      aria-hidden="true"
    />
  )
}
