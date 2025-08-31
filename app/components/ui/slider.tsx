import * as React from "react"
import * as RadixSlider from "@radix-ui/react-slider"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center",
  {
    variants: {
      variant: {
        default: "data-[orientation=horizontal]:h-2",
        outline: "data-[orientation=horizontal]:h-2 bg-accent/20 rounded-md",
      },
      size: {
        default: "h-2",
        sm: "h-1.5",
        lg: "h-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Slider({
  className,
  variant,
  size,
  min = 2,
  max = 12,
  step = 1,
  defaultValue = [6],
  ...props
}: React.ComponentProps<typeof RadixSlider.Root> &
  VariantProps<typeof sliderVariants>) {
  const [value, setValue] = React.useState(defaultValue)

  return (
    <RadixSlider.Root
    data-slot="slider"
    className={cn(sliderVariants({ variant, size, className }))}
    min={min}
    max={max}
    step={step}
    value={value}
    onValueChange={setValue}
    {...props}
    >
    <RadixSlider.Track className="relative h-full grow rounded-full bg-muted">
        <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
    </RadixSlider.Track>
    <RadixSlider.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </RadixSlider.Root>

  )
}

export { Slider, sliderVariants }
