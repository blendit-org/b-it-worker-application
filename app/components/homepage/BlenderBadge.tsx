import { Badge } from "@/app/components/ui/badge"
import { XCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

type BlenderStatus = "not-found" | "downloading" | "available"

export function BlenderBadge() {
  const [status, setStatus] = useState<BlenderStatus>("not-found")
  const [progress, setProgress] = useState(0)

  // Example: fake download flow
  useEffect(() => {
    window.api.receive('blender:blender-download-progress', (progress: number) => {
        console.warn('downloading blender...', progress)
        setStatus("downloading");
        setProgress(progress);
        if (progress == 100) {
            checkBlender()
        }
    })
    const checkBlender = () => {
        window.api.invoke('worker:check-blender-bin')
        .then((flag: boolean) => {
            console.warn('blender check check...')
            if (flag) setStatus("available")
        })
    }
    checkBlender()

  }, [])

  return (
    <Badge
      variant={
        status === "not-found"
          ? "destructive"
          : status === "downloading"
          ? "secondary"
          : "available"
      }
    >
      {status === "not-found" && (
        <>
          <XCircle className="size-4" />
          No Blender found
        </>
      )}

      {status === "downloading" && (
        <>
          <Loader2 className="size-4 animate-spin" />
          Downloading Blender ({progress}%)
        </>
      )}

      {status === "available" && (
        <>
          <CheckCircle2 className="size-4" />
          Blender v4.5 available on your machine
        </>
      )}
    </Badge>
  )
}
