const STORAGE_COMPONENTS_KEY = "sklad_soucastek_v1";
const STORAGE_ORGANIZERS_KEY = "sklad_organizery_v1";
const STORAGE_CLOUD_URL_KEY = "sklad_cloud_json_url_v1";
const STORAGE_VIEW_MODE_KEY = "sklad_view_mode_v1";
const STORAGE_MOVEMENTS_KEY = "sklad_movements_v1";

const form = document.getElementById("component-form");
const viewTabs = document.getElementById("view-tabs");
const viewButtons = viewTabs ? Array.from(viewTabs.querySelectorAll("button[data-view]")) : [];
const viewCards = Array.from(document.querySelectorAll(".card[data-view-group]"));
const resetBtn = document.getElementById("reset-btn");
const submitBtn = document.getElementById("submit-btn");
const printFilteredBtn = document.getElementById("print-filtered-btn");
const tableBody = document.getElementById("component-table-body");
const resultCount = document.getElementById("result-count");
const criticalSummary = document.getElementById("critical-summary");
const searchQrInput = document.getElementById("search-qr-input");
const searchQrBtn = document.getElementById("search-qr-btn");
const visualTitle = document.getElementById("visual-title");
const visualGrid = document.getElementById("visual-grid");
const drawerDetailPanel = document.getElementById("drawer-detail-panel");
const visualOrganizer = document.getElementById("visual-organizer");
const filterOrganizer = document.getElementById("filter-organizer");
const bomFile = document.getElementById("bom-file");
const compareBomBtn = document.getElementById("compare-bom-btn");
const clearBomBtn = document.getElementById("clear-bom-btn");
const bomSummary = document.getElementById("bom-summary");
const bomTableBody = document.getElementById("bom-table-body");
const qrComponentSelect = document.getElementById("qr-component-select");
const showQrBtn = document.getElementById("show-qr-btn");
const printQrLabelBtn = document.getElementById("print-qr-label-btn");
const qrPreviewTitle = document.getElementById("qr-preview-title");
const qrPreviewMeta = document.getElementById("qr-preview-meta");
const qrCodeContainer = document.getElementById("qr-code-container");
const startQrScanBtn = document.getElementById("start-qr-scan-btn");
const stopQrScanBtn = document.getElementById("stop-qr-scan-btn");
const qrScanStatus = document.getElementById("qr-scan-status");
const qrScannerRegion = document.getElementById("qr-scanner-region");
const usbScanInput = document.getElementById("usb-scan-input");
const usbScanProcessBtn = document.getElementById("usb-scan-process-btn");
const cloudJsonUrlInput = document.getElementById("cloud-json-url");
const cloudSaveUrlBtn = document.getElementById("cloud-save-url-btn");
const cloudLoadUrlBtn = document.getElementById("cloud-load-url-btn");
const cloudJsonFileInput = document.getElementById("cloud-json-file");
const cloudImportFileBtn = document.getElementById("cloud-import-file-btn");
const cloudExportJsonBtn = document.getElementById("cloud-export-json-btn");
const cloudCopyJsonBtn = document.getElementById("cloud-copy-json-btn");
const cloudSyncStatus = document.getElementById("cloud-sync-status");
const purchaseSummary = document.getElementById("purchase-summary");
const purchaseTableBody = document.getElementById("purchase-table-body");
const purchaseExportCsvBtn = document.getElementById("purchase-export-csv-btn");
const purchasePrintBtn = document.getElementById("purchase-print-btn");
const historyTableBody = document.getElementById("history-table-body");
const historyClearBtn = document.getElementById("history-clear-btn");

const organizerForm = document.getElementById("organizer-form");
const organizerId = document.getElementById("organizer-id");
const organizerNumber = document.getElementById("organizer-number");
const organizerName = document.getElementById("organizer-name");
const organizerRows = document.getElementById("organizer-rows");
const organizerCols = document.getElementById("organizer-cols");
const organizerRowLayout = document.getElementById("organizer-row-layout");
const organizerSubmitBtn = document.getElementById("organizer-submit-btn");
const organizerResetBtn = document.getElementById("organizer-reset-btn");
const organizerTableBody = document.getElementById("organizer-table-body");

const fields = {
  id: document.getElementById("component-id"),
  organizer: document.getElementById("organizer"),
  row: document.getElementById("row"),
  col: document.getElementById("col"),
  rowLabel: document.getElementById("row-label"),
  colLabel: document.getElementById("col-label"),
};

const partsEditorBody = document.getElementById("parts-editor-body");
const partsAddRowBtn = document.getElementById("parts-add-row-btn");

const filters = {
  text: document.getElementById("filter-text"),
  category: document.getElementById("filter-category"),
  value: document.getElementById("filter-value"),
  packageName: document.getElementById("filter-package"),
  manufacturer: document.getElementById("filter-manufacturer"),
  organizer: filterOrganizer,
  lowStock: document.getElementById("filter-low-stock"),
};

let components = loadComponents();
let organizers = loadOrganizers();
let movements = loadMovements();
let highlightedId = null;
let selectedDrawer = null;
let bomRows = [];
let bomResults = [];
let qrScanner = null;
let scannerRunning = false;
let lastScanText = "";
let lastScanTime = 0;
let lastCloudSyncMessage = "Data jsou lokalne v prohlizeci. Nastav odkaz a nacti/sdilej JSON.";
let activeViewMode = loadViewModeSetting();

function newPartId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `part-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyPartLine() {
  return normalizePartLine(
    {
      name: "",
      category: "",
      value: "",
      packageName: "",
      manufacturer: "",
      mpn: "",
      quantity: 1,
      criticalQuantity: 0,
      datasheetUrl: "",
      ecadUrl: "",
      note: "",
    },
    newPartId()
  );
}

function normalizePartLine(raw, stableFallbackId) {
  const id = String(raw.id || "").trim() || stableFallbackId || newPartId();
  return {
    id,
    name: String(raw.name || "").trim(),
    category: String(raw.category || "").trim(),
    value: String(raw.value || "").trim(),
    packageName: String(raw.packageName || "").trim(),
    manufacturer: String(raw.manufacturer || "").trim(),
    mpn: String(raw.mpn || "").trim(),
    quantity: toNonNegativeInt(raw.quantity),
    criticalQuantity: toNonNegativeInt(raw.criticalQuantity),
    datasheetUrl: String(raw.datasheetUrl || "").trim(),
    ecadUrl: String(raw.ecadUrl || "").trim(),
    note: String(raw.note || "").trim(),
  };
}

function syncItemMetaFromParts(item) {
  const parts = item.parts;
  if (!parts || parts.length === 0) return;
  const first = parts[0];
  if (parts.length === 1) {
    item.name = first.name;
    item.category = first.category;
    item.value = first.value;
    item.packageName = first.packageName;
    item.manufacturer = first.manufacturer;
    item.mpn = first.mpn;
    item.quantity = first.quantity;
    item.criticalQuantity = first.criticalQuantity;
    item.datasheetUrl = first.datasheetUrl;
    item.ecadUrl = first.ecadUrl;
    item.note = first.note;
    return;
  }

  item.category = first.category;
  item.datasheetUrl = first.datasheetUrl;
  item.ecadUrl = first.ecadUrl;
  item.note = first.note;
  item.name = first.name
    ? `${first.name} (+${parts.length - 1} dalsich)`
    : `${parts.length} druhu v supliku`;
  item.value = parts.map((p) => p.value).filter(Boolean).join("; ");
  item.packageName = parts.map((p) => p.packageName).filter(Boolean).join("; ");
  item.manufacturer = parts.map((p) => p.manufacturer).filter(Boolean).join("; ");
  item.quantity = parts.reduce((sum, p) => sum + p.quantity, 0);
  item.criticalQuantity = parts.reduce((sum, p) => sum + p.criticalQuantity, 0);
}

function getPartStockQuantitySum(item) {
  const parts = item.parts || [];
  return parts.reduce((sum, p) => sum + p.quantity, 0);
}

function getPartShopSearchQuery(part) {
  const mpn = String(part.mpn || "").trim();
  if (mpn) return mpn;

  const manufacturer = String(part.manufacturer || "").trim();
  const value = String(part.value || "").trim();
  const name = String(part.name || "").trim();

  if (manufacturer && value) return `${manufacturer} ${value}`;
  if (value) return value;
  if (name) return name;
  return "";
}

function buildTmeSearchUrl(query) {
  return `https://www.tme.eu/cz/katalog/?search=${encodeURIComponent(query)}`;
}

function buildMouserSearchUrl(query) {
  return `https://www.mouser.com/c/?q=${encodeURIComponent(query)}`;
}

function openShopSearch(shop, part) {
  const query = getPartShopSearchQuery(part);
  if (!query) {
    alert("Vypln MPN / PN, nebo alespon nazev ci hodnotu pro vyhledani u obchodu.");
    return;
  }
  const url = shop === "tme" ? buildTmeSearchUrl(query) : buildMouserSearchUrl(query);
  window.open(url, "_blank", "noopener,noreferrer");
}

function renderShopSearchLinksHtml(part) {
  const query = getPartShopSearchQuery(part);
  if (!query) {
    return `<span class="muted">—</span>`;
  }
  const tme = buildTmeSearchUrl(query);
  const mouser = buildMouserSearchUrl(query);
  return `
    <span class="shop-links">
      <a class="shop-link" href="${escapeHtml(tme)}" target="_blank" rel="noreferrer">TME</a>
      <a class="shop-link" href="${escapeHtml(mouser)}" target="_blank" rel="noreferrer">Mouser</a>
    </span>
  `;
}

function readPartFromEditorRow(tr) {
  return normalizePartLine(
    {
      id: tr.dataset.partId || "",
      name: tr.querySelector(".part-name")?.value ?? "",
      category: tr.querySelector(".part-category")?.value ?? "",
      value: tr.querySelector(".part-value")?.value ?? "",
      packageName: tr.querySelector(".part-package")?.value ?? "",
      mpn: tr.querySelector(".part-mpn")?.value ?? "",
      manufacturer: tr.querySelector(".part-manufacturer")?.value ?? "",
      quantity: tr.querySelector(".part-qty")?.value ?? "0",
      criticalQuantity: tr.querySelector(".part-crit")?.value ?? "0",
      datasheetUrl: tr.querySelector(".part-datasheet")?.value ?? "",
      ecadUrl: tr.querySelector(".part-ecad")?.value ?? "",
      note: tr.querySelector(".part-note")?.value ?? "",
    },
    tr.dataset.partId || newPartId()
  );
}

function partMatchesBom(part, bomEntry) {
  const synthetic = {
    name: part.name,
    value: part.value,
    packageName: part.packageName,
    manufacturer: part.manufacturer,
    mpn: part.mpn,
    note: part.note,
  };
  return componentMatchesBomSingle(synthetic, bomEntry);
}

