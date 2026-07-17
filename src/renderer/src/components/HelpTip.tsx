import { CircleHelp } from 'lucide-react'

export function HelpTip({ text }: { text: string }) {
  return (
    <button className="help-tip" type="button" aria-label={text}>
      <CircleHelp size={13} strokeWidth={2.2} />
      <span role="tooltip">{text}</span>
    </button>
  )
}
