const STORAGE_KEY = "signage-studio-state-v2";
const LEGACY_KEY = "signage-studio-state-v1";
const API_STATE_URL = "/api/state";
const STAGE_WIDTH = 5760;
const STAGE_HEIGHT = 1080;
const GRID_ROWS = 7;
const GRID_COLS = 32;

const gildeLogo = `
  <svg viewBox="0 0 820 150" aria-label="Gilde Opleidingen">
    <text x="0" y="104" font-size="92" font-weight="900" font-family="Arial, sans-serif" fill="#e6007e">gilde</text>
    <text x="212" y="104" font-size="92" font-weight="900" font-family="Arial, sans-serif" fill="#003b70">opleidingen</text>
  </svg>`;

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const stationData = {
  code: "RM",
  naam: "Roermond",
  lat: 51.1913,
  lon: 5.9878,
};

const hexSizeOptions = {
  small: 160,
  medium: 220,
  large: 300,
};

const hexColorPresets = [
  { id: "white-blue", label: "Wit / blauw", fill: "#ffffff", border: "#003b70" },
  { id: "white-pink", label: "Wit / roze", fill: "#ffffff", border: "#e6007e" },
  { id: "white-blue-pink", label: "Wit / accent", fill: "#ffffff", border: "#003b70", accent: "#e6007e" },
];

const iconOptions = [
  ["info", "Info"],
  ["bus", "Bus"],
  ["bike", "Fiets"],
  ["coffee", "Koffie"],
  ["taxi", "Taxi"],
  ["train", "Trein"],
  ["sun", "Zon"],
  ["rain", "Regen"],
  ["cloud", "Wolk"],
  ["atom", "Atoom"],
  ["chip", "Chip"],
  ["robot", "Robot"],
  ["code", "Code"],
  ["beaker", "Lab"],
  ["wifi", "Wifi"],
  ["bolt", "Energie"],
  ["gear", "Techniek"],
  ["book", "Boek"],
];

const defaultAnnouncements = [
  {
    id: uid(),
    title: "Welkom in Roermond",
    text: "Vandaag extra aandacht voor reizigers richting Maastricht en Eindhoven.",
    priority: "normaal",
    startsAt: "",
    endsAt: "",
    createdAt: Date.now(),
  },
  {
    id: uid(),
    title: "Onderhoud fietsenstalling",
    text: "De noordelijke ingang sluit om 22:00 uur.",
    priority: "belangrijk",
    startsAt: "",
    endsAt: "",
    createdAt: Date.now() - 120000,
  },
];

function createDefaultPreset(name = "Ochtendspits Roermond") {
  return {
    id: uid(),
    name,
    hexGrid: {
      hexWidth: 220,
      fill: "#003b70",
      border: "#003b70",
      borderWidth: 8,
    },
    hexes: [
      { id: "h-2-0", row: 2, col: 0, kind: "pictogram", label: "Bus", icon: "bus", fill: "#e6007e", animated: false },
      { id: "h-2-1", row: 2, col: 1, kind: "pictogram", label: "Fiets", icon: "bike", fill: "#00a6d6", animated: false },
      { id: "h-2-2", row: 2, col: 2, kind: "weather", label: "Weer", fill: "#003b70", expanded: false, expandMode: "manual", closedSeconds: 5, expandedSeconds: 10, cycleMode: "all", contentOrder: "normal", expandDirection: "right", expandSize: "medium", weatherMode: "dayparts" },
      { id: "h-3-1", row: 3, col: 1, kind: "trains", label: "Trein", fill: "#003b70", expanded: true, expandMode: "manual", closedSeconds: 5, expandedSeconds: 10, cycleMode: "all", contentOrder: "normal", expandDirection: "right", expandSize: "medium", direction: "both" },
      { id: "h-4-0", row: 4, col: 0, kind: "pictogram", label: "Lab", icon: "beaker", fill: "#7a2cff", animated: true },
      { id: "h-4-3", row: 4, col: 3, kind: "pictogram", label: "Robotica", icon: "robot", fill: "#e6007e", animated: false },
      { id: "h-4-6", row: 4, col: 6, kind: "pictogram", label: "Tech", icon: "chip", fill: "#003b70", animated: true },
    ],
    widgets: [
      {
        id: "logo-main",
        type: "logo",
        x: 110,
        y: 66,
        width: 1040,
        height: 170,
        logoData: "",
      },
      {
        id: "ann-main",
        type: "announcements",
        x: 3580,
        y: 82,
        width: 1780,
        height: 430,
        title: "Mededelingen",
      },
    ],
  };
}

let store = loadStore();
let weatherData = null;
let trainData = null;
let weatherStatus = { live: false, message: "Weerdata laden..." };
let trainStatus = { live: false, message: "Treindata laden..." };
let editorScale = 0.45;
let dragState = null;
let syncChannel = null;
const hexTransitionStates = new Map();

const views = {
  editor: document.querySelector("#editorView"),
  signage: document.querySelector("#signageView"),
  admin: document.querySelector("#adminView"),
};

const editorStage = document.querySelector("#editorStage");
const signageStage = document.querySelector("#signageStage");
const stageScaler = document.querySelector("#stageScaler");
const stageViewport = document.querySelector(".stage-viewport");
const settingsForm = document.querySelector("#settingsForm");
const selectionEmpty = document.querySelector("#selectionEmpty");
const announcementList = document.querySelector("#announcementList");
const presetSelect = document.querySelector("#presetSelect");
const presetName = document.querySelector("#presetName");
const scaleInput = document.querySelector("#previewScale");
const scaleLabel = document.querySelector("#scaleLabel");
const gridHexSize = document.querySelector("#gridHexSize");
const gridBorderWidth = document.querySelector("#gridBorderWidth");
const gridBorderColor = document.querySelector("#gridBorderColor");
const gridOffsetX = document.querySelector("#gridOffsetX");
const gridOffsetY = document.querySelector("#gridOffsetY");
const deployedPresetLabel = document.querySelector("#deployedPresetLabel");
const toastRegion = document.querySelector("#toastRegion");
const backgroundUploadInput = document.querySelector("#backgroundUploadInput");
const backgroundUploadButton = document.querySelector("#backgroundUploadButton");
const backgroundAssetGrid = document.querySelector("#backgroundAssetGrid");
const removeBackground = document.querySelector("#removeBackground");

settingsForm.addEventListener("pointerdown", (event) => {
  if (event.target.closest("[data-delete-widget]")) event.stopPropagation();
});

settingsForm.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-widget]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  removeWidgetFromEditor(button.dataset.deleteWidget);
});

function editingPreset() {
  if (!store.editingPresetId) return null;
  return store.presets.find((preset) => preset.id === store.editingPresetId) || null;
}

function deployedPreset() {
  return store.deployedSnapshot || null;
}

function activePreset() {
  return editingPreset() || deployedPreset() || store.presets[0] || null;
}

function activeWidgets() {
  return activePreset()?.widgets || [];
}

function activeGrid() {
  return activePreset()?.hexGrid || createDefaultPreset().hexGrid;
}

function activeHexes() {
  return activePreset()?.hexes || [];
}

function loadStore() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeStore(JSON.parse(stored));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      const preset = createDefaultPreset(old.presetName || "Geimporteerde preset");
      if (Array.isArray(old.widgets)) preset.widgets = migrateWidgets(old.widgets);
      return normalizeStore({ deployedPresetId: preset.id, presets: [preset], announcements: old.announcements || defaultAnnouncements, selected: old.selected });
    }
  } catch {
    return normalizeStore();
  }
  return normalizeStore();
}

function normalizeStore(next = {}) {
  const firstPreset = createDefaultPreset();
  const presets = Array.isArray(next.presets) && next.presets.length ? next.presets : [firstPreset];
  const deployedPresetId = presets.some((preset) => preset.id === next.deployedPresetId) ? next.deployedPresetId : (presets.some((preset) => preset.id === next.activePresetId) ? next.activePresetId : null);
  const migratedPresets = presets.map((preset) => {
    const migrated = migratePreset(preset);
    migrated.savedSnapshot = preset.savedSnapshot
      ? migratePreset(preset.savedSnapshot)
      : snapshotPreset(migrated);
    return migrated;
  });
  const deployedSource = next.deployedSnapshot
    ? migratePreset(next.deployedSnapshot)
    : migratedPresets.find((preset) => preset.id === deployedPresetId)?.savedSnapshot || null;
  return {
    deployedPresetId,
    deployedSnapshot: deployedSource ? snapshotPreset(deployedSource) : null,
    editingPresetId: deployedPresetId || migratedPresets[0]?.id || null,
    presets: migratedPresets,
    assets: Array.isArray(next.assets) ? next.assets.map((asset) => ({ kind: "logo", ...asset })) : [],
    announcements: Array.isArray(next.announcements) ? next.announcements : defaultAnnouncements,
    selected: next.selected || { type: "widget", id: "logo-main" },
  };
}

function migratePreset(preset) {
  const { savedSnapshot, ...presetData } = preset;
  const widgets = preset.widgets || [];
  const oldGrid = widgets.find((widget) => widget.type === "hexgrid");
  const hexGrid = preset.hexGrid || {
    hexWidth: oldGrid?.hexWidth || 220,
    fill: oldGrid?.fill || "#003b70",
    border: oldGrid?.border || "#ffffff",
    borderWidth: oldGrid?.borderWidth ?? 8,
  };
  const normalizedHexGrid = {
    ...hexGrid,
    border: !hexGrid.border || sameColor(hexGrid.border, "#ffffff") ? hexGrid.fill : hexGrid.border,
    offsetX: Number(hexGrid.offsetX || 0),
    offsetY: Number(hexGrid.offsetY || 0),
  };
  const oldMetrics = oldGrid ? hexMetrics({ hexWidth: oldGrid.hexWidth || 220 }) : null;
  const colOffset = oldGrid && oldMetrics ? Math.max(0, Math.round((oldGrid.x || 0) / oldMetrics.stepX)) : 0;
  const rowOffset = oldGrid && oldMetrics ? Math.max(0, Math.round((oldGrid.y || 0) / oldMetrics.stepY)) : 0;
  const hexes = Array.isArray(preset.hexes)
    ? preset.hexes
    : (oldGrid?.hexes || []).map((hex) => ({ ...hex, row: hex.row + rowOffset, col: hex.col + colOffset }));
  return {
    ...presetData,
    hexGrid: normalizedHexGrid,
    hexes: dedupeTrainHexes(hexes.map(migrateHex)),
    widgets: migrateWidgets(widgets.filter((widget) => widget.type !== "hexgrid")),
  };
}

