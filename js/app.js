import { MENU, CONFIG } from './data.js';
// UPDATE 1: Import restoreBackup dari report.js
import { saveTransaction, getReport, clearReportData, downloadBackup, restoreBackup, payUnpaidTransaction, deleteTransaction, finishTransaction } from './report.js';
import { sendToDiscord, sendOrderDone, sendUnpaidOrder } from './discord.js';
import { qrisStaticToDynamic } from './qris.js';

const fmt = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

// --- SFX (Audio) ---
const sounds = {
    click: document.getElementById('sfx-click'),
    success: document.getElementById('sfx-success'),
    error: document.getElementById('sfx-error')
};
function playSound(type) {
    if(sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].volume = 0.5; 
        sounds[type].play().catch(e => console.log("Audio blocked", e));
    }
}
window.playSound = playSound; 

// --- STATE MANAGEMENT ---
let cart = JSON.parse(localStorage.getItem('cart_temp') || '[]');
let isStockMode = false; 
let localMenu = [];

// Load Data & Sync Stock
try {
    const savedStock = JSON.parse(localStorage.getItem('menu_stock') || '[]');
    localMenu = MENU.map(newItem => {
        let item = { ...newItem };
        const oldItem = savedStock.find(old => old.id === item.id);
        if (oldItem) {
            if (item.variants && oldItem.variants) {
                item.variants = item.variants.map(newV => {
                    const oldV = oldItem.variants.find(ov => ov.name === newV.name);
                    return { ...newV, active: oldV ? oldV.active : true };
                });
            } else if (oldItem.active !== undefined) { item.active = oldItem.active; }
        }
        return item;
    });
} catch (err) { localMenu = JSON.parse(JSON.stringify(MENU)); localStorage.removeItem('menu_stock'); }
localStorage.setItem('menu_stock', JSON.stringify(localMenu));

let currentPaymentMethod = 'CASH';
let currentTotalBill = 0;
let currentQtyItem = null;
let activeUnpaidId = localStorage.getItem('active_unpaid_id') || null; // hold UNPAID yg lagi dibuka di MY ORDER
let serverName = '';
try { serverName = localStorage.getItem('bebyte_server') || ''; } catch (e) {}
let reportPage = 1;
const itemsPerPage = 5; 
let isPrintingMode = false;
let editingItemData = null; 
let tempCashString = ""; // Variabel Numpad Tablet

// DOM ELEMENTS
const els = {
  grid: document.getElementById('menu-grid'),
  cartList: document.getElementById('cart-list'),
  cartCount: document.getElementById('cart-count'),
  total: document.getElementById('total'),
  note: document.getElementById('note'),
  custName: document.getElementById('customer-name'),
  btnSend: document.getElementById('btn-send'),
  btnSave: document.getElementById('btn-save'),
  alertModal: document.getElementById('custom-alert'),
  alertTitle: document.getElementById('alert-title'),
  alertMsg: document.getElementById('alert-msg'),
  btnAlertOk: document.getElementById('btn-alert-ok'),
  modalReport: document.getElementById('modal-report'),
  reportContent: document.getElementById('report-content'),
  btnReport: document.getElementById('btn-report'),
  btnCloseReport: document.getElementById('close-report'),
  btnResetDB: document.getElementById('btn-reset-db'), 
  btnBackup: document.getElementById('btn-backup'),
  // UPDATE 2: Tambahkan referensi ke elemen input file dan tombol restore
  btnRestore: document.getElementById('btn-restore'),
  inputRestore: document.getElementById('input-restore-json'),
  
  btnStockMode: document.getElementById('btn-stock-mode'),
  modalVariant: document.getElementById('modal-variant'),
  variantTitle: document.getElementById('variant-title'),
  variantOptions: document.getElementById('variant-options')
};

const elsPay = {
    modal: document.getElementById('modal-payment'), total: document.getElementById('pay-total'), inputCash: document.getElementById('input-cash'),
    textChange: document.getElementById('text-change'), btnFinal: document.getElementById('btn-final-pay'), btnClose: document.getElementById('close-payment'),
    grpCash: document.getElementById('cash-input-group'), btnCash: document.getElementById('btn-cash'), btnQris: document.getElementById('btn-qris'),
    grpQr: document.getElementById('qris-qr-group'), qrBox: document.getElementById('qris-qr-box'), qrAmount: document.getElementById('qris-qr-amount')
};

const elsQty = {
    modal: document.getElementById('modal-qty'), input: document.getElementById('input-qty-number'),
    total: document.getElementById('qty-total-price'), btnAdd: document.getElementById('btn-add-qty'), title: document.getElementById('qty-title')
};

const elsEdit = {
    modal: document.getElementById('modal-edit-qty'), input: document.getElementById('input-edit-qty'),
    itemName: document.getElementById('edit-item-name'), btnSave: document.getElementById('btn-save-qty')
};

const elsConfirm = {
    modal: document.getElementById('modal-confirm'), title: document.getElementById('confirm-title'), msg: document.getElementById('confirm-msg'),
    btnYes: document.getElementById('btn-confirm-yes'), btnNo: document.getElementById('btn-confirm-no')
};

function saveMenuStock() { localStorage.setItem('menu_stock', JSON.stringify(localMenu)); }

// --- HELPERS ---
let confirmCallback = null;
window.showConfirm = (title, msg, callback) => {
    playSound('click');
    if(elsConfirm.title) elsConfirm.title.innerText = title;
    if(elsConfirm.msg) elsConfirm.msg.innerText = msg;
    confirmCallback = callback; 
    elsConfirm.modal.classList.remove('hidden');
};
elsConfirm.btnYes.onclick = () => { playSound('click'); if(confirmCallback) confirmCallback(); elsConfirm.modal.classList.add('hidden'); confirmCallback = null; };
elsConfirm.btnNo.onclick = () => { playSound('click'); elsConfirm.modal.classList.add('hidden'); confirmCallback = null; };

window.showAlert = (t, m) => { 
    if(t.includes("ERROR")||t.includes("KURANG")||t.includes("GAGAL")) playSound('error'); else playSound('click'); 
    els.alertTitle.innerText = t; els.alertMsg.innerText = m; els.alertModal.classList.remove('hidden'); 
};
els.btnAlertOk.addEventListener('click', () => { playSound('click'); els.alertModal.classList.add('hidden'); });

