
class TodoApp {
  constructor() {
    this.tasks = [];
    this.currentEditingId = null;

    // Elements
    this.clockElement = document.getElementById('digital-clock');
    this.taskForm = document.getElementById('task-form');
    this.taskInput = document.getElementById('task-input');
    this.categorySelect = document.getElementById('category-select');
    this.tasksList = document.getElementById('tasks-list');
    this.emptyState = document.getElementById('empty-state');
    this.totalTasksElement = document.getElementById('total-tasks');
    this.completedTasksElement = document.getElementById('completed-tasks');
    this.pendingTasksElement = document.getElementById('pending-tasks');
    this.clearCompletedBtn = document.getElementById('clear-completed');
    this.clearAllBtn = document.getElementById('clear-all');
    this.categoryFilter = document.getElementById('category-filter');

    this.currentFilter = 'All';

    this.init();
  }

  init() {
    this.loadTasksFromStorage();
    this.checkDailyReset();
    this.startClock();
    this.bindEvents();
    this.renderTasks();
    this.updateStats();
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      this.clockElement.textContent = now.toLocaleString('en-US', options);
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  bindEvents() {
    this.taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const taskText = this.taskInput.value.trim();
      const category = this.categorySelect.value;
      if (taskText) {
        this.addTask(taskText, category);
        this.taskInput.value = '';
        this.categorySelect.value = 'None';
      }
    });

    this.clearCompletedBtn.addEventListener('click', () => {
      if (confirm('Clear all completed tasks?')) this.clearCompletedTasks();
    });

    this.clearAllBtn.addEventListener('click', () => {
      if (confirm('Clear ALL tasks? This cannot be undone.')) this.clearAllTasks();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentEditingId) this.cancelEdit();
    });

    this.categoryFilter.addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.renderTasks();
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addTask(text, category = 'None') {
    const task = {
      id: this.generateId(),
      text,
      completed: false,
      category,
      dateCreated: new Date().toISOString(),
    };
    this.tasks.unshift(task);
    this.saveTasksToStorage();
    this.renderTasks();
    this.updateStats();
  }

  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.saveTasksToStorage();
      this.renderTasks();
      this.updateStats();
    }
  }

  deleteTask(id) {
    if (confirm('Delete this task?')) {
      this.tasks = this.tasks.filter((t) => t.id !== id);
      this.saveTasksToStorage();
      this.renderTasks();
      this.updateStats();
    }
  }

  editTask(id) {
    this.currentEditingId = id;
    this.renderTasks();
  }

  saveEdit(id, newText) {
    const task = this.tasks.find((t) => t.id === id);
    if (task && newText.trim()) {
      task.text = newText.trim();
      this.currentEditingId = null;
      this.saveTasksToStorage();
      this.renderTasks();
    }
  }

  cancelEdit() {
    this.currentEditingId = null;
    this.renderTasks();
  }

  clearCompletedTasks() {
    this.tasks = this.tasks.filter((t) => !t.completed);
    this.saveTasksToStorage();
    this.renderTasks();
    this.updateStats();
  }

  clearAllTasks() {
    this.tasks = [];
    this.saveTasksToStorage();
    this.renderTasks();
    this.updateStats();
  }

  renderTasks() {
    let displayTasks = this.tasks;
    if (this.currentFilter && this.currentFilter !== 'All') {
      displayTasks = this.tasks.filter((t) => t.category === this.currentFilter);
    }

    if (displayTasks.length === 0) {
      this.tasksList.style.display = 'none';
      this.emptyState.style.display = 'block';
      return;
    }

    this.tasksList.style.display = 'flex';
    this.emptyState.style.display = 'none';

    this.tasksList.innerHTML = displayTasks
      .map((task) => {
        const isEditing = this.currentEditingId === task.id;

        return `
        <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
          <div 
            class="task-checkbox${task.completed ? ' checked' : ''}" 
            role="checkbox" 
            aria-checked="${task.completed}" 
            tabindex="0"
            onclick="todoApp.toggleTask('${task.id}')"
            onkeypress="if(event.key==='Enter' || event.key===' ') { todoApp.toggleTask('${task.id}'); event.preventDefault(); }"
            title="Mark task as ${task.completed ? 'incomplete' : 'complete'}"
          >
            ${task.completed ? '✓' : ''}
          </div>
          ${
            isEditing
              ? `<input 
                  type="text" 
                  class="task-input-edit" 
                  value="${this.escapeHtml(task.text)}"
                  onblur="todoApp.handleEditBlur('${task.id}', this.value)"
                  onkeydown="todoApp.handleEditKeydown(event, '${task.id}', this.value)"
                  autofocus
                  aria-label="Edit task"
                >`
              : `<span class="task-text${task.completed ? ' completed' : ''}"
                ondblclick="todoApp.editTask('${task.id}')"
                title="Double-click to edit"
                tabindex="0"
                onkeypress="if(event.key==='Enter') { todoApp.editTask('${task.id}'); }"
              >${this.escapeHtml(task.text)}</span>`
          }
          <span class="task-category">${this.escapeHtml(task.category)}</span>
          <div class="task-actions">
            ${
              !isEditing
                ? `<button class="task-btn edit" onclick="todoApp.editTask('${task.id}')" title="Edit task" aria-label="Edit task">✏️</button>`
                : `<button class="task-btn edit" onclick="todoApp.cancelEdit()" title="Cancel edit" aria-label="Cancel editing">❌</button>`
            }
            <button class="task-btn delete" onclick="todoApp.deleteTask('${task.id}')" title="Delete task" aria-label="Delete task">🗑️</button>
          </div>
        </li>
      `;
      })
      .join('');
  }

  handleEditBlur(id, value) {
    setTimeout(() => {
      if (this.currentEditingId === id) this.saveEdit(id, value);
    }, 100);
  }

  handleEditKeydown(event, id, value) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveEdit(id, value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    this.totalTasksElement.textContent = total;
    this.completedTasksElement.textContent = completed;
    this.pendingTasksElement.textContent = total - completed;
  }

  saveTasksToStorage() {
    try {
      localStorage.setItem('todoTasks', JSON.stringify(this.tasks));
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }

  loadTasksFromStorage() {
    try {
      const stored = localStorage.getItem('todoTasks');
      if (stored) this.tasks = JSON.parse(stored) || [];
    } catch (error) {
      console.error('Failed to load', error);
      this.tasks = [];
    }
  }

  checkDailyReset() {
    try {
      const today = new Date().toDateString();
      const lastResetDate = localStorage.getItem('lastResetDate');
      if (lastResetDate !== today) {
        this.tasks.forEach((task) => {
          task.completed = false;
        });
        localStorage.setItem('lastResetDate', today);
        this.saveTasksToStorage();
      }
    } catch (error) {/* ignore */}
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  window.todoApp = new TodoApp();
});

/* Theme Toggle Logic */
(function () {
  const btn = document.getElementById('theme-toggle');
  const ICON_SUN = '☀️';
  const ICON_MOON = '🌙';

  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    if (btn) btn.textContent = theme === 'dark' ? ICON_SUN : ICON_MOON;
  }

  function saveTheme(theme) {
    localStorage.setItem('ui-theme', theme);
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    applyTheme(isDark ? 'light' : 'dark');
    saveTheme(isDark ? 'light' : 'dark');
  }

  // Initialization
  let theme = localStorage.getItem('ui-theme');
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  applyTheme(theme);

  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
})();

/* Handle daily reset on page visibility */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.todoApp) window.todoApp.checkDailyReset();
});