function snapshotPreset(preset) {
  return structuredClone({
    id: preset.id,
    name: preset.name,
    hexGrid: preset.hexGrid,
    hexes: preset.hexes,
    widgets: preset.widgets,
    backgroundAssetId: preset.backgroundAssetId || "",
  });
}

function presetHasUnsavedChanges(preset) {
  if (!preset.savedSnapshot) return true;
  return JSON.stringify(snapshotPreset(preset)) !== JSON.stringify(snapshotPreset(preset.savedSnapshot));
}

function syncDeployedGridOffset(preset) {
  if (!preset || store.deployedPresetId !== preset.id || !store.deployedSnapshot?.hexGrid) return;
  const offsetX = Number(preset.hexGrid.offsetX || 0);
  const offsetY = Number(preset.hexGrid.offsetY || 0);
  store.deployedSnapshot.hexGrid.offsetX = offsetX;
  store.deployedSnapshot.hexGrid.offsetY = offsetY;
  if (preset.savedSnapshot?.hexGrid) {
    preset.savedSnapshot.hexGrid.offsetX = offsetX;
    preset.savedSnapshot.hexGrid.offsetY = offsetY;
  }
}

function migrateWidgets(widgets) {
  return widgets.map((widget) => {
    if (widget.type === "logo") return { ...widget, width: Math.max(widget.width || 1040, 1040), height: widget.height || 170, logoData: widget.logoData || "" };
    return widget;
  });
}

function migrateHex(hex) {
  const direction = hex.kind === "trains" || hex.showBothDirections ? "both" : hex.direction;
  return {
    expandDirection: "right",
    expandSize: "medium",
    weatherMode: "dayparts",
    expandMode: "manual",
    closedSeconds: 5,
    expandedSeconds: 10,
    cycleMode: "all",
    contentOrder: "normal",
    ...hex,
    direction,
  };
}

function dedupeTrainHexes(hexes) {
  let hasTrainHex = false;
  return hexes.filter((hex) => {
    if (hex.kind !== "trains") return true;
    if (hasTrainHex) return false;
    hasTrainHex = true;
    hex.direction = "both";
    return true;
  });
}

function saveStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedStore()));
  } catch {
    // The server remains the source of truth if browser storage is full.
  }
  notifyScreens();
  return saveRemoteStore();
}

async function uploadAsset(file, kind) {
  if (!file) return null;
  try {
    const response = await fetch("/api/assets", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Filename": encodeURIComponent(file.name),
        "X-Asset-Kind": kind,
      },
      body: file,
    });
    if (!response.ok) throw new Error("Upload mislukt");
    const asset = await response.json();
    store.assets = [...store.assets.filter((item) => item.id !== asset.id), { ...asset, kind }];
    await saveStore();
    return asset;
  } catch {
    showToast("De afbeelding kon niet worden geupload.", "error");
    return null;
  }
}

function assetById(id) {
  return store.assets.find((asset) => asset.id === id) || null;
}

function loadImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = url;
  });
}

async function fitLogoWidgetToAsset(widget, asset) {
  try {
    const dimensions = await loadImageDimensions(asset.url);
    if (!dimensions.width || !dimensions.height) return;
    const ratio = dimensions.width / dimensions.height;
    const currentHeight = clamp(Number(widget.height) || 170, 50, STAGE_HEIGHT - widget.y);
    let width = currentHeight * ratio;
    let height = currentHeight;
    const maxWidth = Math.max(120, STAGE_WIDTH - widget.x);
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    widget.width = Math.max(50, Math.round(width));
    widget.height = Math.max(50, Math.round(height));
    widget.logoAspectRatio = ratio;
  } catch {
    // Keep the current dimensions for unsupported image metadata.
  }
}

function ensureLogoWidgetAspect(widget, asset) {
  if (!asset || widget.logoAspectRatio) return;
  loadImageDimensions(asset.url).then((dimensions) => {
    if (!dimensions.width || !dimensions.height) return;
    const currentWidget = editingPreset()?.widgets.find((item) => item.id === widget.id);
    if (!currentWidget || currentWidget.logoAssetId !== asset.id) return;
    const ratio = dimensions.width / dimensions.height;
    const currentRatio = currentWidget.width / Math.max(1, currentWidget.height);
    currentWidget.logoAspectRatio = ratio;
    if (Math.abs(currentRatio - ratio) / ratio > 0.04) {
      currentWidget.height = Math.max(50, Math.round(currentWidget.width / ratio));
    }
    saveStore();
    renderAll();
  }).catch(() => {});
}

function assetsByKind(kind) {
  return store.assets.filter((asset) => asset.kind === kind);
}

async function deleteAsset(assetId) {
  const asset = assetById(assetId);
  if (!asset) return;
  try {
    const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Verwijderen mislukt");
  } catch {
    showToast("De afbeelding kon niet van de server worden verwijderd.", "error");
    return;
  }

  store.assets = store.assets.filter((item) => item.id !== assetId);
  const clearPresetReferences = (preset) => {
    if (!preset) return;
    if (preset.backgroundAssetId === assetId) preset.backgroundAssetId = "";
    preset.widgets?.forEach((widget) => {
      if (widget.logoAssetId === assetId) widget.logoAssetId = "";
    });
  };
  store.presets.forEach((preset) => {
    clearPresetReferences(preset);
    clearPresetReferences(preset.savedSnapshot);
  });
  clearPresetReferences(store.deployedSnapshot);
  await saveStore();
  renderAll();
  showToast(`"${asset.name}" is uit de opgeslagen afbeeldingen verwijderd.`, "success");
}

async function saveRemoteStore() {
  try {
    const response = await fetch(API_STATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(persistedStore()),
    });
    if (!response.ok) return false;
    return true;
  } catch {
    // Static-file fallback remains localStorage.
    return false;
  }
}

