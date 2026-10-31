const productList = document.querySelector("#listaProdutos");
const searchInput = document.querySelector("#busca");
const categoryList = document.querySelector("#categorias");
const refreshNote = document.querySelector("#atualizacao");
const standardCategories = ["Sideritos", "Palasitos", "Moldavitas", "Condritos", "Marcianos", "Lunares", "Outros"];
let products = [];
let activeCategory = "Todos";

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const image = document.createElement("img");
  image.className = "product-image";
  image.src = product.fotoUrl;
  image.alt = product.nome;
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    image.alt = `Imagem indisponível: ${product.nome}`;
    image.removeAttribute("src");
  }, { once: true });

  const info = document.createElement("div");
  info.className = "product-info";

  const meta = document.createElement("div");
  meta.className = "product-meta";
  const category = document.createElement("span");
  category.textContent = product.categoria || "Fragmento";
  const stockLabel = document.createElement("span");
  stockLabel.className = product.quantidade > 0 ? "stock" : "stock stock-out";
  stockLabel.textContent = product.quantidade > 0 ? "Disponível" : "Esgotado";
  meta.append(category, stockLabel);

  const name = document.createElement("h3");
  name.textContent = product.nome;
  const description = document.createElement("p");
  description.className = "product-description";
  description.textContent = product.descricao;

  const bottom = document.createElement("div");
  bottom.className = "product-bottom";
  const price = document.createElement("span");
  price.className = "product-price";
  price.textContent = formatCurrency(product.preco);
  const quantity = document.createElement("span");
  quantity.className = product.quantidade > 0 ? "stock" : "stock stock-out";
  quantity.textContent = product.quantidade > 0
    ? `${product.quantidade} em estoque`
    : "Indisponível";
  bottom.append(price, quantity);

  info.append(meta, name, description, bottom);
  card.append(image, info);
  return card;
}

function renderProducts() {
  const term = searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const visibleProducts = products.filter((product) =>
    (activeCategory === "Todos" || (product.categoria || "Outros") === activeCategory)
      && `${product.nome} ${product.descricao} ${product.categoria || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
  );
  productList.replaceChildren();

  if (!visibleProducts.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = products.length
      ? "Nenhum produto corresponde à busca."
      : "Ainda não há produtos disponíveis. Volte em breve.";
    productList.append(empty);
    return;
  }

  for (const product of visibleProducts) {
    productList.append(createProductCard(product));
  }
}

function renderCategories() {
  const productCategories = products.map((product) => product.categoria || "Outros");
  const categories = ["Todos", ...new Set([...standardCategories, ...productCategories])];
  if (!categories.includes(activeCategory)) activeCategory = "Todos";
  categoryList.replaceChildren();

  for (const category of categories) {
    const button = document.createElement("button");
    button.className = "category-chip";
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === activeCategory));
    button.addEventListener("click", () => {
      activeCategory = category;
      renderCategories();
      renderProducts();
    });
    categoryList.append(button);
  }
}

async function loadProducts() {
  try {
    const response = await fetch("/api/produtos", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Não foi possível carregar os produtos.");
    products = await response.json();
    renderCategories();
    renderProducts();
    refreshNote.textContent = `Catálogo atualizado às ${new Date().toLocaleTimeString("pt-BR")}.`;
  } catch (error) {
    if (!products.length) {
      productList.replaceChildren();
      const message = document.createElement("p");
      message.className = "empty-state";
      message.textContent = "Não foi possível carregar a coleção. Tente novamente em instantes.";
      productList.append(message);
    }
    refreshNote.textContent = "Falha ao atualizar o catálogo.";
    console.error(error);
  }
}

searchInput.addEventListener("input", renderProducts);
loadProducts();
window.setInterval(loadProducts, 10_000);
