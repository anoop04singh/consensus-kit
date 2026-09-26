import './style.css';

type EventRow = {
  event_id: string;
  stream: string;
  entity_id: string;
  event_type: string;
  payload_hash: string;
  topic_id: string;
  sequence_number: string;
  consensus_timestamp: string;
};
type Overview = {
  topicId: string;
  network: string;
  indexedEvents: number;
  lastSequence: number;
  events: EventRow[];
};

const projectName = 'ConsensusKit project';
const app = document.querySelector<HTMLDivElement>('#app')!;
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const hashscan = (topic: string, sequence: string, network: string) =>
  `https://hashscan.io/${encodeURIComponent(network)}/topic/${encodeURIComponent(topic)}?p=1&k=sequenceNumber&v=${encodeURIComponent(sequence)}`;

function pageIntro(network?: string) {
  return `<div class="topbar">
    <div class="brand"><span class="brand-mark" aria-hidden="true">✳</span><span class="brand-name">${escapeHtml(projectName)}</span><span class="brand-divider" aria-hidden="true">/</span><span class="brand-section">Explorer</span></div>
    ${network ? `<span class="network"><span class="network-dot" aria-hidden="true"></span>${escapeHtml(network)} network</span>` : ''}
  </div>
  <header class="intro">
    <p class="eyebrow">CONSENSUSKIT / EVENT INFRASTRUCTURE</p>
    <h1>Event explorer<span class="accent">.</span></h1>
    <p class="lede">An ordered view of your Hedera events, indexed into PostgreSQL and ready to verify.</p>
  </header>`;
}

async function load() {
  app.innerHTML = `<main class="shell">${pageIntro()}<p class="loading-note" role="status">Loading event history…</p></main>`;
  try {
    const response = await fetch('/api/overview');
    const data = (await response.json()) as Overview & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    app.innerHTML = `
      <main class="shell">
        ${pageIntro(data.network)}
        <section class="metrics" aria-label="Overview">
          <div class="metric"><span class="eyebrow">HCS TOPIC</span><strong class="topic-value">${escapeHtml(data.topicId || 'Not configured')}</strong></div>
          <div class="metric"><span class="eyebrow">INDEXED EVENTS</span><strong>${data.indexedEvents}</strong></div>
          <div class="metric"><span class="eyebrow">LAST SEQUENCE</span><strong>${data.lastSequence}</strong></div>
          <div class="metric"><span class="eyebrow">INDEXED STATE</span><strong class="state-value"><span class="state-dot" aria-hidden="true"></span>${data.lastSequence ? 'At checkpoint' : 'Awaiting events'}</strong></div>
        </section>
        <div class="content-grid">
          <section class="explorer" aria-labelledby="events-heading">
            <div class="section-head"><div><p class="eyebrow">01 / ORDERED HISTORY</p><h2 id="events-heading">Events</h2></div><button id="refresh" class="text-button" type="button"><span aria-hidden="true">↻</span> Refresh</button></div>
            <div class="table-wrap"><table><thead><tr><th scope="col">SEQ</th><th scope="col">STREAM</th><th scope="col">EVENT TYPE</th><th scope="col">ENTITY</th><th scope="col">CONSENSUS TIME</th><th scope="col"><span class="sr-only">Open</span></th></tr></thead><tbody>${data.events.length ? data.events.map((event, i) => `<tr data-index="${i}"><td class="seq"><button class="row-trigger" type="button" aria-label="View ${escapeHtml(event.event_type)} event, sequence ${escapeHtml(event.sequence_number)}" aria-pressed="false">${escapeHtml(event.sequence_number)}</button></td><td>${escapeHtml(event.stream)}</td><td><span class="event-type">${escapeHtml(event.event_type)}</span></td><td>${escapeHtml(event.entity_id)}</td><td class="time">${escapeHtml(event.consensus_timestamp)}</td><td class="row-arrow" aria-hidden="true">↗</td></tr>`).join('') : '<tr><td colspan="6" class="empty">No events indexed yet. Publish an event, then run the indexer.</td></tr>'}</tbody></table></div>
          </section>
          <aside id="details" class="details" aria-label="Event details" aria-live="polite"><div class="placeholder"><p class="eyebrow">02 / RECORD INSPECTION</p><div class="placeholder-symbol" aria-hidden="true">↗</div><h2>Select an event</h2><p>Inspect its HCS record and verify it against Mirror Node.</p></div></aside>
        </div>
        <footer><span>${escapeHtml(projectName)}</span><span>HCS <span aria-hidden="true">→</span> MIRROR NODE <span aria-hidden="true">→</span> POSTGRESQL</span></footer>
      </main>`;
    document.querySelector('#refresh')?.addEventListener('click', load);
    document.querySelectorAll<HTMLTableRowElement>('tr[data-index]').forEach((row) => {
      const select = () =>
        showDetails(
          data.events[Number(row.dataset.index)],
          data.network,
          Number(row.dataset.index),
        );
      row.addEventListener('click', select);
    });
  } catch (error) {
    app.innerHTML = `<main class="shell">${pageIntro()}<section class="error-state"><p class="eyebrow">EXPLORER UNAVAILABLE</p><h2>Unable to load events.</h2><p>${escapeHtml(error instanceof Error ? error.message : error)}</p><button id="retry" class="primary-button" type="button">Retry loading <span aria-hidden="true">↗</span></button></section></main>`;
    document.querySelector('#retry')?.addEventListener('click', load);
  }
}

