// Historique par onglet — sessionStorage (effacé à la fermeture, compatible PHI / DSGVO)
// Format item : { id, label, ts } + champs libres par onglet

// Scan réutilise la clé existante ('arvis_scan_history') qui contient déjà
// toute la logique de restauration (aiHtml, ocrText, thumb…)
const KEYS = {
  scan:           'arvis_scan_history',
  briefassistent: 'arvis_history_brief',
  bausteine:      'arvis_history_bausteine',
}

const MAX = 8

export function getHistory(tab) {
  const key = KEYS[tab]
  if (!key) return []
  try { return JSON.parse(sessionStorage.getItem(key) || '[]') } catch { return [] }
}

export function addHistory(tab, item) {
  const key = KEYS[tab]
  if (!key || !item?.id) return
  const list = getHistory(tab)
  const filtered = list.filter(x => x.id !== item.id)
  const next = [{ ...item, ts: Date.now() }, ...filtered].slice(0, MAX)
  try {
    sessionStorage.setItem(key, JSON.stringify(next))
    // Notifier la sidebar pour qu'elle se rafraîchisse
    window.dispatchEvent(new CustomEvent('arvis:history-change', { detail: { tab } }))
  } catch {}
}

export function clearHistory(tab) {
  const key = KEYS[tab]
  if (!key) return
  sessionStorage.removeItem(key)
  window.dispatchEvent(new CustomEvent('arvis:history-change', { detail: { tab } }))
}

// Demander à la page cible de restaurer un item : pose une clé que la page consomme au mount/effect
export function requestRestore(tab, id) {
  try { sessionStorage.setItem(`arvis_restore_${tab}`, String(id)) } catch {}
}

export function consumeRestore(tab) {
  const key = `arvis_restore_${tab}`
  const val = sessionStorage.getItem(key)
  if (val) sessionStorage.removeItem(key)
  return val
}
