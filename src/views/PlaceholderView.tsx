/**
 * Disabled stage tab body (STA / IREM / DSV, etc.).
 */
export function PlaceholderView({ stage }: { stage: string }) {
  return (
    <section className="card placeholder">
      <h3>{stage.toUpperCase()}</h3>
      <p className="muted">This stage is not enabled yet.</p>
    </section>
  );
}
