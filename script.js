// Inicialização do mapa
const map = L.map("map").setView([-30.033056, -51.23], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Marcador inicial (Anita Garibaldi)
const initialLocation = [-30.0346, -51.2177];
const initialMarker = L.marker(initialLocation, {
  icon: L.divIcon({
    className: "map-marker-icon",
    iconSize: [20, 20],
  }),
})
  .addTo(map)
  .bindPopup(
    "<b>Local de desaparecimento</b><br>O cão saiu correndo da Petshop aqui"
  )
  .openPopup();

// Array para armazenar avistamentos
let avistamentos = [];
let routeLine = null;
let predictionArea = null;
let markers = [];
let clickMarker = null;

// Mostrar loading no mapa
function showLoading() {
  document.getElementById("mapLoading").style.display = "block";
}

// Esconder loading
function hideLoading() {
  document.getElementById("mapLoading").style.display = "none";
}

// Mostrar toast de notificação
function showToast(message, type = "success") {
  const toastContainer = document.querySelector(".toast-container");
  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-white bg-${type} border-0 show`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");

  toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

  toastContainer.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.remove(), 300);
  }, 5000);

  toastEl.querySelector("button").addEventListener("click", () => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.remove(), 300);
  });
}

// Evento de clique no mapa para selecionar localização
function handleMapClick(e) {
  if (clickMarker) {
    map.removeLayer(clickMarker);
  }

  clickMarker = L.marker(e.latlng, {
    icon: L.divIcon({
      className: "map-marker-icon",
      iconSize: [24, 24],
      html: '<div style="background-color:#28a745;border-radius:50%;width:24px;height:24px;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>',
    }),
  })
    .addTo(map)
    .bindPopup("Local selecionado")
    .openPopup();

  document.getElementById("latitude").value = e.latlng.lat.toFixed(6);
  document.getElementById("longitude").value = e.latlng.lng.toFixed(6);

  reverseGeocode(e.latlng.lat, e.latlng.lng);

  showToast("Localização selecionada no mapa", "info");
}

// Ativar/desativar o modo de seleção no mapa
document
  .getElementById("selecionarNoMapa")
  .addEventListener("click", function () {
    if (map.hasEventListeners("click")) {
      map.off("click", handleMapClick);
      if (clickMarker) {
        map.removeLayer(clickMarker);
        clickMarker = null;
      }
      this.classList.remove("btn-primary");
      this.classList.add("btn-outline-secondary");
      showToast("Modo de seleção no mapa desativado", "info");
    } else {
      map.on("click", handleMapClick);
      this.classList.remove("btn-outline-secondary");
      this.classList.add("btn-primary");
      showToast("Clique no mapa para selecionar uma localização", "info");
    }
  });

// Geocodificação - Converter endereço em coordenadas
document
  .getElementById("buscarEndereco")
  .addEventListener("click", buscarEndereco);
document.getElementById("endereco").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    buscarEndereco();
  }
});

async function buscarEndereco() {
  const endereco = document.getElementById("endereco").value.trim();
  if (!endereco) {
    showToast("Digite um endereço para buscar", "warning");
    return;
  }

  showLoading();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        endereco + ", Porto Alegre, RS"
      )}&limit=5&addressdetails=1`
    );
    const results = await response.json();

    const resultsContainer = document.getElementById("addressResults");
    resultsContainer.innerHTML = "";

    if (results.length === 0) {
      resultsContainer.innerHTML =
        '<div class="address-result-item text-muted">Nenhum resultado encontrado</div>';
    } else {
      results.forEach((result) => {
        const item = document.createElement("div");
        item.className = "address-result-item";

        const displayAddress = formatAddress(result);

        item.innerHTML = `
                    <div><strong>${displayAddress}</strong></div>
                    <small>${result.lat}, ${result.lon}</small>
                `;

        item.addEventListener("click", () => {
          document.getElementById("latitude").value = result.lat;
          document.getElementById("longitude").value = result.lon;

          document.getElementById("logradouro").value =
            result.address.road || result.address.street || "";
          document.getElementById("numero").value =
            result.address.house_number || "";
          document.getElementById("bairro").value =
            result.address.suburb || result.address.neighbourhood || "";

          document.getElementById("addressDetails").classList.add("show");

          const enderecoCompleto = formatCompleteAddress(result);
          document.getElementById("endereco").value = enderecoCompleto;

          resultsContainer.style.display = "none";

          map.setView([result.lat, result.lon], 18);

          if (clickMarker) {
            map.removeLayer(clickMarker);
          }
          clickMarker = L.marker([result.lat, result.lon], {
            icon: L.divIcon({
              className: "map-marker-icon",
              iconSize: [24, 24],
              html: '<div style="background-color:#28a745;border-radius:50%;width:24px;height:24px;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>',
            }),
          })
            .addTo(map)
            .bindPopup(enderecoCompleto)
            .openPopup();

          showToast("Endereço encontrado e coordenadas definidas", "success");
        });

        resultsContainer.appendChild(item);
      });
    }

    resultsContainer.style.display = "block";
  } catch (error) {
    console.error("Erro na geocodificação:", error);
    showToast("Erro ao buscar endereço. Tente novamente.", "danger");
  } finally {
    hideLoading();
  }
}