async function loadRemoteStore() {
  try {
    const response = await fetch(`${API_STATE_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    if (!data || !Array.isArray(data.presets)) return false;
    const editingPresetId = store.editingPresetId;
    const selected = store.selected;
    store = normalizeStore(data);
    store.editingPresetId = editingPresetId || store.editingPresetId;
    store.selected = selected;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedStore()));
    renderAll();
    return true;
  } catch {
    return false;
  }
}

function persistedStore() {
  const { editingPresetId, selected, ...rest } = store;
  return rest;
}

function notifyScreens() {
  try {
    syncChannel?.postMessage({ type: "store-updated" });
  } catch {
    // BroadcastChannel is optional; the storage event below is the fallback.
  }
}

function reloadSharedStore() {
  const editingPresetId = store.editingPresetId;
  const selected = store.selected;
  store = loadStore();
  store.editingPresetId = editingPresetId || store.editingPresetId;
  store.selected = selected;
  renderAll();
  loadRemoteStore();
}

function currentAnnouncements() {
  const now = Date.now();
  return store.announcements
    .filter((item) => {
      const start = item.startsAt ? new Date(item.startsAt).getTime() : 0;
      const end = item.endsAt ? new Date(item.endsAt).getTime() : Infinity;
      return start <= now && now <= end;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

document.querySelectorAll(".nav-tab[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelector("#menuOpenSignage").addEventListener("click", () => {
  window.open(`${window.location.pathname}?view=signage`, "_blank", "noopener");
});

backgroundUploadButton.addEventListener("click", () => {
  if (!editingPreset()) {
    showToast("Kies eerst een preset.", "error");
    return;
  }
  backgroundUploadInput.click();
});

backgroundUploadInput.addEventListener("change", async () => {
  const asset = await uploadAsset(backgroundUploadInput.files?.[0], "background");
  backgroundUploadInput.value = "";
  if (!asset || !editingPreset()) return;
  editingPreset().backgroundAssetId = asset.id;
  await saveStore();
  renderAll();
  showToast("Achtergrond toegevoegd aan de preset. Sla op en deploy om hem live te zetten.", "success");
});

removeBackground.addEventListener("click", () => {
  const preset = editingPreset();
  if (!preset) return;
  preset.backgroundAssetId = "";
  saveStore();
  renderAll();
  showToast("Achtergrond uit de editor verwijderd.", "success");
});

scaleInput.addEventListener("input", () => setEditorScale(Number(scaleInput.value) / 100));

document.querySelector("#savePreset").addEventListener("click", async () => {
  const preset = editingPreset();
  if (!preset) {
    pulseButton("#savePreset", "Kies preset");
    return;
  }
  preset.name = presetName.value.trim() || "Naamloze preset";
  preset.savedSnapshot = snapshotPreset(preset);
  const synced = await saveStore();
  renderPresetControls();
  pulseButton("#savePreset", "Opgeslagen");
  showToast(
    synced ? `"${preset.name}" is opgeslagen en klaar om te deployen.` : `"${preset.name}" is lokaal opgeslagen, maar de server kon niet worden bereikt.`,
    synced ? "success" : "error",
  );
});

document.querySelector("#deployPreset").addEventListener("click", async () => {
  const preset = editingPreset();
  if (!preset) {
    pulseButton("#deployPreset", "Kies preset");
    showToast("Kies eerst een preset om te deployen.", "error");
    return;
  }
  preset.name = presetName.value.trim() || preset.name || "Naamloze preset";
  if (presetHasUnsavedChanges(preset)) {
    pulseButton("#deployPreset", "Eerst opslaan");
    showToast("Sla de preset eerst op voordat je hem deployt.", "error");
    return;
  }
  store.deployedPresetId = preset.id;
  store.deployedSnapshot = snapshotPreset(preset.savedSnapshot);
  const synced = await saveStore();
  renderAll();
  pulseButton("#deployPreset", "Gedeployed");
  showToast(
    synced ? `"${preset.name}" is gedeployed en staat nu actief op de schermen.` : `"${preset.name}" is lokaal gedeployed, maar de schermserver kon niet worden bereikt.`,
    synced ? "success" : "error",
  );
});

document.querySelector("#newPreset").addEventListener("click", () => {
  const source = editingPreset() || createDefaultPreset("Nieuwe preset");
  const copy = structuredClone(source);
  copy.id = uid();
  copy.name = editingPreset() ? `${presetName.value.trim() || source.name} kopie` : "Nieuwe preset";
  delete copy.savedSnapshot;
  copy.widgets = copy.widgets.map((widget) => ({ ...widget, id: `${widget.type}-${uid()}` }));
  const idMap = new Map(source.widgets.map((widget, index) => [widget.id, copy.widgets[index].id]));
  if (store.selected?.type === "widget") store.selected = { type: "widget", id: idMap.get(store.selected.id) || copy.widgets[0]?.id };
  if (store.selected?.type === "hex") store.selected = { type: "hex", id: copy.hexes[0]?.id };
  store.presets.push(copy);
  store.editingPresetId = copy.id;
  saveStore();
  renderAll();
  pulseButton("#newPreset", "Aangemaakt");
});

document.querySelector("#deletePreset").addEventListener("click", () => {
  const preset = editingPreset();
  if (!preset) {
    pulseButton("#deletePreset", "Kies preset");
    return;
  }
  if (store.presets.length === 1) {
    pulseButton("#deletePreset", "Laatste preset");
    return;
  }
  store.presets = store.presets.filter((item) => item.id !== preset.id);
  if (store.deployedPresetId === preset.id) {
    store.deployedPresetId = null;
    store.deployedSnapshot = null;
  }
  store.editingPresetId = null;
  store.selected = null;
  saveStore();
  renderAll();
});

document.querySelector("#resetPreset").addEventListener("click", () => {
  const replacement = createDefaultPreset("Voorbeeld Roermond");
  store.presets.push(replacement);
  store.editingPresetId = replacement.id;
  store.selected = { type: "widget", id: "logo-main" };
  saveStore();
  renderAll();
});

presetSelect.addEventListener("change", () => {
  store.editingPresetId = presetSelect.value || null;
  store.selected = editingPreset() ? { type: "widget", id: activeWidgets()[0]?.id } : null;
  saveStore();
  renderAll();
});

document.querySelector("#fitStage").addEventListener("click", () => {
  const available = stageViewport.clientWidth - 32;
  const nextScale = Math.max(8, Math.min(80, Math.floor((available / STAGE_WIDTH) * 100)));
  scaleInput.value = nextScale;
  setEditorScale(nextScale / 100);
});

document.querySelectorAll("[data-add-widget]").forEach((button) => {
  button.addEventListener("click", () => addWidget(button.dataset.addWidget));
});

gridHexSize.querySelectorAll("[data-hex-size]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!editingPreset()) return;
    activeGrid().hexWidth = hexSizeOptions[button.dataset.hexSize] || hexSizeOptions.medium;
    saveStore();
    renderAll();
  });
});

gridBorderWidth.addEventListener("input", () => {
  if (!editingPreset()) return;
  activeGrid().borderWidth = Number(gridBorderWidth.value);
  saveStore();
  renderStagesOnly();
});

gridBorderColor.addEventListener("input", () => {
  if (!editingPreset()) return;
  activeGrid().border = gridBorderColor.value;
  saveStore();
  renderStagesOnly();
});

[gridOffsetX, gridOffsetY].forEach((input) => {
  input.addEventListener("input", () => {
    const preset = editingPreset();
    if (!preset) return;
    const grid = preset.hexGrid;
    grid.offsetX = Number(gridOffsetX.value || 0);
    grid.offsetY = Number(gridOffsetY.value || 0);
    syncDeployedGridOffset(preset);
    saveStore();
    renderStagesOnly();
  });
});

document.querySelector("#announcementForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = document.querySelector("#announcementTitle").value.trim();
  const text = document.querySelector("#announcementText").value.trim();
  const priority = document.querySelector("#announcementPriority").value;
  const duration = Math.max(1, Number(document.querySelector("#announcementDuration").value || 1));
  const durationUnit = document.querySelector("#announcementDurationUnit").value;
  const startsAt = new Date();
  const durationMs = duration * (durationUnit === "days" ? 86400000 : 3600000);
  const endsAt = new Date(startsAt.getTime() + durationMs);
  if (!title || !text) return;
  store.announcements.unshift({
    id: uid(),
    title,
    text,
    priority,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    duration,
    durationUnit,
    createdAt: Date.now(),
  });
  event.target.reset();
  document.querySelector("#announcementDuration").value = "8";
  const synced = await saveStore();
  renderAll();
  const unitLabel = durationUnit === "days" ? (duration === 1 ? "dag" : "dagen") : (duration === 1 ? "uur" : "uren");
  showToast(
    synced ? `Mededeling "${title}" staat nu ${duration} ${unitLabel} op de schermen.` : `Mededeling lokaal toegevoegd, maar de schermserver kon niet worden bereikt.`,
    synced ? "success" : "error",
  );
});

function setView(name) {
  if (!views[name]) name = "editor";
  document.body.classList.toggle("signage-mode", name === "signage");
  document.querySelectorAll(".nav-tab[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  Object.entries(views).forEach(([key, view]) => view.classList.toggle("active", key === name));
  if (name === "signage") sizeLiveStage();
}

function renderAll() {
  renderPresetControls();
  renderStage(editorStage, true, editingPreset());
  renderStage(signageStage, false, deployedPreset());
  renderSettings();
  renderAnnouncementsAdmin();
  setEditorScale(editorScale);
}

function renderStagesOnly() {
  renderStage(editorStage, true, editingPreset());
  renderStage(signageStage, false, deployedPreset());
  setEditorScale(editorScale);
}

function renderPresetControls() {
  const preset = editingPreset();
  const deployed = deployedPreset();
  deployedPresetLabel.textContent = `Actief scherm: ${deployed ? deployed.name : "geen preset"}`;
  presetSelect.innerHTML = `<option value="">Kies een preset...</option>${store.presets.map((item) => `<option value="${item.id}" ${preset?.id === item.id ? "selected" : ""}>${escapeHtml(item.name)}${deployed?.id === item.id ? " (actief)" : ""}</option>`).join("")}`;
  presetName.value = preset?.name || "";
  presetName.disabled = !preset;
  gridBorderWidth.disabled = !preset;
  gridBorderColor.disabled = !preset;
  gridOffsetX.disabled = !preset;
  gridOffsetY.disabled = !preset;
  gridHexSize.querySelectorAll("button").forEach((button) => {
    button.disabled = !preset;
    button.classList.toggle("active", Boolean(preset) && button.dataset.hexSize === gridSizeKey(preset.hexGrid.hexWidth));
  });
  backgroundUploadButton.disabled = !preset;
  removeBackground.disabled = !preset || !preset.backgroundAssetId;
  if (preset) {
    gridBorderWidth.value = preset.hexGrid.borderWidth;
    gridBorderColor.value = preset.hexGrid.border || preset.hexGrid.fill;
    gridOffsetX.value = preset.hexGrid.offsetX || 0;
    gridOffsetY.value = preset.hexGrid.offsetY || 0;
  }
  renderBackgroundAssets();
}

function gridSizeKey(width) {
  const value = Number(width) || hexSizeOptions.medium;
  return Object.entries(hexSizeOptions).reduce((best, [key, size]) => (
    Math.abs(size - value) < Math.abs(hexSizeOptions[best] - value) ? key : best
  ), "medium");
}

function sameColor(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function applyHexColorPreset(hex, preset) {
  hex.fill = preset.fill;
  hex.border = preset.border;
  hex.colorPreset = preset.id;
}

function renderBackgroundAssets() {
  const preset = editingPreset();
  const assets = assetsByKind("background");
  backgroundAssetGrid.innerHTML = "";
  if (!assets.length) {
    backgroundAssetGrid.innerHTML = `<span class="asset-empty">Nog geen achtergronden.</span>`;
    return;
  }
  assets.forEach((asset) => {
    const card = createAssetCard(asset, preset?.backgroundAssetId === asset.id, () => {
      if (!preset) return;
      preset.backgroundAssetId = asset.id;
      saveStore();
      renderAll();
      showToast(`"${asset.name}" ingesteld als achtergrond.`, "success");
    });
    card.querySelector(".asset-select").disabled = !preset;
    backgroundAssetGrid.appendChild(card);
  });
}

function renderStage(stage, editable, preset = activePreset()) {
  stage.innerHTML = "";
  const backgroundAsset = preset ? assetById(preset.backgroundAssetId) : null;
  stage.style.backgroundImage = backgroundAsset ? `url("${backgroundAsset.url}")` : "";
  stage.style.backgroundSize = backgroundAsset ? "cover" : "";
  stage.style.backgroundPosition = backgroundAsset ? "center" : "";
  stage.style.backgroundRepeat = backgroundAsset ? "no-repeat" : "";
  stage.classList.toggle("is-empty", !preset);
  if (!preset) {
    if (editable) stage.innerHTML = `<div class="empty-stage">Kies een preset om te bewerken.</div>`;
    else stage.innerHTML = `<div class="empty-stage">Geen preset gedeployed.</div>`;
    return;
  }
  stage.classList.toggle("has-editor-grid", editable);
  stage.appendChild(renderHexSpace(editable, preset));
  preset.widgets.forEach((widget) => {
    const element = renderWidget(widget, editable);
    if (editable && store.selected?.type === "widget" && store.selected.id === widget.id) element.classList.add("selected");
    stage.appendChild(element);
  });
}

function renderWidget(widget, editable) {
  if (widget.type === "logo") return renderLogo(widget, editable);
  if (widget.type === "announcements") return renderAnnouncements(widget, editable);
  return document.createElement("div");
}

function placeWidget(element, widget) {
  element.classList.add("widget");
  element.style.left = `${widget.x}px`;
  element.style.top = `${widget.y}px`;
  if (widget.width) element.style.width = `${widget.width}px`;
  if (widget.height) element.style.height = `${widget.height}px`;
}

function makeWidgetInteractive(element, widget, editable) {
  if (!editable) return;
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("input, select, textarea")) return;
    if (event.target.closest(".hex-cell, .resize-handle")) return;
    event.preventDefault();
    store.selected = { type: "widget", id: widget.id };
    dragState = {
      kind: "widget",
      id: widget.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originalX: widget.x,
      originalY: widget.y,
      moved: false,
    };
    element.setPointerCapture(event.pointerId);
    renderSettings();
  });
}

function renderLogo(widget, editable) {
  const element = document.createElement("article");
  placeWidget(element, widget);
  element.classList.add("logo-widget");
  const logoAsset = assetById(widget.logoAssetId);
  const logoSource = logoAsset?.url || widget.logoData;
  element.innerHTML = logoSource
    ? `<img class="logo-image" alt="Logo" src="${logoSource}">`
    : `<div class="logo-fallback">${gildeLogo}</div>`;
  if (editable && logoAsset) ensureLogoWidgetAspect(widget, logoAsset);
  if (editable) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "resize-handle";
    handle.title = "Logo schalen";
    handle.setAttribute("aria-label", "Logo schalen");
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      store.selected = { type: "widget", id: widget.id };
      dragState = {
        kind: "resize-logo",
        id: widget.id,
        startX: event.clientX,
        startY: event.clientY,
        originalWidth: widget.width,
        originalHeight: widget.height,
      };
      handle.setPointerCapture(event.pointerId);
      renderSettings();
    });
    element.appendChild(handle);
  }
  makeWidgetInteractive(element, widget, editable);
  return element;
}

function renderAnnouncements(widget, editable) {
  const element = document.createElement("article");
  placeWidget(element, widget);
  element.classList.add("announcements-widget");
  const items = currentAnnouncements().slice(0, 3);
  element.innerHTML = `
    <h3>${escapeHtml(widget.title)}</h3>
    <div class="announcement-ticker">
      ${items.map((item) => `
        <div class="announcement-item">
          <span class="priority ${item.priority}">${item.priority}</span>
          <div>
            <div class="announcement-title">${escapeHtml(item.title)}</div>
            <div class="announcement-text">${escapeHtml(item.text)}</div>
          </div>
        </div>
      `).join("") || `<div class="announcement-text">Geen actuele mededelingen.</div>`}
    </div>`;
  makeWidgetInteractive(element, widget, editable);
  return element;
}

function renderHexSpace(editable, preset = activePreset()) {
  const element = document.createElement("section");
  const grid = preset.hexGrid;
  const metrics = hexMetrics(grid);
  element.classList.add("hex-space");
  element.style.setProperty("--hex-w", `${metrics.width}px`);
  element.style.setProperty("--hex-h", `${metrics.height}px`);
  element.style.setProperty("--hex-border", `${grid.borderWidth}px`);

  const layer = document.createElement("div");
  layer.className = "hex-layer";
  layer.style.width = `${STAGE_WIDTH}px`;
  layer.style.height = `${STAGE_HEIGHT}px`;
  layer.style.transform = `translate(${Number(grid.offsetX || 0)}px, ${Number(grid.offsetY || 0)}px)`;

  const configured = new Map(preset.hexes.map((hex) => [`${hex.row}-${hex.col}`, hex]));
  const rows = metrics.rows;
  const cols = metrics.cols;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const hex = configured.get(`${row}-${col}`);
      if (!editable && !hex) continue;
      layer.appendChild(renderHexCell(hex || { row, col, kind: "empty" }, metrics, editable, grid));
    }
  }
  element.appendChild(layer);
  return element;
}

function hexMetrics(grid) {
  const width = grid.hexWidth;
  const height = Math.round(width * 0.866);
  const stepX = width * 0.75;
  const stepY = height;
  return {
    width,
    height,
    stepX,
    stepY,
    cols: Math.ceil(STAGE_WIDTH / stepX) + 2,
    rows: Math.ceil(STAGE_HEIGHT / stepY) + 2,
  };
}

function renderHexCell(hex, metrics, editable, grid) {
  const cell = document.createElement("button");
  const isExpanded = isHexExpanded(hex);
  const span = isExpanded ? expandedSpan(hex.expandSize) : 1;
  const heightScale = isExpanded ? 1.5 : 1;
  const renderWidth = metrics.width * span;
  const renderHeight = metrics.height * heightScale;
  const offset = isExpanded && hex.expandDirection === "left" ? (span - 1) * metrics.width * -0.75 : 0;
  const verticalOffset = isExpanded ? (renderHeight - metrics.height) / -2 : 0;
  const transitionKey = hex.id ? `${editable ? "editor" : "signage"}:${hex.id}` : "";
  const previousTransition = transitionKey ? hexTransitionStates.get(transitionKey) : null;
  cell.type = "button";
  cell.className = `hex-cell ${hex.kind === "empty" ? "empty" : ""} ${hex.animated ? "animated" : ""} ${isExpanded ? "expanded" : ""} size-${hex.expandSize || "medium"} expand-${hex.expandDirection || "right"} ${hex.kind === "trains" ? "active-trains" : ""} ${hex.kind === "weather" ? "active-weather" : ""} ${hex.kind === "announcements" ? "active-announcements" : ""}`;
  if (previousTransition && previousTransition.expanded !== isExpanded) {
    cell.classList.add(isExpanded ? "morph-expand" : "morph-collapse");
    if (isExpanded) {
      cell.style.setProperty("--morph-start-x", `${1 / span}`);
      cell.style.setProperty("--morph-start-y", `${1 / heightScale}`);
    } else {
      cell.style.setProperty("--morph-collapse-x", `${previousTransition.span || expandedSpan(hex.expandSize)}`);
      cell.style.setProperty("--morph-collapse-y", `${previousTransition.heightScale || 1.5}`);
    }
  }
  if (transitionKey) hexTransitionStates.set(transitionKey, { expanded: isExpanded, span, heightScale });
  cell.style.left = `${hex.col * metrics.stepX + offset}px`;
  cell.style.top = `${hex.row * metrics.stepY + (hex.col % 2 ? metrics.stepY / 2 : 0) + verticalOffset}px`;
  cell.style.width = `${renderWidth}px`;
  cell.style.height = `${renderHeight}px`;
  cell.style.setProperty("--hex-w", `${renderWidth}px`);
  cell.style.setProperty("--hex-h", `${renderHeight}px`);
  cell.style.setProperty("--hex-cap", `${renderHeight * 0.288675}px`);
  cell.style.setProperty("--hex-fill", hex.fill || grid.fill);
  applyHexContrast(cell, hex.fill || grid.fill);
  cell.style.background = hexBorderColor(hex, grid);
  if (editable && store.selected?.type === "hex" && store.selected.id === hex.id) cell.classList.add("selected");
  cell.innerHTML = `<div class="hex-content">${hexContent(hex, isExpanded)}</div>`;
  if (editable && hex.kind !== "empty") makeHexInteractive(cell, hex, metrics);
  return cell;
}

function hexBorderColor(hex, grid) {
  if (hex.kind === "empty") return grid.border || grid.fill;
  return hex.border || grid.border || hex.fill || grid.fill;
}

function applyHexContrast(cell, fill) {
  const light = isLightColor(fill);
  cell.style.setProperty("--hex-ink", light ? "#003b70" : "#ffffff");
  cell.style.setProperty("--hex-detail", light ? "rgba(0, 59, 112, 0.78)" : "rgba(255, 255, 255, 0.86)");
  cell.style.setProperty("--hex-card-bg", light ? "rgba(0, 59, 112, 0.1)" : "rgba(255, 255, 255, 0.16)");
  cell.style.setProperty("--hex-card-border", light ? "rgba(0, 59, 112, 0.22)" : "rgba(255, 255, 255, 0.4)");
  cell.style.setProperty("--hex-icon-cutout", light ? "#ffffff" : "#003b70");
  cell.style.color = "var(--hex-ink)";
}

function isLightColor(value) {
  const hex = String(value || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 170;
}

function makeHexInteractive(cell, hex, metrics) {
  cell.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    store.selected = { type: "hex", id: hex.id };
    dragState = {
      kind: "hex",
      id: hex.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originalRow: hex.row,
      originalCol: hex.col,
      metrics,
      moved: false,
    };
    cell.setPointerCapture(event.pointerId);
    saveStore();
    renderAll();
  });
}

document.addEventListener("pointermove", (event) => {
  if (!dragState) return;
  const dx = (event.clientX - dragState.startX) / editorScale;
  const dy = (event.clientY - dragState.startY) / editorScale;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragState.moved = true;

  if (dragState.kind === "widget") {
    const widget = activeWidgets().find((item) => item.id === dragState.id);
    if (!widget) return;
    widget.x = clamp(Math.round(dragState.originalX + dx), 0, STAGE_WIDTH - 80);
    widget.y = clamp(Math.round(dragState.originalY + dy), 0, STAGE_HEIGHT - 80);
    renderStagesOnly();
  }

  if (dragState.kind === "resize-logo") {
    const widget = activeWidgets().find((item) => item.id === dragState.id);
    if (!widget) return;
    const ratio = dragState.originalWidth / Math.max(1, dragState.originalHeight);
    const widthFromX = dragState.originalWidth + dx;
    const widthFromY = (dragState.originalHeight + dy) * ratio;
    const width = clamp(Math.round(Math.max(widthFromX, widthFromY)), 120, STAGE_WIDTH - widget.x);
    widget.width = width;
    widget.height = Math.max(50, Math.round(width / ratio));
    renderStagesOnly();
  }

  if (dragState.kind === "hex") {
    const hex = activeHexes().find((item) => item.id === dragState.id);
    if (!hex) return;
    const nextCol = clamp(Math.round(dragState.originalCol + dx / dragState.metrics.stepX), 0, dragState.metrics.cols - 1);
    const nextRow = clamp(Math.round(dragState.originalRow + dy / dragState.metrics.stepY), 0, dragState.metrics.rows - 1);
    const occupied = activeHexes().some((item) => item.id !== hex.id && item.row === nextRow && item.col === nextCol);
    if (!occupied) {
      hex.col = nextCol;
      hex.row = nextRow;
      renderStagesOnly();
    }
  }
});

document.addEventListener("pointerup", () => {
  if (!dragState) return;
  saveStore();
  renderAll();
  dragState = null;
});

function expandedSpan(size) {
  return { small: 2.35, medium: 3.25, large: 4.25, wide: 5.2 }[size] || 3.25;
}

function isHexExpanded(hex) {
  if (!hex.expanded || hex.kind === "empty") return false;
  if (hex.expandMode === "auto") {
    const closed = Math.max(1, Number(hex.closedSeconds || 5));
    const open = Math.max(1, Number(hex.expandedSeconds || 10));
    const cycle = closed + open;
    return Math.floor(Date.now() / 1000) % cycle >= closed;
  }
  if (hex.expandMode === "sequential") {
    const allHexes = activeHexes().filter(h => h.expandMode === "sequential" && h.kind !== "empty");
    if (!allHexes.length) return false;
    const closed = Math.max(1, Number(hex.closedSeconds || 5));
    const open = Math.max(1, Number(hex.expandedSeconds || 10));
    const cycle = closed + open;
    const totalCycle = allHexes.length * (closed + open);
    const elapsed = Math.floor(Date.now() / 1000) % totalCycle;
    const currentIndex = Math.floor(elapsed / (closed + open));
    const hexIndex = allHexes.findIndex(h => h.id === hex.id);
    if (currentIndex !== hexIndex) return false;
    return (elapsed % (closed + open)) >= closed;
  }
  return true;
}

function timedIndex(length, seconds = 4) {
  if (!length) return 0;
  return Math.floor(Date.now() / 1000 / Math.max(1, Number(seconds || 4))) % length;
}

function orderedItems(items, order) {
  return order === "reverse" ? [...items].reverse() : items;
}

function hexContent(hex, isExpanded = isHexExpanded(hex)) {
  if (hex.kind === "empty") return "";
  if (hex.kind === "trains") return trainHexContent(hex, isExpanded);
  if (hex.kind === "weather") return weatherHexContent(hex, isExpanded);
  if (hex.kind === "announcements") return announcementHexContent(hex, isExpanded);
  if (hex.kind === "time") return timeHexContent(hex, isExpanded);
  return `${iconSvg(hex.icon)}<div class="hex-label">${escapeHtml(hex.label)}</div>`;
}

function announcementHexContent(hex, isExpanded) {
  const items = currentAnnouncements();
  if (!isExpanded) {
    return `
      ${iconSvg("info")}
      <div class="active-title">Mededeling</div>
      <div class="active-main">${items.length || 0}</div>`;
  }

  const visible = announcementVisibleItems(items, hex);
  return `
    <div class="announcement-hex">
      <div class="active-title compact-title">${escapeHtml(hex.label || "Mededelingen")}</div>
      <div class="active-detail announcement-hex-list">
        ${visible.length ? visible.map(announcementHexRow).join("") : `<div class="announcement-hex-empty">Geen actieve mededelingen</div>`}
      </div>
    </div>`;
}

function announcementVisibleItems(items, hex) {
  if (hex.cycleMode === "one") return [items[timedIndex(items.length, 5)]].filter(Boolean);
  const maxVisible = { small: 1, medium: 2, large: 3, wide: 4 }[hex.expandSize || "medium"] || 2;
  return orderedItems(items, hex.contentOrder).slice(0, maxVisible);
}

function announcementHexRow(item) {
  return `
    <div class="announcement-hex-row">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.text)}</span>
    </div>`;
}

function timeHexContent(hex, isExpanded) {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateFormatter = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = timeFormatter.format(now);
  const dateStr = dateFormatter.format(now);
  
  if (!isExpanded) {
    return `
      ${iconSvg("clock")}
      <div class="active-title">Tijd</div>
      <div class="active-main">${timeStr.split(":").slice(0, 2).join(":")}</div>`;
  }
  
  return `
    <div class="time-expanded">
      <div class="active-title compact-title">${escapeHtml(hex.label || "Huidige tijd")}</div>
      <div class="active-detail time-display">
        <div class="time-large">${timeStr}</div>
        <div class="time-date">${dateStr}</div>
      </div>
    </div>`;
}

function trainHexContent(hex, isExpanded) {
  const directions = ["Eindhoven", "Maastricht"];
  const firstDirection = directions[0];
  const firstTrain = (trainData?.[firstDirection] || demoTrains()[firstDirection])[0];
  const status = liveStatusBadge(trainStatus);
  if (!isExpanded) {
    return `
      ${iconSvg("train")}
      <div class="active-title">Treinen</div>
      <div class="active-main">${firstTrain?.time || "--:--"}</div>
      ${status}`;
  }

  const columns = directions.map((direction) => {
    const trains = (trainData?.[direction] || demoTrains()[direction]).slice(0, 3);
    const visible = trainVisibleItems(trains, hex);
    return `
      <div class="train-column">
        <div class="train-heading">${escapeHtml(direction)}</div>
        ${visible.map(trainRow).join("")}
      </div>`;
  }).join("");
  return `<div class="active-title compact-title">Treintijden</div><div class="active-detail train-columns">${columns}</div>${status}`;
}

function trainRow(train) {
  if (!train) return "";
  return `<div class="train-row"><strong>${train.time}</strong><em class="${train.delay ? "delay" : ""}">${train.delay || "op tijd"}</em><span>spoor ${train.platform}</span></div>`;
}

function trainVisibleItems(trains, hex) {
  if (hex.cycleMode === "one") return [trains[timedIndex(trains.length, 4)]];
  const maxVisible = { small: 1, medium: 3, large: 3, wide: 3 }[hex.expandSize || "medium"] || 3;
  return trains.slice(0, maxVisible);
}

function weatherHexContent(hex, isExpanded) {
  const current = weatherData?.current || { temp: 18, code: 2, label: "Half bewolkt" };
  const days = weatherData?.days || demoWeatherDays();
  const status = liveStatusBadge(weatherStatus);
  if (!isExpanded) {
    return `
      ${iconSvg(weatherIcon(current.code))}
      <div class="active-title">${escapeHtml(current.label)}</div>
      <div class="active-main">${Math.round(current.temp)}°C</div>
      ${status}`;
  }
  const detail = weatherDetail(hex, days);
  const modeClass = hex.weatherMode === "week7" ? " weather-week7" : "";
  return `
    <div class="weather-expanded${modeClass}">
      <div class="weather-now">${iconSvg(weatherIcon(current.code))}<strong>${Math.round(current.temp)}°C</strong><span>${escapeHtml(current.label)}</span></div>
      <div class="active-detail weather-grid">${detail}</div>
    </div>
    ${status}`;
}

function liveStatusBadge(status) {
  if (status?.live) return "";
  return `<div class="live-warning">${escapeHtml(status?.message || "Niet actueel")}</div>`;
}

function weatherDetail(hex, days) {
  let items;
  if (hex.weatherMode === "dayparts") {
    items = [
      { name: "Ochtend", temp: `${days[0].morning}°`, icon: "cloud" },
      { name: "Middag", temp: `${days[0].midday}°`, icon: "sun" },
      { name: "Avond", temp: `${days[0].night}°`, icon: "cloud" },
    ];
  } else {
    const amount = hex.weatherMode === "week3" ? 3 : 7;
    items = days.slice(0, amount).map((day, index) => ({ name: day.name, temp: `${day.min}° / ${day.max}°`, icon: index % 3 === 0 ? "sun" : index % 3 === 1 ? "cloud" : "rain" }));
  }
  const maxVisible = hex.weatherMode === "week7" ? 7 : ({ small: 2, medium: 3, large: 5, wide: 7 }[hex.expandSize || "medium"] || 3);
  const visible = items.slice(0, maxVisible);
  return visible.map((item) => `<div class="weather-row">${iconSvg(item.icon)}<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.temp)}</span></div>`).join("");
}

function renderSettings() {
  const selected = getSelection();
  settingsForm.innerHTML = "";
  settingsForm.classList.toggle("hidden", !selected);
  selectionEmpty.classList.toggle("hidden", Boolean(selected));
  if (!selected) return;
  if (selected.type === "widget") renderWidgetSettings(selected.widget);
  if (selected.type === "hex") renderHexSettings(selected.hex);
}

function getSelection() {
  if (!editingPreset()) return null;
  if (!store.selected) return null;
  if (store.selected.type === "widget") {
    const widget = activeWidgets().find((item) => item.id === store.selected.id);
    return widget ? { type: "widget", widget } : null;
  }
  const hex = activeHexes().find((item) => item.id === store.selected.id);
  return hex ? { type: "hex", hex } : null;
}

function renderWidgetSettings(widget) {
  addDragHint();
  if (widget.type === "logo") {
    addField("Breedte", "number", widget.width, (value) => widget.width = Number(value));
    addField("Hoogte", "number", widget.height, (value) => widget.height = Number(value));
    addLogoAssetPicker(widget);
  }
  if (widget.type === "announcements") {
    addField("Titel", "text", widget.title, (value) => widget.title = value);
    addField("Breedte", "number", widget.width, (value) => widget.width = Number(value));
    addField("Hoogte", "number", widget.height, (value) => widget.height = Number(value));
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "danger-btn";
  remove.dataset.deleteWidget = widget.id;
  remove.textContent = widget.type === "logo" ? "Logo verwijderen" : "Mededelingenwidget verwijderen";
  remove.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  remove.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeWidgetFromEditor(widget.id);
  });
  settingsForm.appendChild(remove);
}

function createAssetButton(asset, active = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `asset-tile asset-select ${active ? "active" : ""}`;
  button.title = asset.name;
  button.innerHTML = `<img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.name)}"><span>${escapeHtml(asset.name)}</span>`;
  return button;
}

