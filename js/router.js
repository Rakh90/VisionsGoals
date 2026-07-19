const routes = [];

export function route(pattern, handler) {
  // pattern like '/house/:houseId/client/:clientId'
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        paramNames.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler });
}

export function navigateTo(hash) {
  if (location.hash === `#${hash}`) {
    dispatch();
  } else {
    location.hash = hash;
  }
}

function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return h === '' ? '/' : h;
}

function dispatch() {
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.paramNames.forEach((name, i) => (params[name] = decodeURIComponent(m[i + 1])));
      r.handler(params);
      return;
    }
  }
  navigateTo('/');
}

export function startRouter() {
  window.addEventListener('hashchange', dispatch);
  dispatch();
}

export function goBack() {
  history.back();
}
