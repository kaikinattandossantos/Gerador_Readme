# DocSync

## Descrição

DocSync é um aplicativo web que automatiza a geração de arquivos `README.md` para projetos GitHub, utilizando a análise de histórico de commits. O aplicativo utiliza uma API do GitHub para recuperar informações sobre os commits e a API do Google Gemini para gerar o conteúdo do `README.md` baseado nesse histórico.  A interface do usuário permite a inserção da URL do repositório GitHub, e a ferramenta então retorna um `README.md` atualizado e com possibilidade de commit diretamente no repositório.  Há também funcionalidades adicionais em desenvolvimento, como análise de bugs e de complexidade de código.

## Tecnologias Utilizadas

* **Backend:** Python (Flask), requests, google.generativeai, dotenv, flask_cors
* **Frontend:** HTML, CSS, JavaScript
* **API:** GitHub API, Google Gemini API
* **Markup:** Markdown
* **Bibliotecas JavaScript:** marked.js, particles.js

## Arquitetura

O DocSync utiliza uma arquitetura cliente-servidor. O frontend (HTML, CSS, JavaScript) interage com um backend (Flask) que por sua vez consome as APIs do GitHub e do Google Gemini. A aplicação segue um modelo de requisição e resposta (RESTful).


## Funcionalidades Principais

* **Geração Automática de README.md:** Analisa o histórico de commits de um repositório GitHub e gera um arquivo `README.md` atualizado.
* **Integração com GitHub:** Permite obter dados de commits de diferentes branches e efetuar commits diretamente no repositório.
* **Integração com Google Gemini:** Utiliza a capacidade de processamento de linguagem natural do Gemini para gerar o conteúdo do README de forma coerente e informativa.
* **Interface do Usuário:** Oferece uma interface intuitiva e amigável para os usuários inserirem a URL do repositório e visualizarem o resultado.
* **Análise de Bugs (futura):** Funcionalidade planejada para identificar potenciais bugs com base no histórico de commits.
* **Análise de Complexidade (futura):** Funcionalidade planejada para analisar a complexidade do código.

## Instalação

1. **Clone o repositório:**

```bash
git clone <URL_DO_REPOSITORIO>
```

2. **Crie um arquivo `.env` na raiz do projeto e adicione suas chaves de API:**

```
GITHUB_TOKEN=<YOUR_GITHUB_TOKEN>
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

3. **Instale as dependências Python:**

```bash
pip install -r requirements.txt
```

4. **(Opcional) Instale as dependências frontend (npm/yarn):**  Dependências frontend não especificadas explicitamente no repositório, assumindo que `style.css` e `script.js` são auto-contidos.

## Uso

1. Execute o aplicativo backend: `python app.py`
2. Acesse a aplicação web através do navegador em `http://localhost:5000`.
3. Cole a URL do seu repositório GitHub.
4. Marque a caixa de consentimento.
5. Clique em "Analisar Commits e Gerar README".
6. Visualize o `README.md` gerado.

## Estrutura de Pastas

```
DocSync/
├── app.py
├── .env
├── index.html
├── script.js
├── style.css
└── requirements.txt
```


## Atividade Recente

A atividade recente se concentra no desenvolvimento e aprimoramento da interface do usuário, incluindo a implementação de funcionalidades para copiar, commitar e criar um pull request do README.md gerado.  A funcionalidade de análise de bugs e análise de complexidade de código está em desenvolvimento futuro.


## Contribuição

Contribuições são bem-vindas! Por favor, crie um pull request após verificar as alterações localmente.

## Licença

(A licença não foi especificada no repositório. Adicione aqui a licença apropriada, ex: MIT License)