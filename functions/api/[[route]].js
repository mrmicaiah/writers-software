// Writer's Dashboard - Cloudflare Pages Function
// API routes for the dashboard

const GITHUB_API = 'https://api.github.com';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    switch (path) {
      case 'projects':
        return jsonResponse(await getProjects(env), corsHeaders);
        
      case 'file':
        if (request.method === 'GET') {
          const category = url.searchParams.get('category');
          const project = url.searchParams.get('project');
          const filePath = url.searchParams.get('path');
          return jsonResponse(await getFile(env, category, project, filePath), corsHeaders);
        } else if (request.method === 'POST') {
          const body = await request.json();
          return jsonResponse(await saveFile(env, body), corsHeaders);
        }
        break;
        
      case 'assistant':
        if (request.method === 'POST') {
          const body = await request.json();
          return jsonResponse(await handleAssistant(env, body), corsHeaders);
        }
        break;
        
      case 'export':
        const category = url.searchParams.get('category');
        const project = url.searchParams.get('project');
        const format = url.searchParams.get('format');
        return await handleExport(env, category, project, format);
        
      default:
        return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
    }
  } catch (err) {
    console.error('API Error:', err);
    return jsonResponse({ error: err.message }, corsHeaders, 500);
  }
}

async function getProjects(env) {
  const categories = ['book-writing', 'research', 'brainstorming'];
  const projects = {};
  
  for (const category of categories) {
    try {
      const contents = await githubFetch(env, `contents/${category}`);
      const folders = contents.filter(item => item.type === 'dir' && !item.name.startsWith('.'));
      
      const projectList = [];
      for (const folder of folders) {
        try {
          const metadata = await githubFetch(env, `contents/${category}/${folder.name}/_metadata.json`);
          const metaContent = JSON.parse(atob(metadata.content));
          projectList.push({
            folder: folder.name,
            title: metaContent.title || folder.name,
            summary: metaContent.summary || '',
            status: metaContent.status || 'active'
          });
        } catch {
          projectList.push({
            folder: folder.name,
            title: folder.name,
            summary: '',
            status: 'active'
          });
        }
      }
      
      projects[category] = projectList;
    } catch {
      projects[category] = [];
    }
  }
  
  return projects;
}

async function getFile(env, category, project, filePath) {
  try {
    const fullPath = `${category}/${project}/${filePath}`;
    const file = await githubFetch(env, `contents/${fullPath}`);
    const content = atob(file.content);
    return { content, sha: file.sha };
  } catch (err) {
    return { content: '', error: err.message };
  }
}

async function saveFile(env, { category, project, path, content }) {
  const fullPath = `${category}/${project}/${path}`;
  
  let sha;
  try {
    const existing = await githubFetch(env, `contents/${fullPath}`);
    sha = existing.sha;
  } catch {
    // File doesn't exist
  }
  
  const body = {
    message: `Update ${path}`,
    content: btoa(content),
    ...(sha && { sha })
  };
  
  await githubFetch(env, `contents/${fullPath}`, 'PUT', body);
  return { success: true };
}

async function handleAssistant(env, { message, context }) {
  const systemPrompt = `You are a writing assistant embedded in a writer's dashboard application. 
You help with creative writing, research, character development, plot outlines, and editing.

Current context:
- Category: ${context.category || 'none'}
- Project: ${context.project || 'none'}
- Current file: ${context.file || 'none'}
- File content: ${context.currentContent?.substring(0, 2000) || 'empty'}

You can:
1. Help brainstorm ideas
2. Develop characters or plot points
3. Research topics (using your knowledge)
4. Edit or improve writing
5. Suggest structural changes
6. Help with dialogue

If asked to modify content, include the full updated text in your response.
Keep responses concise but helpful. Be encouraging and constructive.`;

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    })
  });
  
  const data = await response.json();
  const assistantResponse = data.content?.[0]?.text || 'Sorry, I could not process that request.';
  
  return { response: assistantResponse };
}

async function handleExport(env, category, project, format) {
  if (format === 'zip') {
    const files = await gatherProjectFiles(env, category, project);
    return new Response(JSON.stringify(files), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${project}.json"`
      }
    });
  } else if (format === 'pdf') {
    return new Response(JSON.stringify({ 
      error: 'PDF export coming soon',
      message: 'This feature requires additional setup for 6x9 formatting'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Invalid format', { status: 400 });
}

async function gatherProjectFiles(env, category, project) {
  const basePath = `${category}/${project}`;
  const files = {};
  
  async function traverseDir(path) {
    try {
      const contents = await githubFetch(env, `contents/${path}`);
      for (const item of contents) {
        if (item.type === 'file' && !item.name.startsWith('.')) {
          const file = await githubFetch(env, `contents/${item.path}`);
          files[item.path.replace(basePath + '/', '')] = atob(file.content);
        } else if (item.type === 'dir') {
          await traverseDir(item.path);
        }
      }
    } catch (err) {
      console.error(`Error traversing ${path}:`, err);
    }
  }
  
  await traverseDir(basePath);
  return files;
}

async function githubFetch(env, endpoint, method = 'GET', body = null) {
  const response = await fetch(`${GITHUB_API}/repos/${env.GITHUB_REPO}/${endpoint}`, {
    method,
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Writers-Dashboard'
    },
    ...(body && { body: JSON.stringify(body) })
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  
  return response.json();
}

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}