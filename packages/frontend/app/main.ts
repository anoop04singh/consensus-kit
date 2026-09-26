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
  `https://hashscan.io/${network}/topic/${encodeURIComponent(topic)}?p=1&k=sequenceNumber&v=${encodeURIComponent(sequence)}`;

async function load() {
  app.innerHTML = `<main class="shell"><p class="eyebrow">${escapeHtml(projectName)} / EXPLORER</p><h1>Loading event history…</h1></main>`;
  try {
    const response = await fetch('/api/overview');
    const data = (await response.json()) as Overview & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    app.innerHTML = `
      <main class="shell">
        <header><div><p class="eyebrow"><span class="pulse"></span> ${escapeHtml(projectName)} / EXPLORER</p><h1>Event explorer</h1><p class="lede">Hedera Consensus Service events, indexed into PostgreSQL and ready to verify.</p></div><div class="network">${escapeHtml(data.network)} network</div></header>
        <section class="metrics" aria-label="Overview"><div><span>HCS TOPIC</span><strong>${escapeHtml(data.topicId || 'Not configured')}</strong></div><div><span>INDEXED EVENTS</span><strong>${data.indexedEvents}</strong></div><div><span>LAST SEQUENCE</span><strong>${data.lastSequence}</strong></div><div><span>INDEXER</span><strong class="status">${data.lastSequence ? 'At checkpoint' : 'Awaiting events'}</strong></div></section>
        <section class="explorer"><div class="section-head"><div><p class="eyebrow">THE LEDGER</p><h2>Event explorer</h2></div><button id="refresh" type="button">↻ Refresh</button></div><div class="table-wrap"><table><thead><tr><th>SEQ</th><th>STREAM</th><th>EVENT TYPE</th><th>ENTITY</th><th>CONSENSUS TIME</th><th></th></tr></thead><tbody>${data.events.length ? data.events.map((event, i) => `<tr data-index="${i}" tabindex="0"><td class="seq">#${escapeHtml(event.sequence_number)}</td><td>${escapeHtml(event.stream)}</td><td><span class="event-type">${escapeHtml(event.event_type)}</span></td><td>${escapeHtml(event.entity_id)}</td><td>${escapeHtml(event.consensus_timestamp)}</td><td class="arrow">↗</td></tr>`).join('') : '<tr><td colspan="6" class="empty">No events indexed yet. Publish an event, then run the indexer.</td></tr>'}</tbody></table></div></section>
        <aside id="details" class="details"><div class="placeholder"><span>✦</span><h3>Select an event</h3><p>Inspect the HCS record and verify its payload hash against Mirror Node.</p></div></aside>
        <footer>Powered by ConsensusKit <span>HCS → MIRROR NODE → POSTGRESQL</span></footer>
      </main>`;
    document.querySelector('#refresh')?.addEventListener('click', load);
    document.querySelectorAll<HTMLTableRowElement>('tr[data-index]').forEach((row) => {
      const select = () => showDetails(data.events[Number(row.dataset.index)], data.network);
      row.addEventListener('click', select);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
    });
  } catch (error) {
    app.innerHTML = `<main class="shell"><p class="eyebrow">${escapeHtml(projectName)} / EXPLORER</p><h1>Explorer unavailable</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : error)}</p><button id="retry">Retry</button></main>`;
    document.querySelector('#retry')?.addEventListener('click', load);
  }
}

function showDetails(event: EventRow, network: string) {
  const details = document.querySelector<HTMLElement>('#details')!;
  document
    .querySelectorAll('tr[data-index]')
    .forEach((row) =>
      row.classList.toggle(
        'selected',
        row.textContent?.includes(`#${event.sequence_number}`) ?? false,
      ),
    );
  details.innerHTML = `<p class="eyebrow">EVENT DETAILS / #${escapeHtml(event.sequence_number)}</p><h2>${escapeHtml(event.event_type)}</h2><dl>
    <dt>EVENT ID</dt><dd>${escapeHtml(event.event_id)}</dd><dt>STREAM</dt><dd>${escapeHtml(event.stream)}</dd><dt>ENTITY ID</dt><dd>${escapeHtml(event.entity_id)}</dd><dt>TOPIC ID</dt><dd>${escapeHtml(event.topic_id)}</dd><dt>SEQUENCE</dt><dd>${escapeHtml(event.sequence_number)}</dd><dt>CONSENSUS TIMESTAMP</dt><dd>${escapeHtml(event.consensus_timestamp)}</dd><dt>PAYLOAD HASH / SHA-256</dt><dd class="hash">${escapeHtml(event.payload_hash)}</dd></dl><div id="verification" class="verification">Verification available</div><div class="actions"><button id="verify" type="button">Verify with Mirror Node ↗</button><a target="_blank" rel="noopener noreferrer" href="${hashscan(event.topic_id, event.sequence_number, network)}">View on Hashscan ↗</a></div>`;
  document.querySelector('#verify')?.addEventListener('click', async () => {
    const status = document.querySelector<HTMLElement>('#verification')!;
    status.textContent = 'Checking HCS message…';
    try {
      const response = await fetch(`/api/verify/${encodeURIComponent(event.event_id)}`);
      const result = (await response.json()) as {
        verified?: boolean;
        reason?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      status.textContent = result.verified
        ? '✓ VERIFIED AGAINST HCS'
        : `✕ ${result.reason ?? 'Verification failed'}`;
      status.className = `verification ${result.verified ? 'verified' : 'failed'}`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Verification failed';
      status.className = 'verification failed';
    }
  });
}

void load();
