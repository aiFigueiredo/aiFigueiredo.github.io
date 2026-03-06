// ── PROJECTS (loaded from projects.yml) ──
const grid = document.getElementById('project-grid');
let observer;

function parseYamlScalar(rawValue) {
  const value = rawValue.trim();
  if (value === 'null') return null;

  if (value.startsWith('[') && value.endsWith(']')) {
    const items = [];
    const quotedItemRegex = /"((?:[^"\\]|\\.)*)"/g;
    let match = quotedItemRegex.exec(value);
    while (match) {
      items.push(match[1].replace(/\\"/g, '"'));
      match = quotedItemRegex.exec(value);
    }
    return items;
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }

  return value;
}

function assignYamlPair(target, line) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) return;

  const key = line.slice(0, separatorIndex).trim();
  const rawValue = line.slice(separatorIndex + 1).trim();
  target[key] = parseYamlScalar(rawValue);
}

function parseProjectsYaml(yamlText) {
  const projects = [];
  let currentProject = null;

  yamlText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (line.startsWith('- ')) {
      if (currentProject) projects.push(currentProject);
      currentProject = {};
      assignYamlPair(currentProject, line.slice(2).trim());
      return;
    }

    if (line.startsWith('  ') && currentProject) {
      assignYamlPair(currentProject, trimmed);
    }
  });

  if (currentProject) projects.push(currentProject);

  return projects.map((project) => ({
    id: project.id || '',
    title: project.title || '',
    subtitle: project.subtitle || '',
    description: project.description || '',
    tech: Array.isArray(project.tech) ? project.tech : [],
    appStoreUrl: project.app_store_url || null,
    icon: project.icon || '',
    screenshots: Array.isArray(project.screenshots) ? project.screenshots : []
  }));
}

function renderProjectScreens(project) {
  const screenshots = project.screenshots || [];

  return [0, 1, 2].map((index) => {
    const screenshot = screenshots[index];
    if (screenshot) {
      return `
        <div class="screen-placeholder">
          <img class="project-shot" src="${screenshot}" alt="" loading="lazy" decoding="async" />
          <div class="sp-shimmer"></div>
        </div>
      `;
    }

    const opacity = index === 0 ? '1' : index === 1 ? '0.6' : '0.35';
    return `
      <div class="screen-placeholder" style="opacity:${opacity}">
        ${index === 0 ? `<span class="sp-icon">${project.icon}</span>` : ''}
        <div class="sp-shimmer"></div>
      </div>
    `;
  }).join('');
}

function renderProjects(projects) {
  const totalProjects = projects.length.toString().padStart(2, '0');
  grid.innerHTML = projects.map(p => `
    <article class="project-card reveal" aria-label="${p.title}">
      <div class="project-num">${p.id} / ${totalProjects}</div>
      <div class="project-screens" aria-hidden="true">
        ${renderProjectScreens(p)}
      </div>
      <h3 class="project-title">${p.title}</h3>
      <div class="project-sub">${p.subtitle}</div>
      <p class="project-desc">${p.description}</p>
      <div class="project-tech">${p.tech.map(t => `<span class="tech-badge">${t}</span>`).join('')}</div>
      ${p.appStoreUrl ? `
        <div class="appstore-row">
          <a href="${p.appStoreUrl}" target="_blank" rel="noopener noreferrer" class="appstore-btn" aria-label="View ${p.title} on App Store">
            <img src="images/download-app-store.svg" alt="Download on the App Store" loading="lazy" decoding="async" />
          </a>
        </div>` : ''}
    </article>
    `).join('');

  if (observer) {
    grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
}

async function loadProjects() {
  try {
    const response = await fetch('projects.yml', {
      headers: { 'Accept': 'text/yaml, text/plain;q=0.9,*/*;q=0.8' }
    });
    if (!response.ok) throw new Error('Failed to load projects.yml');

    const yamlText = await response.text();
    const projects = parseProjectsYaml(yamlText);
    if (projects.length === 0) throw new Error('No projects found in YAML');

    renderProjects(projects);
  } catch (error) {
    console.error('Unable to load projects from YAML:', error);
    grid.innerHTML = '<div class="gh-loading">Unable to load projects right now.</div>';
  }
}
loadProjects();

// ── GITHUB REPOS ──
async function loadGitHubRepos() {
  const container = document.getElementById('gh-repos');
  try {
    const resp = await fetch('https://api.github.com/users/aiFigueiredo/repos?per_page=100&type=owner', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!resp.ok) throw new Error('GitHub API error');
    const repos = await resp.json();
    const topRepos = repos
      .filter(r => !r.fork)
      .sort((a, b) => {
        const starsDiff = b.stargazers_count - a.stargazers_count;
        if (starsDiff !== 0) return starsDiff;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 3);

    if (topRepos.length === 0) throw new Error('No repos');
    container.innerHTML = topRepos.map(r => `
      <a href="${r.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card" aria-label="${r.name} repository">
        <div class="repo-name">${r.name}</div>
        <div class="repo-desc">${r.description || 'No description available.'}</div>
        <div class="repo-meta">
          <span><span class="repo-lang-dot"></span>${r.language || 'Swift'}</span>
          <span>★ ${r.stargazers_count}</span>
          <span>⑂ ${r.forks_count}</span>
        </div>
      </a>
    `).join('');
  } catch(e) {
    container.innerHTML = `
      <a href="https://github.com/aiFigueiredo" target="_blank" rel="noopener noreferrer" class="repo-card">
        <div class="repo-name">View all repositories</div>
        <div class="repo-desc">Visit github.com/aiFigueiredo to explore public repositories.</div>
      </a>`;
  }
}
loadGitHubRepos();

// ── NAV SCROLL ──
const nav = document.getElementById('main-nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── HAMBURGER ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
hamburger.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ── SCROLL REVEAL ──
observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      // stagger children
      e.target.querySelectorAll('.reveal').forEach((child, i) => {
        setTimeout(() => child.classList.add('visible'), i * 80);
      });
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