function createAssetCard(asset, active, onSelect) {
  const card = document.createElement("div");
  card.className = "asset-card";
  const select = createAssetButton(asset, active);
  select.addEventListener("click", onSelect);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "asset-delete";
  remove.title = "Opgeslagen afbeelding verwijderen";
  remove.textContent = "×";
  remove.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteAsset(asset.id);
  });
  card.append(select, remove);
  return card;
}

function addLogoAssetPicker(widget) {
  const row = document.createElement("div");
  row.className = "settings-row";
  row.innerHTML = `<label>Logo-afbeelding</label>`;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,.svg,.webp,.avif";
  input.className = "visually-hidden";

  const upload = document.createElement("button");
  upload.type = "button";
  upload.className = "asset-upload-btn";
  upload.textContent = "Afbeelding toevoegen";
  upload.addEventListener("pointerdown", (event) => event.stopPropagation());
  upload.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  });

  input.addEventListener("change", async () => {
    const asset = await uploadAsset(input.files?.[0], "logo");
    input.value = "";
    if (!asset) return;
    const currentWidget = editingPreset()?.widgets.find((item) => item.id === widget.id);
    if (!currentWidget) return;
    currentWidget.logoAssetId = asset.id;
    currentWidget.logoData = "";
    await fitLogoWidgetToAsset(currentWidget, asset);
    await saveStore();
    renderAll();
    showToast(`Logo "${asset.name}" toegevoegd.`, "success");
  });

  const grid = document.createElement("div");
  grid.className = "asset-grid";
  const logoAssets = assetsByKind("logo");
  if (!logoAssets.length) {
    grid.innerHTML = `<span class="asset-empty">Nog geen logo's.</span>`;
  } else {
    logoAssets.forEach((asset) => {
      const card = createAssetCard(asset, widget.logoAssetId === asset.id, async () => {
        const currentWidget = editingPreset()?.widgets.find((item) => item.id === widget.id);
        if (!currentWidget) return;
        currentWidget.logoAssetId = asset.id;
        currentWidget.logoData = "";
        await fitLogoWidgetToAsset(currentWidget, asset);
        await saveStore();
        renderAll();
      });
      grid.appendChild(card);
    });
  }

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "ghost-btn light-ghost";
  clear.textContent = "Logo-afbeelding wissen";
  clear.addEventListener("click", () => {
    const currentWidget = editingPreset()?.widgets.find((item) => item.id === widget.id);
    if (!currentWidget) return;
    currentWidget.logoAssetId = "";
    currentWidget.logoData = "";
    saveStore();
    renderAll();
  });

  row.append(input, upload, grid, clear);
  settingsForm.appendChild(row);
}

