type MultiChoiceVoteResultsBarProps = {
  options: { label: string; relativeVoteResult: number }[]
  votesExist: boolean
  colors: string[]
}

const MultiChoiceVoteResultsBar = ({
  options,
  votesExist,
  colors,
}: MultiChoiceVoteResultsBarProps) => {
  if (options.length > colors.length) {
    throw Error('Not enough colors exist for the amount of options!')
  }

  return (
    <div className="bg-bkg-4 h-1.5 flex flex-grow mt-2.5 rounded w-full">
      {votesExist &&
        options.map((option, index) => (
          <div
            style={{
              width: `${option.relativeVoteResult * 100}%`,
            }}
            className={`${colors[index]} flex ${index === 0 && 'rounded-l'} ${
              index === options.length - 1 && 'rounded-r'
            }`}
          />
        ))}
    </div>
  )
}

export default MultiChoiceVoteResultsBar
