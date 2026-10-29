// Estado ZERADO por padrão
let userData = {
    name: "",
    age: null,
    gender: "",
    weight: null,
    height: null,
    experience: "",
    days: null,
    duration: null,
    objective: "",
    waterDrank: 0.0,
    waterTarget: 0.0,
    streak: 0,
    weightHistory: [],
    workouts: []
};

let charts = {};

// Inicialização da Aplicação
window.addEventListener('DOMContentLoaded', () => {
    // Tenta carregar dados salvos no navegador (LocalStorage)
    const saved = localStorage.getItem('evo_pulse_user');
    if (saved) {
        userData = JSON.parse(saved);
    }

    // Timer da Splash Screen
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';

            // Se o usuário já cadastrou nome e peso, abre no Dashboard, senão Onboarding
            if (userData.name && userData.weight) {
                updateUI();
                switchPage('page-dashboard');
            } else {
                switchPage('page-onboarding');
                document.getElementById('app-header').classList.add('hidden');
            }
        }, 600);
    }, 2000);
});

// Navegação de Páginas
function switchPage(pageId, navElement = null) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (navElement) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        navElement.classList.add('active');
    }

    const header = document.getElementById('app-header');
    if (pageId === 'page-onboarding') {
        header.classList.add('hidden');
    } else {
        header.classList.remove('hidden');
    }

    if (pageId === 'page-dashboard') initDashboardCharts();
    if (pageId === 'page-workout') initWorkoutChart();
}

// Passos do Onboarding
function goToStep(step) {
    const name = document.getElementById('input-name').value.trim();
    const weight = parseFloat(document.getElementById('input-weight').value);
    const height = parseFloat(document.getElementById('input-height').value);

    if (step === 2) {
        if (!name || isNaN(weight) || isNaN(height)) {
            alert('Por favor, preencha pelo menos Nome, Peso e Altura para continuar.');
            return;
        }

        userData.name = name;
        userData.age = parseInt(document.getElementById('input-age').value) || 20;
        userData.gender = document.getElementById('input-gender').value || "M";
        userData.weight = weight;
        userData.height = height;
        userData.experience = document.getElementById('input-exp').value || "Iniciante";
        userData.days = parseInt(document.getElementById('input-days').value) || 3;
        userData.duration = parseInt(document.getElementById('input-duration').value) || 45;

        // Adiciona primeiro peso ao histórico se estiver vazio
        if (userData.weightHistory.length === 0) {
            userData.weightHistory.push({ date: 'Hoje', weight: weight });
        }

        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
    }
}

function selectObjective(cardElement, obj) {
    document.querySelectorAll('.objective-card').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');
    userData.objective = obj;
}

function finishOnboarding() {
    if (!userData.objective) {
        alert('Por favor, selecione seu principal objetivo.');
        return;
    }

    // Calcula meta de água aproximada (35ml por kg de peso)
    userData.waterTarget = parseFloat(((userData.weight * 35) / 1000).toFixed(1));
    userData.streak = 1;

    saveData();
    updateUI();
    switchPage('page-dashboard');
}

// Atualiza Interfaces com os dados do usuário
function updateUI() {
    document.getElementById('header-user-name').innerText = userData.name || "Usuário";
    document.getElementById('header-avatar').innerText = userData.name ? userData.name.charAt(0).toUpperCase() : "?";
    document.getElementById('streak-count').innerText = userData.streak || 0;

    document.getElementById('dash-weight').innerText = userData.weight ? userData.weight.toFixed(1) + " kg" : "-- kg";
    document.getElementById('dash-goal-badge').innerText = userData.objective || "Nenhum";

    // Cálculo da meta de peso conforme objetivo
    let targetW = userData.weight;
    if (userData.objective === 'Perder Peso') targetW -= 5;
    if (userData.objective === 'Ganhar Massa Muscular') targetW += 4;
    document.getElementById('dash-target-weight').innerText = targetW ? targetW.toFixed(1) + " kg" : "-- kg";

    // IMC
    if (userData.weight && userData.height) {
        let heightM = userData.height / 100;
        let bmi = (userData.weight / (heightM * heightM)).toFixed(1);
        document.getElementById('dash-bmi').innerText = bmi;
    }

    // Água
    document.getElementById('water-current').innerText = userData.waterDrank.toFixed(2);
    document.getElementById('water-target').innerText = userData.waterTarget.toFixed(1);
    let pct = userData.waterTarget > 0 ? (userData.waterDrank / userData.waterTarget) * 100 : 0;
    document.getElementById('water-fill-bar').style.height = Math.min(pct, 100) + "%";

    renderSmartMacros();
    renderDietPlan();
    renderWorkoutList();
    updateBadges();
}

// Renderiza Macros Estimados
function renderSmartMacros() {
    const container = document.getElementById('macros-container');
    if (!userData.weight) return;

    let protein = (userData.weight * 2.0).toFixed(0);
    let carbs = (userData.weight * 3.0).toFixed(0);
    let fats = (userData.weight * 0.8).toFixed(0);
    let calories = (protein * 4) + (carbs * 4) + (fats * 9);

    container.innerHTML = `
        <div style="font-size: 13px; color: var(--accent-cyan); margin-bottom: 12px; font-weight:600;">Estimativa Diária: ~${calories} kcal</div>
        
        <div class="macro-item">
            <div class="macro-info"><span>Proteínas (~2g/kg)</span><span>${protein}g</span></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 70%; background: var(--accent-green);"></div></div>
        </div>
        <div class="macro-item">
            <div class="macro-info"><span>Carboidratos</span><span>${carbs}g</span></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 55%; background: var(--accent-cyan);"></div></div>
        </div>
        <div class="macro-item">
            <div class="macro-info"><span>Gorduras Saudáveis</span><span>${fats}g</span></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: 40%; background: var(--accent-orange);"></div></div>
        </div>
    `;
}

