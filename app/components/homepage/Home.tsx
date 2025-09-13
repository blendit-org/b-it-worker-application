import { Slider } from "../ui/slider"
import { Button } from "../ui/button"
import React from "react"



const Home = () => {
  const [allowedCpuThreads, setAllowedCpuThreads] = React.useState([6]);
  const [jobRunning, setJobRunning] = React.useState(false);

  const handleSliderChange = (value: number[]) => {
    setAllowedCpuThreads(value)
    

  }

  const handleStartButtonPress = () => {
    console.warn("hiiii")
    window.api.send('home:start-job', allowedCpuThreads); // when start button pressed send cpu thread count user wants to use for rendering
    setJobRunning(true)
  }

  const handleStopButtonPress = () => {
    console.warn("hiiii")
    window.api.send('home:stop-job'); // when start button pressed send cpu thread count user wants to use for rendering
    setJobRunning(false)
  }

  return (
    <div className="home-page flex flex-col items-center justify-center gap-8 p-8 min-h-screen bg-background">
      
      {/* Slider */}
      <div className="slider-container w-full max-w-md flex flex-col items-center gap-2">
        <div className="flex flex-col gap-2 w-full">
            <label className="text-sm font-medium text-foreground">
                {"CPU thread"}: <span className="font-semibold">{allowedCpuThreads[0]}</span>
            </label>
            <Slider 
                className="cpu-threads w-full" 
                value={allowedCpuThreads}
                onValueChange={handleSliderChange}
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
          disabled={jobRunning}
        >
          Start Job
        </Button>
        <Button variant="destructive" size="lg" className="stop-job-button" onClick={handleStopButtonPress}>
          Stop Job
        </Button>
      </div>
    </div>
  )
}

export default Home