function componentMatchesBomSingle(component, bomEntry) {
  const hasComparableData = [bomEntry.name, bomEntry.value, bomEntry.packageName, bomEntry.manufacturer, bomEntry.mpn]
    .some((value) => normalizeText(value).length > 0);

  if (!hasComparableData) return false;

  if (bomEntry.value && !matchesDelimitedValues(component.value, bomEntry.value)) return false;
  if (bomEntry.packageName && !matchesToken(component.packageName, bomEntry.packageName)) return false;
  if (bomEntry.manufacturer && !matchesToken(component.manufacturer, bomEntry.manufacturer)) return false;
  if (bomEntry.name && !matchesToken(component.name, bomEntry.name)) return false;

  if (bomEntry.mpn) {
    const haystack = [component.name, component.value, component.note, component.manufacturer, component.mpn].join(" ");
    if (!matchesToken(haystack, bomEntry.mpn)) return false;
  }

  return true;
}

function componentMatchesBom(component, bomEntry) {
  const parts = component.parts || [];
  if (parts.length === 0) {
    return componentMatchesBomSingle(component, bomEntry);
  }
  return parts.some((part) => partMatchesBom(part, bomEntry));
}

function bomStockQtyForEntry(bomEntry) {
  let sum = 0;
  components.forEach((component) => {
    const parts = component.parts || [];
    if (parts.length === 0) return;
    parts.forEach((part) => {
      if (partMatchesBom(part, bomEntry)) {
        sum += part.quantity;
      }
    });
  });
  return sum;
}

function findBomFirstMatchIds(bomEntry) {
  for (const component of components) {
    const parts = component.parts || [];
    for (let i = 0; i < parts.length; i += 1) {
      if (partMatchesBom(parts[i], bomEntry)) {
        return { componentId: component.id, partId: parts[i].id };
      }
    }
  }
  return { componentId: "", partId: "" };
}

function getPartByIds(componentId, partId) {
  const component = components.find((c) => c.id === componentId);
  if (!component) return { component: null, part: null, partIndex: -1 };
  const parts = component.parts || [];
  const idx = parts.findIndex((p) => p.id === partId);
  if (idx < 0) return { component, part: null, partIndex: -1 };
  return { component, part: parts[idx], partIndex: idx };
}

function encodeQrSelection(componentId, partId) {
  return `${componentId}|${partId}`;
}

function decodeQrSelection(value) {
  const raw = String(value || "");
  const idx = raw.indexOf("|");
  if (idx === -1) {
    return { componentId: raw, partId: null };
  }
  return { componentId: raw.slice(0, idx), partId: raw.slice(idx + 1) || null };
}

function ensureInitialPartsEditor() {
  if (!partsEditorBody) return;
  if (partsEditorBody.querySelector("tr")) return;
  appendPartEditorRow(emptyPartLine());
}

function renderPartsEditor(parts) {
  if (!partsEditorBody) return;
  partsEditorBody.innerHTML = "";
  const list = parts && parts.length > 0 ? parts : [emptyPartLine()];
  list.forEach((p) => appendPartEditorRow(p));
  syncPartRemoveButtons();
}

function categoryOptionsHtml(selected) {
  const opts = [
    { value: "", label: "Vyber typ" },
    { value: "passive", label: "Passive" },
    { value: "active", label: "Active" },
    { value: "connector", label: "Connector" },
    { value: "other", label: "Jine" },
  ];
  return opts
    .map(
      (o) =>
        `<option value="${escapeHtml(o.value)}" ${o.value === selected ? "selected" : ""}>${escapeHtml(
          o.label
        )}</option>`
    )
    .join("");
}

function appendPartEditorRow(part) {
  if (!partsEditorBody) return;
  const tr = document.createElement("tr");
  tr.dataset.partId = part.id;
  tr.innerHTML = `
    <td><input type="text" class="part-name" required placeholder="Nazev" value="${escapeHtml(part.name)}"></td>
    <td><select class="part-category" required>${categoryOptionsHtml(part.category)}</select></td>
    <td><input type="text" class="part-value" placeholder="10k;100nF" value="${escapeHtml(part.value)}"></td>
    <td><input type="text" class="part-package" placeholder="0805" value="${escapeHtml(part.packageName)}"></td>
    <td><input type="text" class="part-mpn" placeholder="STM32F103C8T6" value="${escapeHtml(part.mpn)}"></td>
    <td><input type="text" class="part-manufacturer" placeholder="ST" value="${escapeHtml(part.manufacturer)}"></td>
    <td><input type="number" class="part-qty" min="0" step="1" value="${part.quantity}"></td>
    <td><input type="number" class="part-crit" min="0" step="1" value="${part.criticalQuantity}"></td>
    <td><input type="url" class="part-datasheet" placeholder="https://" value="${escapeHtml(part.datasheetUrl)}"></td>
    <td><input type="url" class="part-ecad" placeholder="https://" value="${escapeHtml(part.ecadUrl)}"></td>
    <td><textarea class="part-note" rows="2" placeholder="Poznamka...">${escapeHtml(part.note)}</textarea></td>
    <td class="part-shop-cell">
      <button type="button" class="secondary shop-link-btn" data-shop="tme" title="Hledat na TME">TME</button>
      <button type="button" class="secondary shop-link-btn" data-shop="mouser" title="Hledat na Mouser">Mouser</button>
    </td>
    <td class="part-remove-cell"><button type="button" class="secondary part-remove-btn" title="Odebrat radek">x</button></td>
  `;
  partsEditorBody.appendChild(tr);
  syncPartRemoveButtons();
}

function syncPartRemoveButtons() {
  if (!partsEditorBody) return;
  const rows = partsEditorBody.querySelectorAll("tr");
  const disable = rows.length <= 1;
  partsEditorBody.querySelectorAll(".part-remove-btn").forEach((btn) => {
    btn.disabled = disable;
  });
}

function onAddPartRowClick() {
  appendPartEditorRow(emptyPartLine());
}

function onPartsEditorBodyClick(event) {
  const shopBtn = event.target.closest("[data-shop]");
  if (shopBtn && partsEditorBody.contains(shopBtn)) {
    const tr = shopBtn.closest("tr");
    if (tr) {
      openShopSearch(shopBtn.dataset.shop, readPartFromEditorRow(tr));
    }
    return;
  }

  const btn = event.target.closest(".part-remove-btn");
  if (!btn || !partsEditorBody.contains(btn)) return;
  const tr = btn.closest("tr");
  if (!tr || !partsEditorBody.contains(tr)) return;
  const rows = partsEditorBody.querySelectorAll("tr");
  if (rows.length <= 1) return;
  tr.remove();
  syncPartRemoveButtons();
}

function readPartsFromEditor() {
  if (!partsEditorBody) return [];
  return Array.from(partsEditorBody.querySelectorAll("tr")).map((tr, idx) => {
    const existingId = tr.dataset.partId || "";
    return normalizePartLine(
      {
        id: existingId,
        name: tr.querySelector(".part-name")?.value ?? "",
        category: tr.querySelector(".part-category")?.value ?? "",
        value: tr.querySelector(".part-value")?.value ?? "",
        packageName: tr.querySelector(".part-package")?.value ?? "",
        mpn: tr.querySelector(".part-mpn")?.value ?? "",
        manufacturer: tr.querySelector(".part-manufacturer")?.value ?? "",
        quantity: tr.querySelector(".part-qty")?.value ?? "0",
        criticalQuantity: tr.querySelector(".part-crit")?.value ?? "0",
        datasheetUrl: tr.querySelector(".part-datasheet")?.value ?? "",
        ecadUrl: tr.querySelector(".part-ecad")?.value ?? "",
        note: tr.querySelector(".part-note")?.value ?? "",
      },
      existingId || newPartId()
    );
  });
}

function focusFirstPartName() {
  const input = partsEditorBody?.querySelector(".part-name");
  if (input) input.focus();
}

bootstrap();

function bootstrap() {
  form.addEventListener("submit", onSubmit);
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.view;
      setActiveViewMode(mode);
    });
  });
  searchQrBtn.addEventListener("click", processSearchQrInput);
  searchQrInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      processSearchQrInput();
    }
  });
  resetBtn.addEventListener("click", resetForm);
  fields.organizer.addEventListener("change", onComponentOrganizerChange);
  fields.row.addEventListener("change", onComponentRowChange);
  visualOrganizer.addEventListener("change", renderAll);
  printFilteredBtn.addEventListener("click", printFilteredList);
  compareBomBtn.addEventListener("click", onCompareBom);
  clearBomBtn.addEventListener("click", clearBomResults);
  showQrBtn.addEventListener("click", onShowQrFromSelector);
  printQrLabelBtn.addEventListener("click", printSelectedQrLabel);
  startQrScanBtn.addEventListener("click", startQrScanner);
  stopQrScanBtn.addEventListener("click", stopQrScanner);
  usbScanProcessBtn.addEventListener("click", processUsbScanInput);
  cloudSaveUrlBtn.addEventListener("click", saveCloudUrlSetting);
  cloudLoadUrlBtn.addEventListener("click", loadFromCloudUrl);
  cloudImportFileBtn.addEventListener("click", importFromCloudFile);
  cloudExportJsonBtn.addEventListener("click", exportCloudJsonFile);
  cloudCopyJsonBtn.addEventListener("click", copyCloudJsonToClipboard);
  purchaseExportCsvBtn.addEventListener("click", exportPurchaseListCsv);
  purchasePrintBtn.addEventListener("click", printPurchaseList);
  historyClearBtn.addEventListener("click", clearMovementHistory);
  usbScanInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      processUsbScanInput();
    }
  });

  organizerForm.addEventListener("submit", onOrganizerSubmit);
  organizerResetBtn.addEventListener("click", resetOrganizerForm);

  if (partsAddRowBtn) {
    partsAddRowBtn.addEventListener("click", onAddPartRowClick);
  }
  if (partsEditorBody) {
    partsEditorBody.addEventListener("click", onPartsEditorBodyClick);
  }

  Object.values(filters).forEach((input) => {
    input.addEventListener("input", renderAll);
    input.addEventListener("change", renderAll);
  });
  window.addEventListener("beforeunload", () => {
    if (scannerRunning) {
      stopQrScanner();
    }
  });

  ensureAtLeastOneOrganizer();
  ensureInitialPartsEditor();
  cloudJsonUrlInput.value = loadCloudUrlSetting();
  applyViewMode();
  renderAll();
}

