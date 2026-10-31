// Minimal in-memory stand-in for the Firestore Admin surface the billing and
// usage modules use: doc().get/set/update/delete and runTransaction with
// get/set/update/delete that commit after the callback resolves.
export function createFakeFirestore() {
  const docs = new Map();
  const clone = (value) => (value === undefined ? undefined : structuredClone(value));
  const snapshot = (path) => {
    const data = docs.get(path);
    return { id: path.split("/").pop(), exists: data !== undefined, data: () => clone(data) };
  };
  const applySet = (path, data, options) => {
    const previous = docs.get(path);
    docs.set(path, options?.merge && previous ? { ...previous, ...clone(data) } : clone(data));
  };
  const ref = (path) => ({
    path,
    id: path.split("/").pop(),
    get: async () => snapshot(path),
    set: async (data, options) => applySet(path, data, options),
    update: async (data) => {
      if (!docs.has(path)) throw new Error(`No document at ${path}`);
      applySet(path, data, { merge: true });
    },
    delete: async () => {
      docs.delete(path);
    },
  });
  return {
    docs,
    doc: (path) => ref(path),
    read: (path) => clone(docs.get(path)),
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        get: async (target) => snapshot(target.path),
        set: (target, data, options) => writes.push(() => applySet(target.path, data, options)),
        update: (target, data) => writes.push(() => applySet(target.path, data, { merge: true })),
        delete: (target) => writes.push(() => docs.delete(target.path)),
      };
      const result = await callback(transaction);
      for (const write of writes) write();
      return result;
    },
  };
}
