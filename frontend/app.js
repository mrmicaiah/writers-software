// Writer's Dashboard - Main Application with Alice

const API_BASE = '/api';
const ALICE_IMAGE = 'https://res.cloudinary.com/dxzw1zwez/image/upload/v1772644026/alice_profile_kpamkm.jpg';

// State
let state = {
  view: 'categories',
  category: null,
  project: null,
  file: null,
  projects: {},
  fileContent: '',
  fileSha: null,
  assistantMessages: [{ role: 'assistant', content: "Hello. How can I help with your writing today?" }],
  loading: false,
  aliceOpen: false,
  fileTree: null
};

// API Functions
async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    return {};
  }
}

async function fetchFileTree(category, project) {
  try {
    const res = await fetch(`${API_BASE}/tree?category=${category}&project=${project}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch file tree:', err);
    return null;
  }
}

async function fetchFile(category, project, path) {
  try {
    const res = await fetch(`${API_BASE}/file?category=${category}&project=${project}&path=${encodeURIComponent(path)}`);
    const data = await res.json();
    state.fileSha = data.sha;
    return data.content || '';
  } catch (err) {
    console.error('Failed to fetch file:', err);
    return '';
  }
}

async function saveFile(category, project, path, content) {
  try {
    const res = await fetch(`${API_BASE}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, project, path, content })
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to save file:', err);
    return { success: false };
  }
}

