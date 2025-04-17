/**
 * Gerenciamento da linha do tempo de avistamentos
 */
const TimelineModule = (function () {
  /**
   * Inicializa o módulo da linha do tempo
   * @returns {boolean} true se a inicialização foi bem sucedida, false caso contrário
   */
  function init() {
    try {
      Utilities.log("Inicializando módulo da linha do tempo...");

      // Verificar se o elemento da linha do tempo existe
      const timelineContainer = document.getElementById("timeline");
      if (!timelineContainer) {
        Utilities.logError("Elemento 'timeline' não encontrado", null);
        return false;
      }

      return true;
    } catch (error) {
      Utilities.logError("Erro ao inicializar módulo da linha do tempo", error);
      return false;
    }
  }

  /**
   * Atualiza a linha do tempo com os avistamentos
   * @param {Array} allSightings - Array com todos os avistamentos
   * @param {Array} filteredSightings - Array com avistamentos filtrados
   * @param {boolean} activeFilters - Indica se os filtros estão ativos
   * @param {Function} onItemClick - Callback para o clique em um item
   * @param {Function} onDeleteClick - Callback para o clique no botão de excluir
   */
  function updateTimeline(
    allSightings,
    filteredSightings,
    activeFilters,
    onItemClick,
    onDeleteClick
  ) {
    try {
      // Debug - Registrar informações para diagnóstico
      Utilities.log("Atualizando linha do tempo...", {
        allSightings: allSightings.length,
        filteredSightings: filteredSightings.length,
        activeFilters: activeFilters,
      });

      // Obter o container da linha do tempo
      const timelineContainer = document.getElementById("timeline");

      // Verificar se o elemento existe
      if (!timelineContainer) {
        Utilities.logError(
          "Elemento 'timeline' não encontrado na atualização",
          null
        );
        return;
      }

      // Limpar o conteúdo atual
      timelineContainer.innerHTML = "";

      // Obter a mensagem de "nenhum avistamento"
      const noSightingsMessage = document.getElementById("noSightingsMessage");

      // Se não há avistamentos, mostrar mensagem
      if (allSightings.length === 0) {
        if (noSightingsMessage) {
          noSightingsMessage.style.display = "block";
        } else {
          // Se o elemento não existir, criar um
          const message = document.createElement("p");
          message.id = "noSightingsMessage";
          message.className = "text-center text-muted";
          message.textContent = "Nenhum avistamento registrado";
          timelineContainer.appendChild(message);
        }
        return;
      } else {
        // Esconder a mensagem se existir
        if (noSightingsMessage) {
          noSightingsMessage.style.display = "none";
        }
      }

      // Conjunto com IDs dos avistamentos filtrados para rápida verificação
      const filteredIds = new Set(filteredSightings.map((s) => s.id));

      // Adicionar itens à linha do tempo
      allSightings.forEach((sighting, index) => {
        // Verificar se o avistamento está no conjunto filtrado
        const isFiltered = !filteredIds.has(sighting.id) && activeFilters;

        // Criar item da linha do tempo
        const timelineItem = document.createElement("div");
        timelineItem.className = `timeline-item${
          isFiltered ? " filtered-out" : ""
        }`;
        timelineItem.setAttribute("data-id", sighting.id);

        // Definir a data e hora para exibição, priorizando valores originais se disponíveis
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

        // Formatação do conteúdo
        timelineItem.innerHTML = `
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>#${index + 1}</strong>
              <span class="text-${
                isFiltered ? "muted" : "dark"
              }">${displayDateTime}</span>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-primary view-btn" title="Ver no mapa">
                <i class="bi bi-geo-alt"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-btn" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <div>
            <small class="text-muted">
              Lat: ${sighting.lat.toFixed(5)}, Lng: ${sighting.lng.toFixed(5)}
            </small>
          </div>
          ${
            sighting.notes
              ? `<div class="mt-1"><small>${sighting.notes}</small></div>`
              : ""
          }
        `;

        // Adicionar ao container
        timelineContainer.appendChild(timelineItem);

        // Configurar eventos
        const viewBtn = timelineItem.querySelector(".view-btn");
        const deleteBtn = timelineItem.querySelector(".delete-btn");

        // Evento para centralizar no mapa
        if (viewBtn) {
          viewBtn.addEventListener("click", function (e) {
            e.stopPropagation(); // Impedir que o evento seja propagado
            if (onItemClick) onItemClick(sighting);
          });
        }

        // Evento para excluir
        if (deleteBtn) {
          deleteBtn.addEventListener("click", function (e) {
            e.stopPropagation(); // Impedir que o evento seja propagado
            if (onDeleteClick) onDeleteClick(sighting.id);
          });
        }

        // Evento de clique no item inteiro
        timelineItem.addEventListener("click", function (e) {
          // Não propagar o clique se for nos botões
          if (e.target.closest(".btn")) return;

          if (onItemClick) onItemClick(sighting);
        });
      });

      // Debug - Registrar conclusão
      Utilities.log(`Timeline atualizada com ${allSightings.length} itens`);
    } catch (error) {
      Utilities.logError("Erro ao atualizar linha do tempo", error);
    }
  }

  /**
   * Atualiza as estatísticas exibidas na interface
   * @param {Array} allSightings - Array com todos os avistamentos
   * @param {Array} filteredSightings - Array com avistamentos filtrados
   */
  function updateStats(allSightings, filteredSightings) {
    try {
      // Verificar se os elementos existem antes de manipulá-los
      const totalSightingsEl = document.getElementById("totalSightings");
      const totalDistanceEl = document.getElementById("totalDistance");
      const bufferAreaEl = document.getElementById("bufferArea");

      // Atualizar contagem total
      if (totalSightingsEl) {
        totalSightingsEl.textContent = allSightings.length.toString();
      }

      // Calcular e atualizar distância total percorrida
      if (totalDistanceEl) {
        const sightingsToUse =
          filteredSightings.length > 0 ? filteredSightings : allSightings;
        let totalDistance = 0;

        if (sightingsToUse.length > 1) {
          for (let i = 0; i < sightingsToUse.length - 1; i++) {
            const current = sightingsToUse[i];
            const next = sightingsToUse[i + 1];

            totalDistance += Utilities.calculateDistance(
              current.lat,
              current.lng,
              next.lat,
              next.lng
            );
          }
        }

        totalDistanceEl.textContent = totalDistance.toFixed(2);
      }

      // Atualizar área do buffer, se ainda não foi definida
      if (bufferAreaEl && bufferAreaEl.textContent === "0") {
        const bufferRadius = CONFIG.MAP.BUFFER_RADIUS / 1000; // em km
        const area = Math.PI * Math.pow(bufferRadius, 2);
        bufferAreaEl.textContent = area.toFixed(2);
      }
    } catch (error) {
      Utilities.logError("Erro ao atualizar estatísticas", error);
    }
  }

  // Interface pública do módulo
  return {
    init: init,
    updateTimeline: updateTimeline,
    updateStats: updateStats,
  };
})();
