const key = "9294bfe271b18d4eeb28d0382f40b486";
let climaAtual = null;

const canvasChuva = document.getElementById("chuva");
const ctxChuva = canvasChuva.getContext("2d");

const canvasRaios = document.getElementById("raios");
const ctxRaios = canvasRaios.getContext("2d");

function redimensionarCanvas() {
  canvasChuva.width = window.innerWidth;
  canvasChuva.height = window.innerHeight;
  canvasRaios.width = window.innerWidth;
  canvasRaios.height = window.innerHeight;
}
redimensionarCanvas();
window.addEventListener("resize", redimensionarCanvas);

function colocarDadosNaTela(dados) {
  console.log(dados);

  document.querySelector(".cidade").innerHTML = "Tempo em " + dados.name;
  document.querySelector(".tempo").innerHTML =
    Math.floor(dados.main.temp) + "°C";
  document.querySelector(".texto-previsao").innerHTML =
    dados.weather[0].description;
  document.querySelector(".img-previsao").src =
    `https://openweathermap.org/img/wn/${dados.weather[0].icon}.png`;

  document.querySelector(".maxima").innerHTML =
    Math.floor(dados.main.temp_max) + "°C";
  document.querySelector(".minima").innerHTML =
    Math.floor(dados.main.temp_min) + "°C";

  document.querySelector(".sensacao").innerHTML =
    Math.floor(dados.main.feels_like) + "°C";
  document.querySelector(".vento").innerHTML =
    Math.floor(dados.wind.speed * 3.6) + " km/h";

  document.querySelector(".nuvens-porcentagem").innerHTML =
    dados.clouds.all + "%";

  aplicarClima(dados.weather[0].main);
}

function aplicarClima(clima) {
  if (clima === climaAtual) return;
  climaAtual = clima;

  pararChuva();
  pararNuvens();
  pararSol();
  pararRaios();

  document.body.classList.add("transicao-clima");

  setTimeout(() => {
    document.body.className = "transicao-clima";

    if (clima === "Clear") {
      document.body.classList.add("clima-clear");
      iniciarSol();
    } else if (["Clouds", "Mist", "Fog", "Haze"].includes(clima)) {
      document.body.classList.add("clima-clouds");
      iniciarNuvens();
    } else if (clima === "Thunderstorm") {
      document.body.classList.add("clima-rain");
      iniciarChuva();
      iniciarRaios();
    } else if (["Rain", "Drizzle"].includes(clima)) {
      document.body.classList.add("clima-rain");
      iniciarChuva();
    } else if (clima === "Snow") {
      document.body.classList.add("clima-snow");
      iniciarNeve();
    }
  }, 400);
}

let meuGrafico = null; // Guardar a instância do gráfico