// Função para formatar o endereço para exibição nos resultados
function formatAddress(result) {
  const address = result.address;
  let display = [];

  if (address.road || address.street) {
    display.push(address.road || address.street);
    if (address.house_number) {
      display[display.length - 1] += `, ${address.house_number}`;
    }
  }

  if (address.suburb || address.neighbourhood) {
    display.push(address.suburb || address.neighbourhood);
  }

  return display.join(" - ");
}

// Função para formatar o endereço completo
function formatCompleteAddress(result) {
  const address = result.address;
  let parts = [];

  if (address.road || address.street) {
    let logradouro = address.road || address.street;
    if (address.house_number) {
      logradouro += `, ${address.house_number}`;
    }
    parts.push(logradouro);
  }

  if (address.suburb || address.neighbourhood) {
    parts.push(address.suburb || address.neighbourhood);
  }

  if (address.city) {
    parts.push(address.city);
  }

  return parts.join(", ");
}

// Reverse geocoding - converter coordenadas em endereço
async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const result = await response.json();

    if (result.address) {
      const address = result.address;

      document.getElementById("logradouro").value =
        address.road || address.street || "";
      document.getElementById("numero").value = address.house_number || "";
      document.getElementById("bairro").value =
        address.suburb || address.neighbourhood || "";

      const enderecoCompleto = formatCompleteAddress(result);
      document.getElementById("endereco").value = enderecoCompleto;

      document.getElementById("addressDetails").classList.add("show");
    }
  } catch (error) {
    console.error("Erro no reverse geocoding:", error);
  }
}

// Fechar resultados de endereço ao clicar fora
document.addEventListener("click", function (e) {
  if (!e.target.closest(".address-search")) {
    document.getElementById("addressResults").style.display = "none";
  }
});

// Usar geolocalização do navegador
document
  .getElementById("usarMinhaLocalizacao")
  .addEventListener("click", function () {
    showLoading();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          document.getElementById("latitude").value = lat.toFixed(6);
          document.getElementById("longitude").value = lng.toFixed(6);

          if (clickMarker) {
            map.removeLayer(clickMarker);
          }
          clickMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "map-marker-icon",
              iconSize: [24, 24],
              html: '<div style="background-color:#28a745;border-radius:50%;width:24px;height:24px;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>',
            }),
          })
            .addTo(map)
            .bindPopup("Sua localização atual")
            .openPopup();

          reverseGeocode(lat, lng);

          map.setView([lat, lng], 15);

          hideLoading();
          showToast("Sua localização foi capturada com sucesso", "success");
        },
        (error) => {
          hideLoading();
          let message = "Erro ao obter localização: ";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message += "Permissão negada";
              break;
            case error.POSITION_UNAVAILABLE:
              message += "Localização indisponível";
              break;
            case error.TIMEOUT:
              message += "Tempo esgotado";
              break;
            default:
              message += "Erro desconhecido";
          }
          showToast(message, "danger");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      hideLoading();
      showToast("Geolocalização não suportada pelo seu navegador", "warning");
    }
  });