async function removeWidgetFromEditor(widgetId) {
  const preset = editingPreset();
  if (!preset) {
    showToast("Kies eerst een preset.", "error");
    return;
  }
  const widget = preset.widgets.find((item) => item.id === widgetId);
  if (!widget) {
    showToast("Deze widget bestaat niet meer.", "error");
    renderAll();
    return;
  }
  preset.widgets = preset.widgets.filter((item) => item.id !== widgetId);
  store.selected = null;
  const synced = await saveStore();
  renderAll();
  const label = widget.type === "logo" ? "Logo" : "Mededelingenwidget";
  showToast(
    synced
      ? `${label} verwijderd uit de preset. Sla de preset op en deploy hem om het scherm bij te werken.`
      : `${label} lokaal verwijderd, maar de server kon niet worden bereikt.`,
    synced ? "success" : "error",
  );
}

function renderHexSettings(hex) {
  addDragHint("Sleep de hexagon naar een rasterpositie.");
  addField("Label", "text", hex.label || "", (value) => hex.label = value);
  addSelect("Type", hex.kind, [["pictogram", "Pictogram"], ["trains", "Treintijden"], ["weather", "Weer"], ["announcements", "Mededelingen"], ["time", "Tijd & datum"]], (value) => setHexKind(hex, value));
  addField("Kleur", "color", hex.fill || activeGrid().fill, (value) => {
    hex.fill = value;
    hex.colorPreset = "";
  });
  addField("Randkleur", "color", hex.border || hex.fill || activeGrid().border || activeGrid().fill, (value) => {
    hex.border = value;
    hex.colorPreset = "";
  });
  addHexColorPresets(hex);
  addCheckbox("Geanimeerd", Boolean(hex.animated), (value) => hex.animated = value);
  addCheckbox("Uitklappen", Boolean(hex.expanded), (value) => hex.expanded = value);
  addSelect("Uitklappen naar", hex.expandDirection || "right", [["right", "Rechts"], ["left", "Links"]], (value) => hex.expandDirection = value);
  addSelect("Uitklapformaat", hex.expandSize || "medium", [["small", "Klein"], ["medium", "Middel"], ["large", "Groot"], ["wide", "Breed"]], (value) => hex.expandSize = value);
  addSelect("Uitklapgedrag", hex.expandMode || "manual", [["manual", "Altijd uitgeklapt"], ["auto", "Automatisch wisselen"], ["sequential", "Een voor een"]], (value) => hex.expandMode = value);
  addField("Gesloten seconden", "number", hex.closedSeconds ?? 5, (value) => hex.closedSeconds = Number(value), { min: 1 });
  addField("Uitgeklapt seconden", "number", hex.expandedSeconds ?? 10, (value) => hex.expandedSeconds = Number(value), { min: 1 });
  if (hex.kind !== "trains" && hex.kind !== "weather") {
    addSelect("Inhoud tonen", hex.cycleMode || "all", [["all", "Alles tegelijk"], ["one", "Een voor een"]], (value) => hex.cycleMode = value);
    addSelect("Volgorde", hex.contentOrder || "normal", [["normal", "Normaal"], ["reverse", "Omgekeerd"]], (value) => hex.contentOrder = value);
  }
  if (hex.kind === "pictogram") addIconTiles(hex.icon || "info", (value) => hex.icon = value);
  if (hex.kind === "trains") hex.direction = "both";
  if (hex.kind === "weather") {
    addSelect("Weerdata", hex.weatherMode || "dayparts", [["dayparts", "Dagdelens"], ["week3", "Komende 3 dagen"], ["week7", "Komende 7 dagen"]], (value) => hex.weatherMode = value);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "danger-btn";
  remove.textContent = "Hexagon verwijderen";
  remove.addEventListener("click", () => {
    activePreset().hexes = activeHexes().filter((item) => item.id !== hex.id);
    store.selected = { type: "widget", id: activeWidgets()[0]?.id };
    saveStore();
    renderAll();
  });
  settingsForm.appendChild(remove);
}

function setHexKind(hex, kind) {
  hex.kind = kind;
  const hasDefaultLabel = !hex.label || hex.label === "Nieuw" || hex.label === "Trein" || hex.label === "Weer" || hex.label === "Mededelingen" || hex.label === "Huidige tijd";
  if (hasDefaultLabel) {
    hex.label = {
      pictogram: "Nieuw",
      trains: "Trein",
      weather: "Weer",
      announcements: "Mededelingen",
      time: "Huidige tijd",
    }[kind] || "Nieuw";
  }
  if (kind === "pictogram") hex.icon = hex.icon || "info";
  if (kind === "trains") hex.direction = "both";
  if (kind === "weather") hex.weatherMode = hex.weatherMode || "dayparts";
  if (kind === "time") hex.expanded = true;
}

function addDragHint(text = "Sleep het geselecteerde onderdeel over het canvas.") {
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = text;
  settingsForm.appendChild(hint);
}

function addField(label, type, value, onChange, attrs = {}) {
  const row = document.createElement("div");
  row.className = "settings-row";
  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  Object.entries(attrs).forEach(([key, attrValue]) => input.setAttribute(key, attrValue));
  input.addEventListener("input", () => {
    onChange(input.value);
    saveStore();
    renderStagesOnly();
  });
  row.innerHTML = `<label>${label}</label>`;
  row.appendChild(input);
  settingsForm.appendChild(row);
}

function addCheckbox(label, value, onChange) {
  const row = document.createElement("label");
  row.className = "check-row";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value;
  input.addEventListener("change", () => {
    onChange(input.checked);
    saveStore();
    renderAll();
  });
  row.append(input, document.createTextNode(label));
  settingsForm.appendChild(row);
}

function addSelect(label, value, options, onChange) {
  const row = document.createElement("div");
  row.className = "settings-row";
  const select = document.createElement("select");
  options.forEach(([optionValue, text]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = text;
    option.selected = optionValue === value;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    onChange(select.value);
    saveStore();
    renderAll();
  });
  row.innerHTML = `<label>${label}</label>`;
  row.appendChild(select);
  settingsForm.appendChild(row);
}

function addHexColorPresets(hex) {
  const row = document.createElement("div");
  row.className = "settings-row";
  row.innerHTML = `<label>Kleurpreset</label>`;
  const grid = document.createElement("div");
  grid.className = "color-preset-grid";
  hexColorPresets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `color-preset ${isHexColorPresetActive(hex, preset) ? "active" : ""}`;
    button.title = preset.label;
    button.innerHTML = `<span class="preset-swatch" style="--preset-fill:${preset.fill};--preset-border:${preset.border};--preset-accent:${preset.accent || preset.border}"></span><span>${preset.label}</span>`;
    button.addEventListener("click", () => {
      applyHexColorPreset(hex, preset);
      saveStore();
      renderAll();
    });
    grid.appendChild(button);
  });
  row.appendChild(grid);
  settingsForm.appendChild(row);
}

