/**
 * Gerenciamento do mapa e visualização de pontos
 */
const MapModule = (function () {
  // Variáveis privadas
  let map = null;
  let markers = [];
  let polyline = null;
  let buffer = null;
  let temporaryMarker = null;

  /**
   * Inicializa o mapa e configura os eventos iniciais
   * @returns {boolean} true se a inicialização foi bem sucedida, false caso contrário
   */
  function init() {
    try {
      Utilities.log("Inicializando mapa...");

      // Verificar se o elemento do mapa existe
      const mapElement = document.getElementById("map");
      if (!mapElement) {
        Utilities.logError("Elemento 'map' não encontrado", null);
        return false;
      }

      // Inicializar o mapa com o centro padrão
      map = L.map("map").setView(
        CONFIG.MAP.DEFAULT_CENTER,
        CONFIG.MAP.DEFAULT_ZOOM
      );

      // Adicionar camada de tiles
      L.tileLayer(CONFIG.MAP.TILE_LAYER, {
        attribution: CONFIG.MAP.ATTRIBUTION,
        maxZoom: CONFIG.MAP.MAX_ZOOM,
      }).addTo(map);

      // Configurar eventos do mapa
      map.on("click", handleMapClick);

      // Adicionar controles básicos de zoom
      L.control
        .zoom({
          position: "bottomright",
        })
        .addTo(map);

      Utilities.log("Mapa inicializado com sucesso");
      return true;
    } catch (error) {
      Utilities.logError("Erro ao inicializar mapa", error);
      return false;
    }
  }

  /**
   * Retorna a instância do mapa Leaflet
   * @returns {Object} Instância do mapa
   */
  function getMap() {
    return map;
  }

  /**
   * Atualiza o mapa com base nos avistamentos
   * @param {Array} allSightings - Array com todos os avistamentos
   * @param {Array} filteredSightings - Array com avistamentos filtrados
   * @param {boolean} activeFilters - Indica se os filtros estão ativos
   */
  function updateMap(allSightings, filteredSightings, activeFilters) {
    try {
      // Verificar se o mapa foi inicializado
      if (!map) {
        Utilities.logError("Mapa não inicializado", null);
        return;
      }

      // Limpar marcadores existentes
      clearMap();

      // Se não houver avistamentos, não há o que mostrar
      if (allSightings.length === 0) {
        return;
      }

      // Determinar quais avistamentos mostrar (todos ou filtrados)
      const sightingsToShow = activeFilters ? filteredSightings : allSightings;

      // Adicionar marcadores para cada avistamento
      addMarkers(allSightings, filteredSightings, activeFilters);

      // Desenhar a rota conectando os pontos (se houver mais de um)
      if (filteredSightings.length > 1) {
        drawRoute(filteredSightings);
      }

      // Adicionar buffer circular ao redor do último avistamento (se houver)
      if (filteredSightings.length > 0) {
        const lastSighting = filteredSightings[filteredSightings.length - 1];
        addBuffer(lastSighting.lat, lastSighting.lng);

        // Atualizar a informação do último avistamento na UI
        const lastSightingElement = document.getElementById("lastSighting");
        if (lastSightingElement) {
          // Determinar a melhor data/hora para exibição
          let displayDateTime;

          if (lastSighting.formattedDateTime) {
            displayDateTime = lastSighting.formattedDateTime;
          } else if (lastSighting.originalDate && lastSighting.originalTime) {
            displayDateTime = `${lastSighting.originalDate} ${lastSighting.originalTime}`;
          } else {
            displayDateTime = Utilities.formatDate(lastSighting.dateTime);
          }

          lastSightingElement.textContent = displayDateTime;
        }
      }

      // Centralizar e ajustar zoom para mostrar todos os pontos
      if (sightingsToShow.length > 0) {
        fitMapToMarkers(sightingsToShow);
      }
    } catch (error) {
      Utilities.logError("Erro ao atualizar mapa", error);
    }
  }

  /**
   * Adiciona marcadores para todos os avistamentos
   * @param {Array} allSightings - Todos os avistamentos
   * @param {Array} filteredSightings - Avistamentos filtrados
   * @param {boolean} activeFilters - Indica se os filtros estão ativos
   */
  function addMarkers(allSightings, filteredSightings, activeFilters) {
    // Limpar marcadores existentes
    clearMarkers();

    // Conjunto com IDs dos avistamentos filtrados para rápida verificação
    const filteredIds = new Set(filteredSightings.map((s) => s.id));

    // Adicionar marcadores para cada avistamento
    allSightings.forEach((sighting, index) => {
      // Verificar se o avistamento está no conjunto filtrado
      const isFiltered = !filteredIds.has(sighting.id);

      // Determinar a classe CSS com base no filtro
      const markerClass = isFiltered && activeFilters ? "filtered-out" : "";

      // Determinar a cor do marcador
      const markerColor =
        isFiltered && activeFilters
          ? CONFIG.MAP.MARKER_INACTIVE_COLOR
          : CONFIG.MAP.MARKER_ACTIVE_COLOR;

      // Criar ícone personalizado do marcador
      const icon = L.divIcon({
        className: `custom-marker ${markerClass}`,
        html: `<div style="background-color: ${markerColor}; width: ${
          CONFIG.MAP.MARKER_SIZE
        }px; height: ${CONFIG.MAP.MARKER_SIZE}px; border-radius: 50%; border: ${
          CONFIG.MAP.MARKER_BORDER
        }; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">${
          index + 1
        }</div>`,
        iconSize: [CONFIG.MAP.MARKER_SIZE, CONFIG.MAP.MARKER_SIZE],
        iconAnchor: [CONFIG.MAP.MARKER_SIZE / 2, CONFIG.MAP.MARKER_SIZE / 2],
      });

      // Criar o marcador e adicionar ao mapa
      const marker = L.marker([sighting.lat, sighting.lng], { icon: icon });

      // Adicionar popup com informações
      marker.bindPopup(createPopupContent(sighting, index + 1));

      // Adicionar o marcador ao mapa e ao array
      marker.addTo(map);
      markers.push(marker);
    });
  }

  /**
   * Cria o conteúdo do popup para um avistamento
   * @param {Object} sighting - Objeto do avistamento
   * @param {number} index - Número do avistamento
   * @returns {string} HTML do popup
   */
  function createPopupContent(sighting, index) {
    // Definir a data e hora para exibição, priorizando valores originais
    let displayDateTime;

    if (sighting.formattedDateTime) {
      // Se temos um formato já pronto, usar ele
      displayDateTime = sighting.formattedDateTime;
    } else if (sighting.originalDate && sighting.originalTime) {
      // Se temos os valores originais separados
      displayDateTime = `${sighting.originalDate} ${sighting.originalTime}`;
    } else {
      // Último caso: formatar a partir do dateTime ISO
      displayDateTime = Utilities.formatDate(sighting.dateTime);
    }

    const notes = sighting.notes
      ? `<p><strong>Observações:</strong> ${sighting.notes}</p>`
      : "";

    return `
      <div class="popup-content">
        <h6>Avistamento #${index}</h6>
        <p><strong>Data e Hora:</strong> ${displayDateTime}</p>
        <p><strong>Coordenadas:</strong> ${sighting.lat.toFixed(
          5
        )}, ${sighting.lng.toFixed(5)}</p>
        ${notes}
      </div>
    `;
  }

  /**
   * Desenha a rota entre os pontos de avistamento
   * @param {Array} sightings - Array de avistamentos
   */
  function drawRoute(sightings) {
    // Verificar se o mapa foi inicializado
    if (!map) {
      Utilities.logError("Mapa não inicializado", null);
      return;
    }

    // Remover polyline existente, se houver
    if (polyline) {
      map.removeLayer(polyline);
    }

    // Preparar os pontos para a polyline
    const points = sightings.map((sighting) => [sighting.lat, sighting.lng]);

    // Criar e adicionar a polyline
    polyline = L.polyline(points, {
      color: CONFIG.MAP.ROUTE_COLOR,
      weight: CONFIG.MAP.ROUTE_WEIGHT,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(map);
  }

  /**
   * Adiciona um buffer circular ao redor de um ponto
   * @param {number} lat - Latitude do centro
   * @param {number} lng - Longitude do centro
   */
  function addBuffer(lat, lng) {
    // Verificar se o mapa foi inicializado
    if (!map) {
      Utilities.logError("Mapa não inicializado", null);
      return;
    }

    // Remover buffer existente, se houver
    if (buffer) {
      map.removeLayer(buffer);
    }

    // Criar e adicionar o buffer
    buffer = L.circle([lat, lng], {
      radius: CONFIG.MAP.BUFFER_RADIUS,
      color: CONFIG.MAP.BUFFER_COLOR,
      fillColor: CONFIG.MAP.BUFFER_FILL_COLOR,
      fillOpacity: CONFIG.MAP.BUFFER_FILL_OPACITY,
    }).addTo(map);

    // Atualizar a área do buffer na UI (em km²)
    const area = Math.PI * Math.pow(CONFIG.MAP.BUFFER_RADIUS / 1000, 2);

    const bufferAreaElement = document.getElementById("bufferArea");
    if (bufferAreaElement) {
      bufferAreaElement.textContent = area.toFixed(2);
    }
  }

  /**
   * Ajusta o zoom do mapa para mostrar todos os marcadores
   * @param {Array} sightings - Array de avistamentos a serem exibidos
   */
  function fitMapToMarkers(sightings) {
    // Verificar se o mapa foi inicializado
    if (!map) {
      Utilities.logError("Mapa não inicializado", null);
      return;
    }

    if (sightings.length === 0) return;

    // Se tivermos apenas um ponto, centralizar nele
    if (sightings.length === 1) {
      map.setView([sightings[0].lat, sightings[0].lng], 15);
      return;
    }

    // Criar bounds para conter todos os pontos
    const bounds = L.latLngBounds(sightings.map((s) => [s.lat, s.lng]));

    // Ajustar o mapa para mostrar todos os pontos
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * Manipula o clique no mapa
   * @param {Object} e - Evento de clique
   */
  function handleMapClick(e) {
    try {
      const latlng = e.latlng;

      // Remover marcador temporário existente
      removeTemporaryMarker();

      // Criar novo marcador temporário
      temporaryMarker = L.marker(latlng).addTo(map);

      // Preencher o campo de localização no formulário
      const locationField = document.getElementById("location");
      if (locationField) {
        locationField.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(
          6
        )}`;
      }

      // Abrir o menu lateral de formulário se não estiver aberto
      const formSidebar = document.getElementById("formSidebar");
      if (formSidebar) {
        try {
          const offcanvas = new bootstrap.Offcanvas(formSidebar);
          offcanvas.show();
        } catch (error) {
          Utilities.logError("Erro ao abrir menu lateral", error);
          // Alternativa: tentar abrir o menu de outra forma
          formSidebar.classList.add("show");
        }
      }
    } catch (error) {
      Utilities.logError("Erro ao processar clique no mapa", error);
    }
  }

  /**
   * Remove o marcador temporário do mapa
   */
  function removeTemporaryMarker() {
    if (temporaryMarker && map) {
      map.removeLayer(temporaryMarker);
      temporaryMarker = null;
    }
  }

  /**
   * Centraliza o mapa em um ponto específico
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} zoom - Nível de zoom (opcional)
   */
  function centerMap(lat, lng, zoom = 15) {
    if (map) {
      map.setView([lat, lng], zoom);
    } else {
      Utilities.logError("Mapa não inicializado", null);
    }
  }

  /**
   * Limpa todos os elementos do mapa
   */
  function clearMap() {
    if (!map) {
      Utilities.logError("Mapa não inicializado", null);
      return;
    }

    clearMarkers();

    if (polyline) {
      map.removeLayer(polyline);
      polyline = null;
    }

    if (buffer) {
      map.removeLayer(buffer);
      buffer = null;
    }
  }

  /**
   * Limpa apenas os marcadores do mapa
   */
  function clearMarkers() {
    if (!map) {
      return;
    }

    markers.forEach((marker) => map.removeLayer(marker));
    markers = [];
  }

  /**
   * Calcula a distância total do percurso
   * @param {Array} sightings - Array de avistamentos
   * @returns {number} Distância total em km
   */
  function calculateTotalDistance(sightings) {
    if (sightings.length <= 1) return 0;

    let totalDistance = 0;

    for (let i = 0; i < sightings.length - 1; i++) {
      const current = sightings[i];
      const next = sightings[i + 1];

      totalDistance += Utilities.calculateDistance(
        current.lat,
        current.lng,
        next.lat,
        next.lng
      );
    }

    return totalDistance;
  }

  /**
   * Importa um arquivo KML para o mapa
   */
  function importKmlFile() {
    if (typeof KmlModule !== "undefined" && KmlModule.importKml) {
      KmlModule.importKml();
    } else {
      Utilities.showAlert(
        "Módulo KML não está disponível. Certifique-se de que o arquivo 'kml-loader.js' foi carregado.",
        "warning"
      );
    }
  }

  // Interface pública do módulo
  return {
    init: init,
    updateMap: updateMap,
    centerMap: centerMap,
    removeTemporaryMarker: removeTemporaryMarker,
    calculateTotalDistance: calculateTotalDistance,
    getMap: getMap,
    importKmlFile: importKmlFile,
  };
})();
