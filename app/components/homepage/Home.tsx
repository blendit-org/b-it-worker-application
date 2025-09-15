import { Slider } from "../ui/slider"
import { Button } from "../ui/button"
import React, { useEffect } from "react"
import { BlenderBadge } from "./BlenderBadge";
import { ProcessingTablets } from "./ProcessingTablets";
import logo from '@/resources/build/icon.svg'
import avatar from '@/resources/build/meerkat.png'
const Home = () => {
  const [allowedCpuThreads, setAllowedCpuThreads] = React.useState([2])
  const [jobRunning, setJobRunning] = React.useState(false)
  const [lookingForJob, setLookingForJob] = React.useState(false)
  const [renderingJob, setRenderingJob] = React.useState(false)
  const [cpuThreads, setCpuThreads] = React.useState([2])
  const [userId, setUserId] = React.useState("")
  const [score, setScore] = React.useState(0)
  const [cpuInfo, setCpuInfo] = React.useState("no-cpu-info-found")
  const [ramInfo, setRamInfo] = React.useState("")
  const [blenderAvailable, setBlenderAvailable] = React.useState(false)

  const handleSliderChange = (value: number[]) => {
    setAllowedCpuThreads(value)
    window.api.send('home:cpu-thread-change-notice', allowedCpuThreads);
  }

  const handleStartButtonPress = () => {
    console.warn("hiiii")
    window.api.send('home:start-job', allowedCpuThreads); // when start button pressed send cpu thread count user wants to use for rendering
    setJobRunning(true)
  }

  const handleStopButtonPress = () => {
    console.warn("hiiii")
    window.api.send('home:stop-job') // when start button pressed send cpu thread count user wants to use for rendering
    // setJobRunning(false)
    setLookingForJob(false)
  }

  const getCpuInfo = async () => {
    const cpuInformation = await window.api.invoke('home:cpu-info')
    // console.warn(cpuThreads)
    setCpuThreads(cpuInformation.thread)
    setCpuInfo(cpuInformation.info)
    setRamInfo(cpuInformation.memInfo)
  }

  const handleLogout = () => {
    window.api.send('home:logout')
  }

  useEffect(() => {
    window.api.receive('worker:start-job-fetching', () => {
      setLookingForJob(true)
      setRenderingJob(false)
    })
    window.api.receive('worker:got-a-job', () => {
      setLookingForJob(false)
      setRenderingJob(true)
    })
    window.api.receive('main:worker-information', (userIdString: string, scoreNumber: number) => {
      setUserId(userIdString)
      setScore(scoreNumber)
    })

    window.api.receive('main:blender-bin-available', () => {
      setBlenderAvailable(true)
    })

    window.api.receive('main:blender-download-finished', () => {
      // setDownloadingBlender(false)
    })

    window.api.receive('main:stopped-after-finishing-job', () => {
      setJobRunning(false)
    })
  },[])

  // get info about users thread count
  if (cpuThreads[0] == 2 || cpuInfo == "no-cpu-info-found") getCpuInfo()

  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-muted  flex flex-col items-center justify-between py-6">
        {/* Top: Avatar + Score */}
        <div className="flex flex-col items-center gap-4">
          <img
            src={avatar} // replace with user avatar source
            alt="User Avatar"
            className="w-16 h-16 rounded-full border"
          />
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{userId}</p>
            <p className="text-xs text-muted-foreground">Score: {score}</p>
          </div>
          <div>
            <p className="text-s font-semibold text-muted-foreground">CPU:</p>
            <p className="text-xs text-muted-foreground">{cpuInfo}</p>

            <p className="text-s font-semibold text-muted-foreground">Memory:</p>
            <p className="text-xs text-muted-foreground">{ramInfo} GB</p>
          </div>
        </div>

        {/* Bottom: Logout */}
        <Button
          variant="destructive"
          size="sm"
          className="mt-auto"
          onClick={handleLogout}
        >
          Log Out
        </Button>
        <p className="text-xs text-muted-foreground">@pritomash</p>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-background flex flex-col items-center justify-center gap-6 p-6 overflow-hidden">
        <div>
          <img className="bg-background" src={logo} alt="blend:it" width={200} height={100} />
        </div>

        {/* Slider */}
        <div className="slider-container w-full max-w-md flex flex-col items-center gap-2">
          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-medium text-foreground">
              CPU thread:{" "}
              <span className="font-semibold">{allowedCpuThreads[0]}</span>
            </label>
            <Slider
              className="cpu-threads w-full"
              value={allowedCpuThreads}
              onValueChange={handleSliderChange}
              max={cpuThreads[0]}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="buttons flex gap-4">
          <Button
            variant={jobRunning ? "ghost" : "default"}
            size="lg"
            className="start-job-button"
            onClick={handleStartButtonPress}
            disabled={jobRunning || !blenderAvailable}
          >
            Start Job
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="stop-job-button"
            onClick={handleStopButtonPress}
            disabled={!blenderAvailable}
          >
            Stop Job
          </Button>
        </div>

        <BlenderBadge />

        <div>
          {!lookingForJob && !renderingJob && <></>}
          {renderingJob && <ProcessingTablets />}
          {lookingForJob && <p>Looking For Job...</p>}
        </div>
      </main>
    </div>
  )
}

export default Home