function onSubmit(event) {
  event.preventDefault();

  const raw = readForm();
  const selectedOrganizer = findOrganizer(raw.organizer);
  if (!selectedOrganizer) {
    alert("Vyber platny poradac.");
    return;
  }

  if (
    raw.row < 1 ||
    raw.col < 1 ||
    raw.row > selectedOrganizer.rows ||
    raw.col > getSlotsForRow(selectedOrganizer, raw.row)
  ) {
    const maxSlots = getSlotsForRow(selectedOrganizer, raw.row);
    alert(`Pozice musi byt v rozsahu R1-${selectedOrganizer.rows}, S1-${maxSlots} pro vybrany radek.`);
    return;
  }

  const cleanedParts = raw.parts.filter((p) => p.name);
  if (cleanedParts.length === 0) {
    alert("Vypln nazev u alespon jednoho radku obsahu supliku.");
    return;
  }
  const missingCat = cleanedParts.find((p) => !p.category);
  if (missingCat) {
    alert(`Vyber typ soucastky u radku "${missingCat.name}".`);
    return;
  }

  const nextId = raw.id || crypto.randomUUID();
  let next = normalizeComponent({
    id: nextId,
    organizer: raw.organizer,
    row: raw.row,
    col: raw.col,
    parts: cleanedParts,
    createdAt: raw.createdAt,
  });

  const existingAtLocation = components.find(
    (item) =>
      item.organizer === next.organizer &&
      item.row === next.row &&
      item.col === next.col &&
      item.id !== next.id
  );

  if (existingAtLocation) {
    alert("Tento suplik je uz obsazeny jinou polozkou. Uprav existujici zaznam nebo zvol jinou pozici.");
    return;
  }

  if (raw.id) {
    const original = components.find((item) => item.id === next.id);
    next.createdAt = original?.createdAt || new Date().toISOString();
    components = components.map((item) => (item.id === next.id ? next : item));
    if (original) {
      const oldSum = getPartStockQuantitySum(original);
      const newSum = getPartStockQuantitySum(next);
      const delta = newSum - oldSum;
      addMovement({
        timestamp: new Date().toISOString(),
        action: "edit",
        componentId: next.id,
        componentName: next.parts.length > 1 ? `Suplik (${next.parts.length} druhu)` : next.name,
        delta,
        afterQuantity: newSum,
        organizer: next.organizer,
        row: next.row,
        col: next.col,
        locationText: `${getOrganizerLabel(next.organizer)}, R${next.row} S${next.col}`,
        note: next.parts.length > 1 ? "Uprava obsahu supliku (vic druhu)" : "Uprava parametru soucastky",
      });
    }
  } else {
    next.createdAt = new Date().toISOString();
    components.push(next);
    const newSum = getPartStockQuantitySum(next);
    addMovement({
      timestamp: new Date().toISOString(),
      action: "stock_in",
      componentId: next.id,
      componentName: next.parts.length > 1 ? `Suplik (${next.parts.length} druhu)` : next.name,
      delta: newSum,
      afterQuantity: newSum,
      organizer: next.organizer,
      row: next.row,
      col: next.col,
      locationText: `${getOrganizerLabel(next.organizer)}, R${next.row} S${next.col}`,
      note: "Zaskladneni (suplik)",
    });
  }

  saveComponents();
  highlightedId = next.id;
  ensureSelectedOrganizer(next.organizer);
  resetForm(false);
  renderAll();
}

function readForm() {
  return {
    id: fields.id.value.trim(),
    organizer: Number(fields.organizer.value),
    row: Number(fields.row.value),
    col: Number(fields.col.value),
    parts: readPartsFromEditor(),
    createdAt: new Date().toISOString(),
  };
}

function onComponentOrganizerChange() {
  applyOrganizerLimitsToComponentForm(Number(fields.organizer.value));
}

function onComponentRowChange() {
  applyOrganizerLimitsToComponentForm(Number(fields.organizer.value));
}

function processSearchQrInput() {
  const raw = searchQrInput.value.trim();
  if (!raw) {
    alert("Naskenuj nebo vloz QR/ID kod.");
    return;
  }
  processScannedCode(raw, "hledani");
  searchQrInput.value = "";
}

function resetForm(clearHighlight = true) {
  form.reset();
  fields.id.value = "";
  submitBtn.textContent = "Ulozit soucastku";
  setDefaultOrganizerInForm();
  applyOrganizerLimitsToComponentForm(Number(fields.organizer.value));
  renderPartsEditor([emptyPartLine()]);
  if (clearHighlight) {
    highlightedId = null;
  }
}

function onOrganizerSubmit(event) {
  event.preventDefault();
  const number = toNonNegativeInt(organizerNumber.value);
  const name = organizerName.value.trim();
  const rows = toNonNegativeInt(organizerRows.value);
  const cols = toNonNegativeInt(organizerCols.value);
  const rowLayout = organizerRowLayout.value.trim();
  const editingNumber = organizerId.value ? Number(organizerId.value) : null;

  if (number <= 0) {
    alert("Cislo poradace musi byt alespon 1.");
    return;
  }
  if (rows <= 0 || cols <= 0) {
    alert("Format poradace musi mit alespon 1 radek a 1 sloupec.");
    return;
  }

  const parsedLayout = parseRowLayout(rowLayout, rows, cols);
  if (!parsedLayout.valid) {
    alert(parsedLayout.errorMessage);
    return;
  }

  const duplicate = organizers.find((org) => org.number === number && org.number !== editingNumber);
  if (duplicate) {
    alert("Toto cislo poradace uz existuje.");
    return;
  }

  if (editingNumber !== null) {
    const componentsInOrganizer = components.filter((component) => component.organizer === editingNumber);
    const outsideBounds = componentsInOrganizer.find(
      (component) =>
        component.row > rows ||
        component.col > getSlotsForRow({ rows, cols, rowLayout }, component.row)
    );
    if (outsideBounds) {
      alert(
        `Format ${rows}x${cols} je moc maly. Soucastka "${outsideBounds.parts?.[0]?.name || outsideBounds.name}" je na pozici R${outsideBounds.row} S${outsideBounds.col}.`
      );
      return;
    }

    organizers = organizers.map((org) =>
      org.number === editingNumber
        ? { number, name: name || `Poradac ${number}`, rows, cols, rowLayout }
        : org
    );

    if (editingNumber !== number) {
      components = components.map((component) =>
        component.organizer === editingNumber
          ? { ...component, organizer: number }
          : component
      );
      saveComponents();
      if (visualOrganizer.value === String(editingNumber)) {
        visualOrganizer.value = String(number);
      }
    }
  } else {
    organizers.push({
      number,
      name: name || `Poradac ${number}`,
      rows,
      cols,
      rowLayout,
    });
  }

  saveOrganizers();
  resetOrganizerForm();
  renderAll();
}

function resetOrganizerForm() {
  organizerForm.reset();
  organizerId.value = "";
  organizerRows.value = "5";
  organizerCols.value = "12";
  organizerRowLayout.value = "";
  organizerSubmitBtn.textContent = "Ulozit poradac";
}

function onOrganizerTableAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  const number = Number(button.dataset.number);
  const organizer = findOrganizer(number);
  if (!organizer) return;

  if (action === "edit") {
    organizerId.value = String(organizer.number);
    organizerNumber.value = String(organizer.number);
    organizerName.value = organizer.name;
    organizerRows.value = String(organizer.rows);
    organizerCols.value = String(organizer.cols);
    organizerRowLayout.value = organizer.rowLayout || "";
    organizerSubmitBtn.textContent = "Ulozit zmeny poradace";
    return;
  }

  if (action === "delete") {
    const used = components.some((item) => item.organizer === organizer.number);
    if (used) {
      alert("Poradac nejde smazat, protoze obsahuje soucastky.");
      return;
    }
    if (organizers.length <= 1) {
      alert("Musi zustat alespon jeden poradac.");
      return;
    }

    const ok = confirm(`Smazat poradac ${organizer.number} (${organizer.name})?`);
    if (!ok) return;
    organizers = organizers.filter((org) => org.number !== organizer.number);
    saveOrganizers();
    resetOrganizerForm();
    renderAll();
  }
}

function loadComponents() {
  try {
    const raw = localStorage.getItem(STORAGE_COMPONENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeComponent);
  } catch {
    return [];
  }
}

function loadMovements() {
  try {
    const raw = localStorage.getItem(STORAGE_MOVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeMovement)
      .filter((item) => item.componentName || item.action);
  } catch {
    return [];
  }
}

function loadOrganizers() {
  try {
    const raw = localStorage.getItem(STORAGE_ORGANIZERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((item) => ({
            number: toNonNegativeInt(item.number),
            name: String(item.name || "").trim(),
            rows: toNonNegativeInt(item.rows) || 5,
            cols: toNonNegativeInt(item.cols) || 12,
            rowLayout: String(item.rowLayout || "").trim(),
          }))
          .filter((item) => item.number > 0);
        if (normalized.length > 0) {
          return deduplicateOrganizers(normalized);
        }
      }
    }
  } catch {
    // no-op
  }

  return buildOrganizersFromComponents();
}

function buildOrganizersFromComponents() {
  const numbers = [...new Set(components.map((item) => item.organizer))].filter((n) => n > 0);
  if (numbers.length === 0) {
    return [{ number: 1, name: "Poradac 1", rows: 5, cols: 12, rowLayout: "" }];
  }
  return numbers
    .sort((a, b) => a - b)
    .map((number) => ({ number, name: `Poradac ${number}`, rows: 5, cols: 12, rowLayout: "" }));
}

function deduplicateOrganizers(list) {
  const map = new Map();
  list.forEach((item) => {
    if (!map.has(item.number)) {
      map.set(item.number, {
        number: item.number,
        name: item.name || `Poradac ${item.number}`,
        rows: toNonNegativeInt(item.rows) || 5,
        cols: toNonNegativeInt(item.cols) || 12,
        rowLayout: String(item.rowLayout || "").trim(),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.number - b.number);
}

function ensureAtLeastOneOrganizer() {
  if (organizers.length === 0) {
    organizers = [{ number: 1, name: "Poradac 1", rows: 5, cols: 12, rowLayout: "" }];
    saveOrganizers();
  }
}

function saveComponents() {
  localStorage.setItem(STORAGE_COMPONENTS_KEY, JSON.stringify(components));
}

function saveOrganizers() {
  localStorage.setItem(STORAGE_ORGANIZERS_KEY, JSON.stringify(organizers));
}

function saveMovements() {
  localStorage.setItem(STORAGE_MOVEMENTS_KEY, JSON.stringify(movements));
}

function loadViewModeSetting() {
  const stored = localStorage.getItem(STORAGE_VIEW_MODE_KEY);
  const allowed = new Set(["stocking", "search", "settings"]);
  return allowed.has(stored) ? stored : "stocking";
}

function setActiveViewMode(mode) {
  const allowed = new Set(["stocking", "search", "settings"]);
  if (!allowed.has(mode)) return;
  activeViewMode = mode;
  localStorage.setItem(STORAGE_VIEW_MODE_KEY, mode);
  applyViewMode();
}

function applyViewMode() {
  if (viewButtons.length > 0) {
    viewButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.view === activeViewMode);
    });
  }

  if (viewCards.length === 0) return;
  viewCards.forEach((card) => {
    const groups = (card.dataset.viewGroup || "")
      .split(/\s+/)
      .map((group) => group.trim())
      .filter(Boolean);
    const visible = groups.includes(activeViewMode);
    card.classList.toggle("is-hidden-by-view", !visible);
  });
}

function loadCloudUrlSetting() {
  return localStorage.getItem(STORAGE_CLOUD_URL_KEY) || "";
}

function saveCloudUrlSetting() {
  const url = cloudJsonUrlInput.value.trim();
  localStorage.setItem(STORAGE_CLOUD_URL_KEY, url);
  lastCloudSyncMessage = url
    ? `Odkaz ulozen. Aktivni cloud URL: ${url}`
    : "Cloud odkaz byl vymazan.";
  renderCloudSyncStatus();
}

function renderCloudSyncStatus() {
  const snapshot = createExportSnapshot();
  const stats = `${snapshot.components.length} soucastek, ${snapshot.organizers.length} poradacu`;
  cloudSyncStatus.textContent = `${lastCloudSyncMessage} (${stats})`;
}

function createExportSnapshot() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    components,
    organizers,
    movements,
  };
}