function isHexColorPresetActive(hex, preset) {
  if (hex.colorPreset) return hex.colorPreset === preset.id;
  return sameColor(hex.fill, preset.fill) && sameColor(hex.border || hex.fill, preset.border) && !preset.accent;
}

function addIconTiles(value, onChange) {
  const row = document.createElement("div");
  row.className = "settings-row";
  row.innerHTML = `<label>Pictogram</label>`;
  const grid = document.createElement("div");
  grid.className = "icon-tile-grid";
  iconOptions.forEach(([icon, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `icon-tile ${icon === value ? "active" : ""}`;
    button.title = label;
    button.innerHTML = `${iconSvg(icon)}<span>${label}</span>`;
    button.addEventListener("click", () => {
      onChange(icon);
      saveStore();
      renderAll();
    });
    grid.appendChild(button);
  });
  row.appendChild(grid);
  settingsForm.appendChild(row);
}

function addFileField(label, onChange) {
  const row = document.createElement("div");
  row.className = "settings-row";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,.svg,.webp,.avif";
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
      saveStore();
      renderAll();
    };
    reader.readAsDataURL(file);
  });
  row.innerHTML = `<label>${label}</label>`;
  row.appendChild(input);
  settingsForm.appendChild(row);
}

function addWidget(type) {
  if (!editingPreset()) {
    pulseButton(`[data-add-widget="${type}"]`, "Kies preset");
    return;
  }
  const id = `${type}-${Date.now()}`;
  if (type === "hex") {
    const metrics = hexMetrics(activeGrid());
    const occupied = new Set(activeHexes().map((hex) => `${hex.row}-${hex.col}`));
    let row = 1;
    let col = 1;
    for (let testRow = 0; testRow < metrics.rows; testRow += 1) {
      for (let testCol = 0; testCol < metrics.cols; testCol += 1) {
        if (!occupied.has(`${testRow}-${testCol}`)) {
          row = testRow;
          col = testCol;
          testRow = metrics.rows;
          break;
        }
      }
    }
    const hex = { id, row, col, kind: "pictogram", label: "Nieuw", icon: "info", fill: activeGrid().fill, animated: false, expanded: false, expandMode: "manual", closedSeconds: 5, expandedSeconds: 10, cycleMode: "all", contentOrder: "normal", expandDirection: "right", expandSize: "medium" };
    activeHexes().push(hex);
    store.selected = { type: "hex", id };
    saveStore();
    renderAll();
    return;
  }
  const widget = {
    logo: { id, type, x: 180, y: 120, width: 1040, height: 170, logoData: "" },
    announcements: { id, type, x: 3600, y: 580, width: 1600, height: 360, title: "Mededelingen" },
  }[type];
  if (!widget) return;
  activeWidgets().push(widget);
  store.selected = { type: "widget", id };
  saveStore();
  renderAll();
}

