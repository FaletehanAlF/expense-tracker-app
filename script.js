const transactionForm = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");
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
    if (!category) {
        document.getElementById("category").focus();
        return;
    }
    if (!date) {
        document.getElementById("date").focus();
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

// ---------- Render daftar transaksi ke DOM ----------

function renderTransactions() {
    transactionList.innerHTML = "";

    if (transactions.length === 0) {
        transactionList.innerHTML = `
            <p class="empty-message">
                No transactions yet.
            </p>
        `;

        return;
    }

    const filtered = getFilteredTransactions();

    if (filtered.length === 0) {
        transactionList.innerHTML = `
            <p class="empty-message">
                No transactions found.
            </p>
        `;

        return;
    }

    filtered.forEach(function (transaction) {
        const item = document.createElement("div");

        item.classList.add("transaction-item");
        item.classList.add(transaction.type === "income" ? "income" : "expense");
        item.setAttribute("data-testid", "transaction-item");
        item.setAttribute("data-id", String(transaction.id));
        item.setAttribute("data-type", transaction.type);
        item.setAttribute("data-category", transaction.category);

        const sign = transaction.type === "income" ? "+" : "-";

        item.innerHTML = `
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
                    onclick="deleteTransaction(${transaction.id})"
                >
                    Delete
                </button>
            </div>
        `;

        transactionList.appendChild(item);
    });
}

// Event delegation sebagai pelapis (tetap kompatibel dengan onclick di atas)
transactionList.addEventListener("click", function (event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    // Jika dipicu via onclick, browser sudah memanggil deleteTransaction.
    // Delegation ini memastikan tombol hasil render dinamis tetap berfungsi
    // walau inline handler diblokir (mis. CSP). Cegah double-call:
    // hanya jalankan jika inline handler tidak tersedia.
    if (typeof window.deleteTransaction !== "function") {
        const id = Number(btn.getAttribute("data-id"));
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

// Agar inline onclick="deleteTransaction(...)" selalu bisa diakses
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

    incomeElement.textContent = formatRupiah(income);
    expenseElement.textContent = formatRupiah(expense);
    balanceElement.textContent = formatRupiah(balance);
}

// ---------- Filter interaktif: type + kategori + search ----------

if (filter) {
    filter.addEventListener("change", function () {
        renderTransactions();
    });
}

if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
        renderTransactions();
    });
}

if (searchInput) {
    searchInput.addEventListener("input", function () {
        renderTransactions();
    });
}

// ---------- Init: baca storage lalu render ----------

loadTransactions();
renderTransactions();
updateSummary();
