// Writer's Dashboard - Cloudflare Pages Function with Alice
const GITHUB_API = 'https://api.github.com';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const ALICE_TOOLS = [
  { name: "create_file", description: "Create a new file in the current project", input_schema: { type: "object", properties: { folder: { type: "string", description: "Folder name (chapters, characters, notes, research)" }, filename: { type: "string", description: "File name with .md extension" }, content: { type: "string", description: "Initial file content" } }, required: ["folder", "filename", "content"] } },
  { name: "update_file", description: "Update the content of the currently open file", input_schema: { type: "object", properties: { content: { type: "string", description: "New file content" } }, required: ["content"] } },
  { name: "append_to_file", description: "Add content to the end of the current file", input_schema: { type: "object", properties: { content: { type: "string", description: "Content to append" } }, required: ["content"] } },
  { name: "create_character", description: "Create a character profile", input_schema: { type: "object", properties: { name: { type: "string" }, role: { type: "string" }, description: { type: "string" }, personality: { type: "string" }, backstory: { type: "string" }, arc: { type: "string" } }, required: ["name", "role"] } },
  { name: "create_chapter_outline", description: "Create a chapter outline", input_schema: { type: "object", properties: { chapter_number: { type: "number" }, title: { type: "string" }, summary: { type: "string" }, scenes: { type: "array", items: { type: "string" } }, pov: { type: "string" }, goals: { type: "string" } }, required: ["chapter_number", "summary"] } },
  { name: "update_metadata", description: "Update project metadata", input_schema: { type: "object", properties: { title: { type: "string" }, summary: { type: "string" }, status: { type: "string", enum: ["nurturing", "active", "drafting", "editing", "complete"] } }, required: [] } }
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  
  try {
    switch (path) {
      case 'projects': return jsonResponse(await getProjects(env), corsHeaders);
      case 'tree': return jsonResponse(await getFileTree(env, url.searchParams.get('category'), url.searchParams.get('project')), corsHeaders);
      case 'file':
        if (request.method === 'GET') return jsonResponse(await getFile(env, url.searchParams.get('category'), url.searchParams.get('project'), url.searchParams.get('path')), corsHeaders);
        if (request.method === 'POST') return jsonResponse(await saveFile(env, await request.json()), corsHeaders);
        break;
      case 'alice':
      case 'assistant':
        if (request.method === 'POST') return jsonResponse(await handleAlice(env, await request.json()), corsHeaders);
        break;
      case 'export':
        return await handleExport(env, url.searchParams.get('category'), url.searchParams.get('project'), url.searchParams.get('format'));
      default: return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
    }
  } catch (err) { 
    console.error('API Error:', err); 
    return jsonResponse({ error: err.message, stack: err.stack }, corsHeaders, 500); 
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
          projectList.push({ folder: folder.name, title: metaContent.title || folder.name, summary: metaContent.summary || '', status: metaContent.status || 'active' });
        } catch { projectList.push({ folder: folder.name, title: folder.name, summary: '', status: 'active' }); }
      }
      projects[category] = projectList;
    } catch { projects[category] = []; }
  }
  return projects;
}

async function getFileTree(env, category, project) {
  const tree = {};
  async function buildTree(path, node) {
    try {
      const contents = await githubFetch(env, `contents/${path}`);
      for (const item of contents) {
        if (item.name.startsWith('.') || item.name.startsWith('_')) continue;
        if (item.type === 'dir') { node[item.name] = {}; await buildTree(item.path, node[item.name]); }
        else if (item.name.endsWith('.md') || item.name.endsWith('.txt')) { node[item.name] = item.sha; }
      }
    } catch {}
  }
  await buildTree(`${category}/${project}`, tree);
  return tree;
}

async function getFile(env, category, project, filePath) {
  try {
    const file = await githubFetch(env, `contents/${category}/${project}/${filePath}`);
    return { content: atob(file.content), sha: file.sha };
  } catch (err) { return { content: '', error: err.message }; }
}

