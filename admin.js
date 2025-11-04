// admin.js — admin UI (Auth + Firestore writes)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, getIdTokenResult
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// === VUL HIER JE FIREBASE-CONFIG IN (zelfde als in app.js) ===
const firebaseConfig = {
  apiKey: "VUL_HIER_IN",
  authDomain: "PROJECT.firebaseapp.com",
  projectId: "PROJECT",
  storageBucket: "PROJECT.appspot.com",
  messagingSenderId: "VUL_HIER_IN",
  appId: "VUL_HIER_IN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// elements
const emailEl = document.getElementById('email');
const passEl = document.getElementById('password');
const loginBtn = document.getElementById('login');
const registerBtn = document.getElementById('register');
const authMsg = document.getElementById('authMsg');
const userArea = document.getElementById('userArea');

const adminPanel = document.getElementById('adminPanel');
const addProdBtn = document.getElementById('addProd');
const refreshBtn = document.getElementById('refresh');
const productList = document.getElementById('productList');

async function showProducts(){
  productList.innerHTML = 'Laden…';
  try {
    const snap = await getDocs(collection(db, 'products'));
    productList.innerHTML = '';
    if (snap.empty) productList.innerHTML = '<div class="text-gray-500">Geen producten.</div>';
    snap.forEach(docSnap => {
      const p = { id: docSnap.id, ...docSnap.data() };
      const row = document.createElement('div');
      row.className = 'p-3 border rounded flex justify-between items-center';
      row.innerHTML = `
        <div>
          <div class="font-semibold">${escapeHtml(p.title)} — €${(p.price||0).toFixed(2)}</div>
          <div class="text-sm text-gray-600">${escapeHtml(p.desc || '')}</div>
        </div>
        <div class="flex gap-2">
          <button data-id="${p.id}" class="editBtn px-3 py-1 bg-yellow-300 rounded">Bewerken</button>
          <button data-id="${p.id}" class="delBtn px-3 py-1 bg-red-500 text-white rounded">Verwijderen</button>
        </div>
      `;
      productList.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    productList.innerHTML = '<div class="text-red-500">Fout bij ophalen producten.</div>';
  }
}

function escapeHtml(str){
  if(!str && str !== 0) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'", '&#039;');
}

// auth handlers
registerBtn.addEventListener('click', async () => {
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    alert('Account aangemaakt. Zorg dat je UID-admin-claim krijgt via set-admin.js.');
    authMsg.classList.add('hidden');
  } catch (err) {
    authMsg.textContent = err.message; authMsg.classList.remove('hidden');
  }
});

loginBtn.addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
    authMsg.classList.add('hidden');
  } catch (err) {
    authMsg.textContent = err.message; authMsg.classList.remove('hidden');
  }
});

onAuthStateChanged(auth, async (user) => {
  if(user){
    // toon gebruiker en logout
    userArea.innerHTML = `<div class="flex items-center gap-2">
      <div class="text-sm text-gray-700">${escapeHtml(user.email)}</div>
      <button id="logout" class="px-2 py-1 bg-gray-100 rounded text-sm">Log uit</button>
    </div>`;
    document.getElementById('logout').addEventListener('click', () => signOut(auth));

    // token check — we vertrouwen security rules, maar feedback naar UI:
    try {
      const tokenRes = await getIdTokenResult(user, true);
      const isAdmin = !!(tokenRes.claims && tokenRes.claims.admin);
      if(!isAdmin){
        adminPanel.classList.add('hidden');
        alert('Je account heeft geen admin-rechten. Voer set-admin.js uit met jouw UID.');
        return;
      }
      adminPanel.classList.remove('hidden');
      await showProducts();
    } catch (err) {
      console.error(err);
      adminPanel.classList.add('hidden');
    }
  } else {
    userArea.innerHTML = '';
    adminPanel.classList.add('hidden');
  }
});

// add product
addProdBtn.addEventListener('click', async () => {
  const title = document.getElementById('prodTitle').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value) || 0;
  const desc = document.getElementById('prodDesc').value.trim();
  const image = document.getElementById('prodImage').value.trim();

  if(!title){ alert('Vul een titel in'); return; }

  try {
    await addDoc(collection(db, 'products'), {
      title, price, desc, image,
      createdAt: serverTimestamp()
    });
    alert('Product toegevoegd');
    document.getElementById('prodTitle').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodDesc').value = '';
    document.getElementById('prodImage').value = '';
    await showProducts();
  } catch (err) {
    alert('Fout: ' + err.message);
  }
});

// delegate delete/edit
productList.addEventListener('click', async (e) => {
  if(e.target.matches('.delBtn')){
    const id = e.target.dataset.id;
    if(!confirm('Verwijder product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      await showProducts();
    } catch (err) {
      alert('Fout bij verwijderen: ' + err.message);
    }
  } else if(e.target.matches('.editBtn')){
    const id = e.target.dataset.id;
    const newTitle = prompt('Nieuwe titel (leeg = geen wijziging):');
    if(newTitle !== null && newTitle.trim() !== ''){
      try {
        await updateDoc(doc(db, 'products', id), { title: newTitle.trim() });
        await showProducts();
      } catch (err) {
        alert('Fout bij bijwerken: ' + err.message);
      }
    }
  }
});

refreshBtn.addEventListener('click', showProducts);