// Formulário de avistamento
document
  .getElementById("avistamentoForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const data = document.getElementById("dataAvistamento").value;
    const descricao = document.getElementById("descricao").value;
    const lat = parseFloat(document.getElementById("latitude").value);
    const lng = parseFloat(document.getElementById("longitude").value);

    if (isNaN(lat) || isNaN(lng)) {
      showToast(
        "Coordenadas inválidas. Preencha com valores numéricos.",
        "danger"
      );
      return;
    }

    if (lat < -30.2 || lat > -29.9 || lng < -51.3 || lng > -51.0) {
      if (
        !confirm(
          "As coordenadas estão fora da área de Porto Alegre. Deseja continuar mesmo assim?"
        )
      ) {
        return;
      }
    }

    const logradouro = document.getElementById("logradouro").value;
    const numero = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value;

    let enderecoCompleto = "";
    if (logradouro) {
      enderecoCompleto = logradouro;
      if (numero) enderecoCompleto += `, ${numero}`;
      if (bairro) enderecoCompleto += ` - ${bairro}`;
      enderecoCompleto += ", Porto Alegre";
    }

    const avistamento = {
      id: Date.now(),
      data: data,
      descricao: descricao,
      lat: lat,
      lng: lng,
      endereco:
        enderecoCompleto || document.getElementById("endereco").value || null,
      detalhesEndereco: {
        logradouro: logradouro,
        numero: numero,
        bairro: bairro,
        cidade: "Porto Alegre",
      },
    };

    avistamentos.push(avistamento);
    renderAvistamento(avistamento);
    addMarkerToMap(avistamento);

    this.reset();
    document.getElementById("cidade").value = "Porto Alegre";
    document.getElementById("addressDetails").classList.remove("show");
    if (clickMarker) {
      map.removeLayer(clickMarker);
      clickMarker = null;
    }

    if (avistamentos.length >= 1) {
      calcularRota();
    }

    showToast("Avistamento cadastrado com sucesso!", "success");
  });

// Função para adicionar marcador no mapa
function addMarkerToMap(avistamento) {
  const marker = L.marker([avistamento.lat, avistamento.lng], {
    icon: L.divIcon({
      className: "map-marker-icon",
      iconSize: [20, 20],
    }),
  }).addTo(map).bindPopup(`
            <b>Avistamento em ${new Date(
              avistamento.data
            ).toLocaleString()}</b><br>
            ${avistamento.descricao}<br>
            <small>${
              avistamento.endereco ||
              `${avistamento.lat.toFixed(6)}, ${avistamento.lng.toFixed(6)}`
            }</small>
        `);

  marker.avistamentoId = avistamento.id;
  markers.push(marker);

  marker.on("click", function () {
    highlightAvistamento(avistamento.id);
  });
}

