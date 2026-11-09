
const STORAGE_KEY = "focusflow-tasks";

let tasks = [];
try {
  tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  if (!Array.isArray(tasks)) tasks = [];
} catch {
  tasks = [];
}

let currentView = "all";

const $ = (id) => document.getElementById(id);

const taskForm = $("taskForm");
const taskName = $("taskName");
const taskDate = $("taskDate");
const priority = $("priority");
const taskList = $("taskList");
const empty = $("empty");

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function addTask(event) {
  event.preventDefault();

  const title = taskName.value.trim();
  if (!title) return;

  tasks.unshift({
    id: makeId(),
    title,
    date: taskDate.value || "",
    priority: priority.value || "medium",
    completed: false,
    createdAt: Date.now()
  });

  saveTasks();
  taskForm.reset();
  taskForm.hidden = true;
  render();
}

function filteredTasks() {
  const query = $("search").value.trim().toLowerCase();
  let result = [...tasks];

  if (currentView === "today") {
    result = result.filter(task => task.date === todayString());
  } else if (currentView === "upcoming") {
    result = result.filter(task =>
      !task.completed && task.date && task.date > todayString()
    );
  } else if (currentView === "completed") {
    result = result.filter(task => task.completed);
  } else {
    result = result.filter(task => !task.completed);
  }

  result = result.filter(task =>
    task.title.toLowerCase().includes(query)
  );

  const sort = $("sort").value;

  if (sort === "date") {
    result.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  } else if (sort === "priority") {
    const rank = { high: 0, medium: 1, low: 2 };
    result.sort((a, b) => rank[a.priority] - rank[b.priority]);
  } else {
    result.sort((a, b) => b.createdAt - a.createdAt);
  }

  return result;
}

function render() {
  const visibleTasks = filteredTasks();

  const completed = tasks.filter(task => task.completed).length;
  const total = tasks.length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  const dueToday = tasks.filter(task =>
    !task.completed && task.date === todayString()
  ).length;

  $("total").textContent = total;
  $("done").textContent = completed;
  $("due").textContent = dueToday;
  $("percent").textContent = `${percent}%`;

  $("date").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const hour = new Date().getHours();
  $("greeting").textContent =
    hour < 12 ? "Good morning!" :
    hour < 18 ? "Good afternoon!" : "Good evening!";

  const titles = {
    all: "All Tasks",
    today: "Today's Tasks",
    upcoming: "Upcoming Tasks",
    completed: "Completed Tasks"
  };

  $("pageTitle").textContent = titles[currentView];
  $("listTitle").textContent = titles[currentView];

  taskList.innerHTML = visibleTasks.map(task => `
    <article class="task-row ${task.completed ? "completed" : ""}">
      <input
        class="task-check"
        type="checkbox"
        data-action="toggle"
        data-id="${escapeHTML(task.id)}"
        ${task.completed ? "checked" : ""}
        aria-label="Mark task complete"
      >

      <div class="task-info">
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">
          ${task.date ? escapeHTML(task.date) : "No due date"}
          <span class="priority ${escapeHTML(task.priority)}">
            ${escapeHTML(task.priority)}
          </span>
        </div>
      </div>

      <button
        class="delete-btn"
        type="button"
        data-action="delete"
        data-id="${escapeHTML(task.id)}"
        aria-label="Delete task"
      >Delete</button>
    </article>
  `).join("");

  empty.hidden = visibleTasks.length > 0;
}

taskForm.addEventListener("submit", addTask);

$("addButton").addEventListener("click", () => {
  taskForm.hidden = false;
  taskName.focus();
});

$("cancel").addEventListener("click", () => {
  taskForm.reset();
  taskForm.hidden = true;
});

$("search").addEventListener("input", render);
$("sort").addEventListener("change", render);

document.querySelectorAll(".nav button").forEach(button => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;

    document.querySelectorAll(".nav button").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    render();
  });
});

taskList.addEventListener("change", event => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;

  const task = tasks.find(item => item.id === checkbox.dataset.id);
  if (!task) return;

  task.completed = checkbox.checked;
  saveTasks();
  render();
});

taskList.addEventListener("click", event => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;

  tasks = tasks.filter(task => task.id !== button.dataset.id);
  saveTasks();
  render();
});

render();
