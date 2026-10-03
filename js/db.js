/* 貓咪日記資料庫：用 IndexedDB 存在瀏覽器裡，照片以 Blob 儲存 */
const DB = (function () {
  const NAME = 'cat-diary';
  const VERSION = 1;
  const STORES = ['cats', 'entries', 'photos'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains('cats')) {
          db.createObjectStore('cats', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('entries')) {
          const s = db.createObjectStore('entries', { keyPath: 'id' });
          s.createIndex('catId', 'catId');
        }
        if (!db.objectStoreNames.contains('photos')) {
          const s = db.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('entryId', 'entryId');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function promisify(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function done(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    });
  }

  async function getAll(store) {
    const db = await open();
    return promisify(db.transaction(store).objectStore(store).getAll());
  }

  async function get(store, id) {
    const db = await open();
    return promisify(db.transaction(store).objectStore(store).get(id));
  }

  async function getByIndex(store, index, value) {
    const db = await open();
    return promisify(db.transaction(store).objectStore(store).index(index).getAll(value));
  }

  /* ops: [{ store, put: obj } | { store, del: id }]，全部在同一個交易完成 */
  async function write(ops) {
    const db = await open();
    const names = Array.from(new Set(ops.map(function (o) { return o.store; })));
    const tx = db.transaction(names, 'readwrite');
    ops.forEach(function (o) {
      const s = tx.objectStore(o.store);
      if (o.put) s.put(o.put); else s.delete(o.del);
    });
    return done(tx);
  }

  async function clearAll() {
    const db = await open();
    const tx = db.transaction(STORES, 'readwrite');
    STORES.forEach(function (n) { tx.objectStore(n).clear(); });
    return done(tx);
  }

  return { getAll, get, getByIndex, write, clearAll, STORES };
})();
