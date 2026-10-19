// DOM ელემენტები
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const priorityInput = document.getElementById('priority-input');
const dueInput = document.getElementById('due-input');
const formError = document.getElementById('form-error');
const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');
const sortSelect = document.getElementById('sort-select');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const clearBtn = document.getElementById('clear-btn');
const clockEl = document.getElementById('clock');
const loader = document.getElementById('loader');
const apiError = document.getElementById('api-error');
const apiList = document.getElementById('api-list');
const reloadApiBtn = document.getElementById('reload-api-btn');
const toastEl = document.getElementById('toast');

const totalCount = document.getElementById('total-count');
const completedCount = document.getElementById('completed-count');
const pendingCount = document.getElementById('pending-count');

const PRIORITY_LABELS = { high: 'მაღალი', medium: 'საშუალო', low: 'დაბალი' };

// თარიღის ფორმატირება (Date ობიექტი)
function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('ka-GE') + ' ' +
        d.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
}

// საათის განახლება
function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleDateString('ka-GE') + ' ' + now.toLocaleTimeString('ka-GE');
}

// ვალიდაციის შეცდომის ჩვენება/დამალვა
function showFormError(msg) {
    if (msg) {
        formError.textContent = msg;
        formError.classList.remove('hidden');
        taskInput.classList.add('invalid');
    } else {
        formError.textContent = '';
        formError.classList.add('hidden');
        taskInput.classList.remove('invalid');
    }
}

// Loader-ის ჩვენება/დამალვა
function showLoader(show) {
    loader.classList.toggle('hidden', !show);
}

// API შეცდომის ჩვენება
function showApiError(msg) {
    apiError.textContent = msg || '';
    apiError.classList.toggle('hidden', !msg);
}

// შეტყობინება, რომელიც 2.5 წამში ქრება (setTimeout)
let toastTimer = null;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastEl.classList.add('hidden');
    }, 2500);
}

// ერთი დავალების <li> ელემენტის შექმნა
function createTaskElement(task, onToggle, onDelete) {
    const li = document.createElement('li');
    if (task.completed) li.classList.add('completed');
    li.classList.add('priority-' + task.priority);

    // სტატუსის checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => onToggle(task.id));

    const content = document.createElement('div');
    content.className = 'task-content';

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.title;
    span.addEventListener('click', () => onToggle(task.id));

    const meta = document.createElement('small');
    meta.className = 'task-meta';
    let metaText = PRIORITY_LABELS[task.priority] + ' • შექმნილია: ' + formatDate(task.createdAt);
    if (task.dueDate) {
        metaText += ' • ვადა: ' + new Date(task.dueDate + 'T00:00').toLocaleDateString('ka-GE');
        if (!task.completed && isOverdue(task.dueDate)) {
            meta.classList.add('overdue');
            metaText += ' (ვადაგასული)';
        }
    }
    if (task.source === 'api') metaText += ' • API';
    meta.textContent = metaText;

    content.appendChild(span);
    content.appendChild(meta);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'წაშლა';
    deleteBtn.addEventListener('click', () => onDelete(task.id));

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(deleteBtn);
    return li;
}

// ვადაგასულია თუ არა (dueDate ფორმატი: YYYY-MM-DD)
function isOverdue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate + 'T00:00') < today;
}

// დავალებების დახატვა
function renderTaskList(visibleTasks, hasAnyTasks, onToggle, onDelete) {
    taskList.innerHTML = '';

    if (visibleTasks.length === 0) {
        emptyState.textContent = hasAnyTasks ? 'ძიების/ფილტრის შედეგად არაფერი მოიძებნა' : 'დავალებები არ არის!';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    for (const task of visibleTasks) {
        taskList.appendChild(createTaskElement(task, onToggle, onDelete));
    }
}

// სტატისტიკის განახლება (ციკლით დათვლა)
function updateStats(allTasks) {
    let completed = 0;
    for (let i = 0; i < allTasks.length; i++) {
        if (allTasks[i].completed) completed++;
    }
    totalCount.textContent = allTasks.length;
    completedCount.textContent = completed;
    pendingCount.textContent = allTasks.length - completed;
}

// API-დან მიღებული დავალებების დახატვა
function renderApiList(apiTodos, isAdded, onImport) {
    apiList.innerHTML = '';

    apiTodos.forEach(todo => {
        const li = document.createElement('li');
        li.classList.add('api-item');
        if (todo.completed) li.classList.add('completed');

        const span = document.createElement('span');
        span.className = 'task-text';
        span.textContent = todo.title;

        const status = document.createElement('small');
        status.className = 'task-meta';
        status.textContent = todo.completed ? 'შესრულებული' : 'შეუსრულებელი';

        const content = document.createElement('div');
        content.className = 'task-content';
        content.appendChild(span);
        content.appendChild(status);

        const btn = document.createElement('button');
        btn.className = 'secondary-btn';
        if (isAdded(todo.id)) {
            btn.textContent = 'დამატებულია';
            btn.disabled = true;
        } else {
            btn.textContent = 'სიაში დამატება';
            btn.addEventListener('click', () => onImport(todo));
        }

        li.appendChild(content);
        li.appendChild(btn);
        apiList.appendChild(li);
    });
}
