import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://oupcokxvyxtribzkdapx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91cGNva3h2eXh0cmliemtkYXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTk2MTQsImV4cCI6MjA4MzkzNTYxNH0.-gWAvIgQ18YtphjVsZmlEFmxUyf9W8lv4UptZVZl788";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  session: null,
  profile: null,
  settings: null,
  categories: [],
  tasks: [],
  logs: [],
  charts: {},
  notified: new Set(),
};

const elements = {
  views: {
    auth: document.getElementById("auth-view"),
    dashboard: document.getElementById("dashboard-view"),
    stats: document.getElementById("stats-view"),
    settings: document.getElementById("settings-view"),
  },
  nav: document.querySelector(".nav"),
  sessionBar: document.querySelector(".session"),
  navButtons: document.querySelectorAll(".nav-btn"),
  authTabs: document.querySelectorAll(".auth-tab"),
  authPanels: document.querySelectorAll(".auth-panel"),
  loginForm: document.getElementById("login-form"),
  signupForm: document.getElementById("signup-form"),
  resetForm: document.getElementById("reset-form"),
  newPasswordForm: document.getElementById("new-password-form"),
  logoutBtn: document.getElementById("logout-btn"),
  logoutBtn2: document.getElementById("logout-btn-2"),
  sessionEmail: document.getElementById("session-email"),
  greeting: document.getElementById("greeting"),
  todayDate: document.getElementById("today-date"),
  todayProgress: document.getElementById("today-progress"),
  taskList: document.getElementById("task-list"),
  toggleTaskForm: document.getElementById("toggle-task-form"),
  taskFormWrapper: document.getElementById("task-form-wrapper"),
  taskForm: document.getElementById("task-form"),
  taskSubmitBtn: document.querySelector("#task-form button[type=\"submit\"]"),
  categorySelect: document.getElementById("category-select"),
  categoryEmpty: document.getElementById("category-empty"),
  createDefaultsBtn: document.getElementById("create-defaults"),
  repeatToggle: document.getElementById("repeat-toggle"),
  daysWrapper: document.getElementById("days-wrapper"),
  dateWrapper: document.getElementById("date-wrapper"),
  motivation: document.getElementById("motivation"),
  statTotal: document.getElementById("stat-total"),
  statDone: document.getElementById("stat-done"),
  statPending: document.getElementById("stat-pending"),
  statPercent: document.getElementById("stat-percent"),
  rangeSelect: document.getElementById("range-select"),
  timeChart: document.getElementById("time-chart"),
  categoryChart: document.getElementById("category-chart"),
  categoryPercentChart: document.getElementById("category-percent-chart"),
  nicknameForm: document.getElementById("nickname-form"),
  themeToggle: document.getElementById("theme-toggle"),
  notificationsToggle: document.getElementById("notifications-toggle"),
  toast: document.getElementById("toast"),
};

const defaultCategories = ["Здоровье", "Учёба", "Работа", "Личное", "Другое"];

const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayISO = () => localDateKey(new Date());
const formatDate = (date) => new Intl.DateTimeFormat("ru-RU", { dateStyle: "full" }).format(date);
const dateDaysAgoISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateKey(d);
};

const showToast = (message, isError = false) => {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  elements.toast.style.background = isError ? "#d14b4b" : "";
  setTimeout(() => elements.toast.classList.add("hidden"), 3200);
};

const setView = (name) => {
  Object.entries(elements.views).forEach(([key, view]) => {
    view.classList.toggle("hidden", key !== name);
  });
  elements.navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
};

const setAuthPanel = (name) => {
  elements.authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.auth === name);
  });
  elements.authPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== name);
  });
};

const toggleAuthUI = (isAuthed) => {
  elements.nav.classList.toggle("hidden", !isAuthed);
  elements.sessionBar.classList.toggle("hidden", !isAuthed);
};

const applyTheme = (theme) => {
  document.body.classList.toggle("dark", theme === "dark");
  elements.themeToggle.checked = theme === "dark";
};

const updateGreeting = () => {
  const nickname = state.profile?.nickname || "";
  elements.greeting.textContent = `Привет, ${nickname} 👋`;
  elements.sessionEmail.textContent = nickname || state.session?.user?.email || "";
};

const updateTodayDate = () => {
  elements.todayDate.textContent = formatDate(new Date());
};

const createDefaultCategories = async () => {
  if (!state.session) return;
  const inserts = defaultCategories.map((name) => ({
    user_id: state.session.user.id,
    name,
  }));
  const { error } = await supabase.from("categories").insert(inserts);
  if (error) {
    showToast("Не удалось создать категории", true);
  }
};