function exportCloudJsonFile() {
  const snapshot = createExportSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const fileName = `sklad-soucastek-${formatDateForFilename(new Date())}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  lastCloudSyncMessage = `Export hotov: ${fileName}`;
  renderCloudSyncStatus();
}

async function copyCloudJsonToClipboard() {
  const snapshot = createExportSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    lastCloudSyncMessage = "JSON byl zkopirovan do schranky.";
  } catch {
    lastCloudSyncMessage = "Kopirovani do schranky selhalo. Pouzij Export JSON.";
  }
  renderCloudSyncStatus();
}

async function importFromCloudFile() {
  const file = cloudJsonFileInput.files && cloudJsonFileInput.files[0];
  if (!file) {
    alert("Vyber JSON soubor pro import.");
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyImportedSnapshot(parsed, `Import ze souboru: ${file.name}`);
    cloudJsonFileInput.value = "";
  } catch (error) {
    alert(`Import ze souboru selhal: ${error.message}`);
  }
}

async function loadFromCloudUrl() {
  const inputUrl = cloudJsonUrlInput.value.trim();
  if (!inputUrl) {
    alert("Zadej odkaz na JSON soubor.");
    return;
  }

  const resolvedUrl = resolveCloudJsonUrl(inputUrl);
  try {
    const response = await fetch(resolvedUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const parsed = await response.json();
    applyImportedSnapshot(parsed, `Nacteno z URL: ${inputUrl}`);
  } catch (error) {
    alert(
      `Nacitani selhalo (${error.message}). U Google Drive musi byt soubor verejny. Pokud browser blokuje CORS, stahni JSON a pouzij Import ze souboru.`
    );
  }
}

function applyImportedSnapshot(payload, sourceLabel) {
  let nextComponents = [];
  let nextOrganizers = [];
  let nextMovements = [];

  if (Array.isArray(payload)) {
    nextComponents = payload.map(normalizeComponent);
    nextOrganizers = buildOrganizersFromComponentsList(nextComponents);
  } else if (payload && typeof payload === "object") {
    if (!Array.isArray(payload.components)) {
      throw new Error("JSON nema pole 'components'.");
    }
    nextComponents = payload.components.map(normalizeComponent);
    if (Array.isArray(payload.organizers)) {
      nextOrganizers = deduplicateOrganizers(payload.organizers);
    } else {
      nextOrganizers = buildOrganizersFromComponentsList(nextComponents);
    }
    if (Array.isArray(payload.movements)) {
      nextMovements = payload.movements.map(normalizeMovement);
    }
  } else {
    throw new Error("Nepodporovany format JSON.");
  }

  if (nextOrganizers.length === 0) {
    nextOrganizers = [{ number: 1, name: "Poradac 1", rows: 5, cols: 12, rowLayout: "" }];
  }

  components = nextComponents.filter((item) => {
    const organizer = nextOrganizers.find((org) => org.number === item.organizer);
    if (!organizer) return false;
    return item.row >= 1 && item.col >= 1 && item.row <= organizer.rows && item.col <= organizer.cols;
  });
  organizers = nextOrganizers;
  movements = nextMovements;
  highlightedId = null;
  selectedDrawer = null;
  bomRows = [];
  bomResults = [];

  saveComponents();
  saveOrganizers();
  saveMovements();
  addMovement({
    timestamp: new Date().toISOString(),
    action: "import",
    componentName: "",
    delta: 0,
    afterQuantity: null,
    organizer: null,
    row: null,
    col: null,
    locationText: "-",
    note: sourceLabel,
  });
  lastCloudSyncMessage = sourceLabel;
  renderAll();
}

function buildOrganizersFromComponentsList(componentList) {
  const numbers = [...new Set(componentList.map((item) => item.organizer))].filter((n) => n > 0);
  if (numbers.length === 0) return [];
  return numbers
    .sort((a, b) => a - b)
    .map((number) => ({ number, name: `Poradac ${number}`, rows: 5, cols: 12, rowLayout: "" }));
}

function resolveCloudJsonUrl(url) {
  const trimmed = url.trim();

  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  const openMatch = trimmed.match(/[?&]id=([^&]+)/i);
  if (trimmed.includes("drive.google.com/open") && openMatch) {
    return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  }

  return trimmed;
}

function parseRowLayout(rowLayout, rows, cols) {
  const text = String(rowLayout || "").trim();
  if (!text) {
    return { valid: true, map: {}, errorMessage: "" };
  }

  const map = {};
  const parts = text.split(";").map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const [rowSpecRaw, slotsRaw] = part.split(":").map((item) => item?.trim());
    const slots = toNonNegativeInt(slotsRaw);
    if (!rowSpecRaw || slots <= 0) {
      return {
        valid: false,
        map: {},
        errorMessage: `Neplatne rozvrzeni "${part}". Pouzij format napr. 11:2;12:1.`,
      };
    }

    const rowNumbers = expandRowSpec(rowSpecRaw, rows);
    if (rowNumbers.length === 0) {
      return {
        valid: false,
        map: {},
        errorMessage: `Neplatny radek nebo rozsah "${rowSpecRaw}" v rozvrzeni.`,
      };
    }

    rowNumbers.forEach((row) => {
      map[row] = slots;
    });
  }

  return { valid: true, map, errorMessage: "" };
}

function expandRowSpec(spec, maxRows) {
  const cleaned = String(spec || "").trim();
  if (!cleaned) return [];
  if (cleaned.includes("-")) {
    const [fromRaw, toRaw] = cleaned.split("-").map((s) => toNonNegativeInt(s));
    if (fromRaw <= 0 || toRaw <= 0 || fromRaw > toRaw || toRaw > maxRows) return [];
    const rows = [];
    for (let row = fromRaw; row <= toRaw; row += 1) {
      rows.push(row);
    }
    return rows;
  }
  const single = toNonNegativeInt(cleaned);
  if (single <= 0 || single > maxRows) return [];
  return [single];
}

function getSlotsForRow(organizer, row) {
  const safeRow = Math.max(1, toNonNegativeInt(row));
  const parsed = parseRowLayout(organizer.rowLayout, organizer.rows, organizer.cols);
  if (!parsed.valid) return organizer.cols;
  return parsed.map[safeRow] || organizer.cols;
}

function getPurchaseListItems() {
  const rows = [];
  components.forEach((item) => {
    const parts = item.parts || [];
    parts.forEach((part) => {
      if (part.quantity < part.criticalQuantity) {
        rows.push({
          componentId: item.id,
          partId: part.id,
          name: part.name,
          value: part.value,
          mpn: part.mpn,
          manufacturer: part.manufacturer,
          quantity: part.quantity,
          criticalQuantity: part.criticalQuantity,
          missing: part.criticalQuantity - part.quantity,
          organizer: item.organizer,
          row: item.row,
          col: item.col,
        });
      }
    });
  });
  return rows.sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name, "cs"));
}

function renderPurchaseList() {
  const items = getPurchaseListItems();
  if (items.length === 0) {
    purchaseSummary.textContent = "Nakupni seznam je prazdny. Zadna polozka neni pod kritickym limitem.";
    purchaseTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Zadne polozky pod kritickym mnozstvim.</td>
      </tr>
    `;
    return;
  }

  const totalMissing = items.reduce((sum, item) => sum + item.missing, 0);
  purchaseSummary.textContent = `Polozek k doplneni: ${items.length}, celkem chybi ${totalMissing} ks.`;
  purchaseTableBody.innerHTML = items
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.mpn || "-")}</td>
        <td>${escapeHtml(item.value || "-")}</td>
        <td>${escapeHtml(item.manufacturer || "-")}</td>
        <td>${item.quantity}</td>
        <td>${item.criticalQuantity}</td>
        <td>${item.missing}</td>
        <td>${escapeHtml(getOrganizerLabel(item.organizer))}, R${item.row} S${item.col}</td>
        <td>${renderShopSearchLinksHtml(item)}</td>
      </tr>
    `)
    .join("");
}

function exportPurchaseListCsv() {
  const items = getPurchaseListItems();
  if (items.length === 0) {
    alert("Nakupni seznam je prazdny.");
    return;
  }

  const rows = [
    ["Nazev", "MPN", "Hodnota", "Vyrobce", "Skladem", "Kriticke", "Doplnit", "Poradac", "Radek", "Sloupec", "TME", "Mouser"],
    ...items.map((item) => {
      const query = getPartShopSearchQuery(item);
      return [
        item.name,
        item.mpn || "",
        item.value || "",
        item.manufacturer || "",
        String(item.quantity),
        String(item.criticalQuantity),
        String(item.missing),
        getOrganizerLabel(item.organizer),
        String(item.row),
        String(item.col),
        query ? buildTmeSearchUrl(query) : "",
        query ? buildMouserSearchUrl(query) : "",
      ];
    }),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const fileName = `nakupni-seznam-${formatDateForFilename(new Date())}.csv`;
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printPurchaseList() {
  const items = getPurchaseListItems();
  if (items.length === 0) {
    alert("Nakupni seznam je prazdny.");
    return;
  }

  const rows = items
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.mpn || "-")}</td>
        <td>${escapeHtml(item.value || "-")}</td>
        <td>${escapeHtml(item.manufacturer || "-")}</td>
        <td>${item.quantity}</td>
        <td>${item.criticalQuantity}</td>
        <td>${item.missing}</td>
        <td>${escapeHtml(getOrganizerLabel(item.organizer))}, R${item.row} S${item.col}</td>
      </tr>
    `)
    .join("");

  const popup = window.open("", "_blank", "width=980,height=760");
  if (!popup) {
    alert("Nepodarilo se otevrit tiskove okno.");
    return;
  }

  popup.document.write(`
    <!doctype html>
    <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <title>Nakupni seznam soucastek</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { margin: 0 0 8px 0; font-size: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #bbb; padding: 6px; text-align: left; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Nakupni seznam pod kritickym limitem</h1>
        <p>Vytvoreno: ${new Date().toLocaleString("cs-CZ")} | Pocet polozek: ${items.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nazev</th>
              <th>MPN</th>
              <th>Hodnota</th>
              <th>Vyrobce</th>
              <th>Skladem</th>
              <th>Kriticke</th>
              <th>Doplnit</th>
              <th>Umisteni</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function renderMovementHistory() {
  if (movements.length === 0) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Historie je prazdna.</td>
      </tr>
    `;
    return;
  }

  const recent = movements.slice(0, 250);
  historyTableBody.innerHTML = recent
    .map((entry) => `
      <tr>
        <td>${formatDateTime(entry.timestamp)}</td>
        <td>${escapeHtml(labelForMovementAction(entry.action))}</td>
        <td>${escapeHtml(entry.componentName || "-")}</td>
        <td>${escapeHtml(formatMovementDelta(entry.delta))}</td>
        <td>${entry.afterQuantity ?? "-"}</td>
        <td>${escapeHtml(entry.locationText || "-")}</td>
        <td>${escapeHtml(entry.note || "-")}</td>
      </tr>
    `)
    .join("");
}

