import { WorkState } from '../domain/model';

export function sidebarHtml(nonce: string): string {
  return htmlDocument(nonce, `
    <main id="app" class="wrap"></main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const app = document.getElementById('app');
      let state = { active: null, summary: null, restoration: false, error: null };

      window.addEventListener('message', event => {
        state = event.data;
        render();
      });

      function post(type, payload = {}) { vscode.postMessage({ type, ...payload }); }
      function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
      }
      function list(items) {
        return items && items.length ? '<ul>' + items.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>' : '<p class="muted">None recorded.</p>';
      }
      function render() {
        if (state.error) {
          app.innerHTML = '<section><h2>WORKSTATE</h2><p class="error">' + escapeHtml(state.error) + '</p><p class="muted">The corrupted file was preserved as a backup where possible. You can start a new local WorkState when ready.</p><button id="recover">Start Fresh</button></section>';
          document.getElementById('recover').onclick = () => post('recover');
          return;
        }
        if (!state.active) {
          app.innerHTML = \`
            <section class="empty">
              <h2>WORKSTATE</h2>
              <p>Your project context,<br>remembered automatically.</p>
              <p class="muted">Capture what matters. WorkState will reconstruct where you left off.</p>
              <button id="create">Start Remembering</button>
            </section>\`;
          document.getElementById('create').onclick = () => post('create');
          return;
        }
        const ws = state.active;
        const summary = state.summary || {};
        app.innerHTML = \`
          <section>
            <div class="eyebrow">WORKSTATE</div>
            <h2><span class="dot"></span>\${escapeHtml(summary.projectName || ws.name)}</h2>
            <div class="hero">
              <div class="label">You were working on</div>
              <div class="focus">\${escapeHtml(summary.focus || ws.name)}</div>
              <div class="meta">Last activity · \${escapeHtml(summary.lastActivity || 'Just now')}</div>
              <p class="quote">"\${escapeHtml(summary.summary || 'Capture what matters and WorkState will remember where you left off.')}"</p>
              <div class="label">Next</div>
              <p>\${escapeHtml(summary.next || 'Continue from the most recent captured context.')}</p>
            </div>
            <button id="continue" class="primary">Continue Work</button>
            <div class="grid-actions">
              <button id="quickCapture" class="secondary">Capture</button>
              <button id="decision" class="secondary">Decisions</button>
              <button id="handoff" class="secondary">Handoff</button>
            </div>
            <section class="recent">
              <div class="label">Recent</div>
              \${list(summary.recent || [])}
            </section>
            <details>
              <summary>Details</summary>
              <div class="actions">
                <button id="quickUpdate" class="secondary">Mark Done / Update</button>
                <button id="fullHandoff" class="secondary">Full Context</button>
                <button id="edit" class="secondary">Edit Legacy Fields</button>
              </div>
              <div class="label">Important Decisions</div>
              \${list(summary.decisions || [])}
              <div class="label">Relevant Files</div>
              \${list(summary.relevantFiles || ws.relevantFiles)}
              <button id="files" class="secondary">Manage Files</button>
            </details>
            <details>
              <summary>About WorkState</summary>
              <p><b>WorkState</b><br><span class="muted">Your engineering context, kept in one place.</span></p>
              <div class="label">Created by</div>
              <p>Pranav</p>
              <div class="label">GitHub</div>
              <p>pranavv1210</p>
              <button id="aboutGithub" class="secondary">View GitHub</button>
            </details>
            <div class="footer">
              <button id="dna" class="link">Task DNA</button>
              <button id="archive" class="link">Archive</button>
            </div>
          </section>\`;
        bind('continue', () => post('continue'));
        bind('handoff', () => post('handoff', { mode: 'quick' }));
        bind('fullHandoff', () => post('handoff', { mode: 'full' }));
        bind('quickUpdate', () => post('quickUpdate'));
        bind('quickCapture', () => post('quickCapture'));
        bind('edit', () => post('edit'));
        bind('decision', () => post('decision'));
        bind('rejected', () => post('rejected'));
        bind('files', () => post('files'));
        bind('aboutGithub', () => post('aboutGithub'));
        bind('dna', () => post('dna'));
        bind('archive', () => post('archive'));
        const freshButton = document.getElementById('fresh');
        if (freshButton) freshButton.onclick = () => post('fresh');
      }
      function bind(id, handler) {
        const element = document.getElementById(id);
        if (element) element.onclick = handler;
      }
      post('ready');
    </script>
  `);
}

