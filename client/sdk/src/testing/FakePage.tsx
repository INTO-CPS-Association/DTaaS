import type { PageProps } from '../host/platform.types';

/** A minimal stand-in for the host's page shell. */
function FakePage({ title, description, children }: PageProps) {
  return (
    <section>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </section>
  );
}

export default FakePage;
