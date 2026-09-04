const transactionForm = document.getElementById("transaction-form");
const incomeListEl = document.getElementById("incomeList");
const expenseListEl = document.getElementById("expenseList");
const searchForm = document.getElementById("search-form");
const filter = document.getElementById("filter");
const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expenseElement = document.getElementById("expense");

const STORAGE_KEY = "transactions";

let transactions = [];

// ---------- Web Storage API ----------

function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function loadTransactions() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        transactions = [];
        return;
    }
    try {
        const parsed = JSON.parse(stored);
        transactions = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        transactions = [];
    }
}

// ---------- Helpers ----------

function escapeHTML(str) {
    return String(str == null ? "" : str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatRupiah(num) {
    return `Rp ${Number(num).toLocaleString("id-ID")}`;
}

function getFilteredTransactions() {
    const selectedFilter = filter ? filter.value : "all";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";

    return transactions.filter(function (transaction) {
        const matchType =
            selectedFilter === "all" ||
            transaction.type === selectedFilter;

        const matchCategory =
            selectedCategory === "all" ||
            transaction.category === selectedCategory;

        const matchSearch =
            keyword === "" ||
            String(transaction.description || "").toLowerCase().includes(keyword) ||
            String(transaction.category || "").toLowerCase().includes(keyword);

        return matchType && matchCategory && matchSearch;
    });
}

// ---------- Form: ambil data -> proses -> simpan -> update DOM ----------

if (transactionForm) {
    transactionForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const description = document.getElementById("description").value.trim();
        const amount = Number(document.getElementById("amount").value);
        const type = document.getElementById("type").value;
        const category = document.getElementById("category").value;
        const date = document.getElementById("date").value;

        // Validasi minimal (HTML required + min sudah ada, ini pengaman JS)
        if (!description) {
            document.getElementById("description").focus();
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            document.getElementById("amount").focus();
            return;
        }
        if (!date) {
            document.getElementById("date").focus();
            return;
        }
        if (!category) {
            document.getElementById("category").focus();
            return;
        }

        const transaction = {
            id: Date.now(),
            description,
            amount,
            type,
            category,
            date
        };

        transactions.push(transaction);
        saveTransactions();

        transactionForm.reset();

        renderTransactions();
        updateSummary();
    });
}

// ---------- Render daftar transaksi ke DOM (incomeList + expenseList) ----------

function createTransactionElement(transaction) {
    const item = document.createElement("div");

    item.classList.add("transaction-item");
    item.classList.add(transaction.type === "income" ? "income" : "expense");
    item.setAttribute("data-testid", "transaction-item");
    item.setAttribute("data-id", String(transaction.id));
    item.setAttribute("data-type", transaction.type);
    item.setAttribute("data-category", transaction.category);

    const sign = transaction.type === "income" ? "+" : "-";
    const typeIcon = transaction.type === "income"
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>';

    item.innerHTML = `
        <div class="transaction-sign" aria-hidden="true">${typeIcon}</div>
        <div class="transaction-info">
            <h3>${escapeHTML(transaction.description)}</h3>
            <p>${escapeHTML(transaction.category)} • ${escapeHTML(transaction.date)} <span class="badge badge-${escapeHTML(transaction.type)}">${escapeHTML(transaction.type)}</span></p>
        </div>

        <div class="transaction-right">
            <div class="transaction-amount ${escapeHTML(transaction.type)}">
                ${sign} ${escapeHTML(formatRupiah(transaction.amount))}
            </div>

            <button
                type="button"
                class="delete-btn"
                data-testid="delete-button"
                data-id="${transaction.id}"
                data-action="delete"
                aria-label="Delete ${escapeHTML(transaction.description)}"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Delete
            </button>
        </div>
    `;

    return item;
}

function renderListInto(container, items, isFiltered) {
    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = isFiltered
            ? `<p class="empty-message">No transactions found.</p>`
            : `<p class="empty-message">No transactions yet.</p>`;
        return;
    }

    items.forEach(function (transaction) {
        container.appendChild(createTransactionElement(transaction));
    });
}

function renderTransactions() {
    if (!incomeListEl || !expenseListEl) return;

    const isFiltered =
        (filter && filter.value !== "all") ||
        (categoryFilter && categoryFilter.value !== "all") ||
        (searchInput && searchInput.value.trim() !== "");

    const filtered = getFilteredTransactions();

    const incomeItems = filtered.filter(function (t) { return t.type === "income"; });
    const expenseItems = filtered.filter(function (t) { return t.type === "expense"; });

    renderListInto(incomeListEl, incomeItems, isFiltered || transactions.length > 0);
    renderListInto(expenseListEl, expenseItems, isFiltered || transactions.length > 0);
}

// Event delegation untuk tombol delete (mendukung item hasil render dinamis)
document.addEventListener("click", function (event) {
    const btn = event.target.closest('[data-action="delete"], .delete-btn');
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    if (Number.isFinite(id)) {
        deleteTransaction(id);
    }
});

function deleteTransaction(id) {
    const numericId = Number(id);
    transactions = transactions.filter(function (transaction) {
        return transaction.id !== numericId && transaction.id !== id;
    });

    saveTransactions();
    renderTransactions();
    updateSummary();
}

// Agar tetap kompatibel jika ada handler lain yang memanggilnya
window.deleteTransaction = deleteTransaction;

function updateSummary() {
    let income = 0;
    let expense = 0;

    transactions.forEach(function (transaction) {
        if (transaction.type === "income") {
            income += Number(transaction.amount) || 0;
        } else {
            expense += Number(transaction.amount) || 0;
        }
    });

    const balance = income - expense;

    if (incomeElement) incomeElement.textContent = formatRupiah(income);
    if (expenseElement) expenseElement.textContent = formatRupiah(expense);
    if (balanceElement) balanceElement.textContent = formatRupiah(balance);
}

// ---------- Search: submit form + live input ----------

if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        renderTransactions();
    });
}

if (searchInput) {
    searchInput.addEventListener("input", function () {
        renderTransactions();
    });
}

// ---------- Filter interaktif: type + kategori ----------

function syncTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    const current = filter ? filter.value : "all";
    tabs.forEach(function (tab) {
        const active = tab.getAttribute("data-tab") === current;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", active ? "true" : "false");
    });
}

if (filter) {
    filter.addEventListener("change", function () {
        syncTabs();
        renderTransactions();
    });
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
        renderTransactions();
    });
}

document.querySelectorAll(".tab-btn").forEach(function (tab) {
    tab.addEventListener("click", function () {
        const value = tab.getAttribute("data-tab");
        if (filter) filter.value = value;
        syncTabs();
        renderTransactions();
    });
});

// ---------- Init: baca storage lalu render ----------

loadTransactions();
syncTabs();
renderTransactions();
updateSummary();
