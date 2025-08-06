document.addEventListener('DOMContentLoaded', () => {
    const screens = document.querySelectorAll('.screen');
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    const analyzeBtn = document.getElementById('analyze-btn');
    const repoUrlInput = document.getElementById('repo-url');
    const repoNameSpans = document.querySelectorAll('.repo-name');
    const bugListContainer = document.getElementById('bug-list-container');
    const readmeContentContainer = document.getElementById('readme-content-container');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.spinner');
    let fullReadmeContent = '';

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContainer = document.getElementById('modal-container');
    const modalFilepath = document.getElementById('modal-filepath');
    const modalCodeBefore = document.getElementById('modal-code-before');
    const modalCodeAfter = document.getElementById('modal-code-after');
    const closeModalBtn = document.getElementById('close-modal-btn');

    async function fetchAnalysisFromBackend(repoUrl) {
        return new Promise(resolve => {
            setTimeout(() => {
                const mockApiResponse = {
                    bugs: [
                        { title: 'SQL Injection na autenticação', branch: 'feature/login', severity: 'critical', filepath: 'src/auth/service.js', codeBefore: `if (user.password === password) {\n  // Logic\n}`, codeAfter: `if (await bcrypt.compare(password, user.password)) {\n  // Logic\n}` },
                        { title: 'Uso de dependência depreciada', branch: 'main', severity: 'medium', filepath: 'package.json', codeBefore: `"request": "^2.88.2"`, codeAfter: `"axios": "^1.6.0"` },
                        { title: 'Variável não utilizada', branch: 'develop', severity: 'low', filepath: 'src/utils/helpers.js', codeBefore: `let tempUser = null;\nconsole.log(tempUser);`, codeAfter: `` },
                    ],
                    readme: `# Nome do Projeto

![Badge de Licença](https://img.shields.io/badge/license-MIT-blue.svg)

## 📝 Descrição

Este é um projeto de exemplo gerado pela DocSync AI. Ele resolve o problema X e oferece a solução Y, utilizando tecnologias de ponta para garantir performance e segurança.

## 🚀 Instalação

Siga os passos abaixo para configurar o ambiente de desenvolvimento:

1. Clone o repositório:
\`\`\`bash
git clone ${repoUrl}
\`\`\`

2. Instale as dependências:
\`\`\`bash
npm install
\`\`\`

3. Inicie o servidor de desenvolvimento:
\`\`\`bash
npm start
\`\`\`
`
                };
                resolve(mockApiResponse);
            }, 1000);
        });
    }

    function showScreen(screenId) {
        screens.forEach(screen => screen.classList.add('hidden'));
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

    function highlightSyntax(codeStr) {
        return codeStr
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\b(const|let|var|if|else|async|await|return|import|from|export|default)\b/g, '<span class="token-keyword">$&</span>')
            .replace(/('.*?'|".*?"|`.*?`)/g, '<span class="token-string">$&</span>')
            .replace(/(\/\/.*)/g, '<span class="token-comment">$&</span>')
            .replace(/(\w+)(?=\()/g, '<span class="token-function">$&</span>');
    }

    function renderSideBySideDiff(before, after) {
        const renderPane = (paneElement, code, diffType) => {
            paneElement.innerHTML = ''; 
            const lines = code.split('\n');
            const lineNumbers = document.createElement('div');
            lineNumbers.className = 'line-numbers';

            const codeContent = document.createElement('div');
            
            lines.forEach((line, index) => {
                const lineNumber = document.createElement('span');
                lineNumber.className = 'line-number';
                lineNumber.textContent = index + 1;
                lineNumbers.appendChild(lineNumber);

                const codeLine = document.createElement('span');
                codeLine.className = diffType;
                codeLine.innerHTML = highlightSyntax(line) || ' ';
                codeContent.appendChild(codeLine);
            });
            
            paneElement.appendChild(lineNumbers);
            paneElement.appendChild(codeContent);
        };

        renderPane(modalCodeBefore, before, 'diff-remove');
        renderPane(modalCodeAfter, after, 'diff-add');
    }

    function populateBugList(bugs) {
        bugListContainer.innerHTML = '';
        if (!bugs || bugs.length === 0) {
            bugListContainer.innerHTML = '<p>Nenhum bug encontrado!</p>';
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
                    <span class="bug-branch">no branch: <b>${bug.branch}</b></span>
                </div>
                <div class="bug-actions">
                    <div class="severity ${severityClass}">${bug.severity}</div>
                    <button class="view-changes-btn" 
                        data-filepath="${bug.filepath}"
                        data-before='${bug.codeBefore.replace(/'/g, "&apos;")}'
                        data-after='${bug.codeAfter.replace(/'/g, "&apos;")}'>
                        Ver Alterações
                    </button>
                </div>
            `;
            
            bugListContainer.appendChild(bugItem);
        });
    }

    analyzeBtn.addEventListener('click', async () => {
        const repoUrl = repoUrlInput.value;
        if (!repoUrl) {
            alert('Por favor, insira a URL de um repositório.');
            return;
        }

        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            const analysisData = await fetchAnalysisFromBackend(repoUrl);
            fullReadmeContent = analysisData.readme;

            const repoName = repoUrl.split('/').slice(-2).join('/');
            repoNameSpans.forEach(span => span.textContent = repoName);

            populateBugList(analysisData.bugs);
            
            showScreen('readme-screen');
            
            await typeReadme(analysisData.readme);
            
            menuItems.forEach(i => i.classList.remove('active'));
            document.querySelector('.menu-item[data-target="readme-screen"]').classList.add('active');

        } catch (error) {
            alert(`Erro ao analisar o repositório: ${error.message}`);
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (target === 'input-screen') {
                menuItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                showScreen(target);
                return;
            }
            if (!document.getElementById('input-screen').classList.contains('hidden')) {
                alert("Primeiro, analise um repositório para poder navegar.");
                return;
            }
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            showScreen(target);
        });
    });

    bugListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-changes-btn')) {
            const button = e.target;
            modalFilepath.textContent = button.dataset.filepath;
            renderSideBySideDiff(button.dataset.before, button.dataset.after);
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

    document.getElementById('copy-readme-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(fullReadmeContent).then(() => alert('Conteúdo do README copiado!'));
    });
    document.getElementById('pr-readme-btn').addEventListener('click', () => {
        alert("AÇÃO SIMULADA: Criando Pull Request com o novo README.md...");
    });
    document.getElementById('commit-readme-btn').addEventListener('click', () => {
        alert("AÇÃO SIMULADA: Commitando README.md diretamente no branch principal...");
    });
    document.getElementById('generate-branch-btn').addEventListener('click', () => {
        alert("AÇÃO SIMULADA: Criando branch com correções de bugs...");
    });

    showScreen('input-screen');

    particlesJS("particles-js", {
        "particles": {
            "number": { "value": 80, "density": { "enable": true, "value_area": 800 } },
            "color": { "value": "#ffffff" },
            "shape": { "type": "circle" },
            "opacity": { "value": 0.6, "random": true },
            "size": { "value": 3, "random": true },
            "line_linked": { "enable": true, "distance": 150, "color": "#007bff", "opacity": 0.5, "width": 1 },
            "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" } },
            "modes": { "repulse": { "distance": 100, "duration": 0.4 }, "push": { "particles_nb": 4 } }
        },
        "retina_detect": true
    });
});