// Função para renderizar avistamento na lista
function renderAvistamento(avistamento) {
  const semAvistamentos = document.getElementById("semAvistamentos");
  if (semAvistamentos) semAvistamentos.remove();

  const div = document.createElement("div");
  div.className = "timeline-item";
  div.dataset.id = avistamento.id;

  let enderecoHtml = "";
  if (avistamento.detalhesEndereco) {
    const det = avistamento.detalhesEndereco;
    enderecoHtml = `
            <small class="text-muted d-block">
                ${det.logradouro}${det.numero ? ", " + det.numero : ""}
                ${det.bairro ? " - " + det.bairro : ""}
            </small>
            <small class="text-muted">${avistamento.lat.toFixed(
              6
            )}, ${avistamento.lng.toFixed(6)}</small>
        `;
  } else if (avistamento.endereco) {
    enderecoHtml = `<small class="text-muted">${avistamento.endereco}</small>`;
  } else {
    enderecoHtml = `<small class="text-muted">${avistamento.lat.toFixed(
      6
    )}, ${avistamento.lng.toFixed(6)}</small>`;
  }

  div.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <h6 class="mb-1">${new Date(
                  avistamento.data
                ).toLocaleString()}</h6>
                <p class="mb-1 small">${avistamento.descricao}</p>
                ${enderecoHtml}
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removerAvistamento(${
              avistamento.id
            }, event)">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

  document.getElementById("listaAvistamentos").prepend(div);

  div.addEventListener("click", function (e) {
    if (e.target.tagName !== "BUTTON") {
      highlightAvistamento(avistamento.id);
    }
  });
}

// Função para destacar um avistamento
function highlightAvistamento(id) {
  document.querySelectorAll(".timeline-item").forEach((item) => {
    item.classList.remove("active");
  });

  markers.forEach((marker) => {
    marker.setIcon(
      L.divIcon({
        className: "map-marker-icon",
        iconSize: [20, 20],
      })
    );
  });

  const item = document.querySelector(`.timeline-item[data-id="${id}"]`);
  if (item) item.classList.add("active");

  const marker = markers.find((m) => m.avistamentoId === id);
  if (marker) {
    marker.setIcon(
      L.divIcon({
        className: "map-marker-icon",
        iconSize: [24, 24],
        html: '<div style="background-color:#dc3545;border-radius:50%;width:24px;height:24px;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.3);"></div>',
      })
    );
    map.setView(marker.getLatLng(), map.getZoom(), { animate: true });
    marker.openPopup();
  }
}

// Função para remover avistamento
window.removerAvistamento = function (id, event) {
  if (event) event.stopPropagation();

  if (!confirm("Tem certeza que deseja remover este avistamento?")) return;

  avistamentos = avistamentos.filter((a) => a.id !== id);

  const item = document.querySelector(`.timeline-item[data-id="${id}"]`);
  if (item) item.remove();

  const markerIndex = markers.findIndex((m) => m.avistamentoId === id);
  if (markerIndex !== -1) {
    map.removeLayer(markers[markerIndex]);
    markers.splice(markerIndex, 1);
  }

  if (avistamentos.length === 0) {
    const div = document.createElement("div");
    div.id = "semAvistamentos";
    div.className = "text-center text-muted py-3";
    div.textContent = "Nenhum avistamento registrado ainda";
    document.getElementById("listaAvistamentos").appendChild(div);

    document.getElementById("areaInfo").innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-info-circle"></i> Cadastre pelo menos 2 avistamentos para calcular a área de busca.
            </div>
        `;
  }

  calcularRota();

  showToast("Avistamento removido", "info");
};

// Calcular rota e área de busca
document.getElementById("calcularArea").addEventListener("click", calcularRota);

function calcularRota() {
  showLoading();

  if (routeLine) map.removeLayer(routeLine);
  if (predictionArea) map.removeLayer(predictionArea);

  if (avistamentos.length === 0) {
    document.getElementById("areaInfo").innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-info-circle"></i> Cadastre pelo menos 2 avistamentos para calcular a área de busca.
            </div>
        `;
    hideLoading();
    return;
  }

  const avistamentosOrdenados = [...avistamentos].sort(
    (a, b) => new Date(a.data) - new Date(b.data)
  );

  const pontosRota = [
    initialLocation,
    ...avistamentosOrdenados.map((a) => [a.lat, a.lng]),
  ];

  routeLine = L.polyline(pontosRota, {
    color: "red",
    weight: 4,
    opacity: 0.7,
    className: "route-line",
  }).addTo(map);

  const ultimoPonto = pontosRota[pontosRota.length - 1];
  const raio = calcularRaioBusca(pontosRota);

  predictionArea = L.circle(ultimoPonto, {
    radius: raio,
    className: "prediction-area",
    color: "red",
    fillOpacity: 0.2,
  }).addTo(map);

  const bounds = routeLine.getBounds().extend(predictionArea.getBounds());
  map.fitBounds(bounds, { padding: [50, 50] });

  document.getElementById("areaInfo").innerHTML = `
        <div class="alert alert-success">
            <h5><i class="fas fa-bullseye"></i> Área de Busca Atualizada</h5>
            <p><strong>Último avistamento:</strong> ${
              avistamentosOrdenados[avistamentosOrdenados.length - 1].descricao
            }</p>
            <p><strong>Localização mais recente:</strong> ${ultimoPonto[0].toFixed(
              6
            )}, ${ultimoPonto[1].toFixed(6)}</p>
            ${
              avistamentosOrdenados[avistamentosOrdenados.length - 1].endereco
                ? `<p><strong>Endereço aproximado:</strong> ${
                    avistamentosOrdenados[avistamentosOrdenados.length - 1]
                      .endereco
                  }</p>`
                : ""
            }
            <p><strong>Área de busca recomendada:</strong> Raio de ${(
              raio / 1000
            ).toFixed(1)} km ao redor do último avistamento</p>
            <p><strong>Direção geral:</strong> ${calcularDirecaoGeral(
              pontosRota
            )}</p>
            <p class="mb-0"><strong>Distância total percorrida:</strong> ${(
              calcularDistanciaTotal(pontosRota) / 1000
            ).toFixed(1)} km</p>
        </div>
    `;

  hideLoading();
  showToast("Área de busca calculada com sucesso", "success");
}

