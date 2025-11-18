import os
import requests
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# 1. Tenta carregar o .env
print("--- INICIANDO DIAGNÓSTICO ---")
pasta_atual = Path(__file__).resolve().parent
caminho_env = pasta_atual / '.env'
print(f"1. Procurando .env em: {caminho_env}")

if caminho_env.exists():
    print("   ✅ Arquivo .env encontrado.")
    load_dotenv(dotenv_path=caminho_env)
else:
    print("   ❌ ERRO: Arquivo .env NÃO encontrado nesta pasta!")
    exit()

# 2. Verifica as Variáveis
github_token = os.getenv("GITHUB_TOKEN")
gemini_key = os.getenv("GEMINI_API_KEY")

def ofuscar(texto):
    if not texto or len(texto) < 5: return "N/A"
    return texto[:4] + "..." + texto[-4:]

print(f"2. Token GitHub: {ofuscar(github_token)}")
print(f"3. Key Gemini:   {ofuscar(gemini_key)}")

if not github_token or not gemini_key:
    print("   ❌ ERRO: Uma das chaves está vazia. Verifique seu arquivo .env")
    exit()

# 3. Testa Conexão com GitHub
print("\n4. Testando conexão com GitHub (Repo: pallets/flask)...")
headers = {
    "Authorization": f"token {github_token}",
    "Accept": "application/vnd.github.v3+json"
}
try:
    url = "https://api.github.com/repos/pallets/flask"
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        print("   ✅ GitHub respondeu OK! Acesso confirmado.")
    elif res.status_code == 401:
        print("   ❌ ERRO GITHUB: Token inválido ou expirado (401).")
    elif res.status_code == 404:
        print("   ❌ ERRO GITHUB: Repositório não encontrado (404). O token pode não ter permissão.")
    else:
        print(f"   ❌ ERRO GITHUB: Código {res.status_code}")
except Exception as e:
    print(f"   ❌ ERRO DE CONEXÃO GITHUB: {e}")

# 4. Testa Conexão com Gemini
print("\n5. Testando conexão com Gemini AI...")
genai.configure(api_key=gemini_key)
try:
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Responda apenas 'OK'.")
    print(f"   ✅ Gemini respondeu: {response.text.strip()}")
except Exception as e:
    print(f"   ❌ ERRO GEMINI: {e}")

print("\n--- FIM DO DIAGNÓSTICO ---")