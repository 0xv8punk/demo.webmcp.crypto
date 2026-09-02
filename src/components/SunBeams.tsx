interface Props {
  visible: boolean
}

export function SunBeams({ visible }: Props) {
  return <div className={`sunbeams${visible ? ' is-visible' : ''}`} aria-hidden="true" />
}
