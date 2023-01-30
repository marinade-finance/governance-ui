type MultipleChoiceVoteResultsBarProps = {
  options: { label: string; relativeVoteResult: number }[]
  colors: string[]
  votesExist: boolean
}

const MultipleChoiceVoteResultsBar = ({
  options,
  colors,
  votesExist,
}: MultipleChoiceVoteResultsBarProps) => {
  if (options.length > colors.length) {
    throw Error('Not enough colors provided for the amount of options!')
  }

  return (
    <div className="bg-bkg-4 h-2 flex flex-grow mt-2.5 rounded w-full">
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

export default MultipleChoiceVoteResultsBar
