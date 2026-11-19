export function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="page">
      <div className="page-head">
        <h1>{title}</h1>
        <p>{blurb}</p>
      </div>
      <div className="placeholder">Coming in a later phase.</div>
    </div>
  );
}