// --- RENDER MENU ---
function renderMenu() {
  if(!els.grid) return;
  els.grid.className = isStockMode ? "grid grid-cols-2 sm:grid-cols-3 gap-4 border-4 border-red-500 p-2 rounded-xl bg-red-50" : "grid grid-cols-2 sm:grid-cols-3 gap-4";
  els.grid.innerHTML = localMenu.map(m => {
    let isFullOOS = false;
    if (m.variants) isFullOOS = m.variants.every(v => v.active === false); else isFullOOS = !m.active;
    const cardClass = isFullOOS ? "grayscale opacity-70" : "";
    let articleClick = '', markerHtml = '';
    if (isStockMode) { const action = `toggleStock(${m.id})`; const btnText = isFullOOS ? "SET: ADA" : "SET: HABIS"; const btnClass = isFullOOS ? "bg-blue-500 text-white" : "bg-red-500 text-white"; markerHtml = `<button onclick="event.stopPropagation(); playSound('click'); ${action}" class="${btnClass} border-2 border-black px-3 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1">${btnText}</button>`; articleClick = `onclick="playSound('click'); ${action}" style="cursor:pointer"`; }
    else if (isFullOOS) { markerHtml = `<span class="leading-none">❌</span>`; }
    else { const action = `handleItemClick(${m.id})`; articleClick = `onclick="playSound('click'); ${action}" style="cursor:pointer"`; markerHtml = m.variants ? `<span class="leading-none">🔽</span>` : `<span class="leading-none">➕</span>`; }
    const displayName = m.name;
    return `<article ${articleClick} class="bg-white rounded-xl overflow-hidden card-pop flex flex-col h-full relative group ${cardClass}"><div class="relative h-40 w-full overflow-hidden bg-gray-200"><img src="${m.img}" onerror="this.src='https://placehold.co/300x200?text=No+Image'" class="w-full h-full object-cover transition duration-500 group-hover:scale-110">${isFullOOS ? '<div class="absolute inset-0 flex items-center justify-center bg-black/60 z-20"><span class="text-white font-black text-2xl border-4 border-white px-2 -rotate-12">HABIS!</span></div>' : ''}<div class="absolute top-2 right-2 bg-bebyte-purple text-white text-[10px] font-bold px-2 py-1 rounded z-10">${m.category}</div>${m.nickname ? `<div class="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded z-10">${m.nickname}</div>` : (m.variants ? `<div class="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">${m.variants.map(v => `<span class="bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded ${v.active === false ? 'opacity-50 line-through' : ''}">${v.nickname || v.name}</span>`).join('')}</div>` : '')}</div><div class="px-2 pt-1.5 pb-2 flex flex-col flex-grow"><h3 class="font-black text-lg text-black leading-tight uppercase">${displayName}</h3><p class="text-sm text-gray-500 mb-1 leading-tight">${m.desc || m.name}</p><div class="flex-grow"></div><div class="flex justify-between items-end mt-1 pt-2 border-t-2 border-dashed border-gray-200"><span class="font-bold text-bebyte-purple bg-purple-100 px-2 py-1 rounded border border-purple-200 text-sm">${fmt(m.price)}</span>${markerHtml}</div></div></article>`;
  }).join('');
}

