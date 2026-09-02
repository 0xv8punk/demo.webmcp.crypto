interface Props {
  message: string
  visible: boolean
}

export function AgentSnackbar({ message, visible }: Props) {
  return (
    <div
      className={`snackbar snackbar--bottom${visible ? ' is-visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="snackbar-icon" aria-hidden="true">
        !
      </span>
      {message}
    </div>
  )
}
