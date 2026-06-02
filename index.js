    const STORAGE_KEY = "personal_budget_planner_v1";
    let memoryStore = null;

    const budgetForm = document.getElementById("budgetForm");
    const expenseForm = document.getElementById("expenseForm");
    const budgetInput = document.getElementById("budgetInput");
    const expenseName = document.getElementById("expenseName");
    const expenseAmount = document.getElementById("expenseAmount");
    const expenseCategory = document.getElementById("expenseCategory");
    const clearExpenseForm = document.getElementById("clearExpenseForm");
    const budgetAmount = document.getElementById("budgetAmount");
    const totalSpent = document.getElementById("totalSpent");
    const remainingBudget = document.getElementById("remainingBudget");
    const remainingNote = document.getElementById("remainingNote");
    const budgetPercent = document.getElementById("budgetPercent");
    const progressFill = document.getElementById("progressFill");
    const warningBox = document.getElementById("warningBox");
    const budgetStatus = document.getElementById("budgetStatus");
    const budgetStatusText = document.getElementById("budgetStatusText");
    const categoryList = document.getElementById("categoryList");
    const expenseTableWrap = document.getElementById("expenseTableWrap");
    const categoryFilter = document.getElementById("categoryFilter");

    let state = loadState();

    function loadState() {
      const fallback = { budget: 0, expenses: [] };
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : fallback;
      } catch (error) {
        if (memoryStore) return memoryStore;
        return fallback;
      }
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        memoryStore = JSON.parse(JSON.stringify(state));
      }
    }

    function money(value) {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN"
      }).format(Number(value) || 0);
    }

    function formatDate(value) {
      return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    }

    function escapeHTML(text) {
      return String(text).replace(/[&<>'"]/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;"
      }[char]));
    }

    function getTotals() {
      const spent = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
      const remaining = Number(state.budget) - spent;
      const percent = state.budget > 0 ? Math.round((spent / state.budget) * 100000) : 0;
      return { spent, remaining, percent };
    }

    function renderSummary() {
      const { spent, remaining, percent } = getTotals();
      budgetAmount.textContent = money(state.budget);
      totalSpent.textContent = money(spent);
      remainingBudget.textContent = money(remaining);
      budgetPercent.textContent = `${percent}%`;

      const cappedPercent = Math.min(percent, 100);
      progressFill.style.width = `${cappedPercent}%`;
      progressFill.classList.toggle("near", percent >= 80 && percent <= 100);
      progressFill.classList.toggle("over", percent > 100);

      remainingBudget.classList.toggle("negative", remaining < 0);
      remainingBudget.classList.toggle("positive", remaining >= 0);
      warningBox.classList.toggle("show", state.budget > 0 && remaining < 0);
      budgetStatus.classList.toggle("over", state.budget > 0 && remaining < 0);
      budgetStatus.classList.toggle("near", state.budget > 0 && remaining >= 0 && percent >= 80);

      if (!state.budget) {
        budgetStatusText.textContent = "Set a budget";
        remainingNote.textContent = "Set your budget to begin tracking.";
      } else if (remaining < 0) {
        budgetStatusText.textContent = "Over budget";
        remainingNote.textContent = `You are ${money(Math.abs(remaining))} over budget.`;
      } else if (percent >= 80) {
        budgetStatusText.textContent = "Close to limit";
        remainingNote.textContent = `${money(remaining)} left. Spending is near your limit.`;
      } else {
        budgetStatusText.textContent = "On track";
        remainingNote.textContent = `${money(remaining)} available this month.`;
      }
    }

    function renderCategories() {
      if (!state.expenses.length) {
        categoryList.innerHTML = `<div class="category-item"><span class="category-name">No spending yet</span><span class="category-amount">₦0.00</span></div>`;
        return;
      }

      const totals = state.expenses.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
        return acc;
      }, {});

      categoryList.innerHTML = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => `
          <div class="category-item">
            <span class="category-name">${escapeHTML(category)}</span>
            <span class="category-amount">${money(amount)}</span>
          </div>
        `).join("");
    }

    function renderExpenses() {
      const filter = categoryFilter.value;
      const expenses = filter === "All"
        ? state.expenses
        : state.expenses.filter(item => item.category === filter);

      if (!expenses.length) {
        expenseTableWrap.innerHTML = `
          <div class="empty-state">
            <strong>${state.expenses.length ? "No matching expenses" : "No expenses yet"}</strong>
            ${state.expenses.length ? "Try another category filter." : "Add your first spending entry from the form."}
          </div>
        `;
        return;
      }

      expenseTableWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(item => `
              <tr>
                <td data-label="Description">${escapeHTML(item.name)}</td>
                <td data-label="Category"><span class="category-badge">${escapeHTML(item.category)}</span></td>
                <td data-label="Amount" class="amount-cell">${money(item.amount)}</td>
                <td data-label="Date">${formatDate(item.createdAt)}</td>
                <td data-label="Action"><button class="btn-danger delete-small" type="button" onclick="deleteExpense('${item.id}')">Delete</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    function render() {
      renderSummary();
      renderCategories();
      renderExpenses();
    }

    budgetForm.addEventListener("submit", event => {
      event.preventDefault();
      state.budget = Number(budgetInput.value) || 0;
      budgetInput.value = "";
      saveState();
      render();
    });

    expenseForm.addEventListener("submit", event => {
      event.preventDefault();
      const name = expenseName.value.trim();
      const amount = Number(expenseAmount.value);
      const category = expenseCategory.value;
      if (!name || !amount || amount <= 0) return;

      state.expenses.push({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name,
        amount,
        category,
        createdAt: new Date().toISOString()
      });

      expenseForm.reset();
      saveState();
      render();
    });

    clearExpenseForm.addEventListener("click", () => expenseForm.reset());
    categoryFilter.addEventListener("change", renderExpenses);

    function deleteExpense(id) {
      state.expenses = state.expenses.filter(item => item.id !== id);
      saveState();
      render();
    }

    render();