function renderAnnouncementsAdmin() {
  announcementList.innerHTML = store.announcements.map((item) => `
    <article class="admin-announcement">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span class="muted">${item.priority}${formatWindow(item)}</span>
        <p>${escapeHtml(item.text)}</p>
      </div>
      <button class="delete-btn" data-delete-announcement="${item.id}" title="Verwijderen">×</button>
    </article>
  `).join("") || `<p class="muted">Geen mededelingen.</p>`;
  announcementList.querySelectorAll("[data-delete-announcement]").forEach((button) => {
    button.addEventListener("click", async () => {
      const removed = store.announcements.find((item) => item.id === button.dataset.deleteAnnouncement);
      store.announcements = store.announcements.filter((item) => item.id !== button.dataset.deleteAnnouncement);
      const synced = await saveStore();
      renderAll();
      showToast(
        synced ? `Mededeling "${removed?.title || ""}" is van de schermen verwijderd.` : "Mededeling lokaal verwijderd, maar de schermserver kon niet worden bereikt.",
        synced ? "success" : "error",
      );
    });
  });
}

function formatWindow(item) {
  if (item.duration && item.durationUnit) {
    const unit = item.durationUnit === "days"
      ? (item.duration === 1 ? "dag" : "dagen")
      : (item.duration === 1 ? "uur" : "uren");
    return ` · ${item.duration} ${unit}`;
  }
  const start = item.startsAt ? ` vanaf ${formatDateTime(item.startsAt)}` : "";
  const end = item.endsAt ? ` tot ${formatDateTime(item.endsAt)}` : "";
  return `${start}${end}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function iconSvg(name) {
  const stroke = "currentColor";
  const fill = "currentColor";
  const icons = {
    train: `<div class="pictogram"><svg viewBox="0 0 100 100"><rect x="24" y="13" width="52" height="62" rx="12" fill="${fill}"/><rect x="32" y="24" width="36" height="18" rx="4" fill="#003b70"/><circle cx="37" cy="61" r="6" fill="#003b70"/><circle cx="63" cy="61" r="6" fill="#003b70"/><path d="M34 84h32" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/></svg></div>`,
    bus: `<div class="pictogram"><svg viewBox="0 0 100 100"><rect x="14" y="26" width="72" height="42" rx="10" fill="${fill}"/><rect x="22" y="34" width="18" height="14" rx="3" fill="#00a6d6"/><rect x="46" y="34" width="18" height="14" rx="3" fill="#00a6d6"/><circle cx="30" cy="70" r="7" fill="#003b70"/><circle cx="70" cy="70" r="7" fill="#003b70"/></svg></div>`,
    bike: `<div class="pictogram"><svg viewBox="0 0 100 100"><circle cx="28" cy="68" r="16" fill="none" stroke="${stroke}" stroke-width="7"/><circle cx="72" cy="68" r="16" fill="none" stroke="${stroke}" stroke-width="7"/><path d="M28 68l16-28 14 28H28l22-18h18" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`,
    coffee: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M24 36h44v22a18 18 0 0 1-18 18h-8a18 18 0 0 1-18-18z" fill="${fill}"/><path d="M68 42h8a10 10 0 0 1 0 20h-8" fill="none" stroke="${stroke}" stroke-width="7"/><path d="M36 20v8M50 18v10M64 20v8" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/></svg></div>`,
    taxi: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M20 54l8-22h44l8 22v18H20z" fill="${fill}"/><path d="M38 24h24" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/><circle cx="32" cy="72" r="7" fill="#003b70"/><circle cx="68" cy="72" r="7" fill="#003b70"/></svg></div>`,
    info: `<div class="pictogram"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="${fill}"/><circle cx="50" cy="33" r="5" fill="#003b70"/><path d="M50 46v24" stroke="#003b70" stroke-width="9" stroke-linecap="round"/></svg></div>`,
    sun: `<div class="pictogram"><svg viewBox="0 0 100 100"><g class="sun-core"><circle cx="50" cy="50" r="20" fill="#ffd200"/><path d="M50 8v14M50 78v14M8 50h14M78 50h14M20 20l10 10M70 70l10 10M80 20L70 30M30 70L20 80" stroke="#ffd200" stroke-width="7" stroke-linecap="round"/></g></svg></div>`,
    rain: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M30 58h42a15 15 0 0 0 0-30 24 24 0 0 0-45 8 11 11 0 0 0 3 22z" fill="${fill}"/><path class="rain-drop" d="M36 68v12M50 68v12M64 68v12" stroke="#75d7ff" stroke-width="7" stroke-linecap="round"/></svg></div>`,
    cloud: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M28 66h46a17 17 0 0 0 0-34 25 25 0 0 0-47 9 13 13 0 0 0 1 25z" fill="${fill}"/></svg></div>`,
    atom: `<div class="pictogram"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="6" fill="${fill}"/><ellipse cx="50" cy="50" rx="34" ry="13" fill="none" stroke="${stroke}" stroke-width="6"/><ellipse cx="50" cy="50" rx="34" ry="13" fill="none" stroke="${stroke}" stroke-width="6" transform="rotate(60 50 50)"/><ellipse cx="50" cy="50" rx="34" ry="13" fill="none" stroke="${stroke}" stroke-width="6" transform="rotate(120 50 50)"/></svg></div>`,
    chip: `<div class="pictogram"><svg viewBox="0 0 100 100"><rect x="28" y="28" width="44" height="44" rx="7" fill="${fill}"/><rect x="40" y="40" width="20" height="20" rx="3" fill="#003b70"/><path d="M18 34h10M18 50h10M18 66h10M72 34h10M72 50h10M72 66h10M34 18v10M50 18v10M66 18v10M34 72v10M50 72v10M66 72v10" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/></svg></div>`,
    robot: `<div class="pictogram"><svg viewBox="0 0 100 100"><rect x="24" y="30" width="52" height="42" rx="10" fill="${fill}"/><path d="M50 18v12" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/><circle cx="38" cy="50" r="5" fill="#003b70"/><circle cx="62" cy="50" r="5" fill="#003b70"/><path d="M39 63h22" stroke="#003b70" stroke-width="6" stroke-linecap="round"/></svg></div>`,
    code: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M38 30L18 50l20 20M62 30l20 20-20 20M55 22L45 78" fill="none" stroke="${stroke}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`,
    beaker: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M38 18h24M44 18v20L24 76a8 8 0 0 0 7 12h38a8 8 0 0 0 7-12L56 38V18" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M34 67h32" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/></svg></div>`,
    wifi: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M20 40a43 43 0 0 1 60 0M32 54a26 26 0 0 1 36 0M44 68a9 9 0 0 1 12 0" fill="none" stroke="${stroke}" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="78" r="5" fill="${fill}"/></svg></div>`,
    bolt: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M56 10L24 56h24l-6 34 34-50H52z" fill="${fill}"/></svg></div>`,
    gear: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M50 18l8 8 12-2 6 10-8 10 2 6-2 6 8 10-6 10-12-2-8 8-8-8-12 2-6-10 8-10-2-6 2-6-8-10 6-10 12 2z" fill="${fill}"/><circle cx="50" cy="50" r="13" fill="#003b70"/></svg></div>`,
    book: `<div class="pictogram"><svg viewBox="0 0 100 100"><path d="M20 24h26a12 12 0 0 1 12 12v42a12 12 0 0 0-12-8H20zM80 24H58a12 12 0 0 0-12 12v42a12 12 0 0 1 12-8h22z" fill="${fill}"/></svg></div>`,
    clock: `<div class="pictogram"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="none" stroke="${stroke}" stroke-width="6"/><path d="M50 50v-18M50 50h16" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="${fill}"/></svg></div>`,
  };
  return (icons[name] || icons.info).replaceAll("#003b70", "var(--hex-icon-cutout, #003b70)");
}

