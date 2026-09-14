/**
 * Placeholder. The real screen is task T-5.1 and renders one `ContainerState`
 * and nothing else (design.md §1). It is not built yet because the two verbs
 * behind its single control are still waiting on `Q-API-2` — what "spin down"
 * should mean is a decision with consequences, and the owner signs it.
 */
export default function Page() {
  return (
    <main style={{ font: '16px/1.6 system-ui, sans-serif', margin: '4rem auto', maxWidth: '34rem' }}>
      <h1 style={{ fontSize: '1.25rem' }}>Railway container console</h1>
      <p>
        The client layer is built and tested; the screen is not. See
        {' '}<code>openspec/changes/railway-container-control/tasks.md</code>.
      </p>
    </main>
  );
}
