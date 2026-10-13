import Echo from "laravel-echo"
import Pusher from "pusher-js"

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo<any>
  }
}

let echoInstance: Echo<any> | null = null

export function getEcho(): Echo<any> | null {
  if (typeof window === "undefined") return null

  if (echoInstance) return echoInstance

  const appKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY || "fprzx6pia61pycszqxjl"
  const host = process.env.NEXT_PUBLIC_REVERB_HOST || "localhost"
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080)
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || "http"

  window.Pusher = Pusher

  try {
    echoInstance = new Echo({
      broadcaster: "reverb",
      key: appKey,
      wsHost: host,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === "https",
      enabledTransports: ["ws", "wss"],
      disableStats: true,
    })

    window.Echo = echoInstance
  } catch (error) {
    console.error("Failed to initialize Laravel Echo Reverb:", error)
    return null
  }

  return echoInstance
}