function showDetails(event: EventRow, network: string, selectedIndex: number) {
  const details = document.querySelector<HTMLElement>('#details')!;
  document.querySelectorAll<HTMLTableRowElement>('tr[data-index]').forEach((row) => {
    const selected = Number(row.dataset.index) === selectedIndex;
    row.classList.toggle('selected', selected);
    row.querySelector('button')?.setAttribute('aria-pressed', String(selected));
  });
  details.innerHTML = `<div class="details-head"><p class="eyebrow">02 / RECORD INSPECTION</p><span class="detail-seq">SEQ ${escapeHtml(event.sequence_number)}</span></div><h2>${escapeHtml(event.event_type)}</h2><p class="detail-subtitle">Event metadata recorded from HCS.</p><dl>
    <div><dt>EVENT ID</dt><dd>${escapeHtml(event.event_id)}</dd></div>
    <div><dt>STREAM</dt><dd>${escapeHtml(event.stream)}</dd></div>
    <div><dt>ENTITY ID</dt><dd>${escapeHtml(event.entity_id)}</dd></div>
    <div><dt>TOPIC ID</dt><dd>${escapeHtml(event.topic_id)}</dd></div>
    <div><dt>SEQUENCE</dt><dd>${escapeHtml(event.sequence_number)}</dd></div>
    <div><dt>CONSENSUS TIMESTAMP</dt><dd>${escapeHtml(event.consensus_timestamp)}</dd></div>
    <div><dt>PAYLOAD HASH / SHA-256</dt><dd class="hash">${escapeHtml(event.payload_hash)}</dd></div>
  </dl><div id="verification" class="verification" role="status"><span class="verification-icon" aria-hidden="true">○</span> Ready to verify</div><div class="actions"><button id="verify" class="primary-button" type="button">Verify with Mirror Node <span aria-hidden="true">↗</span></button><a class="secondary-link" target="_blank" rel="noopener noreferrer" href="${hashscan(event.topic_id, event.sequence_number, network)}">View on Hashscan <span aria-hidden="true">↗</span></a></div>`;
  document.querySelector('#verify')?.addEventListener('click', async () => {
    const status = document.querySelector<HTMLElement>('#verification')!;
    const button = document.querySelector<HTMLButtonElement>('#verify')!;
    button.disabled = true;
    status.textContent = 'Checking HCS message…';
    status.className = 'verification checking';
    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(event.event_id)}`);
      const result = (await response.json()) as {
        verified?: boolean;
        reason?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      status.textContent = result.verified
        ? '✓ Verified against HCS'
        : `✕ ${result.reason ?? 'Verification failed'}`;
      status.className = `verification ${result.verified ? 'verified' : 'failed'}`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Verification failed';
      status.className = 'verification failed';
    } finally {
      button.disabled = false;
    }
  });
}

void load();