async function saveFile(env, { category, project, path, content }) {
  const fullPath = `${category}/${project}/${path}`;
  let sha;
  try { const existing = await githubFetch(env, `contents/${fullPath}`); sha = existing.sha; } catch {}
  await githubFetch(env, `contents/${fullPath}`, 'PUT', { message: `Update ${path}`, content: btoa(unescape(encodeURIComponent(content))), ...(sha && { sha }) });
  return { success: true };
}

async function executeAliceTool(env, toolName, toolInput, context) {
  const { category, project, file, currentContent } = context;
  switch (toolName) {
    case "create_file": {
      const filePath = `${toolInput.folder}/${toolInput.filename}`;
      await saveFile(env, { category, project, path: filePath, content: toolInput.content });
      return { success: true, filePath, filesCreated: true, message: `Created ${filePath}` };
    }
    case "update_file": {
      if (!file) return { success: false, message: "No file is currently open" };
      await saveFile(env, { category, project, path: file, content: toolInput.content });
      return { success: true, filePath: file, fileUpdate: toolInput.content, message: `Updated ${file}` };
    }
    case "append_to_file": {
      if (!file) return { success: false, message: "No file is currently open" };
      const newContent = (currentContent || '') + '\n\n' + toolInput.content;
      await saveFile(env, { category, project, path: file, content: newContent });
      return { success: true, filePath: file, fileUpdate: newContent, message: `Appended to ${file}` };
    }
    case "create_character": {
      const filename = toolInput.name.toLowerCase().replace(/\s+/g, '-') + '.md';
      const content = `# ${toolInput.name}\n\n**Role:** ${toolInput.role}\n\n## Description\n${toolInput.description || '_To be developed_'}\n\n## Personality\n${toolInput.personality || '_To be developed_'}\n\n## Backstory\n${toolInput.backstory || '_To be developed_'}\n\n## Character Arc\n${toolInput.arc || '_To be developed_'}\n\n---\n*Created by Alice*`;
      await saveFile(env, { category, project, path: `characters/${filename}`, content });
      return { success: true, filePath: `characters/${filename}`, filesCreated: true, message: `Created character: ${toolInput.name}` };
    }
    case "create_chapter_outline": {
      const chNum = String(toolInput.chapter_number).padStart(2, '0');
      const filename = `chapter-${chNum}-outline.md`;
      const scenes = toolInput.scenes?.map((s, i) => `${i + 1}. ${s}`).join('\n') || '_Scenes to be outlined_';
      const content = `# Chapter ${toolInput.chapter_number}${toolInput.title ? ': ' + toolInput.title : ''}\n\n## Summary\n${toolInput.summary}\n\n${toolInput.pov ? `**POV:** ${toolInput.pov}\n\n` : ''}## Scenes\n${scenes}\n\n## Goals\n${toolInput.goals || '_What does this chapter accomplish?_'}\n\n---\n*Outline created by Alice*`;
      await saveFile(env, { category, project, path: `chapters/${filename}`, content });
      return { success: true, filePath: `chapters/${filename}`, filesCreated: true, message: `Created outline for Chapter ${toolInput.chapter_number}` };
    }
    case "update_metadata": {
      let metadata = {};
      try { const existing = await getFile(env, category, project, '_metadata.json'); if (existing.content) metadata = JSON.parse(existing.content); } catch {}
      if (toolInput.title) metadata.title = toolInput.title;
      if (toolInput.summary) metadata.summary = toolInput.summary;
      if (toolInput.status) metadata.status = toolInput.status;
      await saveFile(env, { category, project, path: '_metadata.json', content: JSON.stringify(metadata, null, 2) });
      return { success: true, message: `Updated project metadata` };
    }
    default: return { success: false, message: `Unknown tool: ${toolName}` };
  }
}

