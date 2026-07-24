import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

function StepNav({
  backTo,
  onContinue,
  continueLabel = "Continue",
  continueDisabled = false,
}: {
  backTo?: string
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
}) {
  const navigate = useNavigate()
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      {backTo ? (
        <Button type="button" variant="ghost" onClick={() => navigate(backTo)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="button" variant="accent" size="lg" onClick={onContinue} disabled={continueDisabled}>
        {continueLabel}
      </Button>
    </div>
  )
}

export { StepNav }
