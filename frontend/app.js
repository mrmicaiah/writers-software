// Writer's Dashboard - Main Application

const API_BASE = '/api';

// State
let state = {
  view: 'categories',
  category: null,
  bookView: null, // 'development' | 'ultimate-focus' | 'published'
  project: null,
  file: null,
  projects: {},
  fileContent: '',
  assistantMessages: [],
  loading: false
};

// Stage definitions
const STAGES = {
  development: ['idea', 'nurturing', 'plausible', 'development'],
  ultimate_focus: ['ultimate_focus', 'initial_draft', 'dialogue_draft', 'backstory_draft', 'emotional_draft', 'polish_draft', 'final_draft', 'beta_reader', 'polishing', 'final_edit'],
  published: ['published']
};

const STAGE_LABELS = {
  idea: 'Idea',
  nurturing: 'Nurturing',
  plausible: 'Plausible',
  development: 'Development',
  ultimate_focus: 'Ultimate Focus',
  initial_draft: 'Initial Draft',
  dialogue_draft: 'Dialogue Draft',
  backstory_draft: 'Backstory Draft',
  emotional_draft: 'Emotional Draft',
  polish_draft: 'Polish Draft',
  final_draft: 'Final Draft',
  beta_reader: 'Beta Reader',
  polishing: 'Polishing',
  final_edit: 'Final Edit',
  published: 'Published'
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

// Helper functions
function getProjectsByStage(projects, stage) {
  return (projects['book-writing'] || []).filter(p => p.stage === stage);
}

function getUltimateFocusBook(projects) {
  return (projects['book-writing'] || []).find(p => p.ultimate_focus === true);
}

function getPublishedBooks(projects) {
  return (projects['book-writing'] || []).filter(p => p.stage === 'published');
}

function getDevelopmentBooks(projects) {
  return (projects['book-writing'] || []).filter(p => STAGES.development.includes(p.stage));
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
    case 'book-writing':
      content += renderBookWritingMenu();
      break;
    case 'development':
      content += renderDevelopmentView();
      break;
    case 'ultimate-focus':
      content += renderUltimateFocusView();
      break;
    case 'published':
      content += renderPublishedView();
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

function renderBookWritingMenu() {
  const ultimateFocusBook = getUltimateFocusBook(state.projects);
  const developmentCount = getDevelopmentBooks(state.projects).length;
  const publishedCount = getPublishedBooks(state.projects).length;
  
  return `
    <button class="back-btn" data-action="back-to-categories">← Back</button>
    <div class="categories">
      <div class="category-card" data-book-view="development">
        <h2>Development</h2>
        <p>${developmentCount} ${developmentCount === 1 ? 'book' : 'books'} in progress</p>
      </div>
      <div class="category-card ultimate-focus-card" data-book-view="ultimate-focus">
        <h2>Ultimate Focus</h2>
        <p>${ultimateFocusBook ? ultimateFocusBook.title : 'No active book'}</p>
      </div>
      <div class="category-card" data-book-view="published">
        <h2>Published</h2>
        <p>${publishedCount} ${publishedCount === 1 ? 'book' : 'books'} complete</p>
      </div>
    </div>
  `;
}

function renderDevelopmentView() {
  const bookColors = ['#8B4513', '#2F4F4F', '#4A0E0E', '#B8860B', '#3D3D3D', '#1C3A4A', '#5D3A1A', '#2E4A3E'];
  
  let content = `
    <button class="back-btn" data-action="back-to-book-writing">← Back</button>
    <div class="shelf-container">
      <h2 class="shelf-title">Development</h2>
  `;
  
  STAGES.development.forEach(stage => {
    const books = getProjectsByStage(state.projects, stage);
    if (books.length > 0) {
      content += `
        <h3 class="stage-header">${STAGE_LABELS[stage]}</h3>
        <div class="books-row">
          ${books.map((proj, i) => renderBookCover(proj, bookColors[i % bookColors.length])).join('')}
        </div>
        <div class="shelf">
          <div class="shelf-edge"></div>
        </div>
      `;
    }
  });
  
  content += '</div>';
  return content;
}

function renderUltimateFocusView() {
  const book = getUltimateFocusBook(state.projects);
  
  if (!book) {
    return `
      <button class="back-btn" data-action="back-to-book-writing">← Back</button>
      <div class="empty-state">
        <h2>No Ultimate Focus Book</h2>
        <p>Select a book from Development to set as your Ultimate Focus.</p>
      </div>
    `;
  }
  
  const stageIndex = STAGES.ultimate_focus.indexOf(book.stage);
  
  return `
    <button class="back-btn" data-action="back-to-book-writing">← Back</button>
    <div class="ultimate-focus-container">
      <div class="focus-book-header">
        <h2>${book.title}</h2>
        <p class="focus-stage">Stage: ${STAGE_LABELS[book.stage] || book.stage}</p>
      </div>
      
      <div class="stage-progress">
        ${STAGES.ultimate_focus.map((s, i) => `
          <div class="stage-dot ${i <= stageIndex ? 'completed' : ''} ${s === book.stage ? 'current' : ''}">
            <span class="stage-label">${STAGE_LABELS[s]}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="focus-actions">
        <button class="primary-btn" data-project="${book.folder}" data-action="open-editor">Open Editor</button>
        <button class="secondary-btn" data-action="export-zip">Export ZIP</button>
        <button class="secondary-btn" data-action="export-pdf">Export 6×9 PDF</button>
      </div>
    </div>
  `;
}

function renderPublishedView() {
  const books = getPublishedBooks(state.projects);
  const bookColors = ['#2F4F4F', '#4A0E0E', '#1C3A4A', '#3D3D3D'];
  
  return `
    <button class="back-btn" data-action="back-to-book-writing">← Back</button>
    <div class="shelf-container">
      <h2 class="shelf-title">Published</h2>
      ${books.length > 0 ? `
        <div class="books-row">
          ${books.map((proj, i) => renderBookCover(proj, bookColors[i % bookColors.length], true)).join('')}
        </div>
        <div class="shelf">
          <div class="shelf-edge"></div>
        </div>
      ` : `
        <div class="empty-state">
          <p>No published books yet. Keep writing!</p>
        </div>
      `}
    </div>
  `;
}

function renderBookCover(proj, color, isPublished = false) {
  const statusColors = {
    'idea': '#888',
    'nurturing': '#D4AF37',
    'plausible': '#4169E1',
    'development': '#228B22',
    'ultimate_focus': '#FF4500',
    'initial_draft': '#4169E1',
    'dialogue_draft': '#4169E1',
    'backstory_draft': '#4169E1',
    'emotional_draft': '#4169E1',
    'polish_draft': '#4169E1',
    'final_draft': '#4169E1',
    'beta_reader': '#FF8C00',
    'polishing': '#FF8C00',
    'final_edit': '#FF8C00',
    'published': '#6B8E23'
  };
  
  const statusColor = statusColors[proj.stage] || '#666';
  
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
      <span class="book-status" style="background: ${statusColor}">${STAGE_LABELS[proj.stage] || proj.stage}</span>
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
  
  const bookColors = ['#8B4513', '#2F4F4F', '#4A0E0E', '#B8860B', '#3D3D3D', '#1C3A4A', '#5D3A1A', '#2E4A3E'];
  
  return `
    <button class="back-btn" data-action="back">← Back</button>
    <div class="shelf-container">
      <h2 class="shelf-title">${categoryNames[state.category]}</h2>
      <div class="books-row">
        ${projects.map((proj, i) => {
          const color = bookColors[i % bookColors.length];
          return renderBookCover(proj, color);
        }).join('')}
      </div>
      <div class="shelf">
        <div class="shelf-edge"></div>
      </div>
    </div>
  `;
}

function renderEditor() {
  const proj = state.projects[state.category]?.find(p => p.folder === state.project) ||
               state.projects['book-writing']?.find(p => p.folder === state.project);
  
  const isPublished = proj?.stage === 'published';
  
  return `
    <div class="editor-container">
      <div class="file-tree">
        <button class="back-btn" data-action="back-to-projects" style="margin: 0 0 20px 0; width: 100%;">← ${proj?.title || 'Back'}</button>
        ${isPublished ? `
          <div class="file-tree-item file-tree-folder">📁 published</div>
          <div class="file-tree-item" data-file="published/title-page.md">  └ title-page.md</div>
          <div class="file-tree-item" data-file="published/dedication.md">  └ dedication.md</div>
          <div class="file-tree-item" data-file="published/isbn-page.md">  └ isbn-page.md</div>
          <div class="file-tree-item" data-file="published/chapter-01.md">  └ chapter-01.md</div>
        ` : `
          <div class="file-tree-item file-tree-folder">📁 characters</div>
          <div class="file-tree-item" data-file="characters/main.md">  └ main.md</div>
          <div class="file-tree-item file-tree-folder">📁 chapters</div>
          <div class="file-tree-item" data-file="chapters/chapter-01.md">  └ chapter-01.md</div>
          <div class="file-tree-item file-tree-folder">📁 research</div>
          <div class="file-tree-item" data-file="research/notes.md">  └ notes.md</div>
          <div class="file-tree-item file-tree-folder">📁 notes</div>
          <div class="file-tree-item" data-file="notes/ideas.md">  └ ideas.md</div>
        `}
      </div>
      
      <div class="editor-main">
        <div class="editor-header">
          <span class="editor-filename">${state.file || 'Select a file'}</span>
          <div class="editor-actions">
            ${isPublished ? `
              <button class="secondary" data-action="export-published-zip">Export ZIP</button>
              <button data-action="export-published-pdf">Export 6×9 PDF</button>
            ` : `
              <button class="secondary" data-action="export-zip">Export ZIP</button>
              <button class="secondary" data-action="export-pdf">Export 6×9 PDF</button>
              <button data-action="save">Save</button>
            `}
          </div>
        </div>
        <textarea class="editor-textarea" id="editor-content" placeholder="Select a file from the tree to begin editing..." ${isPublished ? 'readonly' : ''}>${state.fileContent}</textarea>
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
  // Category clicks
  document.querySelectorAll('.category-card[data-category]').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      if (cat === 'book-writing') {
        state.view = 'book-writing';
      } else {
        state.category = cat;
        state.view = 'projects';
      }
      render();
    });
  });
  
  // Book writing menu clicks
  document.querySelectorAll('.category-card[data-book-view]').forEach(card => {
    card.addEventListener('click', () => {
      state.view = card.dataset.bookView;
      state.category = 'book-writing';
      render();
    });
  });
  
  // Book clicks
  document.querySelectorAll('.book-cover').forEach(book => {
    book.addEventListener('click', () => {
      state.project = book.dataset.project;
      state.view = 'editor';
      state.category = 'book-writing';
      state.file = null;
      state.fileContent = '';
      state.assistantMessages = [];
      render();
    });
  });
  
  // Open editor from ultimate focus
  document.querySelectorAll('[data-action="open-editor"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.project = btn.dataset.project;
      state.view = 'editor';
      state.category = 'book-writing';
      state.file = null;
      state.fileContent = '';
      state.assistantMessages = [];
      render();
    });
  });
  
  // File tree clicks
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
  
  // Back buttons
  document.querySelectorAll('[data-action="back-to-categories"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = 'categories';
      state.category = null;
      render();
    });
  });
  
  document.querySelectorAll('[data-action="back-to-book-writing"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = 'book-writing';
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
      if (state.category === 'book-writing') {
        state.view = 'book-writing';
      } else {
        state.view = 'projects';
      }
      state.project = null;
      state.file = null;
      render();
    });
  });
  
  // Save button
  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const content = document.getElementById('editor-content')?.value || '';
      if (state.file) {
        await saveFile(state.category, state.project, state.file, content);
        state.fileContent = content;
      }
    });
  });
  
  // Export buttons
  document.querySelectorAll('[data-action="export-zip"], [data-action="export-published-zip"]').forEach(btn => {
    btn.addEventListener('click', () => {
      exportProject(state.category, state.project, 'zip');
    });
  });
  
  document.querySelectorAll('[data-action="export-pdf"], [data-action="export-published-pdf"]').forEach(btn => {
    btn.addEventListener('click', () => {
      exportProject(state.category, state.project, 'pdf');
    });
  });
  
  // Assistant
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
  
  // Enter to send in assistant
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