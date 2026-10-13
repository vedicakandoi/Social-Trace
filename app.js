(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const followerInput = $('#followersFiles');
  const followingInput = $('#followingFiles');
  const noticeArea = $('#noticeArea');
  const resultsSection = $('#resultsSection');
  const searchInput = $('#searchInput');
  const accountList = $('#accountList');
  const emptyState = $('#emptyState');

  const state = {
    followersFiles: [], followingFiles: [],
    followers: new Set(), following: new Set(),
    lists: { notFollowingBack: [], notFollowedBack: [], mutuals: [] },
    activeTab: 'notFollowingBack', analyzed: false
  };

  const TAB_LABELS = {
    notFollowingBack: "They don't follow you back",
    notFollowedBack: "You don't follow them back",
    mutuals: 'Both follow each other'
  };

  function showNotice(message, type = 'warning', details = []) {
    const box = document.createElement('div');
    box.className = `notice ${type}`;
    box.append(document.createTextNode(message));
    if (details.length) {
      const list = document.createElement('ul');
      details.forEach((detail) => { const li = document.createElement('li'); li.textContent = detail; list.append(li); });
      box.append(list);
    }
    noticeArea.append(box);
  }

  function refreshFileSummary(kind) {
    const files = kind === 'followers' ? followerInput.files : followingInput.files;
    const summary = $(`#${kind}Summary`);
    if (!files || files.length === 0) {
      summary.textContent = 'No files selected';
      return;
    }
    const total = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    summary.textContent = `${files.length} file${files.length === 1 ? '' : 's'} selected · ${formatBytes(total)}`;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function normalizeUsername(value) {
    if (!value) return null;
    let candidate = String(value).trim();
    if (!candidate) return null;
    if (/^https?:\/\//i.test(candidate)) {
      try {
        const url = new URL(candidate);
        if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === '_u') candidate = parts[1] || '';
        else candidate = parts[0] || '';
      } catch (_) { return null; }
    }
    candidate = candidate.replace(/^@/, '').replace(/\/$/, '').trim();
    if (!candidate || candidate === '_u' || candidate.includes('/') || candidate.length > 30) return null;
    if (!/^[a-zA-Z0-9._]+$/.test(candidate)) return null;
    const reserved = new Set(['accounts', 'about', 'explore', 'developer', 'direct', 'p', 'reel', 'reels', 'stories', 'web', 'challenge', 'legal', 'privacy', 'terms']);
    if (reserved.has(candidate.toLowerCase())) return null;
    return candidate.toLowerCase();
  }

  function isInstagramProfileUrl(href) {
    try {
      const url = new URL(href, window.location.href);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return false;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === '_u') return Boolean(normalizeUsername(parts[1] || ''));
      return parts.length === 1 && Boolean(normalizeUsername(parts[0] || ''));
    } catch (_) { return false; }
  }

  function usernameFromHref(href) {
    try {
      const url = new URL(href, window.location.href);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
      return normalizeUsername(url.href);
    } catch (_) { return null; }
  }

  function likelyUsernameText(text) {
    const value = (text || '').trim();
    if (!value || value.length > 80) return null;
    if (/^(followers?|following|remove|message|requested|follow|following|instagram|posts?|profile|about|more)$/i.test(value)) return null;
    return normalizeUsername(value);
  }

  // Rule-based and intentionally layered: profile URLs first, then nearby text/headings.
  // This avoids depending on Instagram's frequently changing CSS class names.
  function parseInstagramHtml(htmlText, fileName) {
    const parsed = { usernames: new Set(), warnings: [], fileName, recognized: false };
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const titleAndHeadings = [doc.title, ...Array.from(doc.querySelectorAll('h1,h2,h3,h4'))].join(' ').toLowerCase();
    const linkElements = Array.from(doc.querySelectorAll('a[href]'));
    const profileLinks = linkElements.filter((link) => isInstagramProfileUrl(link.getAttribute('href') || link.href));
    const fileNameLower = fileName.toLowerCase();
    parsed.recognized = /instagram|followers|following|connections/.test(`${fileNameLower} ${titleAndHeadings}`) || profileLinks.length > 0;

    profileLinks.forEach((link) => {
      const username = usernameFromHref(link.getAttribute('href') || link.href);
      if (username) parsed.usernames.add(username);
      // Some export layouts contain a username in a nearby heading and a generic link.
      if (!username) {
        const nearby = link.closest('li, tr, article, section, div');
        if (nearby) {
          const heading = nearby.querySelector('h1,h2,h3,h4');
          const fallback = likelyUsernameText(heading?.textContent || link.textContent);
          if (fallback) parsed.usernames.add(fallback);
        }
      }
    });

    // Fallback for export variants where username is in a heading and the link uses /_u/username.
    if (parsed.usernames.size === 0) {
      doc.querySelectorAll('h1,h2,h3,h4').forEach((heading) => {
        const fromHeading = likelyUsernameText(heading.textContent);
        if (fromHeading) parsed.usernames.add(fromHeading);
        const container = heading.closest('li, tr, article, section, div');
        if (container) {
          container.querySelectorAll('a[href]').forEach((link) => {
            const fromLink = usernameFromHref(link.getAttribute('href') || link.href);
            if (fromLink) parsed.usernames.add(fromLink);
          });
        }
      });
    }

    // A final text fallback is limited to profile-shaped URLs, never arbitrary page text.
    if (parsed.usernames.size === 0) {
      const html = htmlText;
      const urlPattern = /https?:\\?\/\\?\/(?:www\.)?instagram\.com\\?\/\\?\/(?:_u\\?\/\\?\/)?([a-zA-Z0-9._]{1,30})/gi;
      let match;
      while ((match = urlPattern.exec(html)) !== null) {
        const username = normalizeUsername(match[1]);
        if (username) parsed.usernames.add(username);
      }
    }

    if (!parsed.recognized) parsed.warnings.push('This file does not look like a typical Instagram export. We tried to read it anyway.');
    if (parsed.usernames.size === 0) parsed.warnings.push('No usernames could be extracted from this file. It may be the wrong file type or an export format we do not recognize.');
    return parsed;
  }

  async function parseFiles(fileList, label) {
    const combined = new Set();
    const warnings = [];
    const files = Array.from(fileList || []);
    if (!files.length) {
      warnings.push(`No ${label.toLowerCase()} files selected.`);
      return { usernames: combined, warnings, filesRead: 0 };
    }
    let filesRead = 0;
    for (const file of files) {
      if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
        warnings.push(`${file.name}: not an HTML file, skipped.`);
        continue;
      }
      try {
        const text = await file.text();
        const result = parseInstagramHtml(text, file.name);
        filesRead += 1;
        result.usernames.forEach((username) => combined.add(username));
        result.warnings.forEach((warning) => warnings.push(`${file.name}: ${warning}`));
      } catch (error) {
        warnings.push(`${file.name}: could not be read (${error?.message || 'unknown error'}).`);
      }
    }
    return { usernames: combined, warnings, filesRead };
  }

  function sortedDifference(left, right) {
    return Array.from(left).filter((username) => !right.has(username)).sort((a, b) => a.localeCompare(b));
  }

  function updateStats() {
    const followersCount = state.followers.size;
    const followingCount = state.following.size;
    const mutualCount = state.lists.mutuals.length;
    const stats = [
      ['Followers', followersCount, 'Accounts following you'],
      ['Following', followingCount, 'Accounts you follow'],
      ["Don't follow back", state.lists.notFollowingBack.length, 'In your following list'],
      ['Mutual connections', mutualCount, 'You follow each other']
    ];
    const grid = $('#statsGrid');
    grid.replaceChildren();
    stats.forEach(([label, value, foot]) => {
      const card = document.createElement('div'); card.className = 'stat-card';
      const labelEl = document.createElement('div'); labelEl.className = 'stat-label'; labelEl.textContent = label;
      const valueEl = document.createElement('div'); valueEl.className = 'stat-value'; valueEl.textContent = Number(value).toLocaleString();
      const footEl = document.createElement('div'); footEl.className = 'stat-foot'; footEl.textContent = foot;
      card.append(labelEl, valueEl, footEl); grid.append(card);
    });
    Object.keys(TAB_LABELS).forEach((key) => { $(`#count-${key}`).textContent = state.lists[key].length.toLocaleString(); });
    $('#resultsSubtitle').textContent = `${followersCount.toLocaleString()} unique followers · ${followingCount.toLocaleString()} unique following · duplicates removed`;
  }

  function renderList() {
    const list = state.lists[state.activeTab] || [];
    const query = searchInput.value.trim().toLowerCase();
    const filtered = list.filter((username) => username.includes(query));
    accountList.replaceChildren();
    filtered.forEach((username) => {
      const row = document.createElement('div'); row.className = 'account-row';
      const main = document.createElement('div'); main.className = 'account-main';
      const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = username.slice(0, 2).toUpperCase(); avatar.setAttribute('aria-hidden', 'true');
      const details = document.createElement('div');
      const name = document.createElement('div'); name.className = 'account-name'; name.textContent = `@${username}`;
      const meta = document.createElement('div'); meta.className = 'account-meta'; meta.textContent = state.activeTab === 'mutuals' ? 'Mutual connection' : state.activeTab === 'notFollowingBack' ? 'You follow them' : 'They follow you';
      details.append(name, meta); main.append(avatar, details);
      const link = document.createElement('a'); link.className = 'account-open'; link.href = `https://www.instagram.com/${encodeURIComponent(username)}/`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'View profile ↗';
      row.append(main, link); accountList.append(row);
    });
    $('#visibleCount').textContent = `${filtered.length.toLocaleString()} account${filtered.length === 1 ? '' : 's'}`;
    emptyState.hidden = filtered.length !== 0;
    accountList.hidden = filtered.length === 0;
  }

  function switchTab(tab) {
    if (!Object.hasOwn(TAB_LABELS, tab)) return;
    state.activeTab = tab;
    document.querySelectorAll('.result-tab').forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    searchInput.value = '';
    renderList();
  }

  function csvEscape(value) { return `"${String(value).replace(/"/g, '""')}"`; }
  function downloadCsv(filename, rows) {
    const csv = ['username,profile_url,relationship', ...rows.map((row) => [row.username, `https://www.instagram.com/${row.username}/`, row.relationship].map(csvEscape).join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportActiveTab() {
    const key = state.activeTab;
    const rows = state.lists[key].map((username) => ({ username, relationship: TAB_LABELS[key] }));
    downloadCsv(`social-trace-${key}.csv`, rows);
  }

  function exportAll() {
    const rows = [];
    Object.entries(state.lists).forEach(([key, usernames]) => usernames.forEach((username) => rows.push({ username, relationship: TAB_LABELS[key] })));
    downloadCsv('social-trace-all-results.csv', rows);
  }

  async function analyze() {
    noticeArea.replaceChildren();
    const followerFiles = followerInput.files;
    const followingFiles = followingInput.files;
    if (!followerFiles.length && !followingFiles.length) {
      showNotice('Choose at least one Followers or Following HTML file to continue. You can still analyze with one side missing, but some comparison results will be incomplete.', 'warning');
      return;
    }
    $('#analyzeBtn').disabled = true;
    $('#analyzeBtn').textContent = 'Reading files…';
    try {
      const [followersResult, followingResult] = await Promise.all([
        parseFiles(followerFiles, 'Followers'), parseFiles(followingFiles, 'Following')
      ]);
      state.followers = followersResult.usernames;
      state.following = followingResult.usernames;
      state.lists.notFollowingBack = sortedDifference(state.following, state.followers);
      state.lists.notFollowedBack = sortedDifference(state.followers, state.following);
      state.lists.mutuals = Array.from(state.followers).filter((username) => state.following.has(username)).sort((a, b) => a.localeCompare(b));
      state.analyzed = true;
      updateStats();
      switchTab(state.activeTab);
      resultsSection.hidden = false;
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const warnings = [...followersResult.warnings, ...followingResult.warnings];
      if (!followerFiles.length) warnings.unshift('No Followers files were selected. “You don’t follow them back” and mutual counts will be incomplete.');
      if (!followingFiles.length) warnings.unshift('No Following files were selected. “They don’t follow you back” and mutual counts will be incomplete.');
      if (warnings.length) showNotice('Analysis finished, but please review these notes. You can continue with the results shown.', 'warning', warnings.slice(0, 12));
      else showNotice('Analysis complete. Your files were processed locally in this browser.', 'success');
      if (followersResult.usernames.size === 0 && followingResult.usernames.size === 0) showNotice('No usernames were found in either set of files. Check that you selected the Followers and Following HTML files from your Instagram data download.', 'error');
    } catch (error) {
      showNotice(`Something went wrong while analyzing these files: ${error?.message || 'unknown error'}. Try selecting the files again.`, 'error');
    } finally {
      $('#analyzeBtn').disabled = false;
      $('#analyzeBtn').innerHTML = 'Analyze my data <span aria-hidden="true">→</span>';
    }
  }

  function clearData() {
    followerInput.value = ''; followingInput.value = '';
    refreshFileSummary('followers'); refreshFileSummary('following');
    noticeArea.replaceChildren(); searchInput.value = '';
    state.followers.clear(); state.following.clear();
    state.lists = { notFollowingBack: [], notFollowedBack: [], mutuals: [] };
    state.activeTab = 'notFollowingBack'; state.analyzed = false;
    resultsSection.hidden = true; accountList.replaceChildren();
    window.scrollTo({ top: $('#instagram-tool').offsetTop - 24, behavior: 'smooth' });
  }

  followerInput.addEventListener('change', () => refreshFileSummary('followers'));
  followingInput.addEventListener('change', () => refreshFileSummary('following'));
  $('#analyzeBtn').addEventListener('click', analyze);
  $('#clearBtn').addEventListener('click', clearData);
  $('#exportTabBtn').addEventListener('click', exportActiveTab);
  $('#exportAllBtn').addEventListener('click', exportAll);
  searchInput.addEventListener('input', renderList);
  document.querySelectorAll('.result-tab').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { event.preventDefault(); searchInput.focus(); }
    if (event.key === 'Escape' && document.activeElement === searchInput) { searchInput.value = ''; renderList(); searchInput.blur(); }
  });
})();