// Função auxiliar para calcular raio da área de busca
function calcularRaioBusca(pontos) {
  if (pontos.length < 2) return 1000;

  const primeiroPonto = pontos[0];
  const ultimoPonto = pontos[pontos.length - 1];

  const distancia = map.distance(primeiroPonto, ultimoPonto);

  const primeiroAvistamento = avistamentos.reduce((prev, current) =>
    new Date(prev.data) < new Date(current.data) ? prev : current
  );
  const horas =
    (new Date() - new Date(primeiroAvistamento.data)) / (1000 * 60 * 60);

  let raio = Math.min(Math.max(distancia * 0.5, 500), 5000);
  if (horas > 12) raio *= 1.2;
  if (horas > 24) raio *= 1.5;
  if (horas > 48) raio *= 2;

  return raio;
}

// Função auxiliar para calcular direção geral
function calcularDirecaoGeral(pontos) {
  if (pontos.length < 3) return "Indeterminada";

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  const dx = ultimo[1] - primeiro[1];
  const dy = ultimo[0] - primeiro[0];

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  if (angle < -157.5) return "Sul";
  if (angle < -112.5) return "Sudoeste";
  if (angle < -67.5) return "Oeste";
  if (angle < -22.5) return "Noroeste";
  if (angle < 22.5) return "Norte";
  if (angle < 67.5) return "Nordeste";
  if (angle < 112.5) return "Leste";
  if (angle < 157.5) return "Sudeste";
  return "Sul";
}

// Função para calcular distância total percorrida
function calcularDistanciaTotal(pontos) {
  let distanciaTotal = 0;

  for (let i = 1; i < pontos.length; i++) {
    distanciaTotal += map.distance(pontos[i - 1], pontos[i]);
  }

  return distanciaTotal;
}

// Inicialização - desativar o modo de seleção no mapa se clicar em outro lugar
document.addEventListener("click", function (e) {
  if (
    !e.target.closest("#selecionarNoMapa") &&
    map.hasEventListeners("click")
  ) {
    map.off("click", handleMapClick);
    document.getElementById("selecionarNoMapa").classList.remove("btn-primary");
    document
      .getElementById("selecionarNoMapa")
      .classList.add("btn-outline-secondary");
  }
});
