import { formatReading } from 'examples/hello-kit/src/core';

interface ReadingProps {
  readonly label: string;
  readonly value: unknown;
  readonly unit: string;
}

/** A domain widget that knows nothing about DTaaS. */
function Reading({ label, value, unit }: ReadingProps) {
  return (
    <p>
      {label}: {formatReading(value, unit)}
    </p>
  );
}

export default Reading;
