const STORAGE_COMPONENTS_KEY = "sklad_soucastek_v1";
const STORAGE_ORGANIZERS_KEY = "sklad_organizery_v1";

const form = document.getElementById("component-form");
const resetBtn = document.getElementById("reset-btn");
const submitBtn = document.getElementById("submit-btn");
const printFilteredBtn = document.getElementById("print-filtered-btn");
const tableBody = document.getElementById("component-table-body");
const resultCount = document.getElementById("result-count");
const criticalSummary = document.getElementById("critical-summary");
const visualTitle = document.getElementById("visual-title");
const visualGrid = document.getElementById("visual-grid");
const visualOrganizer = document.getElementById("visual-organizer");
const filterOrganizer = document.getElementById("filter-organizer");
const bomFile = document.getElementById("bom-file");
const compareBomBtn = document.getElementById("compare-bom-btn");
const clearBomBtn = document.getElementById("clear-bom-btn");
const bomSummary = document.getElementById("bom-summary");
const bomTableBody = document.getElementById("bom-table-body");

const organizerForm = document.getElementById("organizer-form");
const organizerId = document.getElementById("organizer-id");
const organizerNumber = document.getElementById("organizer-number");
const organizerName = document.getElementById("organizer-name");
const organizerRows = document.getElementById("organizer-rows");
const organizerCols = document.getElementById("organizer-cols");
const organizerSubmitBtn = document.getElementById("organizer-submit-btn");
const organizerResetBtn = document.getElementById("organizer-reset-btn");
const organizerTableBody = document.getElementById("organizer-table-body");

const fields = {
  id: document.getElementById("component-id"),
  name: document.getElementById("name"),
  category: document.getElementById("category"),
  value: document.getElementById("value"),
  packageName: document.getElementById("package"),
  manufacturer: document.getElementById("manufacturer"),
  quantity: document.getElementById("quantity"),
  criticalQuantity: document.getElementById("criticalQuantity"),
  organizer: document.getElementById("organizer"),
  row: document.getElementById("row"),
  col: document.getElementById("col"),
  rowLabel: document.getElementById("row-label"),
  colLabel: document.getElementById("col-label"),
  datasheetUrl: document.getElementById("datasheetUrl"),
  ecadUrl: document.getElementById("ecadUrl"),
  note: document.getElementById("note"),
};

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
let highlightedId = null;
let bomRows = [];
let bomResults = [];

bootstrap();

function bootstrap() {
  form.addEventListener("submit", onSubmit);
  resetBtn.addEventListener("click", resetForm);
  fields.organizer.addEventListener("change", onComponentOrganizerChange);
  visualOrganizer.addEventListener("change", renderAll);
  printFilteredBtn.addEventListener("click", printFilteredList);
  compareBomBtn.addEventListener("click", onCompareBom);
  clearBomBtn.addEventListener("click", clearBomResults);

  organizerForm.addEventListener("submit", onOrganizerSubmit);
  organizerResetBtn.addEventListener("click", resetOrganizerForm);

  Object.values(filters).forEach((input) => {
    input.addEventListener("input", renderAll);
    input.addEventListener("change", renderAll);
  });

  ensureAtLeastOneOrganizer();
  renderAll();
}

function onSubmit(event) {
  event.preventDefault();

  const payload = readForm();
  const selectedOrganizer = findOrganizer(payload.organizer);
  if (!selectedOrganizer) {
    alert("Vyber platny poradac.");
    return;
  }

  if (
    payload.row < 1 ||
    payload.col < 1 ||
    payload.row > selectedOrganizer.rows ||
    payload.col > selectedOrganizer.cols
  ) {
    alert(`Pozice musi byt v rozsahu R1-${selectedOrganizer.rows}, S1-${selectedOrganizer.cols}.`);
    return;
  }

  const existingAtLocation = components.find((item) =>
    item.organizer === payload.organizer &&
    item.row === payload.row &&
    item.col === payload.col &&
    item.id !== payload.id
  );

  if (existingAtLocation) {
    alert("Tento suplik je uz obsazeny jinou soucastkou.");
    return;
  }

  if (payload.id) {
    const original = components.find((item) => item.id === payload.id);
    payload.createdAt = original?.createdAt || new Date().toISOString();
    components = components.map((item) => (item.id === payload.id ? payload : item));
  } else {
    payload.id = crypto.randomUUID();
    payload.createdAt = new Date().toISOString();
    components.push(payload);
  }

  saveComponents();
  highlightedId = payload.id;
  ensureSelectedOrganizer(payload.organizer);
  resetForm(false);
  renderAll();
}

