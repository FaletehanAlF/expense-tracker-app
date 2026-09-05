let transactions = [];
let editingTransactionId = null;
let lastDeleted = null;
let toastTimer = null;

const STORAGE_KEY = 'expense-tracker-data';
const RENDER_EVENT = 'transaction:updated';

function generateId() {
  return +new Date();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadTransactions() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    transactions = [];
    return;
  }
  try {
    const parsed = JSON.parse(data);
    transactions = Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    transactions = [];
  }
}

function getLocalDateString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

function setDefaultDate() {
  if (dateInput && !dateInput.value) {
    dateInput.value = getLocalDateString();
  }
}

const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');
const transactionForm = document.getElementById('transactionForm');

const titleInput = document.getElementById('transactionFormTitleInput');
const amountInput = document.getElementById('transactionFormAmountInput');
const dateInput = document.getElementById('transactionFormDateInput');
const typeInput = document.getElementById('transactionFormTypeSelect');
const submitButton = transactionForm
  ? transactionForm.querySelector('[data-testid="transactionFormSubmitButton"]')
  : null;
const cancelEditButton = document.getElementById('cancelEditButton');

const searchForm = document.getElementById('searchTransactionForm');
const searchInput = document.getElementById('searchTransactionFormTitleInput');

const sortSelect = document.getElementById('sortSelect');
const resultCount = document.getElementById('resultCount');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const undoButton = document.getElementById('undoButton');

const balanceElement = document.querySelector('.tracker-summary__balance-amount');
const incomeElement = document.querySelector('.tracker-summary__stat-amount--income');
const expenseElement = document.querySelector('.tracker-summary__stat-amount--expense');

function setEditMode(isEditing) {
  if (submitButton) submitButton.textContent = isEditing ? 'Update' : 'Simpan';
  if (cancelEditButton) cancelEditButton.hidden = !isEditing;
}

function getVisibleTransactions() {
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const mode = sortSelect ? sortSelect.value : 'newest';

  const visible = transactions.filter((t) =>
    keyword === '' || String(t.title || '').toLowerCase().includes(keyword),
  );

  visible.sort((a, b) => {
    if (mode === 'oldest') {
      return String(a.date || '').localeCompare(String(b.date || '')) || a.id - b.id;
    }
    if (mode === 'largest') {
      return Number(b.amount) - Number(a.amount) || b.id - a.id;
    }
    if (mode === 'smallest') {
      return Number(a.amount) - Number(b.amount) || a.id - b.id;
    }
    return String(b.date || '').localeCompare(String(a.date || '')) || b.id - a.id;
  });

  return visible;
}

function createSvgIcon(children) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  children.forEach((def) => {
    const el = document.createElementNS(ns, def[0]);
    Object.keys(def[1]).forEach((key) => el.setAttribute(key, def[1][key]));
    svg.appendChild(el);
  });
  return svg;
}

