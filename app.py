import os
import base64
import requests
import google.generativeai as genai
import json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash-latest")


def obter_dono_e_repositorio(repo_url):
    try:
        parts = repo_url.rstrip("/").split("/")
        owner, repo = parts[-2], parts[-1]
        if repo.endswith(".git"):
            repo = repo[:-4]
        return owner, repo
    except:
        return None, None

def listar_branches(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}/branches"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return [branch['name'] for branch in res.json()]
    print(f"❌ Erro ao listar branches: {res.status_code}")
    return []

def obter_commits_da_branch(owner, repo, branch_name, limit=5):
    url = f"https://api.github.com/repos/{owner}/{repo}/commits"
    params = {'sha': branch_name, 'per_page': limit}
    res = requests.get(url, headers=HEADERS, params=params)
    if res.status_code == 200:
        return [commit['commit']['message'] for commit in res.json()]
    return []

app = Flask(__name__)
CORS(app)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    repo_url = data.get("repo_url")
    if not repo_url:
        return jsonify({"error": "A URL do repositório é obrigatória."}), 400

    owner, repo = obter_dono_e_repositorio(repo_url)
    if not owner or not repo:
        return jsonify({"error": "Não foi possível identificar o repositório a partir da URL."}), 400

    print("🔎 Listando todas as branches...")
    branches = listar_branches(owner, repo)
    if not branches:
        return jsonify({"error": "Nenhuma branch encontrada ou falha ao acessar o repositório."}), 404

    historico_de_commits = ""
    print(f"🌿 Encontradas {len(branches)} branches: {', '.join(branches)}")

    for branch in branches:
        print(f"📜 Coletando commits da branch '{branch}'...")
        commits = obter_commits_da_branch(owner, repo, branch)
        if commits:
            historico_de_commits += f"\n\n# Commits Recentes da Branch: '{branch}'\n"
            for msg in commits:
                historico_de_commits += f"- {msg}\n"

    if not historico_de_commits:
        return jsonify({"error": "Nenhum histórico de commit encontrado nas branches."}), 404

    prompt = f"""
    Você é um engenheiro de software sênior e especialista em DevOps. Sua tarefa é criar um README.md profissional e inteligente para um projeto, baseando-se unicamente no histórico de commits de todas as suas branches.

    A seguir, o histórico de commits recentes do repositório. Analise-o para entender a evolução, as funcionalidades principais e o propósito do projeto.

    Histórico de Commits:
    {historico_de_commits}

    Com base nesta análise, gere um README.md completo em Markdown puro, contendo as seguintes seções:
    - **Nome do Projeto:** (Inferido a partir do contexto)
    - **Descrição:** Um parágrafo que resume o objetivo do projeto, baseado nas features descritas nos commits.
    - **Funcionalidades Principais:** Uma lista (bullet points) das principais funcionalidades que você consegue deduzir a partir dos commits (ex: "Implementação de login", "Criação de relatórios financeiros", "Correção de bug na API", etc.).
    - **Atividade Recente:** Um resumo do que parece estar sendo desenvolvido atualmente.
    """

    try:
        print("🤖 Enviando histórico de commits para o Gemini...")
        resposta = model.generate_content(prompt)
        readme = resposta.text.strip()
        return jsonify({"readme": readme, "bugs": []})
    except Exception as e:
        return jsonify({"error": f"Erro ao gerar README com Gemini: {str(e)}"}), 500

@app.route("/commit", methods=["POST"])
def commit_readme():
    data = request.json
    repo_url = data.get("repo_url")
    readme_content = data.get("readme_content")
    if not repo_url or not readme_content:
        return jsonify({"error": "Dados insuficientes para o commit."}), 400
    owner, repo = obter_dono_e_repositorio(repo_url)
    if not owner or not repo:
        return jsonify({"error": "URL do repositório inválida."}), 400
    
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/README.md"
    payload = {
        "message": "docs: 🚀 README.md gerado por IA a partir do histórico de commits",
        "content": base64.b64encode(readme_content.encode("utf-8")).decode("utf-8"),
    }
    get_res = requests.get(url, headers=HEADERS)
    if get_res.status_code == 200:
        payload["sha"] = get_res.json()["sha"]
    elif get_res.status_code != 404:
        return jsonify({"error": f"Erro ao buscar README existente: {get_res.json()}"}), 500
    put_res = requests.put(url, headers=HEADERS, json=payload)
    if put_res.status_code in [200, 201]:
        return jsonify({"success": True, "message": "README.md comitado com sucesso!", "url": put_res.json().get('content', {}).get('html_url')})
    else:
        return jsonify({"error": f"Erro ao fazer commit no GitHub: {put_res.json()}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