const ensureDefaultCategories = async () => {
  if (!state.session) return;
  if (state.categories.length) return;
  await createDefaultCategories();
};

const ensureProfileRow = async (user) => {
  const { data: existing } = await supabase
    .from("users")
    .select("id, nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return;

  const preferredNickname = user.user_metadata?.nickname || user.email?.split("@")[0] || "user";
  const { error } = await supabase.from("users").insert({
    id: user.id,
    email: user.email,
    nickname: preferredNickname,
    theme: "light",
  });

  if (error) {
    const fallbackNickname = `user-${user.id.slice(0, 6)}`;
    await supabase.from("users").insert({
      id: user.id,
      email: user.email,
      nickname: fallbackNickname,
      theme: "light",
    });
    showToast("Никнейм уже занят, измените его в настройках.", true);
  }

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settingsRow) {
    await supabase.from("settings").insert({
      user_id: user.id,
      notifications: false,
      theme: "light",
    });
  }
};

const fetchProfile = async () => {
  const { data } = await supabase
    .from("users")
    .select("id, email, nickname, theme")
    .eq("id", state.session.user.id)
    .single();
  state.profile = data;
};

const fetchSettings = async () => {
  const { data } = await supabase
    .from("settings")
    .select("notifications, theme")
    .eq("user_id", state.session.user.id)
    .single();
  state.settings = data || { notifications: false, theme: "light" };
};

const fetchCategories = async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", state.session.user.id)
    .order("name");
  if (error) {
    showToast("Не удалось загрузить категории", true);
  }
  state.categories = data || [];
};

const fetchTasks = async () => {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", state.session.user.id)
    .order("created_at", { ascending: false });
  state.tasks = data || [];
};

const fetchLogs = async (fromDate) => {
  const { data } = await supabase
    .from("task_logs")
    .select("task_id, date, status")
    .eq("user_id", state.session.user.id)
    .gte("date", fromDate);
  state.logs = data || [];
};

const isTaskScheduledForDate = (task, date) => {
  const day = date.getDay();
  if (task.repeat) {
    return Array.isArray(task.days) && task.days.includes(day);
  }
  if (task.task_date) {
    return task.task_date === localDateKey(date);
  }
  return false;
};

const isTaskDoneForDate = (taskId, dateISOKey) => {
  return state.logs.some((log) => log.task_id === taskId && log.date === dateISOKey && log.status === "done");
};

const renderCategories = () => {
  elements.categorySelect.innerHTML = "";
  const isEmpty = state.categories.length === 0;
  elements.categoryEmpty.classList.toggle("hidden", !isEmpty);
  if (elements.taskSubmitBtn) {
    elements.taskSubmitBtn.disabled = isEmpty;
  }
  state.categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    elements.categorySelect.appendChild(option);
  });
};

const renderTasks = () => {
  const today = new Date();
  const todayKey = todayISO();
  elements.taskList.innerHTML = "";

  const tasksToday = state.tasks.filter((task) => isTaskScheduledForDate(task, today));

  if (!tasksToday.length) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.textContent = "Сегодня задач нет. Добавьте новую задачу.";
    elements.taskList.appendChild(empty);
    return;
  }

  tasksToday.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";

    const category = state.categories.find((cat) => cat.id === task.category_id);
    const done = isTaskDoneForDate(task.id, todayKey);

    const header = document.createElement("div");
    header.className = "task-row";
    header.innerHTML = `<strong>${task.title}</strong><span class="badge">${category?.name || ""}</span>`;

    const meta = document.createElement("div");
    meta.className = "task-row muted";
    meta.innerHTML = `<span>${task.time || ""}</span><span>${task.repeat ? "Повтор" : "Разовая"}</span>`;

    const action = document.createElement("div");
    action.className = "task-row";

    const btn = document.createElement("button");
    btn.textContent = done ? "Выполнено" : "Отметить";
    btn.disabled = done;
    btn.addEventListener("click", () => markTaskDone(task.id));

    const priority = document.createElement("span");
    priority.className = "badge";
    priority.textContent = task.priority ? `Приоритет: ${task.priority}` : "";
    if (!task.priority) {
      priority.style.display = "none";
    }

    action.appendChild(btn);
    action.appendChild(priority);

    item.appendChild(header);
    if (task.description) {
      const desc = document.createElement("div");
      desc.textContent = task.description;
      desc.className = "muted";
      item.appendChild(desc);
    }
    item.appendChild(meta);
    item.appendChild(action);

    elements.taskList.appendChild(item);
  });
};

