const productRows = document.querySelector("#productRows");
const addRowBtn = document.querySelector("#addRowBtn");
const loadExampleBtn = document.querySelector("#loadExampleBtn");
const clearBtn = document.querySelector("#clearBtn");
const calculateBtn = document.querySelector("#calculateBtn");
const parseProblemBtn = document.querySelector("#parseProblemBtn");
const problemText = document.querySelector("#problemText");
const messageArea = document.querySelector("#messageArea");
const resultsSection = document.querySelector("#resultsSection");
const resultsRows = document.querySelector("#resultsRows");
const summaryCards = document.querySelector("#summaryCards");
const quickReadingList = document.querySelector("#quickReadingList");
const barChart = document.querySelector("#barChart");
const lineChart = document.querySelector("#lineChart");
const stepExplanation = document.querySelector("#stepExplanation");

const recommendations = {
  A: "Requiere control estricto, revisión frecuente, pronóstico cuidadoso y prioridad en compras.",
  B: "Requiere control moderado y revisión periódica.",
  C: "Puede manejarse con controles simples, reposición menos frecuente y menor esfuerzo administrativo."
};

const exampleProducts = [
  { name: "Motor M-01", demand: 120, cost: 180 },
  { name: "Sensor S-22", demand: 430, cost: 34 },
  { name: "Cable C-10", demand: 1800, cost: 3.5 },
  { name: "Valvula V-08", demand: 90, cost: 95 },
  { name: "Filtro F-12", demand: 520, cost: 8 },
  { name: "Tornillo T-02", demand: 4000, cost: 0.8 }
];

function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function formatMoney(value) {
  return `Bs ${formatNumber(value, 2)}`;
}

function formatPercent(value) {
  return `${formatNumber(value, 2)}%`;
}

function toNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const normalized = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function setMessage(text, type = "") {
  messageArea.textContent = text;
  messageArea.className = `message-area ${type}`.trim();
}

function createInput(value, field, placeholder, type = "text") {
  const input = document.createElement("input");
  input.value = value ?? "";
  input.dataset.field = field;
  input.placeholder = placeholder;
  input.type = type;
  input.inputMode = field === "name" ? "text" : "decimal";
  if (field !== "name") {
    input.step = "0.01";
  }
  return input;
}

function addRow(product = {}) {
  const row = document.createElement("tr");

  const nameCell = document.createElement("td");
  nameCell.appendChild(createInput(product.name, "name", "Ej. P1"));

  const demandCell = document.createElement("td");
  demandCell.appendChild(createInput(product.demand, "demand", "Ej. 100", "number"));

  const costCell = document.createElement("td");
  costCell.appendChild(createInput(product.cost, "cost", "Ej. 50", "number"));

  const actionCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-row";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", "Eliminar producto");
  actionCell.appendChild(removeButton);

  row.append(nameCell, demandCell, costCell, actionCell);
  productRows.appendChild(row);
}

function clearRows() {
  productRows.innerHTML = "";
}

function fillRows(products) {
  clearRows();
  products.forEach(addRow);
}

function getProductsFromTable() {
  return [...productRows.querySelectorAll("tr")].map((row, index) => {
    const name = row.querySelector('[data-field="name"]').value.trim();
    const demandInput = row.querySelector('[data-field="demand"]').value;
    const costInput = row.querySelector('[data-field="cost"]').value;

    return {
      index: index + 1,
      name,
      demand: toNumber(demandInput),
      cost: toNumber(costInput),
      rawDemand: demandInput,
      rawCost: costInput
    };
  });
}

function validateProducts(products) {
  const errors = [];
  const warnings = [];

  if (products.length === 0) {
    errors.push("Agrega al menos un producto antes de calcular.");
    return { errors, warnings };
  }

  products.forEach((product) => {
    if (!product.name || product.rawDemand === "" || product.rawCost === "") {
      errors.push(`Fila ${product.index}: no se aceptan campos vacíos.`);
      return;
    }

    if (product.demand === null) {
      errors.push(`Fila ${product.index}: la demanda anual debe ser un número válido.`);
    } else if (product.demand < 0) {
      errors.push(`Fila ${product.index}: la demanda anual no puede ser negativa.`);
    }

    if (product.cost === null) {
      errors.push(`Fila ${product.index}: el costo unitario debe ser un número válido.`);
    } else if (product.cost < 0) {
      errors.push(`Fila ${product.index}: el costo unitario no puede ser negativo.`);
    }
  });

  if (products.length < 3) {
    warnings.push("Advertencia: hay menos de 3 productos. El cálculo funciona, pero el análisis ABC suele ser más representativo con más artículos.");
  }

  return { errors, warnings };
}

