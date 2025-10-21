document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL =
        window.location.hostname === 'localhost'
            ? 'http://localhost:5000'
            : 'https://gerador-readme-origin.onrender.com';

    const screens = document.querySelectorAll('.screen');
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const analyzeBtn = document.getElementById('analyze-btn');
    const repoUrlInput = document.getElementById('repo-url');
    const consentCheckbox = document.getElementById('consent-checkbox');
    const repoNameSpans = document.querySelectorAll('.repo-name');
    const bugListContainer = document.getElementById('bug-list-container');
    const readmeContentContainer = document.getElementById('readme-content-container');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');

    const commitBtn = document.getElementById('commit-readme-btn');
    const copyBtn = document.getElementById('copy-readme-btn');
    const prBtn = document.getElementById('pr-readme-btn');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContainer = document.getElementById('modal-container');
    const modalFilepath = document.getElementById('modal-filepath');
    const modalDetails = document.getElementById('modal-details');
    const closeModalBtn = document.getElementById('close-modal-btn');

    const analyzeComplexityBtn = document.getElementById('analyze-complexity-btn');
    const complexityResultsContainer = document.getElementById('complexity-results-container');
    const complexityOverall = document.getElementById('complexity-overall');
    const complexityBottlenecks = document.getElementById('complexity-bottlenecks');
    const complexitySuggestions = document.getElementById('complexity-suggestions');

    let fullReadmeContent = '';
    let currentRepoUrl = '';
    let analysisHasBeenPerformed = false;

    // === API CALLS ===
    async function fetchAnalysisFromBackend(repoUrl) {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo_url: repoUrl })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Erro desconhecido ao gerar o README');
        }
        return await response.json();
    }

    async function commitReadmeToGithub(repoUrl, readmeContent) {
        const response = await fetch(`${API_BASE_URL}/commit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repo_url: repoUrl,
                readme_content: readmeContent
            })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Erro desconhecido ao fazer o commit');
        }
        return await response.json();
    }

    // === UI FUNCTIONS ===
    function showScreen(screenId) {
        screens.forEach(s => s.classList.add('hidden'));
        const screenToShow = document.getElementById(screenId);
        if (screenToShow) screenToShow.classList.remove('hidden');
    }

    async function typeReadme(textToType) {
        readmeContentContainer.innerHTML = '';
        let currentText = '';
        for (let i = 0; i < textToType.length; i++) {
            currentText += textToType[i];
            readmeContentContainer.innerHTML = marked.parse(currentText) + '<span class="typing-cursor"></span>';
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        readmeContentContainer.innerHTML = marked.parse(textToType);
    }

    function populateBugList(bugs) {
        bugListContainer.innerHTML = '';
        if (!bugs || bugs.length === 0) {
            bugListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>Nenhum problema crítico encontrado!</p>
                </div>`;
            return;
        }

        bugs.forEach(bug => {
            const bugItem = document.createElement('div');
            bugItem.classList.add('bug-item');
            const severityClass = bug.severity.toLowerCase();

            bugItem.innerHTML = `
                <div class="bug-info">
                    <div class="bug-title">
                        <h4>${bug.title}</h4>
                    </div>
                    <span class="bug-branch">em: <b>${bug.filepath}</b></span>
                </div>
                <div class="bug-actions">
                    <div class="severity ${severityClass}">${bug.severity}</div>
                    <button class="view-details-btn" data-bug='${JSON.stringify(bug)}'>
                        Ver Detalhes
                    </button>
                </div>
            `;
            bugListContainer.appendChild(bugItem);
        });
    }

    function populateModalDetails(details) {
        const tagClass = `tag-${details.type.toLowerCase()}`;
        modalDetails.innerHTML = `
            <h4><i class="fas fa-exclamation-circle"></i> Problema</h4>
            <p>${details.problem}</p>
            <h4><i class="fas fa-lightbulb"></i> Sugestão da IA</h4>
            <p>${details.suggestion}</p>
            <span class="detail-tag ${tagClass}">${details.type}</span>
        `;
    }

    // === EVENTOS ===
    consentCheckbox.addEventListener('change', () => {
        analyzeBtn.disabled = !consentCheckbox.checked;
    });

    analyzeBtn.addEventListener('click', async () => {
        const repoUrl = repoUrlInput.value.trim();
        if (!repoUrl) {
            alert('Por favor, insira a URL de um repositório.');
            return;
        }

        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        analyzeBtn.disabled = true;

        try {
            const data = await fetchAnalysisFromBackend(repoUrl);
            fullReadmeContent = data.readme || 'README.md vazio gerado pela IA.';
            currentRepoUrl = repoUrl;
            analysisHasBeenPerformed = true;

            const repoName = repoUrl.split('/').slice(-2).join('/').replace('.git', '');
            repoNameSpans.forEach(span => (span.textContent = repoName));

            populateBugList(data.bugs || []);
            showScreen('readme-screen');
            await typeReadme(data.readme);

            menuItems.forEach(i => i.classList.remove('active'));
            document.querySelector('.menu-item[data-target="readme-screen"]').classList.add('active');

        } catch (error) {
            alert(`Erro ao analisar o repositório: ${error.message}`);
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            analyzeBtn.disabled = !consentCheckbox.checked;
        }
    });

    menuItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (['input-screen', 'complexity-screen'].includes(target) || analysisHasBeenPerformed) {
                showScreen(target);
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            } else {
                alert('Primeiro, analise um repositório para poder navegar.');
            }
        });
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(fullReadmeContent).then(() => alert('Conteúdo do README copiado!'));
    });

    commitBtn.addEventListener('click', async () => {
        if (!currentRepoUrl || !fullReadmeContent) return;
        const originalText = commitBtn.innerHTML;
        commitBtn.innerHTML = '<span class="spinner-btn"></span> Comitando...';
        commitBtn.disabled = true;

        try {
            const result = await commitReadmeToGithub(currentRepoUrl, fullReadmeContent);
            alert(result.message);
            if (result.url) window.open(result.url, '_blank');
        } catch (error) {
            alert(`Erro: ${error.message}`);
        } finally {
            commitBtn.innerHTML = originalText;
            commitBtn.disabled = false;
        }
    });

    prBtn.addEventListener('click', () => {
        alert('Funcionalidade futura: criar PR automaticamente.');
    });

    bugListContainer.addEventListener('click', e => {
        if (e.target.classList.contains('view-details-btn')) {
            const bugData = JSON.parse(e.target.dataset.bug);
            modalFilepath.textContent = bugData.filepath;
            populateModalDetails(bugData);
            modalOverlay.classList.remove('hidden');
            modalContainer.classList.remove('hidden');
        }
    });

    const closeModal = () => {
        modalOverlay.classList.add('hidden');
        modalContainer.classList.add('hidden');
    };

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    analyzeComplexityBtn.addEventListener('click', () => {
        alert('Funcionalidade futura: análise de complexidade via IA.');
    });

    showScreen('input-screen');
});