const updateMotivation = (percent) => {
  let message = "🚀 Не сдавайся";
  if (percent === 100) message = "🔥 Отличная работа!";
  else if (percent >= 70) message = "👍 Хороший результат";
  else if (percent >= 40) message = "💪 Есть прогресс";
  elements.motivation.textContent = message;
};

const buildStatsForRange = (dates) => {
  let total = 0;
  let done = 0;

  dates.forEach((date) => {
    const scheduled = state.tasks.filter((task) => isTaskScheduledForDate(task, date));
    total += scheduled.length;
    const dateKey = localDateKey(date);
    scheduled.forEach((task) => {
      if (isTaskDoneForDate(task.id, dateKey)) {
        done += 1;
      }
    });
  });

  const pending = Math.max(total - done, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;

  return { total, done, pending, percent };
};

const updateTodayProgress = () => {
  const today = new Date();
  const stats = buildStatsForRange([today]);
  elements.todayProgress.textContent = `${stats.percent}%`;
  updateMotivation(stats.percent);
};

const updateQuickStats = () => {
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d;
  });
  const stats = buildStatsForRange(dates);
  elements.statTotal.textContent = stats.total;
  elements.statDone.textContent = stats.done;
  elements.statPending.textContent = stats.pending;
  elements.statPercent.textContent = `${stats.percent}%`;
};

const buildTimeChart = (range) => {
  if (!elements.timeChart) return;
  const ctx = elements.timeChart.getContext("2d");
  if (state.charts.time) state.charts.time.destroy();

  let labels = [];
  let totals = [];
  let dones = [];

  if (range === "day") {
    const date = new Date();
    const stats = buildStatsForRange([date]);
    labels = ["Сегодня"];
    totals = [stats.total];
    dones = [stats.done];
  } else if (range === "week" || range === "month") {
    const length = range === "week" ? 7 : 30;
    const dates = Array.from({ length }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (length - 1 - i));
      return d;
    });
    labels = dates.map((d) => d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }));
    dates.forEach((date) => {
      const stats = buildStatsForRange([date]);
      totals.push(stats.total);
      dones.push(stats.done);
    });
  } else {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return d;
    });
    labels = months.map((d) => d.toLocaleDateString("ru-RU", { month: "short" }));
    months.forEach((date) => {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const dates = [];
      const pointer = new Date(monthStart);
      while (pointer <= monthEnd) {
        dates.push(new Date(pointer));
        pointer.setDate(pointer.getDate() + 1);
      }
      const stats = buildStatsForRange(dates);
      totals.push(stats.total);
      dones.push(stats.done);
    });
  }

  state.charts.time = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Всего",
          data: totals,
          backgroundColor: "rgba(242, 106, 61, 0.6)",
        },
        {
          label: "Выполнено",
          data: dones,
          backgroundColor: "rgba(47, 156, 127, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
};

const buildCategoryCharts = () => {
  if (!elements.categoryChart || !elements.categoryPercentChart) return;

  const totals = {};
  const doneTotals = {};
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d;
  });

  state.categories.forEach((cat) => {
    totals[cat.name] = 0;
    doneTotals[cat.name] = 0;
  });

  dates.forEach((date) => {
    const scheduled = state.tasks.filter((task) => isTaskScheduledForDate(task, date));
    const dateKey = localDateKey(date);
    scheduled.forEach((task) => {
      const category = state.categories.find((cat) => cat.id === task.category_id);
      if (!category) return;
      totals[category.name] += 1;
      if (isTaskDoneForDate(task.id, dateKey)) {
        doneTotals[category.name] += 1;
      }
    });
  });

  const labels = Object.keys(totals);
  const totalValues = Object.values(totals);
  const percentValues = labels.map((label) => {
    const total = totals[label];
    const done = doneTotals[label];
    return total ? Math.round((done / total) * 100) : 0;
  });

  if (state.charts.category) state.charts.category.destroy();
  if (state.charts.categoryPercent) state.charts.categoryPercent.destroy();

  state.charts.category = new Chart(elements.categoryChart.getContext("2d"), {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: totalValues,
          backgroundColor: ["#f26a3d", "#2f9c7f", "#f0b429", "#4c79d3", "#f05b86"],
        },
      ],
    },
  });

  state.charts.categoryPercent = new Chart(elements.categoryPercentChart.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "% выполнения",
          data: percentValues,
          backgroundColor: "rgba(76, 121, 211, 0.7)",
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true, max: 100 },
      },
    },
  });
};

