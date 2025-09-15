import { useEffect, useState } from "react"
import { Badge } from "@/app/components/ui/badge"
import { CheckCircle2, Loader2 } from "lucide-react"

type Status = "idle" | "running" | "done"

interface TaskState {
  status: Status
  progress: number
}

// Component handling Download and Render tablets separately
export function ProcessingTablets() {
  const [download, setDownload] = useState<TaskState>({ status: "idle", progress: 0 })
  const [render, setRender] = useState<TaskState>({ status: "idle", progress: 0 })
  const [remainingTime, setRemainingTime] = useState<string>("")

  useEffect(() => {
    // Download progress
    window.api.receive("worker:download-progress", (progress: number) => {
      setDownload({
        status: progress < 100 ? "running" : "done",
        progress,
      })
    })

    // Render progress
    window.api.receive("worker:render-progress", (progress: number, remains: string) => {
      setRender({
        status: progress < 100 ? "running" : "done",
        progress,
      })
      setRemainingTime(remains)
    })
  }, [])

  const renderTablet = (label: string, task: TaskState, showRemaining: boolean = false) => {
    const isRunning = task.status === "running"
    const isDone = task.status === "done"

    return (
      <div className="flex flex-col gap-2 w-64">
        <Badge
          variant={isRunning ? "secondary" : isDone ? "default" : "outline"}
          className="justify-between w-full px-3 py-2"
        >
          <span className="flex items-center gap-2">
            {isRunning && <Loader2 className="size-4 animate-spin" />}
            {isDone && <CheckCircle2 className="size-4" />}
            {label}
            
          </span>
          <span className="text-xs">{task.progress}%</span>
        </Badge>
        <span className="flex items-center gap-2">
        {showRemaining && isRunning && remainingTime && (
              <span className="ml-2 text-xs text-muted-foreground">Remaining Time: ({remainingTime})</span>
        )}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {renderTablet("Downloading", download)}
      {renderTablet("Rendering", render, true)}
    </div>
  )
}
