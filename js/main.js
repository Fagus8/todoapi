// localStorage-ის გასაღები
const STORAGE_KEY = 'taskManager.tasks';
const PRIORITY_ORDER = { high: 1, medium: 2, low: 3 };

// აპლიკაციის მდგომარეობა — დავალებების ობიექტების მასივი
let tasks = loadFromStorage();
let apiTodos = [];

// ---------- localStorage ----------

function loadFromStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch (err) {
        console.error('localStorage-დან წაკითხვა ვერ მოხერხდა', err);
        return [];
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
        console.error('localStorage-ში შენახვა ვერ მოხერხდა', err);
    }
}

// ---------- ვალიდაცია ----------

// აბრუნებს შეცდომის ტექსტს ან null-ს, თუ ყველაფერი სწორია
function validateTask(title, priority, dueDate) {
    if (title === '') {
        return 'დავალების ტექსტი ცარიელია';
    }
    if (title.length < 3) {
        return 'დავალება უნდა შეიცავდეს მინიმუმ 3 სიმბოლოს';
    }
    if (title.length > 100) {
        return 'დავალება არ უნდა აღემატებოდეს 100 სიმბოლოს';
    }
    const duplicate = tasks.some(t => t.title.toLowerCase() === title.toLowerCase());
    if (duplicate) {
        return 'ასეთი დავალება უკვე არსებობს';
    }
    if (!PRIORITY_ORDER[priority]) {
        return 'აირჩიეთ პრიორიტეტი';
    }
    if (dueDate && isOverdue(dueDate)) {
        return 'ვადა არ შეიძლება იყოს წარსულში';
    }
    return null;
}

// ---------- CRUD ----------

function addTask(event) {
    event.preventDefault();

    const title = taskInput.value.trim();
    const priority = priorityInput.value;
    const dueDate = dueInput.value;

    const error = validateTask(title, priority, dueDate);
    if (error) {
        showFormError(error);
        return;
    }
    showFormError(null);

    // ახალი დავალების ობიექტი
    const newTask = {
        id: Date.now().toString(),
        title: title,
        completed: false,
        priority: priority,
        dueDate: dueDate,
        createdAt: new Date().toISOString(),
        source: 'local'
    };

    tasks.push(newTask);
    saveToStorage();
    refresh();

    taskForm.reset();
    taskInput.focus();
    showToast('დავალება დაემატა');
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    saveToStorage();
    refresh();
    showToast(task.completed ? 'მონიშნულია შესრულებულად' : 'მონიშნულია შეუსრულებლად');
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveToStorage();
    refresh();
    renderApiList(apiTodos, isImported, importApiTodo); // API ღილაკი ხელახლა აქტიური ხდება
    showToast('დავალება წაიშალა');
}

function clearAll() {
    if (tasks.length === 0) return;
    tasks = [];
    saveToStorage();
    refresh();
    renderApiList(apiTodos, isImported, importApiTodo);
    showToast('ყველა დავალება წაიშალა');
}

// ---------- ძიება / ფილტრი / სორტირება ----------

function getVisibleTasks() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;
    const sort = sortSelect.value;

    // ძიება + ფილტრაცია (filter)
    let result = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(query);
        let matchesFilter = true;
        if (filter === 'active') matchesFilter = !task.completed;
        else if (filter === 'completed') matchesFilter = task.completed;
        return matchesSearch && matchesFilter;
    });

    // სორტირება (slice — ორიგინალი მასივი რომ არ შეიცვალოს)
    result = result.slice().sort((a, b) => {
        switch (sort) {
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'az':
                return a.title.localeCompare(b.title, 'ka');
            case 'priority':
                return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            case 'due':
                // ვადის გარეშე დავალებები ბოლოში
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return a.dueDate.localeCompare(b.dueDate);
            default: // newest
                return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    return result;
}

// DOM-ის განახლება
function refresh() {
    renderTaskList(getVisibleTasks(), tasks.length > 0, toggleTask, deleteTask);
    updateStats(tasks);
}

// ---------- API (Fetch) ----------

function isImported(apiId) {
    return tasks.some(t => t.id === apiId);
}

// API-დან მიღებული დავალების პროექტის სიაში დამატება
function importApiTodo(todo) {
    if (isImported(todo.id)) return;
    tasks.push({ ...todo, createdAt: new Date().toISOString() });
    saveToStorage();
    refresh();
    renderApiList(apiTodos, isImported, importApiTodo);
    showToast('დავალება დაემატა სერვერიდან');
}

async function loadApiTodos() {
    showLoader(true);
    showApiError(null);
    apiList.innerHTML = '';
    reloadApiBtn.disabled = true;

    try {
        apiTodos = await fetchApiTodos();
        renderApiList(apiTodos, isImported, importApiTodo);
    } catch (err) {
        console.error(err);
        showApiError('მონაცემების ჩატვირთვა ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.');
    } finally {
        showLoader(false);
        reloadApiBtn.disabled = false;
    }
}

// ---------- Events ----------

taskForm.addEventListener('submit', addTask);
taskInput.addEventListener('input', () => showFormError(null));
searchInput.addEventListener('input', refresh);
filterSelect.addEventListener('change', refresh);
sortSelect.addEventListener('change', refresh);
clearBtn.addEventListener('click', clearAll);
reloadApiBtn.addEventListener('click', loadApiTodos);

// ---------- გაშვება ----------

// წარსული თარიღის არჩევის აკრძალვა კალენდარში
const today = new Date();
dueInput.min = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');

updateClock();
setInterval(updateClock, 1000); // საათი ყოველ წამში ახლდება

refresh();
loadApiTodos();
