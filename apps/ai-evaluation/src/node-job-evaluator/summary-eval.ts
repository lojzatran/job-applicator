export function createSummaryEval() {
  const startedAt = performance.now();

  return function summaryEval({
    outputs,
    referenceOutputs,
  }: {
    outputs: Array<Record<string, unknown>>;
    referenceOutputs?: Array<Record<string, unknown>>;
  }) {
    const totalDuration = {
      key: 'total_duration_ms',
      score: performance.now() - startedAt,
    };

    if (!referenceOutputs) {
      return [totalDuration];
    }

    const diff = outputs.reduce((count, currentValue, index) => {
      return currentValue.response === referenceOutputs[index].isValidJob
        ? count
        : count + 1;
    }, 0);
    const correctProcessedPairs = outputs.length - diff;
    const processedPairs = outputs.length;
    const accuracy =
      processedPairs === 0 ? undefined : correctProcessedPairs / processedPairs;

    const correctMatchedPairsCount = outputs.reduce(
      (count, currentValue, index) => {
        return currentValue.response === true &&
          currentValue.response === referenceOutputs[index].isValidJob
          ? count + 1
          : count;
      },
      0,
    );
    const aiMatchedPairs = outputs.reduce((count, currentValue) => {
      return currentValue.response === true ? count + 1 : count;
    }, 0);
    const allMatchedPairs = referenceOutputs.reduce((count, currentValue) => {
      return currentValue.isValidJob === true ? count + 1 : count;
    }, 0);
    const precision =
      aiMatchedPairs === 0
        ? undefined
        : correctMatchedPairsCount / aiMatchedPairs;
    const recall =
      allMatchedPairs === 0
        ? undefined
        : correctMatchedPairsCount / allMatchedPairs;

    const f1 =
      precision === undefined || recall === undefined
        ? undefined
        : precision === 0 && recall === 0
          ? 0
          : (2 * precision * recall) / (precision + recall);

    return [
      { key: 'f1', score: f1 },
      { key: 'precision', score: precision },
      { key: 'recall', score: recall },
      { key: 'accuracy', score: accuracy },
      totalDuration,
    ];
  };
}
