/* -------------------------------------------------
   Planner‑Cat 2026
   • календарь 2026 г.
   • задачи хранятся в localStorage
   • невыполненные задачи переносятся на следующий день
   • кот меняет настроение (счастливый / грустный)
   • модальное окно‑инструкция
------------------------------------------------- */

const STATE = {
    year: 2026,
    month: new Date().getMonth(),
    selectedDate: new Date(),
    tasks: {}               // {"2026-03-15":[{text,done},...] }
};

/* ---------- Утилиты ---------- */
function pad(n) { return n < 10 ? '0' + n : n; }
function fmt(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }

function load() {
    const raw = localStorage.getItem('plannerCatTasks');
    if (raw) STATE.tasks = JSON.parse(raw);
}
function save() { localStorage.setItem('plannerCatTasks', JSON.stringify(STATE.tasks)); }

/* ---------- Перенос незавершённых задач ---------- */
function rollOverPending() {
    const today = fmt(new Date());
    // Если уже был перенос сегодня – ничего не делаем
    if (localStorage.getItem('plannerCatLastRoll')) {
        const last = localStorage.getItem('plannerCatLastRoll');
        if (last === today) return;
    }

    // Идём по всем датам, которым предшествует вчерашний день
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = fmt(yesterday);

    const pending = STATE.tasks[yStr];
    if (pending && pending.some(t => !t.done)) {
        const toMove = pending.filter(t => !t.done);
        // оставляем выполненные в старой дате
        STATE.tasks[yStr] = pending.filter(t => t.done);
        // добавляем к следующему дню
        const tomorrow = fmt(new Date(yesterday.getTime() + 86400000));
        if (!STATE.tasks[tomorrow]) STATE.tasks[tomorrow] = [];
        STATE.tasks[tomorrow].push(...toMove);
        save();
    }
    localStorage.setItem('plannerCatLastRoll', today);
}

/* ---------- Рендер календаря ---------- */
function renderCalendar() {
    const label = document.getElementById('monthLabel');
    const tbody = document.querySelector('#calendarTable tbody');
    tbody.innerHTML = '';

    const first = new Date(STATE.year, STATE.month, 1);
    const startDow = (first.getDay() + 6) % 7;          // 0 = понедельник
    const days = new Date(STATE.year, STATE.month + 1, 0).getDate();

    label.textContent = first.toLocaleString('ru', { month: 'long', year: 'numeric' });

    let d = 1;
    for (let wk = 0; wk < 6; wk++) {
        const tr = document.createElement('tr');
        for (let i = 0; i < 7; i++) {
            const td = document.createElement('td');
            if (wk === 0 && i < startDow) { td.className = 'empty'; tr.appendChild(td); continue; }
            if (d > days) { td.className = 'empty'; tr.appendChild(td); continue; }

            const cur = new Date(STATE.year, STATE.month, d);
            const iso = fmt(cur);
            td.textContent = d;
            td.dataset.date = iso;

            const today = new Date();
            if (cur.toDateString() === today.toDateString()) td.classList.add('today');
            if (STATE.selectedDate && iso === fmt(STATE.selectedDate)) td.classList.add('selected');
            if (STATE.tasks[iso] && STATE.tasks[iso].length) td.classList.add('has-tasks');

            td.addEventListener('click', () => selectDate(iso));
            tr.appendChild(td);
            d++;
        }
        tbody.appendChild(tr);
        if (d > days) break;
    }
    renderTaskPanel();
    updateCatState();
}

/* ---------- Выбор даты ---------- */
function selectDate(iso) {
    const [y, m, day] = iso.split('-').map(Number);
    STATE.selectedDate = new Date(y, m - 1, day);
    renderCalendar();
}

/* ---------- Работа с задачами ---------- */
function renderTaskPanel() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    if (!STATE.selectedDate) return;
    const iso = fmt(STATE.selectedDate);
    const dayTasks = STATE.tasks[iso] || [];

    dayTasks.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = t.done ? 'completed' : '';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = t.done;
        cb.addEventListener('change', () => {
            t.done = cb.checked;
            save();
            renderTaskPanel();
            renderCalendar();
        });

        const label = document.createElement('label');
        label.textContent = t.text;

        const del = document.createElement('button');
        del.textContent = '✕';
        del.style.background = 'transparent';
        del.style.border = 'none';
        del.style.cursor = 'pointer';
        del.addEventListener('click', () => {
            dayTasks.splice(i, 1);
            if (!dayTasks.length) delete STATE.tasks[iso];
            save();
            renderTaskPanel();
            renderCalendar();
        });

        li.append(cb, label, del);
        list.appendChild(li);
    });
}

/* ---------- Добавление задачи ---------- */
document.getElementById('addTaskBtn').addEventListener('click', () => {
    const txt = document.getElementById('newTaskInput').value.trim();
    if (!txt) return;
    const iso = fmt(STATE.selectedDate);
    if (!STATE.tasks[iso]) STATE.tasks[iso] = [];
    STATE.tasks[iso].push({ text: txt, done: false });
    document.getElementById('newTaskInput').value = '';
    save();
    renderTaskPanel();
    renderCalendar();
});

/* ---------- Переключение месяцев ---------- */
document.getElementById('prevMonth').addEventListener('click', () => {
    STATE.month = (STATE.month + 11) % 12;
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    STATE.month = (STATE.month + 1) % 12;
    renderCalendar();
});

/* ---------- Кот и эмоции ---------- */
function updateCatState() {
    const catImg = document.getElementById('catImg');
    const catTxt = document.getElementById('catState');
    const today = fmt(new Date());
    const todayTasks = STATE.tasks[today];

    if (!todayTasks || todayTasks.length === 0) {
        catImg.src = 'cat-sad.png';
        catTxt.textContent = 'Грустный кот';
        return;
    }
    const allDone = todayTasks.every(t => t.done);
    if (allDone) {
        catImg.src = 'cat-happy.png';
        catTxt.textContent = 'Счастливый кот';
    } else {
        catImg.src = 'cat-sad.png';
        catTxt.textContent = 'Грустный кот';
    }
}

/* ---------- Модальное окно‑инструкция ---------- */
const helpModal = document.getElementById('helpModal');
document.getElementById('showHelp').addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});
document.getElementById('closeHelp').addEventListener('click', () => {
    helpModal.classList.add('hidden');
});
window.addEventListener('click', e => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
});

/* ---------- Инициализация ---------- */
load();
rollOverPending();          // перенос дел, если день изменился
renderCalendar();