async function handleAlice(env, { message, context, history }) {
  // Check if API key is configured
  if (!env.ANTHROPIC_API_KEY) {
    return { response: "Error: ANTHROPIC_API_KEY is not configured in Cloudflare Pages environment variables." };
  }

  const systemPrompt = `You are Alice, a writing assistant embedded in a writer's dashboard.
You help with creative writing, character development, plot outlines, and editing.

Current context:
- Category: ${context?.category || 'none'}
- Project: ${context?.project || 'none'} ${context?.projectInfo ? `("${context.projectInfo.title}")` : ''}
- Current file: ${context?.file || 'none'}
- File tree: ${context?.fileTree ? JSON.stringify(context.fileTree, null, 2) : 'not loaded'}

Current file content (first 4000 chars):
${context?.currentContent || '(empty or no file selected)'}

You have tools to: create_file, update_file, append_to_file, create_character, create_chapter_outline, update_metadata

PERSONALITY:
- Be warm but efficient. You're a writing partner, not a cheerleader.
- Keep responses to 1-3 sentences unless explaining something complex.
- Don't ask "Is there anything else?" - just wait.
- Confirm actions briefly: "Done." or "Created the character file."
- If asked to write content, provide quality prose.
- Ask ONE clarifying question if unclear.
- No emojis.`;

  const messages = [];
  if (history?.length > 0) { 
    for (const msg of history) { 
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content }); 
      }
    } 
  }
  messages.push({ role: 'user', content: message });

  try {
    let response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: systemPrompt, messages, tools: ALICE_TOOLS })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { response: `Anthropic API error (${response.status}): ${errorText}` };
    }
    
    let data = await response.json();
    
    let fileUpdate = null, filePath = null, filesCreated = false;
    let loopMessages = [...messages];
    
    while (data.stop_reason === 'tool_use') {
      loopMessages.push({ role: 'assistant', content: data.content });
      const toolResults = [];
      for (const block of data.content) {
        if (block.type === 'tool_use') {
          const result = await executeAliceTool(env, block.name, block.input, context || {});
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
          if (result.fileUpdate) fileUpdate = result.fileUpdate;
          if (result.filePath) filePath = result.filePath;
          if (result.filesCreated) filesCreated = true;
        }
      }
      loopMessages.push({ role: 'user', content: toolResults });
      response = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4096, system: systemPrompt, messages: loopMessages, tools: ALICE_TOOLS })
      });
      data = await response.json();
    }

    const textContent = data.content?.filter(c => c.type === 'text').map(c => c.text).join('\n') || "I couldn't process that.";
    return { response: textContent, fileUpdate, filePath, filesCreated };
  } catch (err) {
    return { response: `Error calling Anthropic: ${err.message}` };
  }
}

async function handleExport(env, category, project, format) {
  if (format === 'zip') {
    const files = await gatherProjectFiles(env, category, project);
    return new Response(JSON.stringify(files), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${project}.json"` } });
  }
  return new Response(JSON.stringify({ error: 'PDF export coming soon' }), { headers: { 'Content-Type': 'application/json' } });
}

async function gatherProjectFiles(env, category, project) {
  const basePath = `${category}/${project}`;
  const files = {};
  async function traverseDir(path) {
    try {
      const contents = await githubFetch(env, `contents/${path}`);
      for (const item of contents) {
        if (item.type === 'file' && !item.name.startsWith('.')) { const file = await githubFetch(env, `contents/${item.path}`); files[item.path.replace(basePath + '/', '')] = atob(file.content); }
        else if (item.type === 'dir') { await traverseDir(item.path); }
      }
    } catch {}
  }
  await traverseDir(basePath);
  return files;
}

async function githubFetch(env, endpoint, method = 'GET', body = null) {
  const response = await fetch(`${GITHUB_API}/repos/${env.GITHUB_REPO}/${endpoint}`, {
    method,
    headers: { 'Authorization': `token ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Writers-Dashboard' },
    ...(body && { body: JSON.stringify(body) })
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return response.json();
}

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
