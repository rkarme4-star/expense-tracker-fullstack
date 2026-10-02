const API_URL = 'http://localhost:3000/api/expenses';
const SERVER_DOWN_MESSAGE = 'Cannot reach the server. Please make sure it is running.';

let allExpenses = [];

const categoryColors = {
  Food: 'bg-success',
  Transport: 'bg-primary',
  Bills: 'bg-danger',
  Entertainment: 'bg-warning text-dark',
  Other: 'bg-secondary',
};

const editModal = new bootstrap.Modal(document.getElementById('editModal'));

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showAlert(message, type, boxId = 'alertBox') {
  document.getElementById(boxId).innerHTML =
    `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}


async function loadExpenses() {
  const spinner = document.getElementById('spinner');
  spinner.style.display = '';
  document.getElementById('alertBox').innerHTML = '';

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!response.ok) throw new Error(data.message);

    allExpenses = data;
    renderTable(getFilteredExpenses());
    renderSummary(allExpenses); // the cards always use ALL expenses
  } catch (error) {
    showAlert(SERVER_DOWN_MESSAGE, 'danger');
  } finally {
    spinner.style.display = 'none';
  }
}

function getFilteredExpenses() {
  const selected = document.getElementById('filterCategory').value;
  if (selected === 'All') return allExpenses;
  return allExpenses.filter(e => e.category === selected);
}


function renderTable(expenses) {
  const tbody = document.getElementById('expensesTableBody');
  tbody.innerHTML = '';

  if (expenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No expenses found</td></tr>';
    return;
  }

  expenses.forEach(expense => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(expense.title)}</td>
      <td>$${expense.amount.toFixed(2)}</td>
      <td><span class="badge ${categoryColors[expense.category]}">${expense.category}</span></td>
      <td>${expense.date}</td>
      <td>
        <button class="btn btn-sm btn-primary edit-btn" data-id="${expense.id}">Edit</button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${expense.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;
  const highest = count > 0 ? Math.max(...expenses.map(e => e.amount)) : 0;

  document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
  document.getElementById('totalCount').textContent = count;
  document.getElementById('highestExpense').textContent = `$${highest.toFixed(2)}`;
}


function validateExpense(expense) {
  if (expense.title === '') return 'Title is required';
  if (!(expense.amount > 0)) return 'Amount must be a number greater than 0';
  if (expense.category === '') return 'Please choose a category';
  if (expense.date === '') return 'Date is required';
  return null;
}


document.getElementById('addForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const expense = {
    title: document.getElementById('title').value.trim(),
    amount: Number(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
  };

  const validationError = validateExpense(expense);
  if (validationError) {
    showAlert(validationError, 'danger');
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    const data = await response.json();

    // The server said no (for example 400)
    if (!response.ok) {
      showAlert(data.message, 'danger');
      return;
    }

    event.target.reset();
    await loadExpenses();
    showAlert('Expense added', 'success');
  } catch (error) {
    showAlert(SERVER_DOWN_MESSAGE, 'danger');
  }
});


async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    const data = await response.json();

    if (!response.ok) {
      showAlert(data.message, 'danger');
      return;
    }

    await loadExpenses();
    showAlert('Expense deleted', 'success');
  } catch (error) {
    showAlert(SERVER_DOWN_MESSAGE, 'danger');
  }
}


function openEditModal(id) {
  const expense = allExpenses.find(e => e.id === Number(id));
  if (!expense) return;

  document.getElementById('editAlert').innerHTML = '';
  document.getElementById('editId').value = expense.id;
  document.getElementById('editTitle').value = expense.title;
  document.getElementById('editAmount').value = expense.amount;
  document.getElementById('editCategory').value = expense.category;
  document.getElementById('editDate').value = expense.date;

  editModal.show();
}

document.getElementById('editForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const id = document.getElementById('editId').value;
  const expense = {
    title: document.getElementById('editTitle').value.trim(),
    amount: Number(document.getElementById('editAmount').value),
    category: document.getElementById('editCategory').value,
    date: document.getElementById('editDate').value,
  };

  const validationError = validateExpense(expense);
  if (validationError) {
    showAlert(validationError, 'danger', 'editAlert');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    const data = await response.json();

    if (!response.ok) {
      showAlert(data.message, 'danger', 'editAlert');
      return;
    }

    editModal.hide();
    await loadExpenses();
    showAlert('Expense updated', 'success');
  } catch (error) {
    showAlert(SERVER_DOWN_MESSAGE, 'danger', 'editAlert');
  }
});


document.getElementById('expensesTableBody').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const id = button.dataset.id;

  if (button.classList.contains('delete-btn')) deleteExpense(id);
  if (button.classList.contains('edit-btn')) openEditModal(id);
});

document.getElementById('filterCategory').addEventListener('change', () => {
  renderTable(getFilteredExpenses());
});


loadExpenses();