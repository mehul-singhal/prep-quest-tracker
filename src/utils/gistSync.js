const GIST_DESC = 'PrepQuestTracker-Sync';
const GIST_FILE = 'data.json';

async function ghCall(method, path, token, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
}

export async function findOrCreateGist(token) {
  const gists = await ghCall('GET', '/gists', token);
  const found = gists.find(g => g.description === GIST_DESC);
  if (found) return found.id;
  const created = await ghCall('POST', '/gists', token, {
    description: GIST_DESC,
    public: false,
    files: { [GIST_FILE]: { content: '{}' } },
  });
  return created.id;
}

export async function saveToGist(token, gistId, data) {
  await ghCall('PATCH', `/gists/${gistId}`, token, {
    files: { [GIST_FILE]: { content: JSON.stringify({ ...data, _syncedAt: Date.now() }) } },
  });
}

export async function loadFromGist(token, gistId) {
  const gist = await ghCall('GET', `/gists/${gistId}`, token);
  const content = gist.files[GIST_FILE]?.content;
  if (!content || content.trim() === '{}') return null;
  const parsed = JSON.parse(content);
  delete parsed._syncedAt;
  return parsed;
}