async function askAlice(message) {
  try {
    const context = {
      category: state.category,
      project: state.project,
      file: state.file,
      currentContent: state.fileContent?.substring(0, 4000),
      projectInfo: state.projects[state.category]?.find(p => p.folder === state.project),
      fileTree: state.fileTree
    };
    
    const res = await fetch(`${API_BASE}/alice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        context,
        history: state.assistantMessages.slice(-10)
      })
    });
    return await res.json();
  } catch (err) {
    console.error('Alice error:', err);
    return { response: 'I had trouble connecting. Try again?' };
  }
}

async function exportProject(category, project, format) {
  window.location.href = `${API_BASE}/export?category=${category}&project=${project}&format=${format}`;
}

function render() {
  const app = document.getElementById('app');
  let content = '<div class="ambient-light"></div>';
  content += renderHeader();
  
  switch (state.view) {
    case 'categories': content += renderCategories(); break;
    case 'projects': content += renderProjects(); break;
    case 'editor': content += renderEditor(); break;
  }
  
  if (state.view !== 'editor') content += renderFooter();
  content += renderAlicePanel();
  
  app.innerHTML = content;
  attachEventListeners();
}

function renderHeader() {
  return `<header class="header"><h1>The Library</h1><p>Your Writing Collection</p><div class="header-line"></div></header>`;
}

function renderCategories() {
  const categories = [
    { id: 'book-writing', name: 'Book Writing', count: state.projects['book-writing']?.length || 0 },
    { id: 'research', name: 'Research', count: state.projects['research']?.length || 0 },
    { id: 'brainstorming', name: 'Brainstorming', count: state.projects['brainstorming']?.length || 0 }
  ];
  return `<div class="categories">${categories.map(cat => `<div class="category-card" data-category="${cat.id}"><h2>${cat.name}</h2><p>${cat.count} ${cat.count === 1 ? 'project' : 'projects'}</p></div>`).join('')}</div>`;
}

function renderProjects() {
  const projects = state.projects[state.category] || [];
  const categoryNames = { 'book-writing': 'Book Writing', 'research': 'Research', 'brainstorming': 'Brainstorming' };
  const statusColors = { 'nurturing': '#D4AF37', 'active': '#228B22', 'drafting': '#4169E1', 'editing': '#FF8C00', 'complete': '#6B8E23' };
  const bookColors = ['#8B4513', '#2F4F4F', '#4A0E0E', '#B8860B', '#3D3D3D', '#1C3A4A', '#5D3A1A', '#2E4A3E'];
  
  return `<button class="back-btn" data-action="back">← Back</button>
    <div class="shelf-container">
      <h2 class="shelf-title">${categoryNames[state.category]}</h2>
      <div class="books-row">
        ${projects.map((proj, i) => {
          const color = bookColors[i % bookColors.length];
          const statusColor = statusColors[proj.status] || '#666';
          return `<div class="book-cover" data-project="${proj.folder}" style="background: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px), linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}99 100%); box-shadow: 4px 4px 12px rgba(0,0,0,0.3), inset -2px 0 6px rgba(0,0,0,0.2), inset 2px 0 6px rgba(255,255,255,0.05);"><div class="book-spine"></div><div class="book-border-top"></div><h3 class="book-title">${proj.title}</h3><div class="book-divider"></div><p class="book-summary">${proj.summary}</p><div class="book-border-bottom"></div><span class="book-status" style="background: ${statusColor}">${proj.status}</span></div>`;
        }).join('')}
      </div>
      <div class="shelf"><div class="shelf-edge"></div></div>
    </div>`;
}

function renderFileTreeItems(tree, basePath = '') {
  if (!tree) return '';
  let html = '';
  const items = Object.entries(tree).sort(([aName, aVal], [bName, bVal]) => {
    const aIsDir = typeof aVal === 'object';
    const bIsDir = typeof bVal === 'object';
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return aName.localeCompare(bName);
  });
  for (const [name, value] of items) {
    const path = basePath ? `${basePath}/${name}` : name;
    const isDir = typeof value === 'object';
    if (isDir) {
      html += `<div class="file-tree-item file-tree-folder">📁 ${name}</div><div class="file-tree-children">${renderFileTreeItems(value, path)}</div>`;
    } else {
      const isActive = state.file === path;
      html += `<div class="file-tree-item${isActive ? ' active' : ''}" data-file="${path}">📄 ${name}</div>`;
    }
  }
  return html;
}

function renderEditor() {
  const proj = state.projects[state.category]?.find(p => p.folder === state.project);
  return `<div class="editor-container">
      <div class="file-tree">
        <button class="back-btn" data-action="back-to-projects" style="margin: 0 0 20px 0; width: 100%;">← ${proj?.title || 'Back'}</button>
        ${state.fileTree ? renderFileTreeItems(state.fileTree) : '<div class="loading">Loading files...</div>'}
      </div>
      <div class="editor-main">
        <div class="editor-header">
          <span class="editor-filename">${state.file || 'Select a file'}</span>
          <div class="editor-actions">
            <button class="secondary" data-action="export-zip">Export ZIP</button>
            <button class="secondary" data-action="export-pdf">Export 6×9 PDF</button>
            <button data-action="save">Save</button>
          </div>
        </div>
        <textarea class="editor-textarea" id="editor-content" placeholder="Select a file from the tree to begin editing...">${state.fileContent}</textarea>
      </div>
      <div class="assistant-panel">
        <div class="assistant-header">
          <div class="alice-header-profile">
            <img src="${ALICE_IMAGE}" alt="Alice" class="alice-avatar-small" />
            <h3>Alice</h3>
          </div>
        </div>
        <div class="assistant-messages" id="assistant-messages">
          ${state.assistantMessages.map(msg => `<div class="assistant-message ${msg.role}">${msg.content}</div>`).join('')}
        </div>
        <div class="assistant-input">
          <textarea id="assistant-input" placeholder="Ask Alice for help with your writing..."></textarea>
          <button data-action="ask-alice" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Thinking...' : 'Send'}</button>
        </div>
      </div>
    </div>`;
}

function renderAlicePanel() {
  if (state.view === 'editor') return '';
  if (!state.aliceOpen) {
    return `<button class="alice-floating-btn" data-action="toggle-alice"><img src="${ALICE_IMAGE}" alt="Alice" /></button>`;
  }
  return `<div class="alice-panel-floating">
      <div class="assistant-header">
        <div class="alice-header-profile"><img src="${ALICE_IMAGE}" alt="Alice" class="alice-avatar-small" /><h3>Alice</h3></div>
        <button class="alice-close" data-action="toggle-alice">✕</button>
      </div>
      <div class="assistant-messages" id="assistant-messages">
        ${state.assistantMessages.map(msg => `<div class="assistant-message ${msg.role}">${msg.content}</div>`).join('')}
      </div>
      <div class="assistant-input">
        <textarea id="assistant-input" placeholder="Ask Alice for help..."></textarea>
        <button data-action="ask-alice" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Thinking...' : 'Send'}</button>
      </div>
    </div>`;
}

function renderFooter() {
  return `<footer class="footer"><p>WRITER'S DASHBOARD • POWERED BY GITHUB</p></footer>`;
}

function attachEventListeners() {
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => { state.category = card.dataset.category; state.view = 'projects'; render(); });
  });
  document.querySelectorAll('.book-cover').forEach(book => {
    book.addEventListener('click', async () => {
      state.project = book.dataset.project; state.view = 'editor'; state.file = null; state.fileContent = ''; state.fileTree = null;
      render();
      state.fileTree = await fetchFileTree(state.category, state.project);
      render();
    });
  });
  document.querySelectorAll('.file-tree-item[data-file]').forEach(item => {
    item.addEventListener('click', async () => {
      state.file = item.dataset.file; state.loading = true; render();
      state.fileContent = await fetchFile(state.category, state.project, state.file);
      state.loading = false; render();
    });
  });
  document.querySelectorAll('[data-action="back"]').forEach(btn => {
    btn.addEventListener('click', () => { state.view = 'categories'; state.category = null; render(); });
  });
  document.querySelectorAll('[data-action="back-to-projects"]').forEach(btn => {
    btn.addEventListener('click', () => { state.view = 'projects'; state.project = null; state.file = null; state.fileTree = null; render(); });
  });
  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const content = document.getElementById('editor-content')?.value || '';
      if (state.file) {
        const result = await saveFile(state.category, state.project, state.file, content);
        if (result.success) { state.fileContent = content; btn.textContent = 'Saved!'; setTimeout(() => { btn.textContent = 'Save'; }, 1500); }
      }
    });
  });
  document.querySelectorAll('[data-action="export-zip"]').forEach(btn => { btn.addEventListener('click', () => { exportProject(state.category, state.project, 'zip'); }); });
  document.querySelectorAll('[data-action="export-pdf"]').forEach(btn => { btn.addEventListener('click', () => { exportProject(state.category, state.project, 'pdf'); }); });
  document.querySelectorAll('[data-action="toggle-alice"]').forEach(btn => { btn.addEventListener('click', () => { state.aliceOpen = !state.aliceOpen; render(); }); });
  document.querySelectorAll('[data-action="ask-alice"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const input = document.getElementById('assistant-input');
      const message = input?.value?.trim();
      if (!message) return;
      state.assistantMessages.push({ role: 'user', content: message });
      state.loading = true; render();
      const result = await askAlice(message);
      state.assistantMessages.push({ role: 'assistant', content: result.response });
      state.loading = false;
      if (result.fileUpdate && result.filePath && result.filePath === state.file) { state.fileContent = result.fileUpdate; }
      if (result.filesCreated) { state.fileTree = await fetchFileTree(state.category, state.project); }
      render();
      const messagesDiv = document.getElementById('assistant-messages');
      if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });
  const assistantInput = document.getElementById('assistant-input');
  if (assistantInput) {
    assistantInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.querySelector('[data-action="ask-alice"]')?.click(); } });
  }
}

async function init() { state.projects = await fetchProjects(); render(); }
init();
