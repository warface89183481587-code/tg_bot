const tg = window.Telegram.WebApp;
tg.expand();

const products = [
  { id: "pirozhok_cabbage", sku: "P-CABBAGE", title: "Пирожок с капустой", price: 90, img: "https://placehold.co/600x400?text=%F0%9F%8D%9E" },
  { id: "pirozhok_cherry", sku: "P-CHERRY", title: "Пирожок с вишней", price: 90, img: "https://placehold.co/600x400?text=%F0%9F%8D%92" },
  { id: "pirozhok_onion_egg", sku: "P-ONION-EGG", title: "Пирожок с луком и яйцом", price: 90, img: "https://placehold.co/600x400?text=%F0%9F%A5%93" },
  { id: "bread_sourdough", sku: "B-SOURDOUGH", title: "Хлеб пшеничный на закваске", price: 250, img: "https://placehold.co/600x400?text=%F0%9F%8D%9E" },
];

const state = {
  cart: {},
  delivery: "pickup",
  payment: "transfer",
};

function formatRuble(n){ return `${n} ₽`; }

function renderCatalog(){
  const root = document.getElementById("catalog");
  root.innerHTML = "";
  products.forEach(p => {
    const qty = state.cart[p.id]?.qty || 0;
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <div class="body">
        <div class="title">${p.title}</div>
        <div class="price">${formatRuble(p.price)}</div>
        <div class="actions">
          <button data-add="${p.id}">В корзину</button>
          <div class="counter">
            <button data-dec="${p.id}">–</button>
            <span>${qty}</span>
            <button data-inc="${p.id}">+</button>
          </div>
        </div>
      </div>
    `;
    root.appendChild(el);
  });

  root.onclick = (e) => {
    const add = e.target.getAttribute("data-add");
    const inc = e.target.getAttribute("data-inc");
    const dec = e.target.getAttribute("data-dec");
    if(add){ addToCart(add, 1); }
    if(inc){ addToCart(inc, 1); }
    if(dec){ addToCart(dec, -1); }
  };
}

function addToCart(id, delta){
  const product = products.find(p => p.id === id);
  if(!product) return;
  const entry = state.cart[id] || { ...product, qty: 0 };
  entry.qty = Math.max(0, entry.qty + delta);
  if(entry.qty === 0){
    delete state.cart[id];
  } else {
    state.cart[id] = entry;
  }
  updateTotals();
  renderCatalog();
}

function updateTotals(){
  const items = Object.values(state.cart);
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const delivery = state.delivery === "courier" ? 0 : 0; // задайте стоимость если нужна
  const total = subtotal + delivery;
  document.getElementById("cartBadge").textContent = items.reduce((s, it) => s + it.qty, 0);
  document.getElementById("subtotal").textContent = formatRuble(subtotal);
  document.getElementById("deliveryCost").textContent = formatRuble(delivery);
  document.getElementById("total").textContent = formatRuble(total);
  state.subtotal = subtotal;
  state.deliveryCost = delivery;
  state.total = total;
}

function getRadio(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

function initForm(){
  // Delivery toggle
  const radios = document.querySelectorAll('input[name="delivery"]');
  const addressWrap = document.getElementById("addressWrap");
  radios.forEach(r => {
    r.addEventListener("change", () => {
      state.delivery = getRadio("delivery");
      addressWrap.style.display = state.delivery === "courier" ? "" : "none";
      updateTotals();
    });
  });

  // Payment radios
  const payRadios = document.querySelectorAll('input[name="payment"]');
  payRadios.forEach(r => {
    r.addEventListener("change", () => {
      state.payment = getRadio("payment");
    });
  });

  document.getElementById("placeOrder").addEventListener("click", () => {
    const items = Object.values(state.cart);
    if(items.length === 0){
      return tg.showPopup({ title: "Корзина пуста", message: "Добавьте товары перед оформлением." });
    }

    const order = {
      items: items.map(it => ({ id: it.id, sku: it.sku, title: it.title, price: it.price, qty: it.qty })),
      subtotal: state.subtotal,
      delivery_cost: state.deliveryCost,
      total: state.total,
      contact: {
        first_name: document.getElementById("firstName").value.trim(),
        last_name: document.getElementById("lastName").value.trim(),
        phone: document.getElementById("phone").value.trim(),
      },
      delivery: {
        method: state.delivery,
        address: document.getElementById("address").value.trim(),
      },
      payment: {
        method: state.payment,
      },
      comment: document.getElementById("comment").value.trim(),
      meta: {
        app_version: "1.0.0"
      }
    };

    // Basic validation
    if(!order.contact.first_name || !order.contact.phone){
      return tg.showPopup({ title: "Заполните контакты", message: "Имя и телефон обязательны." });
    }
    if(order.delivery.method === "courier" && !order.delivery.address){
      return tg.showPopup({ title: "Адрес доставки", message: "Укажите адрес для курьера." });
    }

    tg.sendData(JSON.stringify(order));
  });
}

renderCatalog();
initForm();
updateTotals();
