let transactions = [];
let editingTransactionId = null;

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

const incomeList = document.getElementById('incomeList');
const expenseList = document.getElementById('expenseList');
const transactionForm = document.getElementById('transactionForm');

const titleInput = document.getElementById('transactionFormTitleInput');
const amountInput = document.getElementById('transactionFormAmountInput');
const dateInput = document.getElementById('transactionFormDateInput');
const typeInput = document.getElementById('transactionFormTypeSelect');

const searchForm = document.getElementById('searchTransactionForm');
const searchInput = document.getElementById('searchTransactionFormTitleInput');

const balanceElement = document.querySelector('.tracker-summary__balance-amount');
const incomeElement = document.querySelector('.tracker-summary__stat-amount--income');
const expenseElement = document.querySelector('.tracker-summary__stat-amount--expense');

function renderTransactions(data = transactions) {
  if (!incomeList || !expenseList) return;

  incomeList.innerHTML = '';
  expenseList.innerHTML = '';

  const list = Array.isArray(data) ? data : [];

  list.forEach((transaction) => {
    const card = document.createElement('div');
    card.setAttribute('data-testid', 'transactionItem');
    card.classList.add('tracker-transaction-item');

    const title = document.createElement('h3');
    title.setAttribute('data-testid', 'transactionItemTitle');
    title.textContent = transaction.title;

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

function deleteTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);

  if (editingTransactionId === id) {
    editingTransactionId = null;
    if (transactionForm) transactionForm.reset();
  }

  saveTransactions();
  document.dispatchEvent(new Event(RENDER_EVENT));
}

function editTransaction(id) {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  titleInput.value = transaction.title;
  amountInput.value = transaction.amount;
  dateInput.value = transaction.date;
  typeInput.value = transaction.type;

  editingTransactionId = id;
  titleInput.focus();
}

document.addEventListener(RENDER_EVENT, function () {
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (keyword !== '') {
    const filtered = transactions.filter((t) =>
      String(t.title || '').toLowerCase().includes(keyword),
    );
    renderTransactions(filtered);
  } else {
    renderTransactions();
  }
  updateSummary();
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
    const keyword = this.value.trim().toLowerCase();

    if (keyword === '') {
      resetSearch();
      return;
    }

    const filteredTransactions = transactions.filter((transaction) =>
      String(transaction.title || '').toLowerCase().includes(keyword),
    );

    renderTransactions(filteredTransactions);
  });
}

if (searchForm) {
  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!searchInput) return;
    const keyword = searchInput.value.trim().toLowerCase();
    if (keyword === '') {
      renderTransactions();
    } else {
      const filtered = transactions.filter((t) =>
        String(t.title || '').toLowerCase().includes(keyword),
      );
      renderTransactions(filtered);
    }
  });
}

function resetSearch() {
  if (searchInput && searchInput.value.trim() === '') {
    renderTransactions();
  }
}

loadTransactions();
document.dispatchEvent(new Event(RENDER_EVENT));