function appendEmptyState(container, text, isSearch) {
  const empty = document.createElement('div');
  empty.classList.add('tracker-empty');
  const icon = isSearch
    ? createSvgIcon([
        ['circle', { cx: '11', cy: '11', r: '8' }],
        ['line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }],
      ])
    : createSvgIcon([
        ['polyline', { points: '22 12 16 12 14 15 10 15 8 12 2 12' }],
        ['path', { d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }],
      ]);
  const message = document.createElement('p');
  message.textContent = text;
  empty.append(icon, message);
  container.appendChild(empty);
}

function buildTitleElement(titleText, keyword) {
  const title = document.createElement('h3');
  title.setAttribute('data-testid', 'transactionItemTitle');
  if (!keyword) {
    title.textContent = titleText;
    return title;
  }
  const lower = String(titleText).toLowerCase();
  let from = 0;
  let pos = lower.indexOf(keyword, from);
  if (pos === -1) {
    title.textContent = titleText;
    return title;
  }
  while (pos !== -1) {
    if (pos > from) {
      title.appendChild(document.createTextNode(String(titleText).slice(from, pos)));
    }
    const mark = document.createElement('mark');
    mark.classList.add('tracker-highlight');
    mark.textContent = String(titleText).slice(pos, pos + keyword.length);
    title.appendChild(mark);
    from = pos + keyword.length;
    pos = lower.indexOf(keyword, from);
  }
  if (from < String(titleText).length) {
    title.appendChild(document.createTextNode(String(titleText).slice(from)));
  }
  return title;
}

function renderTransactions(data = transactions, keyword = '') {
  if (!incomeList || !expenseList) return;

  incomeList.innerHTML = '';
  expenseList.innerHTML = '';

  const list = Array.isArray(data) ? data : [];
  const isSearch = String(keyword || '').trim() !== '';

  const incomeItems = list.filter((t) => t.type === 'income');
  const expenseItems = list.filter((t) => t.type !== 'income');

  if (incomeItems.length === 0) {
    appendEmptyState(
      incomeList,
      isSearch ? 'Tidak ada pemasukan yang cocok.' : 'Belum ada pemasukan.',
      isSearch,
    );
  }
  if (expenseItems.length === 0) {
    appendEmptyState(
      expenseList,
      isSearch ? 'Tidak ada pengeluaran yang cocok.' : 'Belum ada pengeluaran.',
      isSearch,
    );
  }

  list.forEach((transaction) => {
    const card = document.createElement('div');
    card.setAttribute('data-testid', 'transactionItem');
    card.classList.add('tracker-transaction-item');

    const title = buildTitleElement(transaction.title, isSearch ? String(keyword).trim().toLowerCase() : '');

    const amount = document.createElement('p');
    amount.setAttribute('data-testid', 'transactionItemAmount');
    amount.textContent = `Nominal: ${formatCurrency(transaction.amount)}`;

    const date = document.createElement('p');
    date.setAttribute('data-testid', 'transactionItemDate');
    date.textContent = `Tanggal: ${transaction.date}`;

    const type = document.createElement('p');
    type.setAttribute('data-testid', 'transactionItemType');
    type.textContent = transaction.type === 'income' ? 'Tipe: Pemasukan' : 'Tipe: Pengeluaran';

    const actionContainer = document.createElement('div');
    actionContainer.classList.add('tracker-transaction-item__actions');

    const editButton = document.createElement('button');
    editButton.setAttribute('data-testid', 'transactionItemEditButton');
    editButton.classList.add('tracker-button', 'tracker-button--edit');
    editButton.textContent = 'Edit';
    editButton.type = 'button';
    editButton.addEventListener('click', function () {
      editTransaction(transaction.id);
    });

    const editTypeButton = document.createElement('button');
    editTypeButton.setAttribute('data-testid', 'transactionItemEditTypeButton');
    editTypeButton.classList.add('tracker-button', 'tracker-button--type');
    editTypeButton.textContent = 'Ubah Tipe';
    editTypeButton.type = 'button';
    editTypeButton.addEventListener('click', function () {
      toggleTransactionType(transaction.id);
    });

    const deleteButton = document.createElement('button');
    deleteButton.setAttribute('data-testid', 'transactionItemDeleteButton');
    deleteButton.classList.add('tracker-button', 'tracker-button--delete');
    deleteButton.textContent = 'Hapus';
    deleteButton.type = 'button';
    deleteButton.addEventListener('click', function () {
      deleteTransaction(transaction.id);
    });

    actionContainer.append(editButton, editTypeButton, deleteButton);

    const content = document.createElement('div');
    content.classList.add('tracker-transaction-item__content');
    content.append(title, amount, date, type);

    card.append(content, actionContainer);

    if (transaction.type === 'income') {
      incomeList.appendChild(card);
    } else {
      expenseList.appendChild(card);
    }
  });
}

function updateResultCount(visibleCount, totalCount) {
  if (!resultCount) return;
  if (totalCount === 0) {
    resultCount.textContent = 'Belum ada transaksi.';
    return;
  }
  resultCount.textContent = `Menampilkan ${visibleCount} dari ${totalCount} transaksi.`;
}

function refreshView() {
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const visible = getVisibleTransactions();
  renderTransactions(visible, keyword);
  updateSummary();
  updateResultCount(visible.length, transactions.length);
}

if (transactionForm) {
  transactionForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const title = titleInput.value;
    const amount = Number(amountInput.value);
    const date = dateInput.value;
    const type = typeInput.value;

    if (!validateTransaction(title, amount)) {
      return;
    }

    if (editingTransactionId !== null) {
      const index = transactions.findIndex((item) => item.id === editingTransactionId);
      if (index !== -1) {
        transactions[index] = {
          id: editingTransactionId,
          title: title.trim(),
          amount,
          date,
          type,
        };
      }
      editingTransactionId = null;
      setEditMode(false);
    } else {
      transactions.push({
        id: generateId(),
        title: title.trim(),
        amount,
        date,
        type,
      });
    }

    saveTransactions();
    document.dispatchEvent(new Event(RENDER_EVENT));

    transactionForm.reset();
    setDefaultDate();
    if (titleInput) titleInput.focus();
  });
}