// --- ACTIONS (Stock & Variants) ---
window.toggleStockMode = () => { playSound('click'); isStockMode = !isStockMode; const btn = els.btnStockMode; if(isStockMode) { btn.classList.replace('bg-bebyte-purple', 'bg-red-600'); btn.innerHTML = "⚠️ EDIT STOK"; showAlert("MODE STOK", "Klik menu buat ubah status HABIS/ADA."); } else { btn.classList.replace('bg-red-600', 'bg-bebyte-purple'); btn.innerHTML = "📦 Stok"; } renderMenu(); };
window.toggleStock = (id) => { const item = localMenu.find(x => x.id === id); if(item.variants) openVariantStockModal(item); else { item.active = !item.active; saveMenuStock(); renderMenu(); } };
function openVariantStockModal(item) { els.variantTitle.innerText = `ATUR STOK: ${item.name}`; els.variantOptions.innerHTML = item.variants.map(v => `<button onclick="toggleVariantStock(${item.id}, '${v.name}')" class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 flex justify-between items-center ${v.active ? 'bg-green-100' : 'bg-red-100'}"><span>${v.nickname || v.name}</span><span class="text-xs border border-black px-2 py-1 rounded bg-white font-black">${v.active ? '✅ ADA' : '❌ HABIS'}</span></button>`).join(''); els.modalVariant.classList.remove('hidden'); }
window.toggleVariantStock = (id, vName) => { const item = localMenu.find(x => x.id === id); const v = item.variants.find(x => x.name === vName); v.active = !v.active; saveMenuStock(); openVariantStockModal(item); renderMenu(); };
window.handleItemClick = (id) => { const item = localMenu.find(x => x.id === id); if (item.custom_qty) openQtyModal(item); else if (item.variants) openVariantModal(item); else addToCart(item, null, 1); };
function openVariantModal(item) { els.variantTitle.innerText = `Pilih Varian`; els.variantOptions.innerHTML = item.variants.map(v => { const isHabis = !v.active; const btnClass = isHabis ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-bebyte-yellow cursor-pointer"; const action = isHabis ? "" : `onclick="selectVariant(${item.id}, '${v.name}')"`; return `<button ${action} class="w-full text-left px-4 py-3 border-2 border-black rounded-lg font-bold mb-2 group ${btnClass}"><div class="flex justify-between items-center"><span class="text-lg">${v.nickname || v.name}</span>${!isHabis ? '<span>➕</span>' : '<span class="leading-none">❌</span>'}</div><div class="text-xs font-normal text-gray-500">${v.desc || ''}</div></button>`; }).join(''); els.modalVariant.classList.remove('hidden'); }
window.selectVariant = (id, vName) => { playSound('click'); addToCart(localMenu.find(x=>x.id===id), vName, 1); els.modalVariant.classList.add('hidden'); };
function openQtyModal(item) { currentQtyItem = item; elsQty.title.innerText = item.nickname || item.name; elsQty.input.value = 5; updateQtyTotal(item.price); elsQty.modal.classList.remove('hidden'); elsQty.input.focus(); elsQty.input.select(); }
window.closeModalQty = () => { playSound('click'); elsQty.modal.classList.add('hidden'); };
elsQty.input.addEventListener('input', () => { if(currentQtyItem) updateQtyTotal(currentQtyItem.price); });
function updateQtyTotal(price) { elsQty.total.innerText = fmt((Number(elsQty.input.value)||0) * price); }
elsQty.btnAdd.addEventListener('click', () => { playSound('click'); const qty = Number(elsQty.input.value); if(qty > 0 && currentQtyItem) { addToCart(currentQtyItem, null, qty); elsQty.modal.classList.add('hidden'); } });

// --- CART ---
function addToCart(item, variantName, quantity = 1) { 
    const exist = cart.find(x => x.id === item.id && x.variant === variantName); 
    let finalName = item.name; let finalNick = item.nickname || item.name; 
    if (variantName && item.variants) { const vData = item.variants.find(v => v.name === variantName); if(vData) { finalName = `${item.name} (${vData.name})`; finalNick = vData.nickname || finalName; } } 
    if(exist) { exist.qty += quantity; } else { cart.push({ id: item.id, name: finalName, nickname: finalNick, price: item.price, variant: variantName, qty: quantity }); } 
    updateCart(); 
    const badge = document.getElementById('cart-count');
    badge.classList.remove('animate-bounce-short'); void badge.offsetWidth; badge.classList.add('animate-bounce-short');
}
window.tryClearCart = () => { if(!cart.length && !els.custName.value.trim() && !els.note.value.trim()) return; showConfirm("HAPUS SEMUA?", "Yakin mau kosongin keranjang?", () => { cart = []; els.custName.value = ''; els.note.value = ''; cancelResume(); updateCart(); refreshNoteChips(); saveForm(); }); };
function cancelResume() { activeUnpaidId = null; localStorage.removeItem('active_unpaid_id'); setResumeUI(null); }
window.removeCartItem = (id, v) => { playSound('click'); cart = cart.filter(x => !(x.id === id && x.variant === (v === 'null' ? null : v))); updateCart(); };
window.editCartQty = (id, v, currentQty) => { playSound('click'); const vKey = v === 'null' ? null : v; const item = cart.find(x => x.id === id && x.variant === vKey); if(item) { editingItemData = { id, vKey }; elsEdit.itemName.innerText = `Edit: ${item.nickname || item.name}`; elsEdit.input.value = currentQty; elsEdit.modal.classList.remove('hidden'); setTimeout(() => elsEdit.input.select(), 100); } };
window.changeEditInput = (delta) => { playSound('click'); let val = parseInt(elsEdit.input.value) || 0; val += delta; if(val < 0) val = 0; elsEdit.input.value = val; };
elsEdit.btnSave.addEventListener('click', () => { playSound('click'); if (!editingItemData) return; const newQty = parseInt(elsEdit.input.value); const item = cart.find(x => x.id === editingItemData.id && x.variant === editingItemData.vKey); if (item) { if (newQty > 0) { item.qty = newQty; updateCart(); elsEdit.modal.classList.add('hidden'); editingItemData = null; } else { elsEdit.modal.classList.add('hidden'); showConfirm("HAPUS ITEM?", "Jumlah 0, mau dihapus dari keranjang?", () => { window.removeCartItem(editingItemData.id, editingItemData.vKey); editingItemData = null; }); } } else { elsEdit.modal.classList.add('hidden'); } });
window.updateQty = (id, v, d) => { playSound('click'); const vKey = v === 'null' ? null : v; const item = cart.find(x => x.id === id && x.variant === vKey); if(item) { item.qty += d; if(item.qty<=0) cart = cart.filter(x=>x!==item); updateCart(); } };
function updateCart() { 
    localStorage.setItem('cart_temp', JSON.stringify(cart)); els.cartCount.textContent = cart.reduce((a,b)=>a+b.qty,0) + " Items"; els.total.textContent = fmt(cart.reduce((a,b)=>a+(b.price*b.qty),0)); 
    if(cart.length === 0) els.cartList.innerHTML = `<div class="text-center py-6 opacity-50 text-sm font-bold italic">Keranjang Kosong</div>`;
    else els.cartList.innerHTML = cart.map(i => `<div class="flex justify-between items-center bg-white p-2 rounded border-2 border-black mb-2 shadow-sm group hover:shadow-md transition"><div class="flex-1 pr-2"><div class="flex items-center gap-2"><button onclick="removeCartItem(${i.id}, '${i.variant}')" class="text-gray-300 hover:text-red-500 transition" title="Hapus Item">❌</button><div class="font-bold text-sm leading-tight">${i.nickname || i.name}</div></div><div class="text-xs text-gray-500 pl-6">${fmt(i.price)} x ${i.qty}</div></div><div class="flex items-center gap-1"><button onclick="updateQty(${i.id},'${i.variant}',-1)" class="w-6 h-6 bg-gray-200 rounded font-bold hover:bg-gray-300">-</button><button onclick="editCartQty(${i.id}, '${i.variant}', ${i.qty})" class="min-w-[1.5rem] px-1 h-6 text-center text-sm font-bold bg-white border border-gray-300 rounded hover:bg-yellow-100 transition">${i.qty}</button><button onclick="updateQty(${i.id},'${i.variant}',1)" class="w-6 h-6 bg-bebyte-purple text-white rounded font-bold hover:bg-purple-700">+</button></div></div>`).join('');
}

// --- TABLET NUMPAD LOGIC ---
window.numpad = (val) => { playSound('click'); if (val === 'backspace') tempCashString = tempCashString.slice(0, -1); else if (val === '10000' || val === '20000' || val === '50000') { let currentVal = Number(tempCashString) || 0; currentVal += Number(val); tempCashString = currentVal.toString(); } else tempCashString += val; updateCashDisplay(); };
window.clearCash = () => { playSound('click'); tempCashString = ""; updateCashDisplay(); };
window.setUangPas = () => { playSound('click'); tempCashString = currentTotalBill.toString(); updateCashDisplay(); };

// --- UPDATE DISPLAY CASH (LOGIC TOMBOL PINTAR) ---
function updateCashDisplay() {
    elsPay.inputCash.value = tempCashString ? parseInt(tempCashString).toLocaleString('id-ID') : "";
    const cash = Number(tempCashString) || 0;
    const change = cash - currentTotalBill;
    
    elsPay.textChange.innerText = fmt(change);
    elsPay.textChange.className = change < 0 ? 'font-black text-xl text-red-600' : 'font-black text-xl text-bebyte-green';
    
    // Hanya disable kalau MODE CASH + DUIT KURANG. QRIS selalu enable.
    if(currentPaymentMethod === 'CASH' && change < 0) {
        elsPay.btnFinal.classList.add('opacity-50','cursor-not-allowed');
    } else {
        elsPay.btnFinal.classList.remove('opacity-50','cursor-not-allowed');
    }
}

// --- TOMBOL SAVE (DINE IN / UNPAID): masuk history + discord, bayar belakangan ---
if (els.btnSave) els.btnSave.addEventListener('click', () => {
    playSound('click');
    if (activeUnpaidId) return showAlert("SUDAH DIBUKA", "Hold ini lagi dibuka di MY ORDER.\nTinggal CHECKOUT buat lunasi.");
    if(!cart.length) return showAlert("KOSONG", "Pilih menu dulu!");
    if(!els.custName.value.trim()) { els.custName.focus(); return showAlert("NAMA?", "Isi nama pemesan!"); }
    const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
    const itemsReport = cart.map(i => ({ ...i, name: i.nickname || i.name }));
    const custName = els.custName.value.trim().toUpperCase();
    const rawNote = els.note.value.trim();
    const saveNote = rawNote;
    const customerInfo = { name: custName, method: 'UNPAID', pay: 0, change: 0, server: serverName };
    const trxData = saveTransaction(itemsReport, total, saveNote, customerInfo, 'UNPAID');
    if (trxData) {
        sendUnpaidOrder(itemsReport, total, saveNote, trxData.queueNo, customerInfo).then(res => { if(!res.success) console.warn("Discord Log Fail"); });
        playSound('success');
        showAlert("TERSIMPAN! 🍽️", `ANTRIAN: #${trxData.queueNo}\nStatus: BELUM BAYAR\nKlik kotak #${trxData.queueNo} buat checkout.`);
    }
    cart = []; els.custName.value = ''; els.note.value = ''; updateCart(); renderUnpaidList(); refreshNoteChips(); saveForm();
});

// --- INDIKATOR RESUME HOLD UNPAID DI MY ORDER ---
function setResumeUI(queueNo) {
    if (els.btnSave) els.btnSave.disabled = !!queueNo;
    if (els.btnSave) els.btnSave.classList.toggle('opacity-40', !!queueNo);
    if (els.btnSave) els.btnSave.classList.toggle('cursor-not-allowed', !!queueNo);
    if (els.btnSend) els.btnSend.innerHTML = queueNo ? `BAYAR #${queueNo} ➤` : 'CHECKOUT ➤';
}

// --- DAFTAR UNPAID (hold) ---
function renderUnpaidList() {
    const box = document.getElementById('unpaid-list');
    const badge = document.getElementById('unpaid-count');
    if (!box) return;
    const data = getReport();
    const list = (data.unpaid || []).slice().sort((a,b) => a.id - b.id);
    if (badge) badge.textContent = `${list.length}`;
    if (!list.length) { box.innerHTML = `<p class="col-span-3 text-center text-gray-400 text-xs font-bold italic py-4">Belum ada hold...</p>`; return; }
    box.innerHTML = list.map(tx => {
        const isActive = activeUnpaidId && String(activeUnpaidId) === String(tx.id);
        return `<div onclick="resumeUnpaid('${tx.id}')" class="relative cursor-pointer border-2 ${isActive ? 'border-green-500 bg-green-50' : 'border-black bg-bebyte-yellow'} rounded-lg p-1.5 text-center shadow-[2px_2px_0px_0px_black] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_black] transition active:scale-95 min-w-0 overflow-hidden">
            <button onclick="event.stopPropagation(); deleteUnpaid('${tx.id}')" class="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full border border-black leading-none" title="Hapus hold">×</button>
            <div class="font-black text-base ${isActive ? 'text-green-700' : 'text-bebyte-purple'}">#${tx.queueNo || String(tx.id).slice(-4)}</div>
            <div class="text-[10px] font-bold uppercase truncate">${tx.customer ? tx.customer.name : '-'}</div>
            <div class="text-[10px] font-black">${fmt(tx.total)}</div>
            ${isActive ? '<div class="text-[9px] font-black text-green-600">● DIBUKA</div>' : ''}
        </div>`;
    }).join('');
}
window.resumeUnpaid = (id) => {
    playSound('click');
    const data = getReport();
    const tx = data.history.find(t => String(t.id) === String(id));
    if (!tx) { renderUnpaidList(); return showAlert("GAGAL!", "Hold tidak ditemukan."); }
    if (!cart.length) {
        cart = (Array.isArray(tx.items) ? tx.items : []).map(i => ({ ...i }));
    } else {
        // Keranjang lagi isi: timpa aja biar ga kecampur sama hold lain
        cart = (Array.isArray(tx.items) ? tx.items : []).map(i => ({ ...i }));
    }
    els.custName.value = tx.customer ? tx.customer.name : '';
    els.note.value = (tx.note || '').split(',').map(s => s.trim()).filter(s => s && !/^tolong masak ya!?$/i.test(s)).join(', ').replace(/,?\s*DINE IN\s*$/i, '');
    activeUnpaidId = String(tx.id);
    localStorage.setItem('active_unpaid_id', activeUnpaidId);
    setResumeUI(tx.queueNo);
    updateCart(); renderUnpaidList(); refreshNoteChips(); saveForm();
    document.getElementById('cart-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
window.deleteUnpaid = (id) => {
    showConfirm("HAPUS HOLD?", "Hold UNPAID ini bakal dihapus permanen.", () => {
        deleteTransaction(id);
        if (activeUnpaidId && String(activeUnpaidId) === String(id)) cancelResume();
        renderUnpaidList();
    });
};
window.payUnpaidFromReport = (id) => {
    els.modalReport.classList.add('hidden');
    window.resumeUnpaid(id);
};
window.finishOrder = (id) => {
    showConfirm("SELESAIKAN?", "Tandai pesanan ini sudah selesai & diserahkan ke pembeli?", () => {
        finishTransaction(id);
        playSound('success');
        renderReportTable();
    });
};

// --- PAYMENT METHOD SELECTION ---
els.btnSend.addEventListener('click', () => { 
    playSound('click');
    if(!cart.length) return showAlert("KOSONG", "Pilih menu dulu!"); 
    if(!els.custName.value.trim()) { els.custName.focus(); return showAlert("NAMA?", "Isi nama pemesan!"); } 
    currentTotalBill = cart.reduce((a,b) => a + (b.price * b.qty), 0); 
    elsPay.total.innerText = fmt(currentTotalBill); 
    tempCashString = ""; updateCashDisplay();
    renderQrisQr();
    if (elsPay.btnQris) { elsPay.btnQris.disabled = currentTotalBill <= 0; elsPay.btnQris.classList.toggle('opacity-40', currentTotalBill <= 0); elsPay.btnQris.classList.toggle('cursor-not-allowed', currentTotalBill <= 0); }
    setMethod('CASH'); elsPay.modal.classList.remove('hidden'); 
});

window.setMethod = (type) => { 
    playSound('click'); 
    if (type === 'QRIS' && currentTotalBill <= 0) { playSound('error'); return showAlert("NOL", "Total Rp 0, pakai CASH aja!"); }
    currentPaymentMethod = type; 
    
    if(type === 'CASH') { 
        elsPay.btnCash.className = "border-2 border-black py-2 rounded font-bold bg-bebyte-yellow ring-2 ring-black ring-offset-2 transition-all"; 
        elsPay.btnQris.className = "border-2 border-black py-2 rounded font-bold bg-white hover:bg-gray-100 transition-all"; 
        elsPay.grpCash.classList.remove('hidden'); 
        if (elsPay.grpQr) elsPay.grpQr.classList.add('hidden');
    } 
    else { 
        elsPay.btnQris.className = "border-2 border-black py-2 rounded font-bold bg-bebyte-yellow ring-2 ring-black ring-offset-2 transition-all"; 
        elsPay.btnCash.className = "border-2 border-black py-2 rounded font-bold bg-white hover:bg-gray-100 transition-all"; 
        elsPay.grpCash.classList.add('hidden'); 
        if (elsPay.grpQr) elsPay.grpQr.classList.remove('hidden');
        renderQrisQr();
    }
    updateCashDisplay();
};

// --- QR DINAMIS SESUAI TOTAL (gantikan keypad saat QRIS) ---
function currentQrisPayload() {
    if (!CONFIG.QRIS_STATIC) return null;
    return qrisStaticToDynamic(CONFIG.QRIS_STATIC, currentTotalBill);
}
function renderQrisQr() {
    if (!elsPay.qrBox) return;
    if (elsPay.qrAmount) elsPay.qrAmount.textContent = fmt(currentTotalBill);
    const dyn = currentQrisPayload();
    elsPay.qrBox.innerHTML = '';
    elsPay.qrBox.dataset.payload = dyn || '';
    if (!dyn) { elsPay.qrBox.innerHTML = '<p class="text-xs font-bold text-red-600 p-4">QRIS belum dikonfigurasi</p>'; return; }
    try {
        if (typeof qrcode === 'undefined') throw new Error('lib qr belum termuat');
        const qr = qrcode(0, 'M'); qr.addData(dyn); qr.make();
        elsPay.qrBox.innerHTML = qr.createSvgTag(6, 0);
        const svg = elsPay.qrBox.querySelector('svg');
        if (svg) { svg.setAttribute('width', '300'); svg.setAttribute('height', '300'); }
    } catch (e) {
        console.warn('QR render fail:', e);
        elsPay.qrBox.innerHTML = '<p class="text-xs font-bold text-red-600 p-4">Gagal bikin QR,<br>pakai nominal manual</p>';
    }
}
function qrisQrDataUrlFor(amount, cellSize = 4) {
    if (!CONFIG.QRIS_STATIC) return null;
    const dyn = qrisStaticToDynamic(CONFIG.QRIS_STATIC, amount);
    if (!dyn) return null;
    try {
        if (typeof qrcode === 'undefined') return null;
        const qr = qrcode(0, 'M'); qr.addData(dyn); qr.make();
        return qr.createDataURL(cellSize, 0);
    } catch (e) { console.warn('QR print fail:', e); return null; }
}

elsPay.btnFinal.addEventListener('click', async () => { 
    const cash = Number(tempCashString) || 0; 
    // Double check validasi saat diklik
    if(currentPaymentMethod === 'CASH' && cash < currentTotalBill) { playSound('error'); return showAlert("DUIT KURANG", "Cek lagi!"); }
    
    elsPay.btnFinal.disabled = true; elsPay.btnFinal.innerText = "SENDING..."; 
    const itemsReport = cart.map(i => ({ ...i, name: i.nickname || i.name })); 
    const customerInfo = { name: els.custName.value.trim().toUpperCase(), method: currentPaymentMethod, pay: cash, change: cash - currentTotalBill, server: serverName }; 
    
    let trxData = null;
    if (activeUnpaidId) {
        // Lunasi hold UNPAID: update di tempat, queueNo tetap sama
        trxData = payUnpaidTransaction(activeUnpaidId, itemsReport, currentTotalBill, els.note.value, customerInfo);
    } else {
        trxData = saveTransaction(itemsReport, currentTotalBill, els.note.value, customerInfo);
    }
    if(trxData) {
        sendToDiscord(itemsReport, currentTotalBill, els.note.value, trxData.queueNo, customerInfo).then(res => { if(!res.success) console.warn("Discord Log Fail"); });
    }
    playSound('success'); elsPay.modal.classList.add('hidden'); 
    showAlert("LUNAS!", `ANTRIAN: #${trxData ? trxData.queueNo : '?'}\n${currentPaymentMethod === 'CASH' ? `Kembalian: ${fmt(customerInfo.change)}` : "QRIS Lunas!"}`); 
    cart = []; els.custName.value = ''; els.note.value = ''; cancelResume(); elsPay.btnFinal.disabled = false; elsPay.btnFinal.innerText = "BAYAR & KIRIM 🚀"; updateCart(); renderUnpaidList(); refreshNoteChips(); saveForm();
});
elsPay.btnClose.addEventListener('click', () => { playSound('click'); elsPay.modal.classList.add('hidden'); });

// --- REPORT & PRINT (CLONING METHOD) ---
window.changeReportPage = (delta) => { playSound('click'); const data = getReport(); const totalPages = Math.ceil(data.totalTrx / itemsPerPage); const newPage = reportPage + delta; if(newPage >= 1 && newPage <= totalPages) { reportPage = newPage; renderReportTable(); } };
function renderReportTable() {
    const data = getReport();
    const history = data.history.sort((a,b) => b.id - a.id); 
    let currentData, paginationControls = '';

    if (isPrintingMode) { currentData = history; } 
    else {
        const totalPages = Math.ceil(history.length / itemsPerPage); if (history.length > 0 && reportPage > totalPages) reportPage = 1;
        const startIndex = (reportPage - 1) * itemsPerPage; currentData = history.slice(startIndex, startIndex + itemsPerPage);
        paginationControls = `<div class="pagination-controls flex justify-between items-center mt-4 pt-2 border-t border-gray-200 shrink-0"><span class="text-xs text-gray-500 font-bold">Halaman ${reportPage} dari ${totalPages || 1}</span><div class="flex gap-2"><button onclick="changeReportPage(-1)" class="px-3 py-1 border border-black rounded text-xs font-bold hover:bg-gray-200 disabled:opacity-50" ${reportPage === 1 ? 'disabled' : ''}>&lt; Prev</button><button onclick="changeReportPage(1)" class="px-3 py-1 border border-black rounded text-xs font-bold hover:bg-gray-200 disabled:opacity-50" ${reportPage >= totalPages ? 'disabled' : ''}>Next &gt;</button></div></div>`;
    }

    const headerHtml = `<div class="mb-6 shrink-0 text-center md:text-left border-b-4 border-black pb-4"><h2 class="font-black text-4xl mb-1 uppercase text-bebyte-purple">Laporan Transaksi</h2><p class="text-sm font-bold text-gray-600">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>${isPrintingMode ? `<p class="text-xs mt-2 font-bold italic text-gray-500">Event: ${CONFIG.EVENT_NAME} • Booth ${CONFIG.STORE_NAME}</p>` : ''}</div>`;
    const tableHeader = `<thead class="bg-gray-100 text-gray-600 text-xs uppercase font-bold text-left sticky top-0 z-10"><tr><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Antrian</th><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Waktu</th><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Pembeli</th><th class="px-4 py-3 w-1/3 border-b-2 border-gray-200 bg-gray-100">Detail Item</th><th class="px-4 py-3 border-b-2 border-gray-200 bg-gray-100">Metode</th><th class="px-4 py-3 text-right border-b-2 border-gray-200 bg-gray-100">Total</th></tr></thead>`;
    const tableRows = currentData.map((tx, index) => {
        const itemsSummary = tx.items.map(i => `<div class="font-bold text-xs text-black whitespace-nowrap">• ${i.qty}x ${i.name}</div>`).join('');
        const rowColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        const isUnpaidTx = tx.status === 'UNPAID' || (tx.customer && tx.customer.method === 'UNPAID');
        const isFinishedTx = !!tx.finished;
        const doneMark = '<div class="mt-1 text-base leading-none text-center">✅</div>';
        const methodBadge = isUnpaidTx ? '<span class="text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-200">UNPAID</span>' : (tx.customer.method === 'QRIS' ? '<span class="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">QRIS</span>' : '<span class="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">TUNAI</span>');
        const noteDisplay = tx.note ? `<div class="text-[10px] text-gray-500 italic mt-1 truncate max-w-[150px]">"${tx.note}"</div>` : '';
        const queueDisplay = tx.queueNo ? `<span class="text-lg font-black">#${tx.queueNo}</span>` : `#${tx.id.toString().slice(-4)}`;
        const discordOff = CONFIG.DISCORD === false;
        const actionBtn = isPrintingMode ? '' : (isFinishedTx ? doneMark : (discordOff ? `<button disabled class="mt-1 bg-gray-400 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 w-full justify-center opacity-60 cursor-not-allowed">✖ Discord</button>` : `<button onclick="notifyDone('${tx.queueNo || '?'}', '${tx.customer.name}')" class="mt-1 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-green-500 shadow active:scale-95 flex items-center gap-1 w-full justify-center">✅ PANGGIL</button>`));
        const payBtn = (!isPrintingMode && isUnpaidTx) ? `<button onclick="payUnpaidFromReport('${tx.id}')" class="mt-1 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-red-500 shadow active:scale-95 flex items-center gap-1 w-full justify-center">💰 BAYAR</button>` : '';
        const finishBtn = (!isPrintingMode && !isUnpaidTx && !isFinishedTx) ? `<button onclick="finishOrder('${tx.id}')" class="mt-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-blue-500 shadow active:scale-95 flex items-center gap-1 w-full justify-center">🏁 FINISH</button>` : ((!isPrintingMode && isFinishedTx) ? doneMark : '');
        const receiptBtn = isPrintingMode ? '' : `<button onclick="printReceipt('${tx.id}')" class="mt-1 bg-gray-800 text-white text-[9px] font-bold px-1 py-0.5 rounded hover:bg-black shadow active:scale-95 flex items-center gap-1 w-full justify-center">🧾 RESI 58mm</button>`;
        return `<tr class="${rowColor} border-b border-gray-200 hover:bg-gray-100 transition group"><td class="px-4 py-3 text-bebyte-purple align-top text-center"><div class="h-8 flex items-center justify-center">${queueDisplay}</div>${actionBtn}</td><td class="px-4 py-3 text-xs font-medium text-gray-500 align-top whitespace-nowrap">${new Date(tx.id).toLocaleTimeString('id-ID')}<br><span class="text-[10px]">${new Date(tx.id).toLocaleDateString('id-ID')}</span></td><td class="px-4 py-3 align-top"><div class="font-bold text-sm text-black uppercase truncate max-w-[120px]">${tx.customer.name}</div>${noteDisplay}</td><td class="px-4 py-3 align-top"><div class="max-h-[100px] overflow-y-auto custom-scroll pr-1">${itemsSummary}</div></td><td class="px-4 py-3 text-xs align-top text-center"><div class="h-8 flex items-center justify-center">${methodBadge}</div>${payBtn}${finishBtn}</td><td class="px-4 py-3 text-sm font-bold text-black text-right align-top"><div class="h-8 flex items-center justify-end">${fmt(tx.total)}</div>${receiptBtn}</td></tr>`;
    }).join('');
    const summaryHtml = `<div class="report-summary mt-8 pt-4 border-t-4 border-black grid grid-cols-2 gap-4 break-inside-avoid"><div class="leading-tight text-center"><h3 class="font-black text-lg uppercase mb-2">Ringkasan Penjualan</h3><p class="text-sm font-bold text-gray-600">Total Transaksi: <span class="text-black text-lg">${data.totalTrx}</span>${(data.finishedCount > 0) ? ` &nbsp; <span class="text-green-600">Selesai: ${data.finishedCount}</span>` : ''}</p>${(data.unpaidCount > 0) ? `<p class="text-sm font-bold text-red-600">Belum bayar: ${data.unpaidCount} (${fmt(data.unpaidTotal)})</p>` : ''}<p class="text-sm font-bold text-blue-600">Hari ini ${data.todayCount} Transaksi (${fmt(data.todayOmset)})</p></div><div class="text-right"><p class="text-sm font-bold text-gray-600 uppercase">Total Omset</p><h2 class="font-black text-4xl text-bebyte-purple">${fmt(data.totalOmset)}</h2></div></div>${isPrintingMode ? `<div class="mt-8 text-center break-inside-avoid"><p class="text-sm font-bold">ttd Server ${serverName || '-'}</p><div style="height:60px"></div><p class="text-xs font-bold">( .............................. )</p></div><div class="mt-8 text-center text-xs font-bold text-gray-400">--- End of Report ---</div>` : ''}`;
    const containerClass = isPrintingMode ? "" : "max-h-[50vh] overflow-y-auto custom-scroll border border-gray-200 rounded-lg";
    els.reportContent.innerHTML = `${headerHtml}<div class="${containerClass}"><table class="w-full">${tableHeader}<tbody>${tableRows || '<tr><td colspan="6" class="p-4 text-center text-gray-400">Belum ada data</td></tr>'}</tbody></table></div>${isPrintingMode ? summaryHtml : paginationControls}`;
}
els.btnReport.addEventListener('click', () => { playSound('click'); isPrintingMode = false; reportPage = 1; renderReportTable(); els.modalReport.classList.remove('hidden'); });

document.getElementById('btn-print-pdf').addEventListener('click', () => { 
    playSound('click'); 
    isPrintingMode = true; 
    renderReportTable(); 
    const content = document.getElementById('report-content').innerHTML;
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = content;
    setTimeout(() => { 
        window.print(); 
        setTimeout(() => { printArea.innerHTML = ''; isPrintingMode = false; renderReportTable(); }, 1000);
    }, 1000); 
});

if(els.btnResetDB) els.btnResetDB.addEventListener('click', () => { showConfirm("RESET DATABASE?", "Semua data penjualan bakal ilang permanen, yakin?", () => { clearReportData(); }); });
if(els.btnBackup) els.btnBackup.addEventListener('click', () => { playSound('click'); downloadBackup(); });

// UPDATE 3: LOGIC RESTORE / UPLOAD JSON
if (els.btnRestore && els.inputRestore) {
    // 1. Klik tombol UI -> Trigger klik pada input file tersembunyi
    els.btnRestore.addEventListener('click', () => {
        playSound('click');
        els.inputRestore.value = ''; // Reset biar bisa pilih file yang sama berulang kali
        els.inputRestore.click();
    });

    // 2. Saat file dipilih user
    els.inputRestore.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 3. Konfirmasi Bahaya (karena akan menimpa data lama)
        showConfirm("TIMPA DATA?", "Database sekarang bakal diganti sama isi file JSON ini. Yakin?", () => {
            restoreBackup(file, (success) => {
                if (success) {
                    playSound('success');
                    // Pakai alert bawaan browser agar thread berhenti sejenak sebelum reload
                    alert("✅ RESTORE BERHASIL!\nHalaman akan dimuat ulang.");
                    window.location.reload();
                } else {
                    playSound('error');
                    showAlert("GAGAL!", "File korup atau format JSON salah.");
                }
            });
        });
    });
}

// --- EXTRAS ---
window.notifyDone = (qNo, cName) => { showConfirm("PANGGIL PEMBELI?", `Kirim notif ke Discord antrian #${qNo} selesai?`, () => { sendOrderDone(qNo, cName, serverName); playSound('success'); showAlert("TERKIRIM! 📢", `Notif #${qNo} sent.`); }); };
// --- PRINT RESI THERMAL 58mm DARI HISTORY ---
window.printReceipt = (id) => {
    playSound('click');
    const data = getReport();
    const tx = data.history.find(t => String(t.id) === String(id));
    if (!tx) return showAlert("GAGAL!", "Data transaksi tidak ditemukan.");
    // Area cetak aman: kolom 3-30 (kolom 1-2 kepotong printer).
    // Jadi lebar konten = 28, tiap baris dikasih 2 spasi di depan sebagai korban.
    const W = 28;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const pad = (s) => '  ' + String(s).slice(0, W);
    const cleanRp = (v) => fmt(Number(v) || 0).replace(/\u00A0/g, ' ');
    const hr = (ch = '=') => esc(pad(ch.repeat(W)));
    const center = (t) => { t = String(t).slice(0, W); const sp = Math.max(0, Math.floor((W - t.length) / 2)); return esc(pad(' '.repeat(sp) + t)); };
    const row = (l, r) => { l = String(l); r = String(r); let space = W - l.length - r.length; if (space < 1) { l = l.slice(0, W - r.length - 1); space = 1; } return esc(pad(l + ' '.repeat(space) + r)); };
    const rowBold = (l, r) => { l = String(l); r = String(r); let space = W - l.length - r.length; if (space < 1) { l = l.slice(0, W - r.length - 1); space = 1; } return '<b>' + esc(pad(l + ' '.repeat(space) + r)) + '</b>'; };
    const rowRightBold = (l, r) => { l = String(l); r = String(r); let space = W - l.length - r.length; if (space < 1) { l = l.slice(0, W - r.length - 1); space = 1; } return esc('  ' + l + ' '.repeat(space)) + '<b>' + esc(r) + '</b>'; };
    const wrap = (t, prefix = '') => { // bungkus teks panjang ke lebar W
        const words = String(t).split(' '); const lines = []; let cur = prefix;
        words.forEach(w => { if ((cur + (cur === prefix ? '' : ' ') + w).length > W) { lines.push(pad(cur)); cur = prefix + w; } else { cur = cur === prefix ? cur + w : cur + ' ' + w; } });
        if (cur.trim()) lines.push(pad(cur)); return esc(lines.join('\n'));
    };
    const store = (CONFIG && CONFIG.STORE_NAME) ? CONFIG.STORE_NAME : 'BeByte';
    const dateStr = tx.date || new Date(tx.id).toLocaleString('id-ID');
    const custName = (tx.customer && tx.customer.name) ? tx.customer.name : '-';
    const queueNo = tx.queueNo || String(tx.id).slice(-4);
    const method = (tx.customer && tx.customer.method) ? tx.customer.method : 'CASH';
    const total = Number(tx.total) || 0;
    let pay = (tx.customer && tx.customer.pay != null) ? Number(tx.customer.pay) || 0 : 0;
    let change = (tx.customer && tx.customer.change != null) ? Number(tx.customer.change) || 0 : 0;
    const isUnpaidTx = (tx.status === 'UNPAID' || method === 'UNPAID');
    if (method === 'QRIS') { pay = total; change = 0; } // QRIS lunas, abaikan data pay/change lama yg minus
    const itemLines = (Array.isArray(tx.items) ? tx.items : []).map(i => {
        const qty = Number(i.qty) || 0;
        const nick = (i.nickname || i.name || 'ITEM').toString();
        const lineTotal = (Number(i.price) || 0) * qty;
        return row(`${qty}x ${nick}`, cleanRp(lineTotal));
    }).join('\n');
    const nowPrint = new Date().toLocaleString('id-ID');
    // Cust + Queue satu baris, nomor rata kanan mentok kolom 30, tebal, tanpa label "Queue:"
    const custLeftRaw = `Cust:${custName}`.slice(0, W);
    const queueRight = `#${queueNo}`;
    let custQueueLine;
    {
        let l = custLeftRaw; const r = queueRight;
        let space = W - l.length - r.length;
        if (space < 1) { l = l.slice(0, W - r.length - 1); space = 1; }
        custQueueLine = esc('  ' + l + ' '.repeat(space)) + '<b>' + esc(r) + '</b>';
    }
    let receiptHead = '';
    receiptHead += row('+', '+') + '\n'; // penanda sudut kiri-kanan atas, korban clipping PrintA
    // Nama toko center pakai CSS (bukan spasi) biar titik tengah presisi walau fontnya lebih besar
    let storeShort = String(store);
    const storeFs = storeShort.length <= 16 ? 16 : (storeShort.length <= 22 ? 13 : 11);
    storeShort = storeShort.slice(0, storeFs === 16 ? 16 : (storeFs === 13 ? 22 : 27));
    const storeHtml = `<div style="text-align:center;font-weight:900;font-size:${storeFs}px;line-height:1.3;">${esc(storeShort)}</div>`;
    const logoHtml = (CONFIG.RECEIPT_LOGO && CONFIG.LOGO) ? `<div style="text-align:center;margin:2px 0;"><img src="${CONFIG.LOGO}" style="display:block;margin:0 auto;width:40px;height:auto;" onerror="this.parentNode.remove()"></div>` : '';
    let receiptTop = '';
    receiptTop += hr('=') + '\n';
    receiptTop += wrap(`Date:${dateStr}`) + '\n';
    const servName = (tx.customer && tx.customer.server) ? tx.customer.server : serverName;
    if (servName) receiptTop += wrap(`Serv:${servName}`) + '\n';
    receiptTop += custQueueLine + '\n';
    receiptTop += hr('=') + '\n';
    receiptTop += itemLines + '\n';
    receiptTop += hr('+') + '\n';
    receiptTop += rowBold('Total:', cleanRp(total)) + '\n';
    const isQrisPaid = !isUnpaidTx && method === 'QRIS';
    if (isUnpaidTx) {
        receiptTop += row('Status:', 'BELUM BAYAR') + '\n';
    } else if (!isQrisPaid) {
        receiptTop += row(`${method}:`, cleanRp(pay)) + '\n';
        receiptTop += row('Change:', cleanRp(change)) + '\n';
    }
    // QRIS lunas: QR dinamis dicetak, tanpa baris bayar/kembalian
    let qrBlock = '';
    if (isQrisPaid) {
        const qrUrl = qrisQrDataUrlFor(total);
        if (qrUrl) qrBlock = `<div style="padding-left:12px;margin:2px 0;"><img class="qr-img" src="${qrUrl}" style="width:168px;height:168px;image-rendering:pixelated;display:block;"></div>`;
    }
    let receiptBottom = '';
    if (tx.note) receiptBottom += wrap(`Note:${tx.note}`) + '\n';
    receiptBottom += center(CONFIG.RECEIPT_FOOTER || 'Terima Kasih') + '\n';
    receiptBottom += wrap(`ID:${tx.id}`) + '\n';
    receiptBottom += wrap(`Print:${nowPrint}`) + '\n';
    receiptBottom += row('+', '+'); // penanda sudut kiri-kanan bawah, korban clipping PrintA
    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `<div class="thermal-receipt"><pre>${receiptHead}</pre>${logoHtml}${storeHtml}<pre>${receiptTop}</pre>${qrBlock}<pre>${receiptBottom}</pre></div>`;
    printArea.classList.add('receipt-mode'); // pakai @page receipt58 bila didukung browser
    const cleanup = () => { printArea.innerHTML = ''; printArea.classList.remove('receipt-mode'); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    // Tunggu semua gambar (logo + QR) selesai di-decode dulu baru print
    const pendingImgs = [...printArea.querySelectorAll('.thermal-receipt img')].filter(i => !i.complete);
    const doPrint = () => window.print();
    if (!pendingImgs.length) {
        doPrint();
    } else {
        let printed = false;
        const go = () => { if (!printed) { printed = true; doPrint(); } };
        pendingImgs.forEach(i => { i.onload = go; i.onerror = go; });
        setTimeout(go, 1500);
    }
    setTimeout(() => { if (printArea.innerHTML) cleanup(); }, 5000);
};
function getNoteParts() { return els.note.value.split(',').map(s => s.trim()).filter(Boolean); }
function refreshNoteChips() {
    const parts = getNoteParts().map(p => p.toLowerCase());
    document.querySelectorAll('#note-chips [data-note]').forEach(b => {
        if (!b.dataset.label) b.dataset.label = b.textContent;
        const active = parts.includes(b.dataset.note.toLowerCase());
        b.textContent = active ? `✓ ${b.dataset.label}` : b.dataset.label;
        b.classList.toggle('bg-bebyte-yellow', active);
        b.classList.toggle('border-black', active);
        b.classList.toggle('bg-white', !active);
        b.classList.toggle('border-gray-400', !active);
    });
}
// Toggle shortcut catatan: ketuk = tambah (centang), ketuk lagi = hapus. Takeaway ↔ Dine In saling menggantikan.
window.toggleNote = (btn) => {
    playSound('click');
    const val = btn.dataset.note;
    let parts = getNoteParts();
    const idx = parts.findIndex(p => p.toLowerCase() === val.toLowerCase());
    if (idx >= 0) { parts.splice(idx, 1); }
    else {
        const low = val.toLowerCase();
        if (low.includes('takeaway')) parts = parts.filter(p => !p.toLowerCase().includes('dine in'));
        else if (low.includes('dine in')) parts = parts.filter(p => !p.toLowerCase().includes('takeaway'));
        parts.push(val);
    }
    els.note.value = parts.join(', ');
    els.note.focus(); toggleNoteClear(); refreshNoteChips();
};
window.addNote = (text) => { playSound('click'); els.note.value = els.note.value ? `${els.note.value}, ${text}` : text; els.note.focus(); toggleNoteClear(); refreshNoteChips(); };
window.clearNote = () => { playSound('click'); els.note.value = ''; els.note.focus(); toggleNoteClear(); refreshNoteChips(); };
function toggleNoteClear() { const b = document.getElementById('note-clear'); if (b) b.classList.toggle('hidden', !els.note.value); }
els.note.addEventListener('input', () => { toggleNoteClear(); refreshNoteChips(); saveForm(); });
els.custName.addEventListener('input', saveForm);
// --- FORM (nama + catatan) ikut tersimpan biar tahan reload ---
function saveForm() { try { localStorage.setItem('bebyte_form', JSON.stringify({ name: els.custName.value, note: els.note.value })); } catch (e) {} }
function restoreForm() { try { const f = JSON.parse(localStorage.getItem('bebyte_form') || '{}'); if (f.name) els.custName.value = f.name; if (f.note) els.note.value = f.note; } catch (e) {} }
window.toggleFullscreen = () => { playSound('click'); if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>console.log(e)); else if (document.exitFullscreen) document.exitFullscreen(); };

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") { els.modalVariant.classList.add('hidden'); elsPay.modal.classList.add('hidden'); elsQty.modal.classList.add('hidden'); elsEdit.modal.classList.add('hidden'); els.alertModal.classList.add('hidden'); els.modalReport.classList.add('hidden'); const _tm = document.getElementById('modal-theme'); if (_tm && !_tm.classList.contains('hidden')) window.closeTheme(); const _sv = document.getElementById('modal-server'); if (_sv && !_sv.classList.contains('hidden')) window.closeServer(); }
    if (e.key === "F2") { e.preventDefault(); els.custName.focus(); }
});
window.addEventListener('beforeunload', (e) => { if (cart.length > 0) { e.preventDefault(); e.returnValue = ''; } });
document.getElementById('close-variant').addEventListener('click', () => { playSound('click'); els.modalVariant.classList.add('hidden'); });
document.getElementById('close-payment').addEventListener('click', () => { playSound('click'); elsPay.modal.classList.add('hidden'); });
document.getElementById('close-report').addEventListener('click', () => { playSound('click'); els.modalReport.classList.add('hidden'); });

const statusDot = document.getElementById('status-dot');
function updateOnlineStatus() { if (!statusDot) return; if (navigator.onLine) { statusDot.classList.remove('bg-red-600'); statusDot.classList.add('bg-green-500'); statusDot.title = "Online"; } else { statusDot.classList.remove('bg-green-500'); statusDot.classList.add('bg-red-600', 'animate-pulse'); statusDot.title = "OFFLINE!"; showAlert("KONEKSI PUTUS!", "Cek internet!"); } }
window.addEventListener('online', updateOnlineStatus); window.addEventListener('offline', updateOnlineStatus); updateOnlineStatus();

// --- PWA: daftarkan Service Worker (https/localhost saja) ---
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW fail', e)); });
}