const refreshUI = () => {
  updateGreeting();
  updateTodayDate();
  renderCategories();
  renderTasks();
  updateTodayProgress();
  updateQuickStats();
  buildTimeChart(elements.rangeSelect.value);
  buildCategoryCharts();
  applyTheme(state.settings?.theme || "light");
  elements.notificationsToggle.checked = !!state.settings?.notifications;
};

const markTaskDone = async (taskId) => {
  const todayKey = todayISO();
  if (isTaskDoneForDate(taskId, todayKey)) {
    return;
  }
  const { error } = await supabase.from("task_logs").insert({
    user_id: state.session.user.id,
    task_id: taskId,
    date: todayKey,
    status: "done",
  });
  if (error) {
    showToast("Не удалось отметить задачу", true);
    return;
  }
  await fetchLogs(dateDaysAgoISO(370));
  renderTasks();
  updateTodayProgress();
  updateQuickStats();
  buildTimeChart(elements.rangeSelect.value);
  buildCategoryCharts();
};

const handleTaskForm = async (event) => {
  event.preventDefault();
  if (state.categories.length === 0) {
    showToast("Сначала создайте категории", true);
    return;
  }
  const form = new FormData(elements.taskForm);
  const repeat = form.get("repeat") === "on";
  const days = form.getAll("days").map((value) => Number(value));
  const taskDate = form.get("task_date");

  if (repeat && days.length === 0) {
    showToast("Выберите дни недели", true);
    return;
  }
  if (!repeat && !taskDate) {
    showToast("Выберите дату для разовой задачи", true);
    return;
  }

  const payload = {
    user_id: state.session.user.id,
    title: form.get("title").trim(),
    time: form.get("time"),
    category_id: Number(form.get("category")),
    repeat,
    days: repeat ? days : [],
    task_date: repeat ? null : taskDate,
    description: form.get("description").trim() || null,
    priority: form.get("priority") || null,
  };

  const { error } = await supabase.from("tasks").insert(payload);
  if (error) {
    showToast("Не удалось сохранить задачу", true);
    return;
  }
  elements.taskForm.reset();
  elements.taskFormWrapper.classList.add("hidden");
  await fetchTasks();
  renderTasks();
  updateTodayProgress();
  updateQuickStats();
  buildTimeChart(elements.rangeSelect.value);
  buildCategoryCharts();
};

