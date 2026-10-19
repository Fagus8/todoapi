// API მისამართი (III ეტაპი)
const API_URL = 'https://jsonplaceholder.typicode.com/todos?_limit=5';

// GET მოთხოვნა Fetch API-ით (async/await)
async function fetchApiTodos() {
    const res = await fetch(API_URL);

    // fetch HTTP შეცდომაზე (404, 500...) თავისით არ აგდებს შეცდომას, ამიტომ ვამოწმებთ
    if (!res.ok) {
        throw new Error('სერვერის შეცდომა: ' + res.status);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
        throw new Error('მიღებული მონაცემები არასწორი ფორმატისაა');
    }

    // მიღებული მონაცემების დამუშავება — ვაქცევთ ჩვენი პროექტის ობიექტის ფორმატში
    return data.map(item => ({
        id: 'api-' + item.id,
        title: String(item.title),
        completed: Boolean(item.completed),
        priority: 'medium',
        dueDate: '',
        createdAt: new Date().toISOString(),
        source: 'api'
    }));
}