function classifyByAccumulated(accumulated) {
  if (accumulated <= 80) return "A";
  if (accumulated <= 95) return "B";
  return "C";
}

function calculateProducts(products) {
  const withAnnualValue = products.map((product) => ({
    name: product.name,
    demand: product.demand,
    cost: product.cost,
    annualValue: product.demand * product.cost
  }));

  const totalValue = withAnnualValue.reduce((sum, product) => sum + product.annualValue, 0);
  if (totalValue === 0) {
    return { totalValue, results: [] };
  }

  let accumulated = 0;
  const results = withAnnualValue
    .sort((a, b) => b.annualValue - a.annualValue)
    .map((product) => {
      const individualPercent = (product.annualValue / totalValue) * 100;
      accumulated += individualPercent;
      const accumulatedPercent = Math.min(accumulated, 100);
      const classification = classifyByAccumulated(accumulatedPercent);

      return {
        ...product,
        individualPercent,
        accumulatedPercent,
        classification,
        recommendation: recommendations[classification]
      };
    });

  return { totalValue, results };
}

function renderSummary(totalValue, results) {
  const counts = countClasses(results);
  const cards = [
    ["Total de productos", results.length],
    ["Valor total", formatMoney(totalValue)],
    ["Productos A", counts.A],
    ["Productos B", counts.B],
    ["Productos C", counts.C]
  ];

  summaryCards.innerHTML = cards
    .map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderResultsTable(results) {
  resultsRows.innerHTML = results
    .map((product) => `
      <tr>
        <td><strong>${escapeHtml(product.name)}</strong></td>
        <td>${formatNumber(product.demand, 2)}</td>
        <td>${formatMoney(product.cost)}</td>
        <td>${formatMoney(product.annualValue)}</td>
        <td>${formatPercent(product.individualPercent)}</td>
        <td>${formatPercent(product.accumulatedPercent)}</td>
        <td><span class="class-pill class-${product.classification.toLowerCase()}">${product.classification}</span></td>
        <td class="recommendation">${product.recommendation}</td>
      </tr>
    `)
    .join("");
}

function renderQuickReading(results) {
  const counts = countClasses(results);
  const aProducts = listNames(results.filter((product) => product.classification === "A"));
  const cProducts = listNames(results.filter((product) => product.classification === "C"));

  quickReadingList.innerHTML = `
    <li>Tus productos A concentran la mayor parte del valor y deben ser los más vigilados: ${aProducts || "ninguno con los datos actuales"}.</li>
    <li>Estos productos deberían tener prioridad en compras, revisión frecuente y pronósticos cuidadosos.</li>
    <li>Los productos C no deben ignorarse, pero no requieren el mismo nivel de control: ${cProducts || "ninguno con los datos actuales"}.</li>
    <li>Distribución obtenida: ${counts.A} A, ${counts.B} B y ${counts.C} C.</li>
  `;
}

function renderBarChart(results) {
  const maxValue = Math.max(...results.map((product) => product.annualValue), 1);

  barChart.innerHTML = results
    .map((product) => {
      const width = (product.annualValue / maxValue) * 100;
      return `
        <div class="bar-item">
          <span class="bar-label" title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</span>
          <span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width: ${width}%"></span></span>
          <span class="bar-value">${formatMoney(product.annualValue)}</span>
        </div>
      `;
    })
    .join("");
}

function renderLineChart(results) {
  const width = 640;
  const height = 270;
  const padding = 38;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const points = results.map((product, index) => {
    const x = results.length === 1
      ? padding + chartWidth / 2
      : padding + (index / (results.length - 1)) * chartWidth;
    const y = padding + chartHeight - (product.accumulatedPercent / 100) * chartHeight;
    return { x, y, product };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const circles = points.map((point) => `
    <g>
      <circle cx="${point.x}" cy="${point.y}" r="5" fill="#127a62"></circle>
      <text x="${point.x}" y="${point.y - 11}" text-anchor="middle">${formatNumber(point.product.accumulatedPercent, 1)}%</text>
      <text x="${point.x}" y="${height - 9}" text-anchor="middle">${escapeSvg(point.product.name.slice(0, 8))}</text>
    </g>
  `).join("");

  lineChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  lineChart.innerHTML = `
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#9badb4" stroke-width="1.5"></line>
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#9badb4" stroke-width="1.5"></line>
    <line x1="${padding}" y1="${padding + chartHeight * 0.2}" x2="${width - padding}" y2="${padding + chartHeight * 0.2}" stroke="#0f7a64" stroke-dasharray="5 6" opacity="0.55"></line>
    <line x1="${padding}" y1="${padding + chartHeight * 0.05}" x2="${width - padding}" y2="${padding + chartHeight * 0.05}" stroke="#b27613" stroke-dasharray="5 6" opacity="0.55"></line>
    <text x="${padding + 5}" y="${padding + chartHeight * 0.2 - 7}" fill="#0f7a64">80%</text>
    <text x="${padding + 5}" y="${padding + chartHeight * 0.05 - 7}" fill="#76500f">95%</text>
    <polyline fill="none" stroke="#127a62" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"></polyline>
    ${circles}
  `;
}

function renderStepExplanation(results, totalValue) {
  const topProduct = results[0];
  const groups = {
    A: results.filter((product) => product.classification === "A"),
    B: results.filter((product) => product.classification === "B"),
    C: results.filter((product) => product.classification === "C")
  };

  stepExplanation.innerHTML = `
    <p>Primero se calculó el valor anual de cada producto multiplicando la demanda anual por el costo unitario. Luego se ordenaron los productos de mayor a menor valor anual. Después se calculó el porcentaje que representa cada producto sobre el total del inventario, que en este ejercicio es <strong>${formatMoney(totalValue)}</strong>. Finalmente, usando el porcentaje acumulado, se asignó la categoría A, B o C.</p>
    <ol>
      <li>El producto con mayor valor anual es <strong>${escapeHtml(topProduct.name)}</strong>, con <strong>${formatMoney(topProduct.annualValue)}</strong>. Es el primer candidato a control prioritario porque aporta más valor económico al inventario.</li>
      <li>Productos en A: <strong>${listNames(groups.A) || "ninguno"}</strong>. Quedaron en A porque su porcentaje acumulado llega hasta el tramo académico de aproximadamente 80% del valor total.</li>
      <li>Productos en B: <strong>${listNames(groups.B) || "ninguno"}</strong>. Quedaron en B porque aparecen después del 80% y hasta aproximadamente el 95% acumulado.</li>
      <li>Productos en C: <strong>${listNames(groups.C) || "ninguno"}</strong>. Quedaron en C porque completan el tramo final, por encima del 95% y hasta el 100% acumulado.</li>
      <li>Recuerda que un producto con muchas unidades no siempre es el más importante si su costo unitario es bajo. La clasificación ABC se basa en valor monetario anual, no solo en cantidad física.</li>
    </ol>
    <p>Estos límites pueden variar según la política de cada empresa, pero los cortes de 80% y 95% son adecuados para ejercicios académicos de Gerencia de Operaciones.</p>
  `;
}

function countClasses(results) {
  return results.reduce((counts, product) => {
    counts[product.classification] += 1;
    return counts;
  }, { A: 0, B: 0, C: 0 });
}

function listNames(products) {
  return products.map((product) => product.name).join(", ");
}

function calculateABC() {
  const products = getProductsFromTable();
  const { errors, warnings } = validateProducts(products);

  if (errors.length > 0) {
    setMessage(errors[0], "error");
    resultsSection.classList.add("is-hidden");
    return;
  }

  const { totalValue, results } = calculateProducts(products);

  if (totalValue === 0) {
    setMessage("El valor total del inventario es cero. Ingresa al menos un producto con demanda y costo mayores a cero.", "error");
    resultsSection.classList.add("is-hidden");
    return;
  }

  renderSummary(totalValue, results);
  renderResultsTable(results);
  renderQuickReading(results);
  renderBarChart(results);
  renderLineChart(results);
  renderStepExplanation(results, totalValue);
  resultsSection.classList.remove("is-hidden");

  if (warnings.length > 0) {
    setMessage(warnings[0], "warning");
  } else {
    setMessage("Clasificación calculada correctamente. Revisa la tabla, gráficos y explicación paso a paso.", "success");
  }

  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseProblemText() {
  const text = problemText.value.trim();
  if (!text) {
    setMessage("Pega un problema antes de intentar extraer datos.", "error");
    return;
  }

  const products = extractProducts(text);
  if (products.length === 0) {
    setMessage("No se reconocieron productos. Intenta usar frases como: Producto P1 demanda 100 y cuesta 50 Bs.", "error");
    return;
  }

  fillRows(products);
  setMessage(`Se extrajeron ${products.length} producto(s). Revisa la tabla antes de calcular.`, "warning");
}

function extractProducts(text) {
  const segments = text
    .split(/(?:;|\n)+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const sourceSegments = segments.length > 1 ? segments : splitByProductKeyword(text);

  return sourceSegments
    .map((segment, index) => parseSegment(segment, index + 1))
    .filter((product) => product.name || product.demand !== "" || product.cost !== "");
}

function splitByProductKeyword(text) {
  const matches = [...text.matchAll(/(?:producto|art[ií]culo|item|c[oó]digo)\s+[\w.-]+[\s\S]*?(?=(?:producto|art[ií]culo|item|c[oó]digo)\s+[\w.-]+|$)/gi)];
  if (matches.length > 0) {
    return matches.map((match) => match[0].trim().replace(/[.。]\s*$/, ""));
  }
  return [text];
}

function parseSegment(segment, fallbackIndex) {
  const nameMatch = segment.match(/(?:producto|art[ií]culo|item|c[oó]digo)\s*[:#-]?\s*([\w.-]+)/i);
  const demandMatch = segment.match(/(?:demanda(?:\s+anual)?|consumo|consume|requiere)\D{0,35}(-?\d+(?:[.,]\d+)?)/i);
  const costMatch = segment.match(/(?:cuesta|costo(?:\s+unitario)?|coste|precio)\D{0,35}(-?\d+(?:[.,]\d+)?)/i);
  const fallbackName = segment.match(/^\s*([\w.-]+)/);

  return {
    name: nameMatch?.[1] || fallbackName?.[1] || `Producto ${fallbackIndex}`,
    demand: demandMatch ? demandMatch[1].replace(",", ".") : "",
    cost: costMatch ? costMatch[1].replace(",", ".") : ""
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeSvg(value) {
  return escapeHtml(value);
}

addRowBtn.addEventListener("click", () => {
  addRow();
  setMessage("Producto agregado. Completa sus datos antes de calcular.");
});

loadExampleBtn.addEventListener("click", () => {
  fillRows(exampleProducts);
  resultsSection.classList.add("is-hidden");
  setMessage("Ejemplo cargado. Puedes calcular o editar los valores.", "success");
});

clearBtn.addEventListener("click", () => {
  clearRows();
  addRow();
  problemText.value = "";
  resultsSection.classList.add("is-hidden");
  setMessage("Datos limpiados. La tabla quedó lista para un nuevo ejercicio.");
});

calculateBtn.addEventListener("click", calculateABC);
parseProblemBtn.addEventListener("click", parseProblemText);

productRows.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-row");
  if (!button) return;

  button.closest("tr").remove();
  if (productRows.children.length === 0) {
    addRow();
  }
  setMessage("Producto eliminado.");
});

fillRows([
  { name: "P1", demand: 100, cost: 50 },
  { name: "P2", demand: 500, cost: 8 },
  { name: "P3", demand: 1000, cost: 1 }
]);
setMessage("Puedes editar el ejemplo inicial, pegar un problema o cargar otro ejemplo.");
