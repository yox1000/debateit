export default function FactResearchView({ factCheck, onBack }) {
  if (!factCheck) {
    return (
      <main className="research-shell">
        <section className="research-panel">
          <button className="secondary-button compact-button" type="button" onClick={onBack}>Back</button>
          <p className="profile-summary">No fact-check is selected.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="research-shell">
      <section className="research-panel">
        <button className="secondary-button compact-button" type="button" onClick={onBack}>Back to debate</button>
        <div className="research-hero">
          <p className="eyebrow">Fact-check research</p>
          <h1>{factCheck.presentation?.headline || factCheck.verdict}</h1>
          <p>{factCheck.presentation?.summary || factCheck.interpretation}</p>
        </div>
        <section className="research-verdict-card">
          <div className="research-verdict-head">
            <strong>{factCheck.verdict}</strong>
            <span>{factCheck.confidence} confidence</span>
          </div>
          <p>{factCheck.interpretation}</p>
          {factCheck.limitations ? <p>{factCheck.limitations}</p> : null}
        </section>
        <section className="research-section">
          <h2>Best sources</h2>
          <div className="research-source-grid">
            {(factCheck.sourceEvaluation?.rankedSources || factCheck.evidence || []).map((source) => (
              <article key={source.url || source.title} className="research-source-card">
                <span>{source.provider || source.strength || "Source"}</span>
                <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
                <p>{source.whatItSays || source.reason || source.relevance}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="research-section">
          <h2>Agent trail</h2>
          <div className="research-trail">
            {(factCheck.researchTrail || []).map((step) => (
              <article key={step.agent}>
                <strong>{step.agent}</strong>
                <p>{step.summary}</p>
                <span>{step.details}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