function weatherIcon(code) {
  if ([0, 1].includes(code)) return "sun";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)) return "rain";
  return "cloud";
}

function demoTrains() {
  return {
    Maastricht: [
      { time: "08:13", platform: "2", delay: "" },
      { time: "08:28", platform: "2", delay: "+5 min" },
      { time: "08:43", platform: "2", delay: "" },
    ],
    Eindhoven: [
      { time: "08:19", platform: "1", delay: "" },
      { time: "08:34", platform: "1", delay: "" },
      { time: "08:49", platform: "1", delay: "+3 min" },
    ],
  };
}

function demoWeatherDays() {
  return [
    { name: "Vandaag", min: 13, max: 21, morning: 15, midday: 20, night: 14 },
    { name: "Morgen", min: 12, max: 23, morning: 16, midday: 22, night: 15 },
    { name: "Overmorgen", min: 14, max: 24, morning: 17, midday: 23, night: 16 },
    { name: "Dag 4", min: 13, max: 20, morning: 15, midday: 19, night: 14 },
    { name: "Dag 5", min: 11, max: 19, morning: 13, midday: 18, night: 12 },
    { name: "Dag 6", min: 12, max: 22, morning: 15, midday: 21, night: 15 },
    { name: "Dag 7", min: 13, max: 23, morning: 16, midday: 22, night: 16 },
  ];
}

function applyHexVisualTestPreset(hexWidth = 220) {
  const preset = createDefaultPreset("Hexagon QA");
  preset.hexGrid = { ...preset.hexGrid, hexWidth };
  preset.widgets = preset.widgets.filter((widget) => widget.type !== "announcements");
  preset.widgets[0] = { ...preset.widgets[0], x: 120, y: 38, width: 860, height: 130 };
  preset.hexes = [
    { id: "qa-train-s", row: 1, col: 0, kind: "trains", label: "Trein", fill: "#003b70", expanded: true, expandDirection: "right", expandSize: "small", direction: "Maastricht", cycleMode: "all", contentOrder: "normal" },
    { id: "qa-train-m", row: 1, col: 4, kind: "trains", label: "Trein", fill: "#0078a8", expanded: true, expandDirection: "right", expandSize: "medium", direction: "Eindhoven", cycleMode: "all", contentOrder: "normal" },
    { id: "qa-train-l", row: 1, col: 9, kind: "trains", label: "Trein", fill: "#003b70", expanded: true, expandDirection: "right", expandSize: "large", direction: "both", cycleMode: "all", contentOrder: "normal" },
    { id: "qa-train-w-left", row: 1, col: 18, kind: "trains", label: "Trein", fill: "#0078a8", expanded: true, expandDirection: "left", expandSize: "wide", direction: "both", cycleMode: "one", contentOrder: "reverse" },
    { id: "qa-weather-s", row: 3, col: 0, kind: "weather", label: "Weer", fill: "#003b70", expanded: true, expandDirection: "right", expandSize: "small", weatherMode: "dayparts", cycleMode: "all", contentOrder: "normal" },
    { id: "qa-weather-m", row: 3, col: 4, kind: "weather", label: "Weer", fill: "#0078a8", expanded: true, expandDirection: "right", expandSize: "medium", weatherMode: "week3", cycleMode: "all", contentOrder: "normal" },
    { id: "qa-weather-l", row: 3, col: 9, kind: "weather", label: "Weer", fill: "#003b70", expanded: true, expandDirection: "right", expandSize: "large", weatherMode: "week7", cycleMode: "all", contentOrder: "normal" },
    { id: "qa-weather-w-left", row: 3, col: 18, kind: "weather", label: "Weer", fill: "#0078a8", expanded: true, expandDirection: "left", expandSize: "wide", weatherMode: "week7", cycleMode: "one", contentOrder: "reverse" },
    { id: "qa-small-train", row: 5, col: 0, kind: "trains", label: "Trein", fill: "#003b70", expanded: false, direction: "both" },
    { id: "qa-small-weather", row: 5, col: 1, kind: "weather", label: "Weer", fill: "#0078a8", expanded: false },
    { id: "qa-small-left", row: 5, col: 2, kind: "weather", label: "Links", fill: "#e6007e", expanded: false, expandDirection: "left", expandSize: "wide" },
    { id: "qa-picto", row: 5, col: 3, kind: "pictogram", label: "Robotica", icon: "robot", fill: "#7a2cff", animated: true },
  ].map(migrateHex);
  store.presets = [preset];
  preset.savedSnapshot = snapshotPreset(preset);
  store.editingPresetId = preset.id;
  store.deployedPresetId = preset.id;
  store.deployedSnapshot = snapshotPreset(preset);
  store.selected = { type: "hex", id: "qa-train-l" };
}

async function fetchWeather() {
  try {
    const response = await fetch("/api/weather", { cache: "no-store" });
    if (!response.ok) throw new Error("Weer niet beschikbaar");
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || "Weer niet beschikbaar");
    weatherData = data.weather;
    weatherStatus = { live: true, updatedAt: data.updatedAt || Date.now(), message: "" };
    renderAll();
  } catch {
    weatherData = { current: { temp: 18, code: 2, label: "Half bewolkt" }, days: demoWeatherDays() };
    weatherStatus = { live: false, updatedAt: Date.now(), message: "Weer niet actueel" };
    renderAll();
  }
}

function weatherLabel(code) {
  if (code === 0) return "Zonnig";
  if ([1, 2].includes(code)) return "Licht bewolkt";
  if (code === 3) return "Bewolkt";
  if ([45, 48].includes(code)) return "Mist";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Regen";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Sneeuw";
  if ([95, 96, 99].includes(code)) return "Onweer";
  return "Wisselvallig";
}

async function fetchTrains() {
  try {
    const response = await fetch("/api/trains", { cache: "no-store" });
    if (!response.ok) throw new Error("Treindata niet beschikbaar");
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || "Treindata niet beschikbaar");
    trainData = normalizeTrainData(data.trains);
    trainStatus = { live: true, updatedAt: data.updatedAt || Date.now(), message: "" };
  } catch {
    trainData = demoTrains();
    trainStatus = { live: false, updatedAt: Date.now(), message: "Treinen niet actueel" };
  }
  renderAll();
}

function normalizeTrainData(data = {}) {
  const fallback = demoTrains();
  return {
    Eindhoven: Array.isArray(data.Eindhoven) && data.Eindhoven.length ? data.Eindhoven : fallback.Eindhoven,
    Maastricht: Array.isArray(data.Maastricht) && data.Maastricht.length ? data.Maastricht : fallback.Maastricht,
  };
}

function setEditorScale(scale) {
  editorScale = scale;
  document.documentElement.style.setProperty("--stage-scale", scale);
  stageScaler.style.width = `${STAGE_WIDTH * scale}px`;
  stageScaler.style.height = `${STAGE_HEIGHT * scale}px`;
  scaleLabel.textContent = `${Math.round(scale * 100)}%`;
}

function sizeLiveStage() {
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
  signageStage.style.transform = `scale(${scale})`;
}

function pulseButton(selector, text) {
  const button = document.querySelector(selector);
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => button.textContent = original, 1100);
}

function showToast(message, type = "success") {
  if (!toastRegion) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${type === "success" ? "Bevestigd" : "Niet gelukt"}</strong><span>${escapeHtml(message)}</span>`;
  toastRegion.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 220);
  }, 4200);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

window.addEventListener("resize", sizeLiveStage);
setInterval(renderStagesOnly, 1000);
setInterval(() => {
  const currentParams = new URLSearchParams(window.location.search);
  if (currentParams.get("view") === "signage" && currentParams.get("test") !== "hexes") loadRemoteStore();
}, 2000);

try {
  syncChannel = new BroadcastChannel("signage-studio-sync");
  syncChannel.addEventListener("message", (event) => {
    if (event.data?.type === "store-updated") reloadSharedStore();
  });
} catch {
  syncChannel = null;
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) reloadSharedStore();
});

const params = new URLSearchParams(window.location.search);
if (params.get("edit") && store.presets.some((preset) => preset.id === params.get("edit"))) {
  store.editingPresetId = params.get("edit");
}
if (params.get("test") === "hexes") {
  applyHexVisualTestPreset(Number(params.get("hexSize") || 220));
}

fetchWeather();
fetchTrains();
setInterval(fetchWeather, 15 * 60 * 1000);
setInterval(fetchTrains, 60 * 1000);
renderAll();
const initialSync = params.get("test") === "hexes" ? Promise.resolve() : loadRemoteStore();
initialSync.finally(() => setView(params.get("view") || "editor"));