function clearMovementHistory() {
  if (movements.length === 0) return;
  const ok = confirm("Opravdu chces vymazat historii pohybu skladu?");
  if (!ok) return;
  movements = [];
  saveMovements();
  renderMovementHistory();
}

function addMovement(entry) {
  movements.unshift(normalizeMovement(entry));
  if (movements.length > 2000) {
    movements = movements.slice(0, 2000);
  }
  saveMovements();
}

function findOrganizer(number) {
  return organizers.find((org) => org.number === Number(number));
}

function getOrganizerLabel(number) {
  const org = findOrganizer(number);
  return org ? `${org.number} - ${org.name}` : String(number);
}

function getOrganizerFormat(organizer) {
  const base = `${organizer.rows} x ${organizer.cols}`;
  if (!organizer.rowLayout) return base;
  return `${base} (${organizer.rowLayout})`;
}

function renderAll() {
  organizers = deduplicateOrganizers(organizers);
  ensureAtLeastOneOrganizer();
  renderOrganizerSelectors();
  renderOrganizerTable();
  renderCloudSyncStatus();
  renderPurchaseList();
  renderMovementHistory();
  renderQrComponentSelector();
  const filtered = getFilteredComponents();
  renderTable(filtered);
  renderGrid();
  refreshBomResults();
  renderBomResults();
}

function renderOrganizerSelectors() {
  const currentForm = fields.organizer.value;
  const currentFilter = filterOrganizer.value;
  const currentVisual = visualOrganizer.value;

  const options = organizers
    .map((org) => `<option value="${org.number}">${escapeHtml(getOrganizerLabel(org.number))}</option>`)
    .join("");

  fields.organizer.innerHTML = options;
  filterOrganizer.innerHTML = `<option value="">Vsechny</option>${options}`;
  visualOrganizer.innerHTML = options;

  const organizerNumbers = organizers.map((org) => org.number);

  if (organizerNumbers.includes(Number(currentForm))) {
    fields.organizer.value = currentForm;
  } else {
    setDefaultOrganizerInForm();
  }

  if (organizerNumbers.includes(Number(currentFilter))) {
    filterOrganizer.value = currentFilter;
  }

  if (organizerNumbers.includes(Number(currentVisual))) {
    visualOrganizer.value = currentVisual;
  } else {
    visualOrganizer.value = String(organizers[0].number);
  }

  applyOrganizerLimitsToComponentForm(Number(fields.organizer.value));
  updateVisualTitle();
}

function setDefaultOrganizerInForm() {
  if (organizers.length > 0) {
    fields.organizer.value = String(organizers[0].number);
  }
}

function applyOrganizerLimitsToComponentForm(organizerNumber) {
  const organizer = findOrganizer(organizerNumber);
  if (!organizer) return;

  fields.row.max = String(organizer.rows);
  fields.rowLabel.textContent = `Radek (1-${organizer.rows}) *`;
  const selectedRow = toNonNegativeInt(fields.row.value) || 1;
  const maxSlots = getSlotsForRow(organizer, selectedRow);
  fields.col.max = String(maxSlots);
  fields.colLabel.textContent = `Sloupec (1-${maxSlots}) *`;

  const currentRow = toNonNegativeInt(fields.row.value);
  const currentCol = toNonNegativeInt(fields.col.value);
  if (currentRow > organizer.rows) {
    fields.row.value = String(organizer.rows);
  }
  if (currentCol > maxSlots) {
    fields.col.value = String(maxSlots);
  }
}

function updateVisualTitle() {
  const organizer = findOrganizer(Number(visualOrganizer.value));
  if (!organizer) {
    visualTitle.textContent = "Vizualizace suplikoveho poradace";
    return;
  }
  visualTitle.textContent = `Vizualizace suplikoveho poradace (${getOrganizerFormat(organizer)})`;
}

function renderOrganizerTable() {
  const sorted = [...organizers].sort((a, b) => a.number - b.number);
  organizerTableBody.innerHTML = sorted
    .map((org) => {
      const count = components.filter((item) => item.organizer === org.number).length;
      return `
        <tr>
          <td>${org.number}</td>
          <td>${escapeHtml(org.name)}</td>
          <td>${escapeHtml(getOrganizerFormat(org))}</td>
          <td>${count}</td>
          <td class="actions-cell">
            <button data-action="edit" data-number="${org.number}" class="secondary">Upravit</button>
            <button data-action="delete" data-number="${org.number}" class="secondary">Smazat</button>
          </td>
        </tr>
      `;
    })
    .join("");

  organizerTableBody.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", onOrganizerTableAction);
  });
}

function renderQrComponentSelector() {
  const current = qrComponentSelect.value;
  const options = [];
  components.forEach((item) => {
    (item.parts || []).forEach((part) => {
      const loc = `${getOrganizerLabel(item.organizer)}, R${item.row} S${item.col}`;
      options.push({
        value: encodeQrSelection(item.id, part.id),
        label: `${part.name} (${loc})`,
      });
    });
  });

  options.sort((a, b) => a.label.localeCompare(b.label, "cs"));

  if (options.length === 0) {
    qrComponentSelect.innerHTML = `<option value="">Zadne soucastky</option>`;
    qrComponentSelect.value = "";
    qrPreviewTitle.textContent = "Vyber soucastku pro zobrazeni QR kodu.";
    qrPreviewMeta.textContent = "";
    qrCodeContainer.innerHTML = "";
    return;
  }

  qrComponentSelect.innerHTML = options
    .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
    .join("");

  if (options.some((o) => o.value === current)) {
    qrComponentSelect.value = current;
  } else {
    qrComponentSelect.value = options[0].value;
  }
}

function onShowQrFromSelector() {
  if (!qrComponentSelect.value) {
    alert("Neni vybrana zadna soucastka.");
    return;
  }
  const { componentId, partId } = decodeQrSelection(qrComponentSelect.value);
  renderComponentQr(componentId, partId);
}