const setupAuthHandlers = () => {
  elements.authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthPanel(tab.dataset.auth);
    });
  });

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(elements.loginForm);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (error) {
      showToast(error.message || "Ошибка входа", true);
    }
  });

  elements.signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(elements.signupForm);
    const nickname = form.get("nickname").trim();
    const email = form.get("email");
    const password = form.get("password");

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (existing) {
      showToast("Никнейм уже занят", true);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    });

    if (error) {
      showToast(error.message || "Ошибка регистрации", true);
      return;
    }

    if (!data.session) {
      showToast("Проверьте почту для подтверждения регистрации.");
      return;
    }

    showToast("Аккаунт создан. Можно входить.");
    elements.signupForm.reset();
  });

  elements.resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(elements.resetForm);
    const email = form.get("email");

    const redirectTo = window.location.origin === "null"
      ? undefined
      : `${window.location.origin}${window.location.pathname}#reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      showToast(error.message || "Не удалось отправить письмо", true);
      return;
    }
    showToast("Письмо отправлено. Проверьте почту.");
    elements.resetForm.reset();
  });

  elements.newPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(elements.newPasswordForm);
    const password = form.get("password");

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      showToast(error.message || "Не удалось обновить пароль", true);
      return;
    }
    showToast("Пароль обновлен. Войдите снова.");
    await supabase.auth.signOut();
    setView("auth");
    toggleAuthUI(false);
    setAuthPanel("login");
    elements.newPasswordForm.reset();
    elements.newPasswordForm.classList.add("hidden");
  });

  [elements.logoutBtn, elements.logoutBtn2].forEach((btn) =>
    btn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      setView("auth");
      toggleAuthUI(false);
      setAuthPanel("login");
    })
  );
};

const setupTaskUI = () => {
  elements.toggleTaskForm.addEventListener("click", () => {
    elements.taskFormWrapper.classList.toggle("hidden");
  });

  elements.createDefaultsBtn.addEventListener("click", async () => {
    await createDefaultCategories();
    await fetchCategories();
    renderCategories();
  });

  const updateRepeatUI = () => {
    const repeat = elements.repeatToggle.checked;
    elements.daysWrapper.classList.toggle("hidden", !repeat);
    elements.dateWrapper.classList.toggle("hidden", repeat);
  };

  elements.repeatToggle.addEventListener("change", updateRepeatUI);
  updateRepeatUI();

  elements.taskForm.addEventListener("submit", handleTaskForm);
};

const setupNavigation = () => {
  elements.navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setView(btn.dataset.view);
      if (btn.dataset.view === "stats") {
        buildTimeChart(elements.rangeSelect.value);
        buildCategoryCharts();
      }
    });
  });

  elements.rangeSelect.addEventListener("change", () => {
    buildTimeChart(elements.rangeSelect.value);
  });
};

const setupSettingsHandlers = () => {
  elements.nicknameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(elements.nicknameForm);
    const nickname = form.get("nickname").trim();

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (existing && existing.id !== state.session.user.id) {
      showToast("Никнейм уже занят", true);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({ nickname })
      .eq("id", state.session.user.id);

    if (error) {
      showToast("Не удалось обновить никнейм", true);
      return;
    }
    state.profile.nickname = nickname;
    updateGreeting();
    showToast("Никнейм обновлен");
    elements.nicknameForm.reset();
  });

  elements.themeToggle.addEventListener("change", async () => {
    const theme = elements.themeToggle.checked ? "dark" : "light";
    applyTheme(theme);
    await supabase.from("users").update({ theme }).eq("id", state.session.user.id);
    await supabase.from("settings").update({ theme }).eq("user_id", state.session.user.id);
  });

  elements.notificationsToggle.addEventListener("change", async () => {
    const enabled = elements.notificationsToggle.checked;
    if (enabled && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        elements.notificationsToggle.checked = false;
        showToast("Разрешение не выдано", true);
        return;
      }
    }
    await supabase
      .from("settings")
      .update({ notifications: enabled })
      .eq("user_id", state.session.user.id);
    state.settings.notifications = enabled;
  });
};

const maybeNotify = async () => {
  if (!state.settings?.notifications) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const today = todayISO();

  const dueTasks = state.tasks.filter((task) => {
    return (
      isTaskScheduledForDate(task, now) &&
      task.time === currentTime &&
      !isTaskDoneForDate(task.id, today)
    );
  });

  dueTasks.forEach((task) => {
    const key = `${task.id}-${today}`;
    if (state.notified.has(key)) return;
    state.notified.add(key);
    navigator.serviceWorker?.ready.then((reg) => {
      reg.showNotification("Напоминание о задаче", {
        body: task.title,
        icon: "icons/icon-192.svg",
      });
    });
  });

  if (now.getHours() === 20 && now.getMinutes() === 0) {
    const summaryKey = `summary-${today}`;
    if (!state.notified.has(summaryKey)) {
      state.notified.add(summaryKey);
      const stats = buildStatsForRange([now]);
      navigator.serviceWorker?.ready.then((reg) => {
        reg.showNotification("Итог дня", {
          body: `Выполнено ${stats.done} из ${stats.total}`,
          icon: "icons/icon-192.svg",
        });
      });
    }
  }

  if (now.getHours() === 21 && now.getMinutes() === 0) {
    const missedKey = `missed-${today}`;
    if (!state.notified.has(missedKey)) {
      state.notified.add(missedKey);
      const stats = buildStatsForRange([now]);
      const missed = Math.max(stats.total - stats.done, 0);
      navigator.serviceWorker?.ready.then((reg) => {
        reg.showNotification("Пропущенные задачи", {
          body: `Сегодня осталось невыполнено: ${missed}`,
          icon: "icons/icon-192.svg",
        });
      });
    }
  }
};

const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("service-worker.js");
  }
};

const init = async () => {
  setupAuthHandlers();
  setupTaskUI();
  setupNavigation();
  setupSettingsHandlers();

  await registerServiceWorker();

  const { data } = await supabase.auth.getSession();
  state.session = data.session;

  supabase.auth.onAuthStateChange(async (event, session) => {
    state.session = session;

    if (event === "PASSWORD_RECOVERY") {
      setAuthPanel("reset");
      elements.newPasswordForm.classList.remove("hidden");
    }

    if (!session) {
      toggleAuthUI(false);
      setView("auth");
      return;
    }

    toggleAuthUI(true);
    await ensureProfileRow(session.user);
    await fetchProfile();
    await fetchSettings();
    await fetchCategories();
    await ensureDefaultCategories();
    await fetchCategories();
    await fetchTasks();
    await fetchLogs(dateDaysAgoISO(370));

    refreshUI();
    setView("dashboard");
  });

  if (!state.session) {
    toggleAuthUI(false);
    setView("auth");
    setAuthPanel("login");
  }

  setInterval(maybeNotify, 60000);
};

init();