function readForm() {
  return {
    id: fields.id.value.trim(),
    name: fields.name.value.trim(),
    category: fields.category.value,
    value: fields.value.value.trim(),
    packageName: fields.packageName.value.trim(),
    manufacturer: fields.manufacturer.value.trim(),
    quantity: toNonNegativeInt(fields.quantity.value),
    criticalQuantity: toNonNegativeInt(fields.criticalQuantity.value),
    organizer: Number(fields.organizer.value),
    row: Number(fields.row.value),
    col: Number(fields.col.value),
    datasheetUrl: fields.datasheetUrl.value.trim(),
    ecadUrl: fields.ecadUrl.value.trim(),
    note: fields.note.value.trim(),
    createdAt: new Date().toISOString(),
  };
}

function onComponentOrganizerChange() {
  applyOrganizerLimitsToComponentForm(Number(fields.organizer.value));
}

function resetForm(clearHighlight = true) {
  form.reset();
  fields.id.value = "";
  fields.quantity.value = 1;
  fields.criticalQuantity.value = 0;
  submitBtn.textContent = "Ulozit soucastku";
  setDefaultOrganizerInForm();
  applyOrganizerLimitsToComponentForm(Number(fields.organizer.value));
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
  const editingNumber = organizerId.value ? Number(organizerId.value) : null;

  if (number <= 0) {
    alert("Cislo poradace musi byt alespon 1.");
    return;
  }
  if (rows <= 0 || cols <= 0) {
    alert("Format poradace musi mit alespon 1 radek a 1 sloupec.");
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
      (component) => component.row > rows || component.col > cols
    );
    if (outsideBounds) {
      alert(
        `Format ${rows}x${cols} je moc maly. Soucastka "${outsideBounds.name}" je na pozici R${outsideBounds.row} S${outsideBounds.col}.`
      );
      return;
    }

    organizers = organizers.map((org) =>
      org.number === editingNumber
        ? { number, name: name || `Poradac ${number}`, rows, cols }
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
    return [{ number: 1, name: "Poradac 1", rows: 5, cols: 12 }];
  }
  return numbers
    .sort((a, b) => a - b)
    .map((number) => ({ number, name: `Poradac ${number}`, rows: 5, cols: 12 }));
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
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.number - b.number);
}

function ensureAtLeastOneOrganizer() {
  if (organizers.length === 0) {
    organizers = [{ number: 1, name: "Poradac 1", rows: 5, cols: 12 }];
    saveOrganizers();
  }
}

function saveComponents() {
  localStorage.setItem(STORAGE_COMPONENTS_KEY, JSON.stringify(components));
}

function saveOrganizers() {
  localStorage.setItem(STORAGE_ORGANIZERS_KEY, JSON.stringify(organizers));
}

function findOrganizer(number) {
  return organizers.find((org) => org.number === Number(number));
}

function getOrganizerLabel(number) {
  const org = findOrganizer(number);
  return org ? `${org.number} - ${org.name}` : String(number);
}

function getOrganizerFormat(organizer) {
  return `${organizer.rows} x ${organizer.cols}`;
}