// --- TEMA (ganti palet warna seluruh aplikasi) ---
const THEMES = [
    { id: 'bebyte',     name: 'BeByte',      icon: '💜', desc: 'Ungu kuning bawaan',      c: { purple: '#6D28D9', yellow: '#FFE100', dark: '#2e1065', green: '#4ade80', red: '#DC2626' } },
    { id: 'merahputih', name: 'Merah Putih', icon: '🇮🇩', desc: 'Semarak tujuhbelasan',     c: { purple: '#B91C1C', yellow: '#FFFFFF', dark: '#450A0A', green: '#22C55E', red: '#7F1D1D' } },
    { id: 'mint',        name: 'Mint',        icon: '🌿', desc: 'Natural & religius',       c: { purple: '#047857', yellow: '#D1FAE5', dark: '#064E3B', green: '#34D399', red: '#B91C1C' } },
    { id: 'cappuccino',  name: 'Cappuccino',  icon: '☕', desc: 'Pas buat pameran kopi',    c: { purple: '#6F4E37', yellow: '#EFE3CE', dark: '#3B2314', green: '#84A98D', red: '#9D0208' } },
    { id: 'ocean',       name: 'Ocean',       icon: '🌊', desc: 'Biru segar',               c: { purple: '#0369A1', yellow: '#E0F2FE', dark: '#082F49', green: '#4ADE80', red: '#DC2626' } },
    { id: 'bluematrix',  name: 'Blue Matrix', icon: '💠', desc: 'Biru neon stabilo',        c: { purple: '#1D4ED8', yellow: '#22D3EE', dark: '#082F49', green: '#A3E635', red: '#F43F5E' } }
];
function currentThemeId() { return (THEMES.some(t => t.id === document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : 'bebyte'); }
function applyTheme(id) {
    if (!THEMES.some(t => t.id === id)) id = 'bebyte';
    document.documentElement.dataset.theme = id;
    try { localStorage.setItem('bebyte_theme', id); } catch (e) {}
    renderThemeGrid();
}
function renderThemeGrid() {
    const grid = document.getElementById('theme-grid');
    if (!grid) return;
    const active = currentThemeId();
    grid.innerHTML = THEMES.map(t => {
        const isActive = t.id === active;
        const sw = [t.c.purple, t.c.yellow, t.c.green, t.c.red].map(h => `<span class="w-6 h-6 rounded-full border-2 border-black inline-block" style="background:${h}"></span>`).join('');
        return `<button onclick="applyTheme('${t.id}')" class="text-left bg-white border-4 ${isActive ? 'border-black shadow-[4px_4px_0px_0px_black]' : 'border-gray-300'} rounded-xl p-3 hover:translate-y-[1px] transition active:scale-95">
            <div class="text-3xl mb-1">${t.icon}</div>
            <div class="font-black text-sm uppercase">${isActive ? '✅ ' : ''}${t.name}</div>
            <div class="text-[10px] font-bold text-gray-500 mb-2">${t.desc}</div>
            <div class="flex gap-1">${sw}</div>
        </button>`;
    }).join('');
}
window.applyTheme = (id) => { playSound('click'); applyTheme(id); };
window.openTheme = () => { playSound('click'); renderThemeGrid(); const m = document.getElementById('modal-theme'); m.classList.remove('hidden'); m.classList.add('flex'); };
window.closeTheme = () => { playSound('click'); const m = document.getElementById('modal-theme'); m.classList.add('hidden'); m.classList.remove('flex'); };
document.getElementById('btn-theme').addEventListener('click', window.openTheme);
document.getElementById('close-theme').addEventListener('click', window.closeTheme);

// --- NAMA SERVER (Kasir/Pramusaji): tampil di Discord + resi ---
function updateServerBtn() {
    const b = document.getElementById('btn-server');
    if (!b) return;
    const has = !!serverName;
    b.classList.toggle('bg-bebyte-green', has);
    b.classList.toggle('bg-white', !has);
    b.title = has ? `Server: ${serverName}` : 'Isi nama server';
}
window.openServer = () => { playSound('click'); const i = document.getElementById('server-name'); if (i) { i.value = serverName; setTimeout(() => i.select(), 50); } const m = document.getElementById('modal-server'); m.classList.remove('hidden'); m.classList.add('flex'); };
window.closeServer = () => { playSound('click'); const m = document.getElementById('modal-server'); m.classList.add('hidden'); m.classList.remove('flex'); };
window.saveServer = () => { playSound('click'); const i = document.getElementById('server-name'); serverName = (i ? i.value : '').trim().toUpperCase(); try { localStorage.setItem('bebyte_server', serverName); } catch (e) {} updateServerBtn(); window.closeServer(); };
document.getElementById('btn-server').addEventListener('click', window.openServer);
document.getElementById('close-server').addEventListener('click', window.closeServer);
document.getElementById('btn-save-server').addEventListener('click', window.saveServer);
document.getElementById('server-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') window.saveServer(); });