// Renderiza Dieta sugerida
function renderDietPlan() {
    const container = document.getElementById('diet-content');
    if (!userData.objective) return;

    container.innerHTML = `
        <div class="metric-card">
            <h3 style="color:var(--accent-green); font-size:15px; margin-bottom:8px;"><i class="fa-solid fa-mug-hot"></i> Café da Manhã</h3>
            <p style="font-size:13px; color:var(--text-muted);">Opções: Ovos mexidos, pão integral ou aveia com frutas.</p>
        </div>
        <div class="metric-card">
            <h3 style="color:var(--accent-orange); font-size:15px; margin-bottom:8px;"><i class="fa-solid fa-bowl-rice"></i> Almoço</h3>
            <p style="font-size:13px; color:var(--text-muted);">Opções: Peito de frango/carne magra, arroz/batata e bastante salada.</p>
        </div>
        <div class="metric-card">
            <h3 style="color:var(--accent-purple); font-size:15px; margin-bottom:8px;"><i class="fa-solid fa-drumstick-bite"></i> Jantar</h3>
            <p style="font-size:13px; color:var(--text-muted);">Opções: Peixe grelhado ou omelete com legumes no vapor.</p>
        </div>
    `;
}

// Registro de Ingestão de Água
function addWater(amountMl) {
    if (!userData.waterTarget) {
        alert('Cadastre seu perfil primeiro.');
        return;
    }
    userData.waterDrank += (amountMl / 1000);
    saveData();
    updateUI();
}

// Registrar Exercício
function registerExercise() {
    const name = document.getElementById('ex-name').value.trim();
    const weight = document.getElementById('ex-weight').value;
    const reps = document.getElementById('ex-reps').value;

    if (!name || !weight) {
        alert('Informe o nome do exercício e a carga.');
        return;
    }

    userData.workouts.push({ name, weight: parseFloat(weight), reps: reps || 10 });
    document.getElementById('ex-name').value = '';
    document.getElementById('ex-weight').value = '';
    document.getElementById('ex-reps').value = '';

    saveData();
    renderWorkoutList();
    initWorkoutChart();
}

function renderWorkoutList() {
    const list = document.getElementById('exercise-list');
    if (userData.workouts.length === 0) {
        list.innerHTML = `<p class="empty-state">Nenhum exercício registrado ainda.</p>`;
        return;
    }

    list.innerHTML = userData.workouts.map(ex => `
        <div class="exercise-item">
            <div>
                <strong style="font-size:13px;">${ex.name}</strong>
                <div style="font-size:11px; color:var(--text-muted);">${ex.reps} repetições</div>
            </div>
            <div style="font-weight:700; color:var(--accent-green);">${ex.weight} kg</div>
        </div>
    `).join('');
}

// Registrar Novo Peso
function logNewWeight() {
    const val = parseFloat(document.getElementById('input-log-weight').value);
    if (isNaN(val)) return;

    userData.weight = val;
    userData.weightHistory.push({ date: `Reg ${userData.weightHistory.length + 1}`, weight: val });
    document.getElementById('input-log-weight').value = '';

    saveData();
    updateUI();
    initDashboardCharts();
}

// Conquistas
function updateBadges() {
    if (userData.streak > 0) document.getElementById('badge-streak').classList.add('active');
    if (userData.waterDrank >= userData.waterTarget && userData.waterTarget > 0) document.getElementById('badge-water').classList.add('active');
    if (userData.workouts.length > 0) document.getElementById('badge-workout').classList.add('active');
}

// Persistência em LocalStorage
function saveData() {
    localStorage.setItem('evo_pulse_user', JSON.stringify(userData));
}

// Reiniciar Dados
function resetAppData() {
    if (confirm('Deseja zerar todos os seus dados e recomeçar do zero?')) {
        localStorage.removeItem('evo_pulse_user');
        location.reload();
    }
}

// Modal Toggle
function toggleModal(show) {
    document.getElementById('quick-modal').style.display = show ? 'flex' : 'none';
}

// Chart.js Gráficos
function initDashboardCharts() {
    if (charts.weight) charts.weight.destroy();

    const ctx = document.getElementById('weightChart').getContext('2d');
    const labels = userData.weightHistory.map(h => h.date);
    const data = userData.weightHistory.map(h => h.weight);

    charts.weight = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Início'],
            datasets: [{
                label: 'Peso (kg)',
                data: data.length ? data : [0],
                borderColor: '#00e676',
                backgroundColor: 'rgba(0, 230, 118, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function initWorkoutChart() {
    if (charts.workout) charts.workout.destroy();

    const ctx = document.getElementById('workoutChart').getContext('2d');
    const labels = userData.workouts.map(w => w.name);
    const data = userData.workouts.map(w => w.weight);

    charts.workout = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Sem registros'],
            datasets: [{
                label: 'Carga (kg)',
                data: data.length ? data : [0],
                backgroundColor: '#00e5ff',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// Coach AI Chat
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML += `<div class="chat-msg user">${text}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    setTimeout(() => {
        let resp = "Para otimizar seus resultados, mantenha a consistência em seus treinos, descanse bem e acompanhe sua hidratação diariamente!";
        let lower = text.toLowerCase();
        if (lower.includes('fome') || lower.includes('pós-treino')) {
            resp = "Após o treino, priorize proteínas magras acompanhadas de carboidratos para acelerar a recuperação muscular.";
        } else if (lower.includes('água') || lower.includes('hidratação')) {
            resp = "Uma boa meta de hidratação é em torno de 35ml a 40ml de água por quilo corporal diariamente.";
        }

        chatBox.innerHTML += `<div class="chat-msg bot">${resp}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 600);
}