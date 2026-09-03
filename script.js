const transactionForm = document.getElementById("transaction-form");
const transactionList = document.getElementById("transaction-list");
const filter = document.getElementById("filter");

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expenseElement = document.getElementById("expense");

let transactions = [];

transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const description = document.getElementById("description").value;
    const amount = Number(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;

    const transaction = {
        id: Date.now(),
        description,
        amount,
        type,
        category,
        date
    };

    transactions.push(transaction);

    transactionForm.reset();

    renderTransactions();
    updateSummary();
});

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

    transactions.forEach(function (transaction) {
        const item = document.createElement("div");

        item.classList.add("transaction-item");

        item.innerHTML = `
            <div class="transaction-info">
                <h3>${transaction.description}</h3>
                <p>${transaction.category} • ${transaction.date}</p>
            </div>

            <div class="transaction-right">
                <div class="transaction-amount">
                    Rp ${transaction.amount.toLocaleString("id-ID")}
                </div>

                <button
                    class="delete-btn"
                    onclick="deleteTransaction(${transaction.id})"
                >
                    Delete
                </button>
            </div>
        `;

        transactionList.appendChild(item);
    });
}

function deleteTransaction(id) {
    transactions = transactions.filter(function (transaction) {
        return transaction.id !== id;
    });

    renderTransactions();
    updateSummary();
}

function updateSummary() {
    let income = 0;
    let expense = 0;

    transactions.forEach(function (transaction) {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expense += transaction.amount;
        }
    });

    const balance = income - expense;

    incomeElement.textContent = `Rp ${income.toLocaleString("id-ID")}`;
    expenseElement.textContent = `Rp ${expense.toLocaleString("id-ID")}`;
    balanceElement.textContent = `Rp ${balance.toLocaleString("id-ID")}`;
}

filter.addEventListener("change", function () {
    const selectedFilter = filter.value;

    const transactionItems = document.querySelectorAll(".transaction-item");

    transactionItems.forEach(function (item, index) {
        const transaction = transactions[index];

        if (
            selectedFilter === "all" ||
            transaction.type === selectedFilter
        ) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
});