async function buscarCidade(cidade) {
  if (!cidade) return;
  // 1. Busca Clima Atual
  const dadosAtuais = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${key}&lang=pt_br&units=metric`,
  ).then((res) => res.json());

  // 2. Busca Previsão (Forecast) para o Gráfico
  const dadosPrevisao = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&appid=${key}&lang=pt_br&units=metric`,
  ).then((res) => res.json());

  if (dadosAtuais.cod === 200) {
    const lat = dadosAtuais.coord.lat;
    const lon = dadosAtuais.coord.lon;
    const dadosPoluicao = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${key}`,
    ).then((res) => res.json());

    colocarDadosNaTela(dadosAtuais);
    montarGrafico(dadosPrevisao);
    salvarNoHistorico(dadosAtuais.name);
    const aqi = dadosPoluicao.list[0].main.aqi;
    const infoAr = interpretarAQI(aqi);
    const campoAr = document.getElementById("qualidade-ar");
    campoAr.innerHTML = infoAr.texto;
    campoAr.style.color = infoAr.cor;
  } else {
    alert("Cidade não encontrada!");
  }
}

function montarGrafico(dados) {
  const ctx = document.getElementById("graficoClima").getContext("2d");

  // Criar um gradiente de cor (Ciano para Transparente)
  const gradiente = ctx.createLinearGradient(0, 0, 0, 150);
  gradiente.addColorStop(0, "rgba(0, 210, 255, 0.5)"); // Topo mais visível
  gradiente.addColorStop(1, "rgba(0, 210, 255, 0)");   // Fundo desaparece

  const proximas24h = dados.list.slice(0, 9);
  const labels = proximas24h.map((item) => {
    const data = new Date(item.dt * 1000);
    return `${data.getHours()}:00`;
  });
  const temperaturas = proximas24h.map((item) => Math.floor(item.main.temp));

  if (meuGrafico) {
    meuGrafico.destroy();
  }

  meuGrafico = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Temperatura",
          data: temperaturas,
          borderColor: "#00d2ff", // Azul ciano vibrante
          borderWidth: 3,
          fill: true,
          backgroundColor: gradiente, // Aplica o gradiente aqui
          tension: 0.4, // Linha suave/curva
          pointBackgroundColor: "#00d2ff",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7, // Aumenta ao passar o mouse (UX)
          pointHoverBackgroundColor: "#ffffff",
          pointHoverBorderColor: "#00d2ff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Remove legenda desnecessária
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            titleFont: { family: 'Montserrat', size: 14 },
            bodyFont: { family: 'Montserrat', size: 13 },
            displayColors: false
        }
      },
      scales: {
        y: {
          display: false, // Esconde o eixo Y para um look mais limpo
          grid: { display: false }
        },
        x: {
          grid: { display: false }, // Remove as linhas de grade verticais
          ticks: {
            color: "#ffffff",
            font: { family: "Montserrat", size: 11, weight: '600' }
          },
        },
      },
      onClick: (evt, element) => {
        if (element.length > 0) {
          const index = element[0].index;
          const dadoSelecionado = proximas24h[index];
          dadoSelecionado.name = dados.city.name;
          colocarDadosNaTela(dadoSelecionado);
        }
      },
    },
  });
}

function cliqueiNoBotao() {
  const cidade = document.querySelector(".input-cidade").value;
  buscarCidade(cidade);
}

let gotas = [];
let animacaoId = null;

function iniciarChuva() {
  gotas = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvasChuva.width,
    y: Math.random() * canvasChuva.height,
    speed: 4 + Math.random() * 5,
    tipo: "chuva",
  }));

  animarChuva();
}

function animarChuva() {
  ctxChuva.clearRect(0, 0, canvasChuva.width, canvasChuva.height);
  ctxChuva.strokeStyle = "rgba(200,220,255,0.8)";
  ctxChuva.lineWidth = 2;

  gotas.forEach((gota) => {
    ctxChuva.beginPath();
    ctxChuva.moveTo(gota.x, gota.y);
    ctxChuva.lineTo(gota.x, gota.y + 15);
    ctxChuva.stroke();

    gota.y += gota.speed;
    if (gota.y > canvasChuva.height) {
      gota.y = -20;
      gota.x = Math.random() * canvasChuva.width;
    }
  });

  animacaoId = requestAnimationFrame(animarChuva);
}

function iniciarNeve() {
  gotas = Array.from({ length: 150 }, () => ({
    x: Math.random() * canvasChuva.width,
    y: Math.random() * canvasChuva.height,
    speed: 1 + Math.random() * 2,
    radius: Math.random() * 3,
    drift: Math.random() - 0.5,
  }));

  animarNeve();
}

function animarNeve() {
  ctxChuva.clearRect(0, 0, canvasChuva.width, canvasChuva.height);
  ctxChuva.fillStyle = "rgba(255, 255, 255, 0.8)";

  gotas.forEach((floco) => {
    ctxChuva.beginPath();
    ctxChuva.arc(floco.x, floco.y, floco.radius, 0, Math.PI * 2);
    ctxChuva.fill();

    floco.y += floco.speed;
    floco.x += floco.drift;

    if (floco.y > canvasChuva.height) {
      floco.y = -5;
      floco.x = Math.random() * canvasChuva.width;
    }
  });

  animacaoId = requestAnimationFrame(animarNeve);
}

function pararChuva() {
  if (animacaoId) {
    cancelAnimationFrame(animacaoId);
    animacaoId = null;
  }
  ctxChuva.clearRect(0, 0, canvasChuva.width, canvasChuva.height);
  gotas = [];
}

const nuvensContainer = document.getElementById("nuvens");
let intervaloNuvens = null;

function iniciarNuvens() {
  if (intervaloNuvens) return;

  nuvensContainer.style.display = "block";
  criarNuvem();

  intervaloNuvens = setInterval(() => {
    criarNuvem();
  }, 2500);
}

function pararNuvens() {
  clearInterval(intervaloNuvens);
  intervaloNuvens = null;
  nuvensContainer.innerHTML = "";
  nuvensContainer.style.display = "none";
}

function criarNuvem() {
  const nuvem = document.createElement("img");
  nuvem.src = "img/nuvem.png";
  nuvem.classList.add("nuvem");

  nuvem.onerror = function () {
    this.style.backgroundColor = "rgba(255,255,255,0.7)";
    this.style.borderRadius = "50%";
    this.style.boxShadow = "20px 20px 60px rgba(255,255,255,0.6)";
    this.src = "";
  };

  const tamanho = Math.random() * 120 + 80;
  nuvem.style.width = `${tamanho}px`;

  nuvem.style.top = `${Math.random() * 50}%`;
  nuvem.style.left = `-${tamanho}px`;

  const duracao = Math.random() * 40 + 30;
  nuvem.style.animationDuration = `${duracao}s`;

  nuvensContainer.appendChild(nuvem);

  nuvem.addEventListener("animationend", () => {
    nuvem.remove();
  });
}

const sol = document.getElementById("sol");

function iniciarSol() {
  sol.style.display = "block";
}

function pararSol() {
  sol.style.display = "none";
}

let raioTimeout = null;

function iniciarRaios() {
  gerarRaioAleatorio();
}

function gerarRaioAleatorio() {
  const delay = Math.random() * 5000 + 3000;

  raioTimeout = setTimeout(() => {
    desenharRaio();
    gerarRaioAleatorio();
  }, delay);
}

function desenharRaio() {
  const startX = Math.random() * canvasRaios.width;
  let startY = 0;

  ctxRaios.strokeStyle = "rgba(255,255,255,0.9)";
  ctxRaios.lineWidth = 2;
  ctxRaios.beginPath();
  ctxRaios.moveTo(startX, startY);

  let x = startX;
  let y = startY;

  while (y < canvasRaios.height * 0.7) {
    x += (Math.random() - 0.5) * 30;
    y += Math.random() * 20 + 10;
    ctxRaios.lineTo(x, y);
  }

  ctxRaios.stroke();
  flashTela();

  setTimeout(() => {
    ctxRaios.clearRect(0, 0, canvasRaios.width, canvasRaios.height);
  }, 120);
}

function flashTela() {
  document.body.classList.add("flash-raio");
  setTimeout(() => {
    document.body.classList.remove("flash-raio");
  }, 120);
}

function pararRaios() {
  clearTimeout(raioTimeout);
  raioTimeout = null;
  ctxRaios.clearRect(0, 0, canvasRaios.width, canvasRaios.height);
}

document
  .querySelector(".input-cidade")
  .addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      cliqueiNoBotao();
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  renderizarHistorico();
});

function salvarNoHistorico(cidade) {
  let historico = JSON.parse(localStorage.getItem("cidades")) || [];

  // Remove a cidade se ela já existir (para não repetir)
  historico = historico.filter((c) => c.toLowerCase() !== cidade.toLowerCase());

  // Adiciona a nova cidade no início da lista
  historico.unshift(cidade);

  // Mantém apenas as últimas 5 cidades
  if (historico.length > 5) {
    historico.pop();
  }

  localStorage.setItem("cidades", JSON.stringify(historico));
  renderizarHistorico();
}

function renderizarHistorico() {
  const container = document.getElementById("historico");
  const historico = JSON.parse(localStorage.getItem("cidades")) || [];

  container.innerHTML = "";

  historico.forEach((cidade) => {
    const span = document.createElement("span");
    span.classList.add("cidade-historico");
    span.innerText = cidade;

    span.onclick = () => {
      document.querySelector(".input-cidade").value = cidade;
      buscarCidade(cidade);
    };

    container.appendChild(span);
  });
}

function interpretarAQI(indice) {
  const status = {
    1: { texto: "Bom", cor: "#00ff00" },
    2: { texto: "Regular", cor: "#ffff00" },
    3: { texto: "Moderado", cor: "#ff7e00" },
    4: { texto: "Ruim", cor: "#ff0000" },
    5: { texto: "Péssimo", cor: "#7e0023" },
  };
  return status[indice];
}