function validateTransaction(title, amount) {
  if (!title || title.trim() === '') {
    alert('Judul transaksi tidak boleh kosong!');
    return false;
  }

  if (!Number.isFinite(amount) || amount < 1) {
    alert('Nominal transaksi harus minimal Rp1!');
    return false;
  }

  return true;
}

function updateSummary() {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((transaction) => {
    const value = Number(transaction.amount) || 0;
    if (transaction.type === 'income') {
      totalIncome += value;
    } else {
      totalExpense += value;
    }
  });

  const balance = totalIncome - totalExpense;

  if (balanceElement) balanceElement.textContent = formatCurrency(balance);
  if (incomeElement) incomeElement.textContent = formatCurrency(totalIncome);
  if (expenseElement) expenseElement.textContent = formatCurrency(totalExpense);
}

function showToast() {
  if (!toast) return;
  if (toastMessage) toastMessage.textContent = 'Transaksi dihapus.';
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    lastDeleted = null;
    hideToast();
  }, 5000);
}

function hideToast() {
  if (!toast) return;
  toast.hidden = true;
}

function deleteTransaction(id) {
  const index = transactions.findIndex((transaction) => transaction.id === id);
  if (index === -1) return;
  lastDeleted = { item: transactions[index], index };

  transactions = transactions.filter((transaction) => transaction.id !== id);

  if (editingTransactionId === id) {
    editingTransactionId = null;
    setEditMode(false);
    if (transactionForm) transactionForm.reset();
    setDefaultDate();
  }

  saveTransactions();
  document.dispatchEvent(new Event(RENDER_EVENT));
  showToast();
}

function editTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  titleInput.value = transaction.title;
  amountInput.value = transaction.amount;
  dateInput.value = transaction.date;
  typeInput.value = transaction.type;

  editingTransactionId = id;
  setEditMode(true);
  titleInput.focus();
}

document.addEventListener(RENDER_EVENT, function () {
  refreshView();
});

function toggleTransactionType(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  transaction.type = transaction.type === 'income' ? 'expense' : 'income';

  saveTransactions();
  document.dispatchEvent(new Event(RENDER_EVENT));
}

if (searchInput) {
  searchInput.addEventListener('input', function () {
    refreshView();
  });
}

if (searchForm) {
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    refreshView();
  });
}

function resetSearch() {
  if (searchInput && searchInput.value.trim() === '') {
    refreshView();
  }
}

if (sortSelect) {
  sortSelect.addEventListener('change', function () {
    refreshView();
  });
}

if (cancelEditButton) {
  cancelEditButton.addEventListener('click', function () {
    editingTransactionId = null;
    if (transactionForm) transactionForm.reset();
    setDefaultDate();
    setEditMode(false);
    if (titleInput) titleInput.focus();
  });
}

if (undoButton) {
  undoButton.addEventListener('click', function () {
    if (!lastDeleted) {
      hideToast();
      return;
    }
    const restored = lastDeleted;
    lastDeleted = null;
    if (toastTimer) clearTimeout(toastTimer);
    const pos = Math.min(Math.max(restored.index, 0), transactions.length);
    transactions.splice(pos, 0, restored.item);
    saveTransactions();
    document.dispatchEvent(new Event(RENDER_EVENT));
    hideToast();
  });
}

loadTransactions();
setDefaultDate();
setEditMode(false);
document.dispatchEvent(new Event(RENDER_EVENT));
