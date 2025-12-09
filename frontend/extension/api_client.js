const BACKEND = async () => {
  const s = await new Promise(r => chrome.storage.sync.get({ backendUrl: 'http://localhost:8000' }, r));
  return s.backendUrl || 'http://localhost:8000';
}

async function classifyImageBlob(blob, url=''){
  const base = await BACKEND();
  const fd = new FormData();
  fd.append('file', blob, 'img.jpg');
  fd.append('type','image');
  fd.append('url', url);
  const resp = await fetch(`${base}/api/classify/`, { method:'POST', body: fd });
  if (!resp.ok) throw new Error('Network error');
  return resp.json();
}
