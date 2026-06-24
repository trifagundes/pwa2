const CACHE_NAME = 'pwa-simples-v101';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './manifest.json'
];

// Função inicializadora para o evento de instalação
function iniciarInstalacao(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto com sucesso:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
}

// Função inicializadora para interceptação de requisições (Fetch)
function gerenciarFetch(event) {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Retorna do cache se encontrado
        }
        return fetch(event.request); // Busca na rede se não estiver no cache
      })
  );
}

// Função inicializadora para o evento de ativação e limpeza
function iniciarAtivacao(event) {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}

// Ouvintes de eventos do Service Worker apontando para as funções principais
self.addEventListener('install', event => iniciarInstalacao(event));
self.addEventListener('fetch', event => gerenciarFetch(event));
self.addEventListener('activate', event => iniciarAtivacao(event));