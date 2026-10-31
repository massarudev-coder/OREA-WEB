const productForm = document.querySelector("#productForm");
const productList = document.querySelector("#adminProductList");
const formTitle = document.querySelector("#formTitle");
const formMessage = document.querySelector("#formMessage");
const adminStatus = document.querySelector("#adminStatus");
const saveButton = document.querySelector("#saveButton");
const cancelEditButton = document.querySelector("#cancelEdit");
const logoutButton = document.querySelector("#logoutButton");
const adminEmail = document.querySelector("#adminEmail");
let editingId = null;
let products = [];

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.method && options.method !== "GET" ? { "X-OREA-Request": "1" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    window.location.replace("/login.html");
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.erro || "Não foi possível concluir a operação.");
  return body;
}

function setFormMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", Boolean(message) && !isError);
}

function resetForm() {
  editingId = null;
  productForm.reset();
  formTitle.textContent = "Novo produto";
  saveButton.textContent = "Cadastrar produto";
  cancelEditButton.hidden = true;
  setFormMessage("");
}

function makeProductRow(product) {
  const row = document.createElement("article");
  row.className = "admin-product";

  const image = document.createElement("img");
  image.src = product.fotoUrl;
  image.alt = "";
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => image.removeAttribute("src"), { once: true });

  const details = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = product.nome;
  const summary = document.createElement("p");
  summary.textContent = `${product.categoria || "Outros"} · ${new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(product.preco)} · estoque: ${product.quantidade}`;
  details.append(name, summary);

  const actions = document.createElement("div");
  actions.className = "admin-actions";
  const editButton = document.createElement("button");
  editButton.className = "button button-outline button-small";
  editButton.type = "button";
  editButton.textContent = "Editar";
  editButton.addEventListener("click", () => startEdit(product));
  const deleteButton = document.createElement("button");
  deleteButton.className = "button button-danger button-small";
  deleteButton.type = "button";
  deleteButton.textContent = "Excluir";
  deleteButton.addEventListener("click", () => deleteProduct(product));
  actions.append(editButton, deleteButton);
  row.append(image, details, actions);
  return row;
}

function renderProducts() {
  productList.replaceChildren();
  if (!products.length) {
    adminStatus.textContent = "Nenhum produto cadastrado.";
    return;
  }
  adminStatus.textContent = `${products.length} produto(s) na coleção.`;
  for (const product of products) productList.append(makeProductRow(product));
}

async function loadProducts() {
  adminStatus.textContent = "Carregando produtos...";
  try {
    products = await apiRequest("/api/produtos");
    renderProducts();
  } catch (error) {
    adminStatus.textContent = error instanceof Error ? error.message : "Falha ao carregar produtos.";
    adminStatus.classList.add("error");
  }
}

function startEdit(product) {
  editingId = product.id;
  for (const name of ["nome", "descricao", "preco", "quantidade", "categoria", "fotoUrl"]) {
    productForm.elements[name].value = product[name] ?? (name === "categoria" ? "Outros" : "");
  }
  formTitle.textContent = "Editar produto";
  saveButton.textContent = "Salvar alterações";
  cancelEditButton.hidden = false;
  setFormMessage("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProduct(product) {
  if (!window.confirm(`Excluir "${product.nome}"? Esta ação não pode ser desfeita.`)) return;
  try {
    await apiRequest(`/api/produtos/${encodeURIComponent(product.id)}`, { method: "DELETE" });
    products = products.filter((item) => item.id !== product.id);
    renderProducts();
    if (editingId === product.id) resetForm();
  } catch (error) {
    adminStatus.textContent = error instanceof Error ? error.message : "Falha ao excluir.";
    adminStatus.classList.add("error");
  }
}

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  setFormMessage("");
  const formData = new FormData(productForm);
  const body = {
    nome: String(formData.get("nome")).trim(),
    descricao: String(formData.get("descricao")).trim(),
    preco: Number(formData.get("preco")),
    quantidade: Number(formData.get("quantidade")),
    categoria: String(formData.get("categoria")),
    fotoUrl: String(formData.get("fotoUrl")).trim(),
  };

  try {
    const editing = editingId !== null;
    await apiRequest(
      editing ? `/api/produtos/${encodeURIComponent(editingId)}` : "/api/produtos",
      { method: editing ? "PUT" : "POST", body: JSON.stringify(body) },
    );
    resetForm();
    setFormMessage(editing ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
    await loadProducts();
  } catch (error) {
    setFormMessage(error instanceof Error ? error.message : "Não foi possível salvar o produto.", true);
  } finally {
    saveButton.disabled = false;
  }
});

cancelEditButton.addEventListener("click", resetForm);
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await apiRequest("/api/sessao", { method: "DELETE" });
  } finally {
    window.location.replace("/login.html");
  }
});

async function initializeAdmin() {
  try {
    const session = await apiRequest("/api/sessao");
    adminEmail.textContent = session.email;
    await loadProducts();
  } catch (error) {
    if (error instanceof Error && !error.message.includes("Sua sessão expirou")) {
      adminStatus.textContent = error.message;
      adminStatus.classList.add("error");
    }
  }
}

initializeAdmin();