export function quickUpdateHtml(nonce: string, variant: 'update' | 'capture'): string {
  const compact = variant === 'capture';
  return htmlDocument(nonce, `
    <main class="wrap">
      <div class="toolbar">
        <strong>${compact ? 'Quick Capture' : 'Update WorkState'}</strong>
        <span></span>
        <button id="save">${compact ? 'Capture' : 'Save Update'}</button>
      </div>
      ${compact ? `<div id="captureMenu" class="capture-menu">
        <div class="label">What do you want to save?</div>
        <button data-type="decision" class="secondary">Decision</button>
        <button data-type="rejected" class="secondary">Don't Forget</button>
        <button data-type="completed" class="secondary">Completed</button>
        <button data-type="note" class="secondary">Note</button>
        <button data-type="blocker" class="secondary">Blocker</button>
      </div>` : ''}
      <label>${compact ? 'Capture' : 'What changed?'}<textarea id="content" class="quick" placeholder="${compact ? 'Capture a note, result, or progress item.' : 'Paste or type the update.'}"></textarea></label>
      <label>Type
        <select id="type">
          <option value="note"${compact ? ' selected' : ''}>Note</option>
          <option value="completed"${compact ? '' : ' selected'}>Completed</option>
          <option value="currentState"${compact ? ' disabled' : ''}>Current State</option>
          <option value="blocker">Blocker</option>
          <option value="decision">Decision</option>
          <option value="rejected">Don't Repeat</option>
          <option value="testResult">Test Result</option>
          <option value="nextAction">Next Action</option>
        </select>
      </label>
      <label id="reasonWrap" class="hidden"><span id="reasonLabel">Why?</span><textarea id="reason" class="small"></textarea></label>
      <label id="blockerModeWrap" class="hidden">Blocker Behavior
        <select id="blockerMode">
          <option value="add">Add blocker</option>
          <option value="replace">Replace blockers</option>
        </select>
      </label>
      <p class="muted">No AI classification is used. The selected type is saved exactly as trusted WorkState.</p>
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const type = document.getElementById('type');
      const reasonWrap = document.getElementById('reasonWrap');
      const reasonLabel = document.getElementById('reasonLabel');
      const blockerModeWrap = document.getElementById('blockerModeWrap');
      const menu = document.getElementById('captureMenu');
      function sync() {
        const value = type.value;
        reasonWrap.classList.toggle('hidden', value !== 'decision' && value !== 'rejected');
        blockerModeWrap.classList.toggle('hidden', value !== 'blocker');
        reasonLabel.textContent = value === 'rejected' ? 'Why should this not be repeated?' : 'Why?';
      }
      type.onchange = sync;
      if (menu) {
        menu.querySelectorAll('button[data-type]').forEach(button => {
          button.onclick = () => {
            type.value = button.dataset.type;
            sync();
            document.getElementById('content').focus();
          };
        });
      }
      document.getElementById('save').onclick = () => vscode.postMessage({
        type: 'save',
        update: {
          type: type.value,
          content: document.getElementById('content').value,
          reason: document.getElementById('reason').value,
          blockerMode: document.getElementById('blockerMode').value
        }
      });
      window.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          document.getElementById('save').click();
        }
      });
      sync();
      document.getElementById('content').focus();
    </script>
  `);
}

export function editWorkStateHtml(nonce: string, state: WorkState): string {
  return htmlDocument(nonce, `
    <main class="wrap">
      <div class="toolbar">
        <strong>Edit WorkState</strong>
        <span></span>
        <button id="save">Save</button>
      </div>
      <label>Task Name<input id="name" value="${escapeAttribute(state.name)}"></label>
      <label>Goal<textarea id="goal">${escapeHtml(state.goal)}</textarea></label>
      <label>Current State<textarea id="currentState">${escapeHtml(state.currentState)}</textarea></label>
      <label>Completed Work<textarea id="completed" placeholder="One item per line">${escapeHtml(state.completed.join('\n'))}</textarea></label>
      <label>Blockers<textarea id="blockers" placeholder="One item per line">${escapeHtml(state.blockers.join('\n'))}</textarea></label>
      <label>Relevant Files<textarea id="relevantFiles" placeholder="Project-relative paths, one per line">${escapeHtml(state.relevantFiles.join('\n'))}</textarea></label>
      <label>Test Notes<textarea id="testNotes">${escapeHtml(state.testNotes)}</textarea></label>
      <label>Next Action<textarea id="nextAction">${escapeHtml(state.nextAction)}</textarea></label>
      <p class="muted">Avoid secrets, API keys, tokens, and credentials. Sensitive-looking file paths are excluded on save.</p>
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const value = id => document.getElementById(id).value;
      document.getElementById('save').onclick = () => vscode.postMessage({
        type: 'save',
        fields: {
          name: value('name'),
          goal: value('goal'),
          currentState: value('currentState'),
          completed: value('completed'),
          blockers: value('blockers'),
          relevantFiles: value('relevantFiles'),
          testNotes: value('testNotes'),
          nextAction: value('nextAction')
        }
      });
      document.getElementById('name').focus();
    </script>
  `);
}

