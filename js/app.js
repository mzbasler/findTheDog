/**
 * Aplicação principal PetRadar
 * Coordena os diferentes módulos e gerencia o fluxo de dados
 */
const App = (function () {
  // Variáveis privadas
  let sightings = []; // Array de todos os avistamentos
  let filteredSightings = []; // Array de avistamentos filtrados
  let activeFilters = false; // Indica se os filtros estão ativos

  /**
   * Inicializa a aplicação
   */
  function init() {
    try {
      Utilities.log("Iniciando aplicação PetRadar...");

      // Carregar dados salvos
      loadData();

      // Inicializar módulos
      initModules();

      // Configurar eventos globais da UI
      setupEventListeners();

      // Verificação final
      setTimeout(() => {
        if (MapModule) {
          Utilities.log("Forçando atualização final do mapa...");
          updateVisualizations();
        }
      }, CONFIG.DELAYS.MAP_UPDATE * 2);

      Utilities.log("Inicialização completa!");
    } catch (error) {
      Utilities.logError("Erro durante a inicialização", error);
      Utilities.showAlert(
        "Ocorreu um erro durante a inicialização da aplicação. Por favor, recarregue a página.",
        "danger"
      );
    }
  }

  /**
   * Inicializa todos os módulos da aplicação
   */
  function initModules() {
    // Inicializar o mapa primeiro
    if (!MapModule.init()) {
      throw new Error("Falha ao inicializar o módulo do mapa");
    }

    // Inicializar outros módulos
    if (!TimelineModule.init()) {
      Utilities.logError(
        "Falha ao inicializar o módulo da linha do tempo",
        null
      );
    }

    if (!FiltersModule.init()) {
      Utilities.logError("Falha ao inicializar o módulo de filtros", null);
    }

    if (!ImportModule.init()) {
      Utilities.logError("Falha ao inicializar o módulo de importação", null);
    }
  }

  /**
   * Configura os listeners de eventos da interface
   */
  function setupEventListeners() {
    // Formulário de avistamento
    document
      .getElementById("sightingForm")
      .addEventListener("submit", handleSightingFormSubmit);

    // Botão de reset
    document
      .getElementById("resetButton")
      .addEventListener("click", handleResetData);

    // Importação de dados
    document
      .getElementById("fileInput")
      .addEventListener("change", function (e) {
        ImportModule.previewFile(e);
      });

    document
      .getElementById("importButton")
      .addEventListener("click", function () {
        ImportModule.importFile(
          event,
          sightings,
          activeFilters,
          handleImportComplete
        );
      });

    // Filtros
    document
      .getElementById("applyFilterBtn")
      .addEventListener("click", function () {
        const result = FiltersModule.applyFilters(sightings);
        filteredSightings = result.filteredSightings;
        activeFilters = result.activeFilters;
        updateVisualizations();
      });

    document
      .getElementById("clearFilterBtn")
      .addEventListener("click", function () {
        const result = FiltersModule.clearFilters(sightings);
        filteredSightings = result.filteredSightings;
        activeFilters = result.activeFilters;
        updateVisualizations();
      });

    // Para dispositivos móveis, atualizar o mapa quando a orientação muda
    window.addEventListener("resize", function () {
      setTimeout(() => updateVisualizations(), 500);
    });
  }

  /**
   * Carrega os dados salvos do armazenamento local
   */
  function loadData() {
    sightings = Utilities.loadData();
    filteredSightings = [...sightings];

    if (sightings.length > 0) {
      Utilities.log(
        `${sightings.length} avistamentos carregados do armazenamento local`
      );
      updateVisualizations();
    } else {
      Utilities.log("Nenhum dado salvo encontrado");
    }
  }

  /**
   * Atualiza todas as visualizações (mapa e linha do tempo)
   */
  function updateVisualizations() {
    // Atualizar o mapa
    MapModule.updateMap(sightings, filteredSightings, activeFilters);

    // Atualizar a linha do tempo
    TimelineModule.updateTimeline(
      sightings,
      filteredSightings,
      activeFilters,
      handleTimelineItemClick,
      handleDeleteSighting
    );

    // Atualizar estatísticas
    TimelineModule.updateStats(sightings, filteredSightings);

    // Atualizar estado dos filtros
    FiltersModule.setActiveFilters(activeFilters);
  }

  /**
   * Manipula o envio do formulário de avistamento
   * @param {Event} e - Evento de envio do formulário
   */
  function handleSightingFormSubmit(e) {
    e.preventDefault();

    try {
      const dateTime = document.getElementById("dateTime").value;
      const location = document.getElementById("location").value;
      const notes = document.getElementById("notes").value;

      if (!dateTime || !location) {
        Utilities.showAlert(
          "Por favor, preencha a data/hora e localização.",
          "danger"
        );
        return;
      }

      // Parse da localização
      let lat, lng;

      // Verificar se é coordenada ou endereço
      if (location.includes(",")) {
        const coords = location
          .split(",")
          .map((coord) => parseFloat(coord.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          lat = coords[0];
          lng = coords[1];
        } else {
          Utilities.showAlert(
            "Formato de coordenadas inválido. Use: latitude, longitude",
            "danger"
          );
          return;
        }
      } else {
        Utilities.showAlert(
          "Por favor, forneça coordenadas no formato: latitude, longitude",
          "danger"
        );
        return;
      }

      // Criar objeto de avistamento
      const newSighting = {
        id: Date.now(), // ID único baseado no timestamp
        dateTime: dateTime,
        lat: lat,
        lng: lng,
        notes: notes,
        timestamp: new Date(dateTime).getTime(),
      };

      // Adicionar ao array de avistamentos
      sightings.push(newSighting);

      // Ordenar por data/hora
      sightings.sort((a, b) => a.timestamp - b.timestamp);

      // Verificar se o novo avistamento passa nos filtros ativos
      let passesFilter = true;

      if (activeFilters) {
        passesFilter = FiltersModule.checkIfPassesCurrentFilters(newSighting);

        // Adicionar à lista filtrada se passar no filtro
        if (passesFilter) {
          filteredSightings.push(newSighting);
          // Ordenar a lista filtrada
          filteredSightings.sort((a, b) => a.timestamp - b.timestamp);
        }
      } else {
        // Se não há filtros ativos, adicionar o novo avistamento à lista filtrada
        filteredSightings = [...sightings];
      }

      // Atualizar visualizações
      updateVisualizations();

      // Salvar no localStorage
      Utilities.saveData(sightings);

      // Limpar formulário
      document.getElementById("sightingForm").reset();
      MapModule.removeTemporaryMarker();

      if (activeFilters && !passesFilter) {
        Utilities.showAlert(
          "Avistamento adicionado com sucesso, mas está fora dos filtros atuais!",
          "warning"
        );
      } else {
        Utilities.showAlert("Avistamento adicionado com sucesso!", "success");
      }
    } catch (error) {
      Utilities.logError("Erro ao adicionar avistamento", error);
      Utilities.showAlert(
        "Erro ao adicionar avistamento: " + error.message,
        "danger"
      );
    }
  }

  /**
   * Manipula a conclusão da importação de dados
   * @param {Object} result - Resultado da importação
   */
  function handleImportComplete(result) {
    if (!result) return;

    // Atualizar sightings com os dados importados
    sightings = result.sightings;

    // Atualizar filteredSightings com base no estado dos filtros
    if (activeFilters) {
      // Refiltra todos os avistamentos
      const filterResult = FiltersModule.applyFilters(sightings);
      filteredSightings = filterResult.filteredSightings;
    } else {
      // Se não há filtros ativos, mostrar todos
      filteredSightings = [...sightings];
    }

    // Atualizar visualizações
    updateVisualizations();

    // Salvar no localStorage
    Utilities.saveData(sightings);

    // Fechar modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("importModal")
    );
    modal.hide();

    // Mostrar mensagem de sucesso
    Utilities.showAlert(
      `Importação concluída com sucesso! ${
        result.importedCount
      } avistamentos importados.${
        result.errorsCount > 0 ? ` ${result.errorsCount} linhas ignoradas.` : ""
      }`,
      "success"
    );
  }

  /**
   * Manipula o clique em um item da linha do tempo
   * @param {Object} sighting - Avistamento clicado
   */
  function handleTimelineItemClick(sighting) {
    MapModule.centerMap(sighting.lat, sighting.lng);
  }

  /**
   * Manipula a exclusão de um avistamento
   * @param {number} id - ID do avistamento a ser excluído
   */
  function handleDeleteSighting(id) {
    if (confirm("Tem certeza que deseja excluir este avistamento?")) {
      // Remover do array principal
      sightings = sightings.filter((s) => s.id !== id);

      // Remover do array filtrado
      filteredSightings = filteredSightings.filter((s) => s.id !== id);

      // Atualizar visualizações
      updateVisualizations();

      // Salvar alterações
      Utilities.saveData(sightings);

      Utilities.showAlert("Avistamento excluído com sucesso", "info");
    }
  }

  /**
   * Manipula o reset completo dos dados
   */
  function handleResetData() {
    if (
      confirm(
        "Tem certeza que deseja excluir TODOS os avistamentos? Esta ação não pode ser desfeita."
      )
    ) {
      // Limpar dados
      sightings = [];
      filteredSightings = [];

      // Limpar armazenamento
      Utilities.clearData();

      // Resetar filtros
      const result = FiltersModule.clearFilters([]);
      activeFilters = result.activeFilters;

      // Atualizar visualizações
      updateVisualizations();

      Utilities.showAlert("Todos os avistamentos foram removidos", "info");
    }
  }

  // Interface pública do módulo
  return {
    init: init,
  };
})();

// Iniciar a aplicação quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", function () {
  // Iniciar a aplicação após um pequeno delay para garantir que tudo está carregado
  setTimeout(() => App.init(), CONFIG.DELAYS.INIT);
});
