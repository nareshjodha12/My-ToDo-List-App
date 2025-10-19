const todoInput = document.querySelector(".todo-input");
const todoForm = document.querySelector(".todo-form");
const todoList = document.querySelector(".todo-list");
const filterOption = document.querySelector(".filter-todo");
const taskCountEl = document.querySelector('.task-count');
const emptyStateEl = document.querySelector('.empty-state');
const markAllBtn = document.querySelector('.mark-all-btn');
const clearCompletedBtn = document.querySelector('.clear-completed-btn');
const clearAllBtn = document.querySelector('.clear-all-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const prioritySelect = document.getElementById('priority-select');
const progressBarEl = document.querySelector('.progress-bar');

// mirror priority as a class on the select so we can style its visible text
function applyPrioritySelectClass(){
    if(!prioritySelect) return;
    prioritySelect.classList.remove('priority-low','priority-medium','priority-high');
    const v = prioritySelect.value || 'low';
    prioritySelect.classList.add('priority-' + v);
}

prioritySelect && prioritySelect.addEventListener('change', applyPrioritySelectClass);
// apply on load
applyPrioritySelectClass();

// Apply saved theme on load (default: dark)
function applySavedTheme(){
    const saved = localStorage.getItem('theme') || 'dark';
    if(saved === 'light'){
        document.documentElement.classList.add('theme-light');
        if(themeToggleBtn){ themeToggleBtn.innerText = '☀️'; themeToggleBtn.setAttribute('aria-pressed','true') }
    } else {
        document.documentElement.classList.remove('theme-light');
        if(themeToggleBtn){ themeToggleBtn.innerText = '🌙'; themeToggleBtn.setAttribute('aria-pressed','false') }
    }
}
applySavedTheme();

themeToggleBtn && themeToggleBtn.addEventListener('click', function(){
    const isLight = document.documentElement.classList.toggle('theme-light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggleBtn.innerText = isLight ? '☀️' : '🌙';
    themeToggleBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
});

document.addEventListener("DOMContentLoaded", getLocalTodos);
todoForm.addEventListener("submit", addTodo);
todoList.addEventListener("click", deleteCheck);
filterOption && filterOption.addEventListener("change", filterTodo);
markAllBtn && markAllBtn.addEventListener('click', markAllTodos);
clearCompletedBtn && clearCompletedBtn.addEventListener('click', clearCompletedTodos);
clearAllBtn && clearAllBtn.addEventListener('click', clearAllTodos);

function addTodo(event) {
    event.preventDefault();
    const text = todoInput.value && todoInput.value.trim();
    if (!text) return; // don't add empty

    // persist the todo and receive a stored object (with id)
    const priority = (prioritySelect && prioritySelect.value) || 'low';
    const saved = saveLocalTodos(text, priority);
    // create element with the stored id so future updates can reference it
    const todoEl = createTodoEl(saved.text, saved.completed, saved.id);
    todoList.appendChild(todoEl);
    // clear input and refresh counts
    todoInput.value = "";
    renderCountAndEmpty();
    updateProgressBar();
    updateEmptyState();
}

function deleteCheck(e) {
    const item = e.target;

    // support clicks on the icon or the button
    const btn = item.closest('button');
    if(!btn) return;

    if(btn.classList.contains("trash-btn")) {
        const todo = btn.closest('.todo');
            // immediate storage update for snappy behavior
            removeLocalTodos(todo);

            // disable the button to avoid double-deletes
            try { btn.disabled = true } catch (e) {}

            // quick removing animation for instant feedback, then remove from DOM
            todo.classList.add('removing');
            // fallback removal after short timeout (120-200ms) to avoid waiting for transitionend
            setTimeout(function() {
                if (todo && todo.parentElement) {
                    todo.remove();
                    renderCountAndEmpty();
                    updateProgressBar();
                    updateEmptyState();
                }
            }, 160);
    }

    if(btn.classList.contains("complete-btn")) {
        const todo = btn.closest('.todo');
        todo.classList.toggle("completed");
        toggleCompletedLocal(todo);
        updateProgressBar();
    }
}

function filterTodo(e) {
    const todos = Array.from(todoList.children);
    todos.forEach(function(todo) {
        switch(e.target.value) {
            case "all": 
                todo.style.display = "flex";
                break;
            case "completed": 
                todo.style.display = todo.classList.contains("completed") ? "flex" : "none";
                break;
            case "incomplete":
                todo.style.display = !todo.classList.contains("completed") ? "flex" : "none";
                break;
        }
    });
}

function saveLocalTodos(todo, priority = 'low') {
    let todos = JSON.parse(localStorage.getItem("todos") || '[]');
    const id = Date.now() + Math.floor(Math.random()*1000);
    const obj = { id: id, text: todo, completed: false, priority: priority };
    todos.push(obj);
    localStorage.setItem("todos", JSON.stringify(todos));
    return obj;
}

function getLocalTodos() {
    let todos;
    if(localStorage.getItem("todos") === null) {
        todos = [];
    } else {
        todos = JSON.parse(localStorage.getItem("todos"));
    }
    // normalize older string-only entries and ensure each todo has an id
    todos = todos.map(function(t){
        if(typeof t === 'string'){
            return { id: Date.now() + Math.floor(Math.random()*1000), text: t, completed: false };
        }
        if(!t.id) t.id = Date.now() + Math.floor(Math.random()*1000);
        return t;
    });
    // persist normalized structure
    localStorage.setItem('todos', JSON.stringify(todos));

    // render using a helper to keep logic consistent
    todos.forEach(function(todo){
        const todoEl = createTodoEl(todo.text, todo.completed, todo.id, todo.priority);
        todoList.appendChild(todoEl);
    });
    renderCountAndEmpty();
    updateProgressBar();
}

function removeLocalTodos(todo) {
    let todos;
    if(localStorage.getItem("todos") === null) {
        todos = [];
    } else {
        todos = JSON.parse(localStorage.getItem("todos"));
    }

    const id = todo.dataset.id;
    const idx = todos.findIndex(t => String(t.id) === String(id));
    if(idx > -1){
        todos.splice(idx, 1);
        localStorage.setItem("todos", JSON.stringify(todos));
    }
}

function toggleCompletedLocal(todoEl){
    let todos = JSON.parse(localStorage.getItem("todos") || '[]');
    const id = todoEl.dataset.id;
    const idx = todos.findIndex(t => String(t.id) === String(id));
    if(idx > -1){
        todos[idx].completed = todoEl.classList.contains('completed');
        localStorage.setItem("todos", JSON.stringify(todos));
    }
}

// update the progress bar based on % completed
function updateProgressBar(){
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    if(!progressBarEl) return;
    const total = todos.length || 0;
    const completed = todos.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((completed/total) * 100);
    progressBarEl.style.width = pct + '%';
    progressBarEl.setAttribute('aria-valuenow', String(pct));
}

// create a todo DOM element from text and completed state
function createTodoEl(text, completed = false, id = null, priority = 'low'){
    const todoDiv = document.createElement('div');
    todoDiv.className = 'todo';
    if(id !== null) todoDiv.dataset.id = id;

    // drag handle
    const handle = document.createElement('button');
    handle.className = 'drag-handle';
    handle.setAttribute('aria-label','Drag to reorder');
    handle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    todoDiv.appendChild(handle);

    // priority indicator
    const p = document.createElement('span');
    p.className = 'priority-indicator priority-' + (priority || 'low');
    p.setAttribute('aria-hidden','true');
    todoDiv.appendChild(p);

    const newTodo = document.createElement('li');
    newTodo.className = 'todo-item';
    newTodo.innerText = text;
    todoDiv.appendChild(newTodo);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    const completedButton = document.createElement('button');
    completedButton.innerHTML = '<i class="fas fa-check-circle"></i>';
    completedButton.className = 'complete-btn';
    btnGroup.appendChild(completedButton);

    const trashButton = document.createElement('button');
    trashButton.innerHTML = '<i class="fas fa-trash"></i>';
    trashButton.className = 'trash-btn';
    btnGroup.appendChild(trashButton);

    todoDiv.appendChild(btnGroup);
    if(completed) todoDiv.classList.add('completed');
    // apply size class based on length
    applySizeClass(todoDiv, text);

    // add entry animation class then remove to trigger CSS transition
    todoDiv.classList.add('enter');
    requestAnimationFrame(() => todoDiv.classList.remove('enter'));

    // enable editing on double click
    todoDiv.addEventListener('dblclick', function(e){
        // ignore if clicked on buttons
        if(e.target.closest('button')) return;
        startEditTodo(todoDiv);
    });

    // control dragging only when interacting with the handle
    let allowDrag = false;
    handle.addEventListener('pointerdown', () => { allowDrag = true; });
    document.addEventListener('pointerup', () => { allowDrag = false; });

    todoDiv.setAttribute('draggable', 'true');
    todoDiv.addEventListener('dragstart', function(e){
        if(!allowDrag){ e.preventDefault(); return; }
        todoDiv.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    });
    todoDiv.addEventListener('dragend', function(){
        todoDiv.classList.remove('dragging');
    });

    return todoDiv;
}

// editing helpers
function startEditTodo(todoEl){
    const textEl = todoEl.querySelector('.todo-item');
    const old = textEl.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = old;
    input.className = 'todo-edit-input';
    // replace text with input
    todoEl.replaceChild(input, textEl);
    input.focus();

    function finish(save){
        const val = input.value && input.value.trim();
        if(save && val){
            // update DOM
            textEl.innerText = val;
            todoEl.replaceChild(textEl, input);
            // persist change
            const id = todoEl.dataset.id;
            let todos = JSON.parse(localStorage.getItem('todos') || '[]');
            const idx = todos.findIndex(t => String(t.id) === String(id));
            if(idx > -1){ todos[idx].text = val; localStorage.setItem('todos', JSON.stringify(todos)); }
        } else {
            // cancel
            todoEl.replaceChild(textEl, input);
        }
    }

    input.addEventListener('keydown', function(e){
        if(e.key === 'Enter') finish(true);
        if(e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', function(){ finish(true); });
}

// drag-and-drop list handlers on the container
todoList && todoList.addEventListener('dragover', function(e){
    e.preventDefault();
    const afterEl = getDragAfterElement(todoList, e.clientY);
    const dragging = document.querySelector('.todo.dragging');
    if(!dragging) return;
    if(afterEl == null) {
        todoList.appendChild(dragging);
    } else {
        todoList.insertBefore(dragging, afterEl);
    }
});

todoList && todoList.addEventListener('drop', function(e){
    e.preventDefault();
    // on drop, try to animate the moved element briefly
    const draggedId = e.dataTransfer.getData('text/plain');
    persistOrderFromDOM();
    if(draggedId){
        const moved = todoList.querySelector(`[data-id="${draggedId}"]`);
        if(moved){
            moved.classList.add('reordered');
            setTimeout(()=> moved.classList.remove('reordered'), 320);
        }
    }
});

function getDragAfterElement(container, y){
    const draggableElements = [...container.querySelectorAll('.todo:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if(offset < 0 && offset > closest.offset){
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function persistOrderFromDOM(){
    const ids = Array.from(todoList.children).map(li => li.dataset.id).filter(Boolean);
    let todos = JSON.parse(localStorage.getItem('todos') || '[]');
    // reorder todos to match ids
    const lookup = new Map(todos.map(t => [String(t.id), t]));
    const newOrder = ids.map(id => lookup.get(String(id))).filter(Boolean);
    // include any missing todos (fallback)
    const missing = todos.filter(t => !lookup.has(String(t.id)));
    const combined = [...newOrder, ...missing];
    localStorage.setItem('todos', JSON.stringify(combined));
}

// UI helpers
function renderCountAndEmpty(){
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    const total = todos.length;
    const remaining = todos.filter(t => !t.completed).length;
    taskCountEl && (taskCountEl.innerText = `${remaining} / ${total} remaining`);
    // show empty-state only when there are no todos
    updateEmptyState(total);
}

function updateEmptyState(totalCount){
    if(!emptyStateEl) return;
    // if totalCount not provided, derive from storage
    const total = typeof totalCount === 'number' ? totalCount : JSON.parse(localStorage.getItem('todos') || '[]').length;
    emptyStateEl.hidden = total > 0;
}

// Size helpers — apply smaller styles for very long texts so they fit
function applySizeClass(todoEl, text){
    const item = todoEl.querySelector('.todo-item');
    // remove existing sizing classes
    item.classList.remove('todo-item--small','todo-item--xsmall');
    todoEl.classList.remove('todo--condensed');

    const len = text.length;
    if(len > 90){
        item.classList.add('todo-item--xsmall');
        todoEl.classList.add('todo--condensed');
    } else if(len > 60){
        item.classList.add('todo-item--small');
        todoEl.classList.add('todo--condensed');
    }
}

function reapplySizingForAll(){
    const todos = Array.from(document.querySelectorAll('.todo'));
    todos.forEach(t => {
        const text = t.querySelector('.todo-item').innerText || '';
        applySizeClass(t, text);
    });
}

// debounce helper
function debounce(fn, wait){
    let t;
    return function(){
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, arguments), wait);
    }
}

window.addEventListener('resize', debounce(reapplySizingForAll, 220));

// Toolbar actions
function markAllTodos(){
    let todos = JSON.parse(localStorage.getItem('todos') || '[]');
    todos = todos.map(t => ({ ...t, completed: true }));
    localStorage.setItem('todos', JSON.stringify(todos));
    // re-render
    refreshListFromStorage();
}

function clearCompletedTodos(){
    let todos = JSON.parse(localStorage.getItem('todos') || '[]');
    todos = todos.filter(t => !t.completed);
    localStorage.setItem('todos', JSON.stringify(todos));
    refreshListFromStorage();
}

function clearAllTodos(){
    localStorage.removeItem('todos');
    refreshListFromStorage();
}

function refreshListFromStorage(){
    // clear UI and re-render
    todoList.innerHTML = '';
    getLocalTodos();
    updateProgressBar();
    updateEmptyState();
}