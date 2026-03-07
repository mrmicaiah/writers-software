// Writer's Dashboard - Main Application

const API_BASE = '/api';

// State
let state = {
  view: 'categories',
  category: null,
  project: null,
  file: null,
  projects: {},
  fileContent: '',
  assistantMessages: [],
  loading: false
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

async function fetchFile(category, project, path) {
  try {
    const res = await fetch(`${API_BASE}/file?category=${category}&project=${project}&path=${encodeURIComponent(path)}`);
    const data = await res.json();
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

async function askAssistant(message, context) {
  try {
    const res = await fetch(`${API_BASE}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context })
    });
    return await res.json();
  } catch (err) {
    console.error('Assistant error:', err);
    return { response: 'Sorry, I encountered an error. Please try again.' };
  }
}

async function exportProject(category, project, format) {
  window.location.href = `${API_BASE}/export?category=${category}&project=${project}&format=${format}`;
}

// Render Functions
function render() {
  const app = document.getElementById('app');
  
  let content = '<div class="ambient-light"></div>';
  content += renderHeader();
  
  switch (state.view) {
    case 'categories':
      content += renderCategories();
      break;
    case 'projects':
      content += renderProjects();
      break;
    case 'editor':
      content += renderEditor();
      break;
  }
  
  if (state.view !== 'editor') {
    content += renderFooter();
  }
  
  app.innerHTML = content;
  attachEventListeners();
}

function renderHeader() {
  return `
    <header class="header">
      <h1>The Library</h1>
      <p>Your Writing Collection</p>
      <div class="header-line"></div>
    </header>
  `;
}

function renderCategories() {
  const categories = [
    { id: 'book-writing', name: 'Book Writing', count: state.projects['book-writing']?.length || 0 },
    { id: 'research', name: 'Research', count: state.projects['research']?.length || 0 },
    { id: 'brainstorming', name: 'Brainstorming', count: state.projects['brainstorming']?.length || 0 }
  ];
  
  return `
    <div class="categories">
      ${categories.map(cat => `
        <div class="category-card" data-category="${cat.id}">
          <h2>${cat.name}</h2>
          <p>${cat.count} ${cat.count === 1 ? 'project' : 'projects'}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function renderProjects() {
  const projects = state.projects[state.category] || [];
  const categoryNames = {
    'book-writing': 'Book Writing',
    'research': 'Research',
    'brainstorming': 'Brainstorming'
  };
  
  const statusColors = {
    'nurturing': '#D4AF37',
    'active': '#228B22',
    'drafting': '#4169E1',
    'editing': '#FF8C00',
    'complete': '#6B8E23'
  };
  
  const bookColors = ['#8B4513', '#2F4F4F', '#4A0E0E', '#B8860B', '#3D3D3D', '#1C3A4A', '#5D3A1A', '#2E4A3E'];
  
  return `
    <button class="back-btn" data-action="back">← Back</button>
    <div class="shelf-container">
      <h2 class="shelf-title">${categoryNames[state.category]}</h2>
      <div class="books-row">
        ${projects.map((proj, i) => {
          const color = bookColors[i % bookColors.length];
          const statusColor = statusColors[proj.status] || '#666';
          return `
            <div class="book-cover" data-project="${proj.folder}" style="
              background: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px),
                          linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}99 100%);
              box-shadow: 4px 4px 12px rgba(0,0,0,0.3), inset -2px 0 6px rgba(0,0,0,0.2), inset 2px 0 6px rgba(255,255,255,0.05);
            ">
              <div class="book-spine"></div>
              <div class="book-border-top"></div>
              <h3 class="book-title">${proj.title}</h3>
              <div class="book-divider"></div>
              <p class="book-summary">${proj.summary}</p>
              <div class="book-border-bottom"></div>
              <span class="book-status" style="background: ${statusColor}">${proj.status}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="shelf">
        <div class="shelf-edge"></div>
      </div>
    </div>
  `;
}

function renderEditor() {
  const proj = state.projects[state.category]?.find(p => p.folder === state.project);
  
  return `
    <div class="editor-container">
      <div class="file-tree">
        <button class="back-btn" data-action="back-to-projects" style="margin: 0 0 20px 0; width: 100%;">← ${proj?.title || 'Back'}</button>
        <div class="file-tree-item file-tree-folder">📁 characters</div>
        <div class="file-tree-item" data-file="characters/main.md">  └ main.md</div>
        <div class="file-tree-item file-tree-folder">📁 chapters</div>
        <div class="file-tree-item" data-file="chapters/chapter-01.md">  └ chapter-01.md</div>
        <div class="file-tree-item file-tree-folder">📁 research</div>
        <div class="file-tree-item" data-file="research/notes.md">  └ notes.md</div>
        <div class="file-tree-item file-tree-folder">📁 notes</div>
        <div class="file-tree-item" data-file="notes/ideas.md">  └ ideas.md</div>
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
          <h3>Writing Assistant</h3>
        </div>
        <div class="assistant-messages" id="assistant-messages">
          ${state.assistantMessages.map(msg => `
            <div class="assistant-message ${msg.role}">${msg.content}</div>
          `).join('')}
          ${state.assistantMessages.length === 0 ? `
            <div class="assistant-message assistant">
              I'm here to help with your writing. Ask me to:
              <br><br>
              • Develop characters or plot points<br>
              • Research topics for your story<br>
              • Edit or improve passages<br>
              • Brainstorm ideas<br>
              • Create new files or chapters
            </div>
          ` : ''}
        </div>
        <div class="assistant-input">
          <textarea id="assistant-input" placeholder="Ask your writing assistant..."></textarea>
          <button data-action="ask-assistant" ${state.loading ? 'disabled' : ''}>
            ${state.loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <p>WRITER'S DASHBOARD • POWERED BY GITHUB</p>
    </footer>
  `;
}

// Event Listeners
function attachEventListeners() {
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      state.category = card.dataset.category;
      state.view = 'projects';
      render();
    });
  });
  
  document.querySelectorAll('.book-cover').forEach(book => {
    book.addEventListener('click', () => {
      state.project = book.dataset.project;
      state.view = 'editor';
      state.file = null;
      state.fileContent = '';
      state.assistantMessages = [];
      render();
    });
  });
  
  document.querySelectorAll('.file-tree-item[data-file]').forEach(item => {
    item.addEventListener('click', async () => {
      state.file = item.dataset.file;
      state.loading = true;
      render();
      
      state.fileContent = await fetchFile(state.category, state.project, state.file);
      state.loading = false;
      render();
    });
  });
  
  document.querySelectorAll('[data-action="back"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = 'categories';
      state.category = null;
      render();
    });
  });
  
  document.querySelectorAll('[data-action="back-to-projects"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = 'projects';
      state.project = null;
      state.file = null;
      render();
    });
  });
  
  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const content = document.getElementById('editor-content')?.value || '';
      if (state.file) {
        await saveFile(state.category, state.project, state.file, content);
        state.fileContent = content;
      }
    });
  });
  
  document.querySelectorAll('[data-action="export-zip"]').forEach(btn => {
    btn.addEventListener('click', () => {
      exportProject(state.category, state.project, 'zip');
    });
  });
  
  document.querySelectorAll('[data-action="export-pdf"]').forEach(btn => {
    btn.addEventListener('click', () => {
      exportProject(state.category, state.project, 'pdf');
    });
  });
  
  document.querySelectorAll('[data-action="ask-assistant"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const input = document.getElementById('assistant-input');
      const message = input?.value?.trim();
      if (!message) return;
      
      state.assistantMessages.push({ role: 'user', content: message });
      state.loading = true;
      render();
      
      const editorContent = document.getElementById('editor-content')?.value || '';
      const context = {
        category: state.category,
        project: state.project,
        file: state.file,
        currentContent: editorContent
      };
      
      const result = await askAssistant(message, context);
      state.assistantMessages.push({ role: 'assistant', content: result.response });
      state.loading = false;
      
      if (result.fileUpdate) {
        state.fileContent = result.fileUpdate;
      }
      
      render();
      
      const messagesDiv = document.getElementById('assistant-messages');
      if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });
  
  const assistantInput = document.getElementById('assistant-input');
  if (assistantInput) {
    assistantInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.querySelector('[data-action="ask-assistant"]')?.click();
      }
    });
  }
}

// Initialize
async function init() {
  state.projects = await fetchProjects();
  render();
}

init();