// --- HERO DARI CONFIG (data.js) ---
(function bindHero() {
    const ev = document.getElementById('hero-event');
    const tag = document.getElementById('hero-tagline');
    const ver = document.getElementById('hero-version');
    const mas = document.getElementById('hero-mascot');
    if (ev && CONFIG.EVENT_NAME) ev.textContent = CONFIG.EVENT_NAME;
    if (tag && CONFIG.TAG_LINE) tag.textContent = CONFIG.TAG_LINE;
    if (CONFIG.STORE_NAME) document.title = `${CONFIG.STORE_NAME} - Order System`;
    if (ver && CONFIG.VERSION) ver.textContent = `🦖 BeByte - ${CONFIG.VERSION}`;
    if (mas && CONFIG.MASCOT) mas.src = CONFIG.MASCOT;
    const logo = document.getElementById('brand-logo');
    const adminLogo = document.getElementById('admin-logo');
    if (logo && CONFIG.LOGO) logo.src = CONFIG.LOGO;
    if (adminLogo && CONFIG.LOGO) adminLogo.src = CONFIG.LOGO;
})();

renderMenu(); restoreForm(); updateCart(); renderUnpaidList(); refreshNoteChips(); toggleNoteClear(); renderThemeGrid(); updateServerBtn();
// Pulihkan indikator resume kalau reload saat hold lagi dibuka
(function restoreResume() {
    if (!activeUnpaidId) return;
    try {
        const data = getReport();
        const tx = data.history.find(t => String(t.id) === String(activeUnpaidId));
        const isUnpaid = tx && (tx.status === 'UNPAID' || (tx.customer && tx.customer.method === 'UNPAID'));
        if (isUnpaid) setResumeUI(tx.queueNo);
        else cancelResume();
    } catch (e) { cancelResume(); }
    renderUnpaidList();
})();
