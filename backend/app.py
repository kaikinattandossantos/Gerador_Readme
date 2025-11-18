import os
import base64
import requests
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from flask_cors import CORS
from pathlib import Path

# --- Configurações ---

load_dotenv()



# Validação brutal: Se não tiver as chaves, nem sobe o servidor.
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GITHUB_TOKEN or not GEMINI_API_KEY:
    raise ValueError("❌ ERRO CRÍTICO: Defina GITHUB_TOKEN e GEMINI_API_KEY no .env")

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

# Configuração Gemini 2.5 (Mantendo sua escolha, mas fique atento à estabilidade)
genai.configure(api_key=GEMINI_API_KEY)
# Fallback para flash-2.0 se o 2.5 der erro, mude aqui se necessário
model = genai.GenerativeModel(model_name="gemini-2.0-flash", generation_config={"temperature": 0.2})

app = Flask(__name__, static_folder='static')
CORS(app)

# --- Helpers ---
def extrair_repo_info(repo_url):
    """Limpa e valida a URL para extrair owner e repo."""
    try:
        parts = repo_url.rstrip("/").split("/")
        owner, repo = parts[-2], parts[-1]
        if repo.endswith(".git"):
            repo = repo[:-4]
        return owner, repo
    except Exception:
        return None, None

def obter_arvore_arquivos(owner, repo):
    """
    Estratégia Melhorada: Pega a estrutura de arquivos da branch padrão.
    Isso diz à IA qual é a stack (Node, Python, Go, etc) melhor que commits.
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    # Tenta 'main' primeiro, se falhar (404), tenta 'master'
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 404:
        url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/master?recursive=1"
        res = requests.get(url, headers=HEADERS)
    
    if res.status_code != 200:
        return []
    
    # Retorna apenas os 30 primeiros arquivos do nível superior para não poluir o contexto
    tree = res.json().get("tree", [])
    arquivos = [item['path'] for item in tree if item['type'] == 'blob']
    # Filtra arquivos irrelevantes para economizar tokens
    arquivos_uteis = [f for f in arquivos if not f.endswith(('.png', '.jpg', '.lock', '.svg'))]
    return arquivos_uteis[:40]

def obter_dependencias(owner, repo, file_list):
    """
    Tenta ler package.json ou requirements.txt para dar contexto real à IA.
    """
    conteudo_extra = ""
    arquivos_alvo = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod']
    
    for alvo in arquivos_alvo:
        if alvo in file_list:
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{alvo}"
            res = requests.get(url, headers=HEADERS)
            if res.status_code == 200:
                try:
                    content_b64 = res.json()['content']
                    texto = base64.b64decode(content_b64).decode('utf-8')
                    conteudo_extra += f"\n\n--- Conteúdo de {alvo} ---\n{texto[:1500]}" # Trunca para não estourar
                except:
                    continue
            break # Se achou um arquivo de dependência, já ajuda muito.
    return conteudo_extra

# --- Rotas ---

@app.route('/')
def serve_frontend():
    # Cria a pasta static se não existir para evitar erro bobo
    if not os.path.exists(app.static_folder):
        os.makedirs(app.static_folder)
        with open(os.path.join(app.static_folder, 'index.html'), 'w') as f:
            f.write("<h1>Frontend placeholder - Coloque seu index.html na pasta static</h1>")
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    repo_url = data.get("repo_url")
    
    if not repo_url:
        return jsonify({"error": "URL obrigatória"}), 400

    owner, repo = extrair_repo_info(repo_url)
    if not owner:
        return jsonify({"error": "URL inválida"}), 400

    print(f"🚀 Analisando {owner}/{repo}...")

    # 1. Pega estrutura de arquivos (Vital para saber a linguagem)
    arquivos = obter_arvore_arquivos(owner, repo)
    if not arquivos:
        return jsonify({"error": "Repositório vazio ou inacessível"}), 404

    # 2. Pega dependências (Vital para saber frameworks)
    deps_content = obter_dependencias(owner, repo, arquivos)

    # 3. Pega APENAS os últimos commits da branch default (Contexto de atividade recente)
    commits = []
    url_commits = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=7"
    res_commits = requests.get(url_commits, headers=HEADERS)
    if res_commits.status_code == 200:
        commits = [c['commit']['message'] for c in res_commits.json()]

    # Construção do Prompt Engenheirado
    prompt = f"""
    Aja como um Tech Lead Sênior. Crie um README.md técnico e vendedor para este projeto.
    
    CONTEXTO DO PROJETO:
    1. Estrutura de Arquivos (Analise para inferir a linguagem e arquitetura):
    {", ".join(arquivos)}

    2. Dependências/Configurações Encontradas:
    {deps_content}

    3. Histórico Recente de Commits (Para entender o estágio atual):
    {chr(10).join(f"- {c}" for c in commits)}

    SAÍDA ESPERADA:
    Gere um código Markdown cru para um README.md contendo:
    - Título e Badges (se aplicável)
    - "Sobre o Projeto" (Inferido da estrutura e dependências)
    - Features Principais
    - Stack Tecnológica (Seja específico: ex: 'Flask' em vez de 'Python')
    - Como Rodar (Instalação e Execução baseada na linguagem detectada)
    
    Não inclua blocos de código ```markdown ``` no início, apenas o conteúdo cru.
    """

    try:
        print("🤖 Gerando com IA...")
        resposta = model.generate_content(prompt)
        return jsonify({"readme": resposta.text, "tech_stack_detected": True})
    except Exception as e:
        print(f"Erro Gemini: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/commit", methods=["POST"])
def commit_readme():
    # Mantive sua lógica, mas adicionei checagem de branch default
    data = request.json
    repo_url = data.get("repo_url")
    readme_content = data.get("readme_content")
    
    if not repo_url or not readme_content:
        return jsonify({"error": "Dados inválidos"}), 400

    owner, repo = extrair_repo_info(repo_url)
    
    # Descobre a branch default para não commitar no lugar errado
    repo_info = requests.get(f"https://api.github.com/repos/{owner}/{repo}", headers=HEADERS).json()
    default_branch = repo_info.get("default_branch", "main")

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/README.md"
    
    # Payload base
    payload = {
        "message": "docs: 🤖 README gerado automaticamente via AI",
        "content": base64.b64encode(readme_content.encode("utf-8")).decode("utf-8"),
        "branch": default_branch
    }

    # Verifica se já existe para pegar o SHA (Update vs Create)
    get_res = requests.get(url, headers=HEADERS)
    if get_res.status_code == 200:
        payload["sha"] = get_res.json()["sha"]

    # PUT request
    put_res = requests.put(url, headers=HEADERS, json=payload)
    
    if put_res.status_code in [200, 201]:
        return jsonify({"success": True, "link": put_res.json()['content']['html_url']})
    
    return jsonify({"error": f"GitHub API Erro: {put_res.text}"}), put_res.status_code

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)