export function handoffHtml(nonce: string, content: string, mode: string): string {
  return htmlDocument(nonce, `
    <main class="wrap">
      <div class="toolbar">
        <strong>${escapeHtml(mode)} Handoff</strong>
        <span></span>
        <button id="regenerate">Regenerate</button>
        <button id="copy">Copy Handoff</button>
      </div>
      <textarea id="content" spellcheck="false">${escapeHtml(content)}</textarea>
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const content = document.getElementById('content');
      document.getElementById('copy').onclick = () => vscode.postMessage({ type: 'copy', content: content.value });
      document.getElementById('regenerate').onclick = () => vscode.postMessage({ type: 'regenerate' });
    </script>
  `);
}

export function taskDnaHtml(nonce: string, state: WorkState): string {
  const items = [...state.dna]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((event) => `<li><time>${escapeHtml(formatDate(event.timestamp))}</time><strong>${escapeHtml(event.title)}</strong>${event.detail ? `<p>${escapeHtml(event.detail)}</p>` : ''}</li>`)
    .join('');
  return htmlDocument(nonce, `
    <main class="wrap">
      <h2>Task DNA</h2>
      <h3>${escapeHtml(state.name)}</h3>
      <ol class="timeline">${items || '<li>No history recorded.</li>'}</ol>
    </main>
  `);
}

function htmlDocument(nonce: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); margin: 0; }
    .wrap { padding: 14px; }
    h2 { font-size: 15px; margin: 6px 0 14px; letter-spacing: 0; }
    h3 { font-size: 13px; margin: 0 0 12px; font-weight: 600; }
    .eyebrow, .label, time { color: var(--vscode-descriptionForeground); font-size: 11px; text-transform: uppercase; margin-top: 10px; }
    .field { border-top: 1px solid var(--vscode-sideBarSectionHeader-border); padding: 9px 0; line-height: 1.4; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: 0; padding: 7px 9px; border-radius: 3px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    button.link { background: transparent; color: var(--vscode-textLink-foreground); padding: 4px 0; }
    button.primary { width: 100%; padding: 9px; margin: 8px 0; font-weight: 600; }
    .actions { display: flex; gap: 8px; margin: 10px 0; flex-wrap: wrap; }
    .grid-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin: 8px 0 12px; }
    .capture-menu { display: grid; grid-template-columns: 1fr; gap: 7px; padding: 8px 0; }
    .footer { display: flex; justify-content: space-between; border-top: 1px solid var(--vscode-sideBarSectionHeader-border); margin-top: 12px; padding-top: 10px; }
    .muted { color: var(--vscode-descriptionForeground); }
    .error { color: var(--vscode-errorForeground); }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3fb950; margin-right: 7px; }
    details { border-top: 1px solid var(--vscode-sideBarSectionHeader-border); padding: 8px 0; }
    summary { cursor: pointer; font-weight: 600; }
    ul { padding-left: 18px; }
    textarea { box-sizing: border-box; width: 100%; height: calc(100vh - 58px); resize: none; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); border: 1px solid var(--vscode-input-border); padding: 12px; font-family: var(--vscode-editor-font-family); line-height: 1.45; }
    textarea.quick { height: 150px; }
    textarea.small { height: 86px; }
    input { box-sizing: border-box; width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); padding: 7px; font-family: var(--vscode-font-family); }
    select { box-sizing: border-box; width: 100%; color: var(--vscode-dropdown-foreground); background: var(--vscode-dropdown-background); border: 1px solid var(--vscode-dropdown-border); padding: 7px; font-family: var(--vscode-font-family); margin-top: 4px; }
    label { display: block; margin: 10px 0; color: var(--vscode-descriptionForeground); font-size: 11px; text-transform: uppercase; }
    label textarea { height: 84px; margin-top: 4px; font-size: var(--vscode-font-size); text-transform: none; }
    label input { margin-top: 4px; font-size: var(--vscode-font-size); text-transform: none; }
    .toolbar { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; margin-bottom: 10px; }
    .hero { border-top: 1px solid var(--vscode-sideBarSectionHeader-border); border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border); padding: 10px 0; margin-bottom: 8px; }
    .focus { font-size: 14px; font-weight: 600; margin: 3px 0; line-height: 1.35; }
    .meta { color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 8px; }
    .quote { line-height: 1.45; margin: 8px 0 12px; }
    .recent { margin-top: 10px; }
    .timeline { padding-left: 18px; }
    .timeline li { margin-bottom: 14px; }
    .timeline strong { display: block; margin-top: 3px; }
    .timeline p { margin: 4px 0 0; color: var(--vscode-descriptionForeground); }
    .hidden { display: none; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(value: string): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