function renderAll() {
  organizers = deduplicateOrganizers(organizers);
  ensureAtLeastOneOrganizer();
  renderOrganizerSelectors();
  renderOrganizerTable();
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
  fields.col.max = String(organizer.cols);
  fields.rowLabel.textContent = `Radek (1-${organizer.rows}) *`;
  fields.colLabel.textContent = `Sloupec (1-${organizer.cols}) *`;

  const currentRow = toNonNegativeInt(fields.row.value);
  const currentCol = toNonNegativeInt(fields.col.value);
  if (currentRow > organizer.rows) {
    fields.row.value = String(organizer.rows);
  }
  if (currentCol > organizer.cols) {
    fields.col.value = String(organizer.cols);
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
      if (category && item.category !== category) return false;
      if (organizerFilter && item.organizer !== organizerFilter) return false;
      if (lowStockOnly && !isLowStock(item)) return false;
      if (valueFilter && !item.value.toLowerCase().includes(valueFilter)) return false;
      if (packageFilter && !item.packageName.toLowerCase().includes(packageFilter)) return false;
      if (manufacturerFilter && !item.manufacturer.toLowerCase().includes(manufacturerFilter)) return false;
      if (text) {
        const haystack = [
          item.name,
          item.value,
          item.packageName,
          item.manufacturer,
          item.note,
          item.category,
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

function renderTable(items) {
  resultCount.textContent = `Nalezeno: ${items.length} soucastek`;
  renderCriticalSummary();

  if (items.length === 0) {
    const tmpl = document.getElementById("empty-state-template");
    tableBody.innerHTML = tmpl.innerHTML;
    return;
  }

  tableBody.innerHTML = items
    .map((item) => {
      const links = [
        item.datasheetUrl ? `<a href="${escapeHtml(item.datasheetUrl)}" target="_blank" rel="noreferrer">Datasheet</a>` : "",
        item.ecadUrl ? `<a href="${escapeHtml(item.ecadUrl)}" target="_blank" rel="noreferrer">ECAD</a>` : "",
      ]
        .filter(Boolean)
        .join(" | ") || "-";

      const lowStock = isLowStock(item);

      return `
        <tr class="${lowStock ? "low-stock" : ""}">
          <td>${escapeHtml(item.name)}</td>
          <td>${labelForCategory(item.category)}</td>
          <td>${escapeHtml(item.value || "-")}</td>
          <td>${escapeHtml(item.packageName || "-")}</td>
          <td>${escapeHtml(item.manufacturer || "-")}</td>
          <td>${item.quantity}</td>
          <td class="critical-cell ${lowStock ? "alert" : ""}">${item.criticalQuantity}${lowStock ? " (pod limitem)" : ""}</td>
          <td>${escapeHtml(getOrganizerLabel(item.organizer))}, R${item.row} S${item.col}</td>
          <td>${links}</td>
          <td class="actions-cell">
            <div class="table-action-group">
              <button data-action="highlight" data-id="${item.id}">Zvyraznit</button>
              <button data-action="decrement" data-id="${item.id}" class="secondary">-1</button>
              <button data-action="issue" data-id="${item.id}" class="secondary">Vyskladnit...</button>
              <button data-action="increment" data-id="${item.id}" class="secondary">+1</button>
              <button data-action="edit" data-id="${item.id}" class="secondary">Upravit</button>
              <button data-action="delete" data-id="${item.id}" class="secondary">Smazat</button>
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
  const action = button.dataset.action;
  const item = components.find((record) => record.id === id);
  if (!item) return;

  if (action === "highlight") {
    highlightedId = id;
    ensureSelectedOrganizer(item.organizer);
    renderGrid();
    return;
  }

  if (action === "decrement") {
    updateQuantity(id, -1);
    return;
  }

  if (action === "increment") {
    updateQuantity(id, 1);
    return;
  }

  if (action === "issue") {
    const answer = prompt(`Kolik kusu vyskladnit z "${item.name}"?`, "1");
    if (answer === null) return;
    const amount = toNonNegativeInt(answer);
    if (amount <= 0) return;
    updateQuantity(id, -amount);
    return;
  }

  if (action === "edit") {
    fillForm(item);
    highlightedId = id;
    ensureSelectedOrganizer(item.organizer);
    renderGrid();
    return;
  }

  if (action === "delete") {
    const ok = confirm(`Smazat soucastku "${item.name}"?`);
    if (!ok) return;
    components = components.filter((record) => record.id !== id);
    saveComponents();
    if (highlightedId === id) highlightedId = null;
    renderAll();
  }
}

function printFilteredList() {
  const items = getFilteredComponents();
  if (items.length === 0) {
    alert("Ve filtru nejsou zadne polozky k tisku.");
    return;
  }

  const rows = items
    .map((item) => {
      const criticalState = isLowStock(item) ? "Pod limitem" : "OK";
      return `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.value || "-")}</td>
          <td>${escapeHtml(item.packageName || "-")}</td>
          <td>${escapeHtml(item.manufacturer || "-")}</td>
          <td>${item.quantity}</td>
          <td>${item.criticalQuantity}</td>
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
        <p>Vytvoreno: ${new Date().toLocaleString("cs-CZ")} | Pocet polozek: ${items.length}</p>
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

function updateQuantity(id, delta) {
  components = components.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      quantity: Math.max(0, item.quantity + delta),
    };
  });
  saveComponents();
  renderAll();
}

function fillForm(item) {
  fields.id.value = item.id;
  fields.name.value = item.name;
  fields.category.value = item.category;
  fields.value.value = item.value;
  fields.packageName.value = item.packageName;
  fields.manufacturer.value = item.manufacturer;
  fields.quantity.value = item.quantity;
  fields.criticalQuantity.value = item.criticalQuantity;
  fields.organizer.value = String(item.organizer);
  applyOrganizerLimitsToComponentForm(item.organizer);
  fields.row.value = item.row;
  fields.col.value = item.col;
  fields.datasheetUrl.value = item.datasheetUrl;
  fields.ecadUrl.value = item.ecadUrl;
  fields.note.value = item.note;
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
    const matching = components.filter((item) => componentMatchesBom(item, entry));
    const stockQty = matching.reduce((sum, item) => sum + item.quantity, 0);
    const shortage = Math.max(0, entry.requiredQty - stockQty);
    return {
      ...entry,
      stockQty,
      shortage,
      matchedComponentId: matching[0]?.id || "",
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

function componentMatchesBom(component, bomEntry) {
  const hasComparableData = [bomEntry.name, bomEntry.value, bomEntry.packageName, bomEntry.manufacturer, bomEntry.mpn]
    .some((value) => normalizeText(value).length > 0);

  if (!hasComparableData) return false;

  if (bomEntry.value && !matchesToken(component.value, bomEntry.value)) return false;
  if (bomEntry.packageName && !matchesToken(component.packageName, bomEntry.packageName)) return false;
  if (bomEntry.manufacturer && !matchesToken(component.manufacturer, bomEntry.manufacturer)) return false;
  if (bomEntry.name && !matchesToken(component.name, bomEntry.name)) return false;

  if (bomEntry.mpn) {
    const haystack = [component.name, component.value, component.note, component.manufacturer].join(" ");
    if (!matchesToken(haystack, bomEntry.mpn)) return false;
  }

  return true;
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
  return {
    id: String(item.id || ""),
    name: String(item.name || ""),
    category: String(item.category || ""),
    value: String(item.value || ""),
    packageName: String(item.packageName || ""),
    manufacturer: String(item.manufacturer || ""),
    quantity: toNonNegativeInt(item.quantity),
    criticalQuantity: toNonNegativeInt(item.criticalQuantity),
    organizer: Number(item.organizer || 1),
    row: Number(item.row || 1),
    col: Number(item.col || 1),
    datasheetUrl: String(item.datasheetUrl || ""),
    ecadUrl: String(item.ecadUrl || ""),
    note: String(item.note || ""),
    createdAt: item.createdAt || new Date().toISOString(),
  };
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

function renderGrid() {
  if (organizers.length === 0) {
    visualGrid.innerHTML = `<div class="muted">Nejsou zalozene zadne poradace.</div>`;
    return;
  }

  const organizer = Number(visualOrganizer.value || organizers[0].number);
  const organizerConfig = findOrganizer(organizer);
  if (!organizerConfig) {
    visualGrid.innerHTML = `<div class="muted">Vybrany poradac neexistuje.</div>`;
    return;
  }
  const inOrganizer = components.filter((item) => item.organizer === organizer);
  const highlighted = inOrganizer.find((item) => item.id === highlightedId);
  visualGrid.style.gridTemplateColumns = `repeat(${Math.max(1, organizerConfig.cols)}, minmax(60px, 1fr))`;

  const cells = [];
  for (let row = 1; row <= organizerConfig.rows; row += 1) {
    for (let col = 1; col <= organizerConfig.cols; col += 1) {
      const item = inOrganizer.find((record) => record.row === row && record.col === col);
      const isHighlighted = highlighted && highlighted.row === row && highlighted.col === col;
      const lowStock = item ? isLowStock(item) : false;

      cells.push(`
        <div class="drawer ${item ? "filled" : ""} ${lowStock ? "low-stock" : ""} ${isHighlighted ? "highlight" : ""}">
          <div class="drawer-position">R${row} S${col}</div>
          <div class="drawer-label">${item ? escapeHtml(item.name) : "-"}</div>
        </div>
      `);
    }
  }
  visualGrid.innerHTML = cells.join("");
}

function isLowStock(item) {
  return item.quantity <= item.criticalQuantity;
}

function toNonNegativeInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
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