function renderComponentQr(componentId, partId) {
  const item = components.find((component) => component.id === componentId);
  if (!item) {
    qrPreviewTitle.textContent = "Soucastka nebyla nalezena.";
    qrPreviewMeta.textContent = "";
    qrCodeContainer.innerHTML = "";
    return;
  }

  const parts = item.parts || [];
  const resolvedPartId = partId || parts[0]?.id;
  const { part } = getPartByIds(componentId, resolvedPartId);
  const displayPart = part || parts[0];

  qrPreviewTitle.textContent = displayPart ? displayPart.name : item.name;
  qrPreviewMeta.textContent = `${getOrganizerLabel(item.organizer)}, R${item.row} S${item.col}`;
  qrCodeContainer.innerHTML = "";

  if (typeof QRCode !== "function") {
    qrCodeContainer.textContent = "QR knihovna se nepodarilo nacist.";
    return;
  }

  const payload = createQrPayload(componentId, displayPart?.id || resolvedPartId);
  // Global QRCode constructor comes from qrcodejs CDN script.
  // eslint-disable-next-line no-new
  new QRCode(qrCodeContainer, {
    text: payload,
    width: 192,
    height: 192,
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function printSelectedQrLabel() {
  const rawSel = qrComponentSelect.value;
  if (!rawSel) {
    alert("Vyber soucastku, pro kterou chces vytisknout QR stitek.");
    return;
  }
  const { componentId, partId } = decodeQrSelection(rawSel);
  const item = components.find((component) => component.id === componentId);
  if (!item) {
    alert("Vyber soucastku, pro kterou chces vytisknout QR stitek.");
    return;
  }
  const parts = item.parts || [];
  const resolvedPartId = partId || parts[0]?.id;
  const { part } = getPartByIds(componentId, resolvedPartId);
  const displayPart = part || parts[0];
  if (!displayPart) {
    alert("Vyber soucastku, pro kterou chces vytisknout QR stitek.");
    return;
  }

  const payload = createQrPayload(componentId, displayPart.id);
  const popup = window.open("", "_blank", "width=520,height=680");
  if (!popup) {
    alert("Nepodarilo se otevrit okno pro tisk stitku.");
    return;
  }

  popup.document.write(`
    <!doctype html>
    <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <title>QR stitek - ${escapeHtml(displayPart.name)}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 14px; }
          .label { width: 88mm; min-height: 48mm; border: 1px dashed #999; border-radius: 8px; padding: 8px; }
          .title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
          .value { font-size: 12px; margin-bottom: 2px; color: #1b2533; }
          .meta { font-size: 12px; color: #444; margin-bottom: 8px; }
          .qr-wrap { display: flex; justify-content: center; margin-top: 4px; }
          .code { font-size: 10px; margin-top: 6px; text-align: center; color: #555; word-break: break-all; }
          @media print { body { margin: 0; } .label { border: none; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="title">${escapeHtml(displayPart.name)}</div>
          <div class="value">Hodnota: ${escapeHtml(displayPart.value || "-")}</div>
          <div class="meta">${escapeHtml(getOrganizerLabel(item.organizer))}, R${item.row} S${item.col}</div>
          <div id="qr" class="qr-wrap"></div>
          <div class="code">${escapeHtml(payload)}</div>
        </div>
        <script>
          const payload = ${JSON.stringify(payload)};
          new QRCode(document.getElementById("qr"), { text: payload, width: 170, height: 170, correctLevel: QRCode.CorrectLevel.M });
          window.focus();
          setTimeout(() => window.print(), 250);
        </script>
      </body>
    </html>
  `);
  popup.document.close();
}

function createQrPayload(componentId, partId) {
  if (partId) {
    return `SKLADCOMP:${componentId}:${partId}`;
  }
  return `SKLADCOMP:${componentId}`;
}

async function startQrScanner() {
  if (scannerRunning) return;
  if (typeof Html5Qrcode !== "function") {
    qrScanStatus.textContent = "Ctecka QR neni dostupna (nepodporovany prohlizec).";
    return;
  }

  qrScanStatus.textContent = "Spoustim ctecku...";
  qrScannerRegion.innerHTML = "";
  qrScanner = new Html5Qrcode("qr-scanner-region");

  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      onQrScanSuccess,
      () => {}
    );
    scannerRunning = true;
    qrScanStatus.textContent = "Ctecka bezi. Namir kameru na QR kod.";
  } catch (error) {
    qrScanStatus.textContent = `Ctecku se nepodarilo spustit: ${error.message}`;
    qrScanner = null;
    scannerRunning = false;
  }
}

async function stopQrScanner() {
  if (!qrScanner) {
    scannerRunning = false;
    qrScanStatus.textContent = "Ctecka je zastavena.";
    return;
  }

  try {
    if (scannerRunning) {
      await qrScanner.stop();
    }
    await qrScanner.clear();
  } catch {
    // Ignore cleanup errors from camera teardown.
  } finally {
    qrScanner = null;
    scannerRunning = false;
    qrScanStatus.textContent = "Ctecka je zastavena.";
  }
}

function onQrScanSuccess(decodedText) {
  const now = Date.now();
  if (decodedText === lastScanText && now - lastScanTime < 2000) {
    return;
  }
  lastScanText = decodedText;
  lastScanTime = now;
  processScannedCode(decodedText, "kamera");
}

function processUsbScanInput() {
  const raw = usbScanInput.value.trim();
  if (!raw) {
    qrScanStatus.textContent = "USB ctecka: neni co zpracovat.";
    return;
  }
  processScannedCode(raw, "usb");
  usbScanInput.value = "";
}

function processScannedCode(rawText, source) {
  const { componentId, partId } = parseQrPayload(rawText);
  const item = components.find((component) => component.id === componentId);
  if (!item) {
    qrScanStatus.textContent = `Nacten kod (${source}), ale soucastka nebyla nalezena: ${rawText}`;
    return;
  }

  const parts = item.parts || [];
  const resolvedPartId = partId || parts[0]?.id;
  const { part } = getPartByIds(componentId, resolvedPartId);
  const displayName = part?.name || item.name;

  qrScanStatus.textContent = `Nacteno (${source}): ${displayName} (${getOrganizerLabel(item.organizer)}, R${item.row} S${item.col})`;
  if (source === "hledani") {
    setActiveViewMode("search");
  }
  highlightedId = item.id;
  selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
  qrComponentSelect.value = encodeQrSelection(item.id, resolvedPartId);
  renderComponentQr(item.id, resolvedPartId);
  ensureSelectedOrganizer(item.organizer);
  renderGrid();
}

function parseQrPayload(decodedText) {
  const value = String(decodedText || "").trim();
  if (value.startsWith("SKLADCOMP:")) {
    const rest = value.slice("SKLADCOMP:".length);
    const segments = rest.split(":").map((s) => s.trim()).filter(Boolean);
    if (segments.length >= 2) {
      return { componentId: segments[0], partId: segments[1] };
    }
    return { componentId: segments[0] || "", partId: null };
  }
  return { componentId: value, partId: null };
}

function getFilteredComponents() {
  const text = filters.text.value.trim().toLowerCase();
  const category = filters.category.value;
  const valueFilter = filters.value.value.trim().toLowerCase();
  const packageFilter = filters.packageName.value.trim().toLowerCase();
  const manufacturerFilter = filters.manufacturer.value.trim().toLowerCase();
  const organizerFilter = filters.organizer.value ? Number(filters.organizer.value) : null;
  const lowStockOnly = filters.lowStock.checked;

  return components
    .filter((item) => {
      const parts = item.parts || [];
      if (category && !parts.some((p) => p.category === category)) return false;
      if (organizerFilter && item.organizer !== organizerFilter) return false;
      if (lowStockOnly && !isLowStock(item)) return false;
      if (valueFilter && !parts.some((p) => matchesDelimitedValues(p.value, valueFilter))) return false;
      if (packageFilter && !parts.some((p) => p.packageName.toLowerCase().includes(packageFilter))) return false;
      if (manufacturerFilter && !parts.some((p) => p.manufacturer.toLowerCase().includes(manufacturerFilter))) {
        return false;
      }
      if (text) {
        const haystack = [
          item.name,
          ...parts.flatMap((p) => [
            p.name,
            p.value,
            p.mpn,
            p.packageName,
            p.manufacturer,
            p.note,
            p.category,
          ]),
          getOrganizerLabel(item.organizer),
          `${item.row}-${item.col}`,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

function flattenComponentsForTable(items) {
  const rows = [];
  items.forEach((item) => {
    const parts = item.parts || [];
    parts.forEach((part, idx) => {
      rows.push({
        component: item,
        part,
        partIndex: idx,
        partCount: parts.length,
      });
    });
  });
  return rows;
}

function renderTable(items) {
  const flat = flattenComponentsForTable(items);
  resultCount.textContent = `Nalezeno: ${flat.length} radku (${items.length} supliku)`;
  renderCriticalSummary();

  if (flat.length === 0) {
    const tmpl = document.getElementById("empty-state-template");
    tableBody.innerHTML = tmpl.innerHTML;
    return;
  }

  tableBody.innerHTML = flat
    .map(({ component: item, part, partIndex, partCount }) => {
      const links = [
        part.datasheetUrl ? `<a href="${escapeHtml(part.datasheetUrl)}" target="_blank" rel="noreferrer">Datasheet</a>` : "",
        part.ecadUrl ? `<a href="${escapeHtml(part.ecadUrl)}" target="_blank" rel="noreferrer">ECAD</a>` : "",
        renderShopSearchLinksHtml(part),
      ]
        .filter((chunk) => chunk && chunk !== `<span class="muted">—</span>`)
        .join(" | ") || "-";

      const lowStock = part.quantity <= part.criticalQuantity;
      const multiTag =
        partCount > 1
          ? ` <span class="table-part-tag">(druh ${partIndex + 1}/${partCount} v supliku)</span>`
          : "";

      return `
        <tr class="${lowStock ? "low-stock" : ""}">
          <td>${escapeHtml(part.name)}${multiTag}</td>
          <td>${labelForCategory(part.category)}</td>
          <td>${escapeHtml(part.value || "-")}</td>
          <td>${escapeHtml(part.packageName || "-")}</td>
          <td>${escapeHtml(part.manufacturer || "-")}</td>
          <td>${part.quantity}</td>
          <td class="critical-cell ${lowStock ? "alert" : ""}">${part.criticalQuantity}${lowStock ? " (pod limitem)" : ""}</td>
          <td>${escapeHtml(getOrganizerLabel(item.organizer))}, R${item.row} S${item.col}</td>
          <td>${links}</td>
          <td class="actions-cell">
            <div class="table-action-group">
              <button data-action="highlight" data-id="${item.id}" data-part-id="${part.id}">Zvyraznit</button>
              <button data-action="decrement" data-id="${item.id}" data-part-id="${part.id}" class="secondary">-1</button>
              <button data-action="issue" data-id="${item.id}" data-part-id="${part.id}" class="secondary">Vyskladnit...</button>
              <button data-action="increment" data-id="${item.id}" data-part-id="${part.id}" class="secondary">+1</button>
              <button data-action="show-qr" data-id="${item.id}" data-part-id="${part.id}" class="secondary">QR</button>
              <button data-action="edit" data-id="${item.id}" class="secondary">Upravit suplik</button>
              <button data-action="delete" data-id="${item.id}" class="secondary">Smazat suplik</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tableBody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", onTableAction);
  });
}

function renderCriticalSummary() {
  const lowStockCount = components.filter((item) => isLowStock(item)).length;
  if (lowStockCount === 0) {
    criticalSummary.textContent = "Vsechny soucastky jsou nad kritickym mnozstvim.";
    criticalSummary.classList.remove("alert");
    return;
  }

  criticalSummary.textContent = `Pozor: ${lowStockCount} polozek je na nebo pod kritickym mnozstvim.`;
  criticalSummary.classList.add("alert");
}

function onTableAction(event) {
  const button = event.currentTarget;
  const id = button.dataset.id;
  const partId = button.dataset.partId;
  const action = button.dataset.action;
  const item = components.find((record) => record.id === id);
  if (!item) return;

  if (action === "highlight") {
    highlightedId = id;
    selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
    ensureSelectedOrganizer(item.organizer);
    renderGrid();
    return;
  }

  if (action === "decrement") {
    updatePartQuantity(id, partId, -1);
    return;
  }

  if (action === "increment") {
    updatePartQuantity(id, partId, 1);
    return;
  }

  if (action === "issue") {
    const { part } = getPartByIds(id, partId);
    const partName = part?.name || item.name;
    const answer = prompt(`Kolik kusu vyskladnit z "${partName}"?`, "1");
    if (answer === null) return;
    const amount = toNonNegativeInt(answer);
    if (amount <= 0) return;
    updatePartQuantity(id, partId, -amount);
    return;
  }

  if (action === "edit") {
    fillForm(item);
    highlightedId = id;
    selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
    ensureSelectedOrganizer(item.organizer);
    renderGrid();
    return;
  }

  if (action === "show-qr") {
    qrComponentSelect.value = encodeQrSelection(id, partId);
    selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
    renderComponentQr(id, partId);
    ensureSelectedOrganizer(item.organizer);
    renderGrid();
    return;
  }

  if (action === "delete") {
    const ok = confirm(`Smazat cely suplik (${item.parts?.length || 0} druhu) vcetne vsech polozek?`);
    if (!ok) return;
    const totalQty = getPartStockQuantitySum(item);
    addMovement({
      timestamp: new Date().toISOString(),
      action: "delete",
      componentId: item.id,
      componentName: item.name,
      delta: -totalQty,
      afterQuantity: 0,
      organizer: item.organizer,
      row: item.row,
      col: item.col,
      locationText: `${getOrganizerLabel(item.organizer)}, R${item.row} S${item.col}`,
      note: "Smazani supliku",
    });
    components = components.filter((record) => record.id !== id);
    saveComponents();
    if (highlightedId === id) highlightedId = null;
    renderAll();
  }
}

function printFilteredList() {
  const items = getFilteredComponents();
  const flat = flattenComponentsForTable(items);
  if (flat.length === 0) {
    alert("Ve filtru nejsou zadne polozky k tisku.");
    return;
  }

  const rows = flat
    .map(({ component: item, part }) => {
      const criticalState = part.quantity <= part.criticalQuantity ? "Pod limitem" : "OK";
      return `
        <tr>
          <td>${escapeHtml(part.name)}</td>
          <td>${escapeHtml(part.value || "-")}</td>
          <td>${escapeHtml(part.packageName || "-")}</td>
          <td>${escapeHtml(part.manufacturer || "-")}</td>
          <td>${part.quantity}</td>
          <td>${part.criticalQuantity}</td>
          <td>${criticalState}</td>
          <td>${escapeHtml(getOrganizerLabel(item.organizer))}, R${item.row} S${item.col}</td>
        </tr>
      `;
    })
    .join("");

  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) {
    alert("Nepodarilo se otevrit tiskove okno. Zkontroluj blokaci popup oken.");
    return;
  }

  const title = filters.lowStock.checked
    ? "Tisk podkritickych soucastek"
    : "Tisk vyfiltrovanych soucastek";

  popup.document.write(`
    <!doctype html>
    <html lang="cs">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { margin-top: 0; font-size: 20px; }
          p { color: #555; margin: 6px 0 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #bbb; padding: 6px; text-align: left; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Vytvoreno: ${new Date().toLocaleString("cs-CZ")} | Pocet radku: ${flat.length}</p>
        <table>
          <thead>
            <tr>
              <th>Nazev</th>
              <th>Hodnota</th>
              <th>Pouzdro</th>
              <th>Vyrobce</th>
              <th>Mnozstvi</th>
              <th>Kriticke</th>
              <th>Stav</th>
              <th>Umisteni</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function updatePartQuantity(componentId, partId, delta) {
  const { component, part, partIndex } = getPartByIds(componentId, partId);
  if (!component || !part || partIndex < 0) return;

  const before = part.quantity;
  const after = Math.max(0, before + delta);
  const appliedDelta = after - before;
  if (appliedDelta === 0) return;

  const nextParts = component.parts.map((p, i) =>
    i === partIndex ? { ...p, quantity: after } : p
  );
  const nextComponent = { ...component, parts: nextParts };
  syncItemMetaFromParts(nextComponent);

  components = components.map((item) => (item.id === componentId ? nextComponent : item));

  addMovement({
    timestamp: new Date().toISOString(),
    action: appliedDelta > 0 ? "stock_in" : "stock_out",
    componentId: component.id,
    componentName: part.name,
    delta: appliedDelta,
    afterQuantity: after,
    organizer: component.organizer,
    row: component.row,
    col: component.col,
    locationText: `${getOrganizerLabel(component.organizer)}, R${component.row} S${component.col}`,
    note: appliedDelta > 0 ? "Navyseni mnozstvi (druh v supliku)" : "Vyskladneni (druh v supliku)",
  });

  saveComponents();
  renderAll();
}

function updateQuantity(id, delta) {
  const target = components.find((item) => item.id === id);
  if (!target || !target.parts || target.parts.length === 0) return;
  updatePartQuantity(id, target.parts[0].id, delta);
}

function fillForm(item) {
  const normalized = normalizeComponent(item);
  fields.id.value = normalized.id;
  fields.organizer.value = String(normalized.organizer);
  applyOrganizerLimitsToComponentForm(normalized.organizer);
  fields.row.value = String(normalized.row);
  fields.col.value = String(normalized.col);
  renderPartsEditor(normalized.parts);
  submitBtn.textContent = "Ulozit zmeny";
}

async function onCompareBom() {
  const file = bomFile.files && bomFile.files[0];
  if (!file) {
    alert("Nejdriv vyber BOM soubor (CSV/TSV/TXT).");
    return;
  }

  try {
    const text = await file.text();
    bomRows = parseBomText(text);
    refreshBomResults();
    renderBomResults();
  } catch (error) {
    alert(`Nepodarilo se nacist BOM: ${error.message}`);
  }
}

function clearBomResults() {
  bomRows = [];
  bomResults = [];
  if (bomFile) bomFile.value = "";
  renderBomResults();
}

function refreshBomResults() {
  if (bomRows.length === 0) {
    bomResults = [];
    return;
  }

  bomResults = bomRows.map((entry) => {
    const stockQty = bomStockQtyForEntry(entry);
    const { componentId } = findBomFirstMatchIds(entry);
    const shortage = Math.max(0, entry.requiredQty - stockQty);
    return {
      ...entry,
      stockQty,
      shortage,
      matchedComponentId: componentId || "",
    };
  });
}

function renderBomResults() {
  if (bomRows.length === 0) {
    bomSummary.textContent = "Vysledky BOM zatim nejsou nactene.";
    bomSummary.classList.remove("alert");
    bomTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Zatim nejsou nacteny zadne BOM vysledky.</td>
      </tr>
    `;
    return;
  }

  const missingCount = bomResults.filter((item) => item.shortage > 0).length;
  if (missingCount > 0) {
    bomSummary.textContent = `BOM porovnani: ${missingCount} polozek nema dostatecne skladove mnozstvi.`;
    bomSummary.classList.add("alert");
  } else {
    bomSummary.textContent = "BOM porovnani: vsechny polozky jsou skladem v dostatecnem mnozstvi.";
    bomSummary.classList.remove("alert");
  }

  bomTableBody.innerHTML = bomResults
    .map((item) => {
      const statusClass = item.shortage === 0 ? "status-ok" : "status-missing";
      const locateButton = item.matchedComponentId
        ? `<button data-action="bom-highlight" data-id="${item.matchedComponentId}" class="secondary">Zvyraznit</button>`
        : "-";
      return `
        <tr>
          <td>${escapeHtml(item.label)}</td>
          <td>${item.requiredQty}</td>
          <td>${item.stockQty}</td>
          <td class="${statusClass}">${item.shortage === 0 ? "OK" : `Chybi ${item.shortage}`}</td>
          <td>${locateButton}</td>
        </tr>
      `;
    })
    .join("");

  bomTableBody.querySelectorAll("button[data-action='bom-highlight']").forEach((btn) => {
    btn.addEventListener("click", onBomTableAction);
  });
}

function onBomTableAction(event) {
  const id = event.currentTarget.dataset.id;
  if (!id) return;
  const item = components.find((record) => record.id === id);
  if (!item) return;
  highlightedId = id;
  selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
  ensureSelectedOrganizer(item.organizer);
  renderGrid();
}

function parseBomText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Soubor BOM nema hlavicku a data.");
  }

  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const headers = rows[0].map((value) => normalizeHeader(value));

  const getIdx = (aliases) => findHeaderIndex(headers, aliases);

  const idx = {
    name: getIdx(["name", "component", "description", "comment", "item", "part"]),
    value: getIdx(["value"]),
    packageName: getIdx(["package", "footprint", "case", "housing"]),
    manufacturer: getIdx(["manufacturer", "mfr", "manuf", "vendor"]),
    qty: getIdx(["quantity", "qty", "qnty", "amount", "count"]),
    designators: getIdx(["designator", "designators", "references", "reference", "refdes"]),
    mpn: getIdx(["mpn", "manufacturer part number", "part number", "pn", "ordercode", "order code"]),
  };

  const rawItems = rows
    .slice(1)
    .map((row) => {
      const name = readCell(row, idx.name);
      const value = readCell(row, idx.value);
      const packageName = readCell(row, idx.packageName);
      const manufacturer = readCell(row, idx.manufacturer);
      const mpn = readCell(row, idx.mpn);
      const requiredQty = parseBomQty(readCell(row, idx.qty), readCell(row, idx.designators));
      const label = [name, value, packageName, manufacturer, mpn].filter(Boolean).join(" | ") || "Neznama BOM polozka";

      return {
        name,
        value,
        packageName,
        manufacturer,
        mpn,
        label,
        requiredQty,
      };
    })
    .filter((entry) => entry.requiredQty > 0);

  const grouped = new Map();
  rawItems.forEach((entry) => {
    const key = createBomGroupingKey(entry);
    const existing = grouped.get(key);
    if (existing) {
      existing.requiredQty += entry.requiredQty;
    } else {
      grouped.set(key, { ...entry });
    }
  });

  return Array.from(grouped.values());
}

function parseBomQty(qtyCell, designatorsCell) {
  const fromQty = Number(String(qtyCell || "").replace(",", "."));
  if (Number.isFinite(fromQty) && fromQty > 0) {
    return Math.round(fromQty);
  }

  const refs = String(designatorsCell || "").trim();
  if (!refs) return 1;

  const refParts = refs
    .split(/[,\s;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return refParts.length > 0 ? refParts.length : 1;
}

function detectDelimiter(headerLine) {
  const delimiters = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;

  delimiters.forEach((delimiter) => {
    const count = (headerLine.match(new RegExp(escapeRegex(delimiter), "g")) || []).length;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  });

  return best;
}

function parseDelimitedLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextIsQuote = line[i + 1] === '"';
      if (inQuotes && nextIsQuote) {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function findHeaderIndex(headers, aliases) {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  return headers.findIndex((header) => normalizedAliases.includes(header));
}

function readCell(row, index) {
  if (index < 0 || index >= row.length) return "";
  return String(row[index] || "").trim();
}

function createBomGroupingKey(entry) {
  const parts = [
    normalizeText(entry.mpn),
    normalizeText(entry.name),
    normalizeText(entry.value),
    normalizeText(entry.packageName),
    normalizeText(entry.manufacturer),
  ];
  return parts.join("|");
}

function normalizeComponent(item) {
  const id = String(item.id || "").trim();
  const organizer = Number(item.organizer || 1);
  const row = Number(item.row || 1);
  const col = Number(item.col || 1);
  const createdAt = item.createdAt || new Date().toISOString();

  const rawParts = Array.isArray(item.parts) ? item.parts : [];
  let parts = rawParts
    .map((p, idx) => normalizePartLine(p, id ? `${id}-part-${idx}` : `part-${idx}`))
    .filter((p) => p.name || p.value || p.packageName || p.manufacturer || p.quantity > 0);

  if (parts.length === 0) {
    parts = [
      normalizePartLine(
        {
          id: id ? `${id}-part0` : undefined,
          name: item.name,
          category: item.category,
          value: item.value,
          packageName: item.packageName,
          manufacturer: item.manufacturer,
          mpn: item.mpn || "",
          quantity: item.quantity,
          criticalQuantity: item.criticalQuantity,
          datasheetUrl: item.datasheetUrl,
          ecadUrl: item.ecadUrl,
          note: item.note,
        },
        id ? `${id}-part0` : newPartId()
      ),
    ];
  }

  const seen = new Set();
  parts = parts.map((p, idx) => {
    let pid = p.id;
    if (seen.has(pid)) {
      pid = `${id || "new"}-p-${idx}-${newPartId()}`;
    }
    seen.add(pid);
    return { ...p, id: pid };
  });

  const merged = {
    id,
    organizer,
    row,
    col,
    createdAt,
    parts,
    name: "",
    category: "",
    value: "",
    packageName: "",
    manufacturer: "",
    quantity: 0,
    criticalQuantity: 0,
    datasheetUrl: "",
    ecadUrl: "",
    note: "",
  };
  syncItemMetaFromParts(merged);
  return merged;
}

function normalizeMovement(item) {
  return {
    timestamp: item.timestamp || new Date().toISOString(),
    action: String(item.action || "unknown"),
    componentId: String(item.componentId || ""),
    componentName: String(item.componentName || ""),
    delta: Number(item.delta || 0),
    afterQuantity: item.afterQuantity === null || item.afterQuantity === undefined
      ? null
      : toNonNegativeInt(item.afterQuantity),
    organizer: item.organizer === null || item.organizer === undefined ? null : Number(item.organizer),
    row: item.row === null || item.row === undefined ? null : Number(item.row),
    col: item.col === null || item.col === undefined ? null : Number(item.col),
    locationText: String(item.locationText || ""),
    note: String(item.note || ""),
  };
}

function labelForMovementAction(action) {
  const labels = {
    stock_in: "Zaskladneni",
    stock_out: "Vyskladneni",
    edit: "Uprava",
    delete: "Smazani",
    import: "Import",
    unknown: "Jine",
  };
  return labels[action] || action;
}

function formatMovementDelta(delta) {
  if (!Number.isFinite(delta) || delta === 0) return "0";
  return delta > 0 ? `+${delta}` : String(delta);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("cs-CZ");
}

function normalizeHeader(value) {
  return normalizeText(value).replaceAll("_", " ");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, " ");
}

function splitDelimitedValues(value) {
  return String(value || "")
    .split(/[;,\n]+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function matchesDelimitedValues(left, right) {
  const leftTokens = splitDelimitedValues(left);
  const rightTokens = splitDelimitedValues(right);
  if (rightTokens.length === 0) return true;

  if (leftTokens.length > 0) {
    return rightTokens.every((token) =>
      leftTokens.some((candidate) =>
        candidate === token || candidate.includes(token) || token.includes(candidate)
      )
    );
  }

  const leftText = normalizeText(left);
  return rightTokens.every((token) => leftText.includes(token));
}

function matchesToken(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function escapeRegex(value) {
  return String(value).replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureSelectedOrganizer(organizer) {
  const exists = findOrganizer(organizer);
  if (exists) {
    visualOrganizer.value = String(organizer);
  } else if (organizers.length > 0) {
    visualOrganizer.value = String(organizers[0].number);
  }
}

function onDrawerClick(event) {
  const element = event.currentTarget;
  const organizer = Number(element.dataset.organizer);
  const row = Number(element.dataset.row);
  const col = Number(element.dataset.col);
  selectedDrawer = { organizer, row, col };
  if (activeViewMode === "stocking") {
    autofillStockingPosition(organizer, row, col);
  }
  renderGrid();
}

function autofillStockingPosition(organizer, row, col) {
  fields.organizer.value = String(organizer);
  applyOrganizerLimitsToComponentForm(organizer);
  fields.row.value = String(row);
  fields.col.value = String(col);
}

function getComponentAtPosition(organizer, row, col) {
  return components.find((item) =>
    item.organizer === organizer &&
    item.row === row &&
    item.col === col
  );
}

function renderDrawerDetailPanel() {
  if (!selectedDrawer) {
    drawerDetailPanel.classList.add("muted");
    drawerDetailPanel.textContent = "Klikni na suplik pro zobrazeni detailu.";
    return;
  }

  const { organizer, row, col } = selectedDrawer;
  const item = getComponentAtPosition(organizer, row, col);
  const title = `${getOrganizerLabel(organizer)}, R${row} S${col}`;

  if (!item) {
    drawerDetailPanel.classList.remove("muted");
    drawerDetailPanel.innerHTML = `
      <div class="drawer-detail-title">Suplik: ${escapeHtml(title)}</div>
      <div>Suplik je prazdny.</div>
      <div class="drawer-detail-actions">
        <button type="button" data-action="drawer-add">Pridat soucastku sem</button>
      </div>
    `;
    bindDrawerDetailActions();
    return;
  }

  const lowStockText = isLowStock(item) ? "Pod kritickym limitem (alespon jeden druh)" : "OK";

  const parts = item.parts || [];
  const partsBlock =
    parts.length <= 1
      ? ""
      : `<div class="drawer-detail-parts"><strong>Druhy v supliku (${parts.length})</strong>${parts
          .map((part, idx) => {
            const pLow = part.quantity <= part.criticalQuantity;
            const plinks = [
              part.datasheetUrl
                ? `<a href="${escapeHtml(part.datasheetUrl)}" target="_blank" rel="noreferrer">Datasheet</a>`
                : "",
              part.ecadUrl ? `<a href="${escapeHtml(part.ecadUrl)}" target="_blank" rel="noreferrer">ECAD</a>` : "",
            ]
              .filter(Boolean)
              .join(" | ") || "-";
            return `
            <div class="drawer-detail-part">
              <div><strong>${idx + 1}.</strong> ${escapeHtml(part.name)} — ${part.quantity} ks (krit. ${part.criticalQuantity})${pLow ? " <em>pod limitem</em>" : ""}</div>
              <div>${escapeHtml(part.value || "-")} | ${escapeHtml(part.packageName || "-")} | ${escapeHtml(part.manufacturer || "-")}${part.mpn ? ` | MPN: ${escapeHtml(part.mpn)}` : ""}</div>
              <div>Odkazy: ${plinks} | Nakup: ${renderShopSearchLinksHtml(part)}</div>
              <div class="part-actions">
                <button type="button" class="secondary" data-action="drawer-dec" data-id="${item.id}" data-part-id="${part.id}">-1</button>
                <button type="button" class="secondary" data-action="drawer-inc" data-id="${item.id}" data-part-id="${part.id}">+1</button>
                <button type="button" class="secondary" data-action="drawer-qr-part" data-id="${item.id}" data-part-id="${part.id}">QR</button>
              </div>
            </div>`;
          })
          .join("")}</div>`;

  const primary = parts[0];
  const links = [
    primary?.datasheetUrl ? `<a href="${escapeHtml(primary.datasheetUrl)}" target="_blank" rel="noreferrer">Datasheet</a>` : "",
    primary?.ecadUrl ? `<a href="${escapeHtml(primary.ecadUrl)}" target="_blank" rel="noreferrer">ECAD</a>` : "",
  ]
    .filter(Boolean)
    .join(" | ") || "-";

  drawerDetailPanel.classList.remove("muted");
  drawerDetailPanel.innerHTML = `
    <div class="drawer-detail-title">${escapeHtml(item.name)}</div>
    <div>Umisteni: ${escapeHtml(title)}</div>
    <div>Celkem ks v supliku: ${getPartStockQuantitySum(item)} | Stav: ${lowStockText}</div>
    <div>Hodnota / souhrn: ${escapeHtml(item.value || "-")} | Pouzdro: ${escapeHtml(item.packageName || "-")} | Vyrobce: ${escapeHtml(item.manufacturer || "-")}${primary?.mpn ? ` | MPN: ${escapeHtml(primary.mpn)}` : ""}</div>
    <div>Odkazy (1. druh): ${links}${primary ? ` | Nakup: ${renderShopSearchLinksHtml(primary)}` : ""}</div>
    ${partsBlock}
    <div class="drawer-detail-actions">
      <button type="button" data-action="drawer-highlight" data-id="${item.id}">Zvyraznit</button>
      <button type="button" data-action="drawer-edit" data-id="${item.id}" class="secondary">Upravit</button>
      <button type="button" data-action="drawer-qr" data-id="${item.id}" class="secondary">QR (1. druh)</button>
    </div>
  `;
  bindDrawerDetailActions();
}

function bindDrawerDetailActions() {
  drawerDetailPanel.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", onDrawerDetailAction);
  });
}

function onDrawerDetailAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;
  const partId = event.currentTarget.dataset.partId;

  if (action === "drawer-add") {
    prepareFormForSelectedDrawer();
    return;
  }

  const item = components.find((component) => component.id === id);
  if (!item) return;

  if (action === "drawer-highlight") {
    highlightedId = item.id;
    ensureSelectedOrganizer(item.organizer);
    selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
    renderGrid();
    return;
  }

  if (action === "drawer-edit") {
    fillForm(item);
    highlightedId = item.id;
    ensureSelectedOrganizer(item.organizer);
    selectedDrawer = { organizer: item.organizer, row: item.row, col: item.col };
    renderGrid();
    return;
  }

  if (action === "drawer-qr") {
    const firstId = item.parts?.[0]?.id;
    if (firstId) {
      qrComponentSelect.value = encodeQrSelection(item.id, firstId);
      renderComponentQr(item.id, firstId);
    }
    return;
  }

  if (action === "drawer-qr-part" && partId) {
    qrComponentSelect.value = encodeQrSelection(item.id, partId);
    renderComponentQr(item.id, partId);
    return;
  }

  if (action === "drawer-dec" && partId) {
    updatePartQuantity(id, partId, -1);
    return;
  }

  if (action === "drawer-inc" && partId) {
    updatePartQuantity(id, partId, 1);
    return;
  }
}

function prepareFormForSelectedDrawer() {
  if (!selectedDrawer) return;
  const { organizer, row, col } = selectedDrawer;
  resetForm(false);
  autofillStockingPosition(organizer, row, col);
  focusFirstPartName();
}

function renderGrid() {
  if (organizers.length === 0) {
    visualGrid.innerHTML = `<div class="muted">Nejsou zalozene zadne poradace.</div>`;
    drawerDetailPanel.textContent = "Klikni na suplik pro zobrazeni detailu.";
    return;
  }

  const organizer = Number(visualOrganizer.value || organizers[0].number);
  const organizerConfig = findOrganizer(organizer);
  if (!organizerConfig) {
    visualGrid.innerHTML = `<div class="muted">Vybrany poradac neexistuje.</div>`;
    drawerDetailPanel.textContent = "Klikni na suplik pro zobrazeni detailu.";
    return;
  }
  const inOrganizer = components.filter((item) => item.organizer === organizer);
  const highlighted = inOrganizer.find((item) => item.id === highlightedId);

  const rowsMarkup = [];
  for (let row = 1; row <= organizerConfig.rows; row += 1) {
    const slotsInRow = getSlotsForRow(organizerConfig, row);
    const cells = [];
    for (let col = 1; col <= slotsInRow; col += 1) {
      const item = inOrganizer.find((record) => record.row === row && record.col === col);
      const isHighlighted = highlighted && highlighted.row === row && highlighted.col === col;
      const lowStock = item ? isLowStock(item) : false;
      const isSelected = selectedDrawer &&
        selectedDrawer.organizer === organizer &&
        selectedDrawer.row === row &&
        selectedDrawer.col === col;

      let drawerLabel = "-";
      if (item) {
        const parts = item.parts || [];
        if (parts.length === 1) {
          drawerLabel = parts[0].name;
        } else if (parts.length > 1) {
          drawerLabel = `${parts.length} druhu`;
        } else {
          drawerLabel = item.name;
        }
      }

      cells.push(`
        <div
          class="drawer ${item ? "filled" : ""} ${lowStock ? "low-stock" : ""} ${isHighlighted ? "highlight" : ""} ${isSelected ? "selected" : ""}"
          data-organizer="${organizer}"
          data-row="${row}"
          data-col="${col}"
        >
          <div class="drawer-position">R${row} S${col}</div>
          <div class="drawer-window"></div>
          <div class="drawer-label">${item ? escapeHtml(drawerLabel) : "-"}</div>
          <div class="drawer-handle"></div>
        </div>
      `);
    }
    rowsMarkup.push(`
      <div class="drawer-row" style="grid-template-columns: repeat(${Math.max(1, slotsInRow)}, minmax(60px, 1fr));">
        ${cells.join("")}
      </div>
    `);
  }
  visualGrid.innerHTML = rowsMarkup.join("");
  visualGrid.querySelectorAll(".drawer").forEach((drawer) => {
    drawer.addEventListener("click", onDrawerClick);
  });
  renderDrawerDetailPanel();
}

function isLowStock(item) {
  const parts = item.parts || [];
  if (parts.length === 0) {
    return item.quantity <= item.criticalQuantity;
  }
  return parts.some((p) => p.quantity <= p.criticalQuantity);
}

function toNonNegativeInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function formatDateForFilename(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function labelForCategory(value) {
  const labels = {
    passive: "Passive",
    active: "Active",
    connector: "Connector",
    other: "Jine",
  };
  return labels[value] || value || "-";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
