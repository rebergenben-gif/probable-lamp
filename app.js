// app.js — publieke frontend die producten uit Firestore laadt
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// === VUL HIER JE FIREBASE-CONFIG IN ===
const firebaseConfig = {
  apiKey: "VUL_HIER_IN",
  authDomain: "PROJECT.firebaseapp.com",
  projectId: "PROJECT",
  storageBucket: "PROJECT.appspot.com",
  messagingSenderId: "VUL_HIER_IN",
  appId: "VUL_HIER_IN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UI elements
const $products = document.getElementById('products');
const $cartCount = document.getElementById('cartCount');
const $cartModal = document.getElementById('cartModal');
const $cartItems = document.getElementById('cartItems');
const $cartTotal = document.getElementById('cartTotal');

let cart = JSON.parse(localStorage.getItem('cart_v1') || '{}');

function saveCart(){ localStorage.setItem('cart_v1', JSON.stringify(cart)); }
function updateCartUI(){ const qty = Object.values(cart).reduce((s, it) => s + it.qty, 0); $cartCount.textContent = qty; }

async function loadProducts(){
  $products.innerHTML = '<div class="col-span-3 text-center py-10">Laden…</div>';
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    $products.innerHTML = '';
    if (snap.empty) {
      $products.innerHTML = '<div class="col-span-3 text-center py-10 text-gray-500">Geen producten gevonden.</div>';
      return;
    }
    snap.forEach(doc => {
      const p = { id: doc.id, ...doc.data() };
      const card = document.createElement('article');
      card.className = 'bg-white rounded-lg shadow p-4 flex flex-col';
      card.innerHTML = `
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" class="w-full h-44 object-cover rounded mb-3">` : ''}
        <h4 class="font-semibold">${escapeHtml(p.title)}</h4>
        <p class="text-sm text-gray-600 flex-1">${escapeHtml(p.desc || '')}</p>
        <div class="mt-3 flex items-center justify-between">
          <div class="text-lg font-bold">€${(p.price || 0).toFixed(2)}</div>
          <button data-id="${p.id}" data-title="${escapeHtml(p.title)}" data-price="${p.price || 0}" class="addBtn px-3 py-1 bg-blue-600 text-white rounded">Toevoegen</button>
        </div>
      `;
      $products.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    $products.innerHTML = '<div class="col-span-3 text-center py-10 text-red-500">Fout bij laden producten.</div>';
  }
}

// eenvoudige XSS-escape voor strings die in innerHTML worden geplaatst
function escapeHtml(str){
  if(!str && str !== 0) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'", '&#039;');
}

// cart render
function renderCart(){
  $cartItems.innerHTML = '';
  const keys = Object.keys(cart);
  if(keys.length === 0){ $cartItems.textContent = 'Je winkelwagen is leeg.'; $cartTotal.textContent = '0.00'; return; }
  let total = 0;
  keys.forEach(id => {
    const it = cart[id];
    total += it.qty * it.price;
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center';
    row.innerHTML = `
      <div>
        <div class="font-semibold">${escapeHtml(it.title)}</div>
        <div class="text-sm text-gray-600">€${it.price.toFixed(2)} × ${it.qty}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-id="${id}" class="decBtn px-2 py-1 bg-gray-200 rounded">−</button>
        <button data-id="${id}" class="incBtn px-2 py-1 bg-gray-200 rounded">+</button>
      </div>
    `;
    $cartItems.appendChild(row);
  });
  $cartTotal.textContent = total.toFixed(2);
}

// events
document.addEventListener('click', e => {
  if(e.target.matches('.addBtn')){
    const id = e.target.dataset.id;
    const title = e.target.dataset.title;
    const price = parseFloat(e.target.dataset.price) || 0;
    if(!cart[id]) cart[id] = { id, title, price, qty:0 };
    cart[id].qty += 1;
    saveCart(); updateCartUI();
  }
  if(e.target.id === 'cartToggle') openCart();
  if(e.target.id === 'closeCart') closeCart();
  if(e.target.id === 'clearCart'){ cart = {}; saveCart(); renderCart(); updateCartUI(); }
  if(e.target.matches('.incBtn')){ const id = e.target.dataset.id; cart[id].qty += 1; saveCart(); renderCart(); updateCartUI(); }
  if(e.target.matches('.decBtn')){ const id = e.target.dataset.id; cart[id].qty -= 1; if(cart[id].qty <= 0) delete cart[id]; saveCart(); renderCart(); updateCartUI(); }
  if(e.target.id === 'checkout') alert('Demo checkout — koppel Stripe/Mollie voor echte betalingen.');
});

// modal helpers
function openCart(){ $cartModal.classList.remove('hidden'); renderCart(); }
function closeCart(){ $cartModal.classList.add('hidden'); }
$cartModal.addEventListener('click', (e) => { if(e.target === $cartModal) closeCart(); });

// init
loadProducts();
updateCartUI();
