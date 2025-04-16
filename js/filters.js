/**
 * Gerenciamento dos filtros de data e hora
 */
const FiltersModule = (function () {
  // Variáveis privadas
  let activeFilters = false;

  // Configuração de filtros
  const timeFilters = CONFIG.TIME_FILTERS;

  /**
   * Inicializa os eventos dos controles de filtro
   */
  function init() {
    try {
      Utilities.log("Configurando eventos de filtro...");

      // Mostrar/ocultar o painel de filtros
      document
        .getElementById("filterToggleBtn")
        .addEventListener("click", toggleFilterPanel);

      // Mostrar/ocultar campos de horário personalizado
      document
        .getElementById("timeFilterType")
        .addEventListener("change", handleTimeFilterTypeChange);

      // Aplicar filtro
      document
        .getElementById("applyFilterBtn")
        .addEventListener("click", applyFilters);

      // Limpar filtro
      document
        .getElementById("clearFilterBtn")
        .addEventListener("click", clearFilters);

      Utilities.log("Eventos de filtro configurados com sucesso");
    } catch (error) {
      Utilities.logError("Erro ao configurar eventos de filtro", error);
    }
  }

  /**
   * Alterna a visibilidade do painel de filtros
   */
  function toggleFilterPanel() {
    const filterContainer = document.getElementById("filterContainer");
    if (filterContainer.style.display === "none") {
      filterContainer.style.display = "block";
    } else {
      filterContainer.style.display = "none";
    }
  }

  /**
   * Manipula a alteração do tipo de filtro de hora
   */
  function handleTimeFilterTypeChange() {
    const customTimeContainer = document.getElementById("customTimeContainer");
    const customTimeEndContainer = document.getElementById(
      "customTimeEndContainer"
    );

    if (this.value === "custom") {
      customTimeContainer.style.display = "block";
      customTimeEndContainer.style.display = "block";
    } else {
      customTimeContainer.style.display = "none";
      customTimeEndContainer.style.display = "none";
    }
  }

  /**
   * Aplica os filtros de data e hora
   * @param {Array} sightings - Array de avistamentos
   * @returns {Object} Objeto contendo os avistamentos filtrados e o estado dos filtros
   */
  function applyFilters(sightings) {
    try {
      Utilities.log("Aplicando filtros...");

      const dateStart = document.getElementById("dateFilterStart").value;
      const dateEnd = document.getElementById("dateFilterEnd").value;
      const timeFilterType = document.getElementById("timeFilterType").value;
      const timeStart = document.getElementById("timeFilterStart").value;
      const timeEnd = document.getElementById("timeFilterEnd").value;

      // Verificar se temos algum filtro para aplicar
      if (!dateStart && !dateEnd && timeFilterType === "all") {
        Utilities.showAlert("Nenhum filtro aplicado.", "info");
        return {
          filteredSightings: sightings,
          activeFilters: false,
        };
      }

      // Converter datas para comparação
      let startDate = dateStart ? new Date(dateStart) : null;
      let endDate = dateEnd ? new Date(dateEnd) : null;

      // Ajustar endDate para incluir todo o dia
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      // Definir horários com base no tipo de filtro
      let startHour = 0,
        startMinute = 0,
        endHour = 23,
        endMinute = 59;
      let crossesMidnight = false;

      if (timeFilterType === "morning") {
        startHour = timeFilters.MORNING.startHour;
        endHour = timeFilters.MORNING.endHour;
        endMinute = timeFilters.MORNING.endMinute;
      } else if (timeFilterType === "afternoon") {
        startHour = timeFilters.AFTERNOON.startHour;
        endHour = timeFilters.AFTERNOON.endHour;
        endMinute = timeFilters.AFTERNOON.endMinute;
      } else if (timeFilterType === "evening") {
        startHour = timeFilters.EVENING.startHour;
        endHour = timeFilters.EVENING.endHour;
        endMinute = timeFilters.EVENING.endMinute;
      } else if (timeFilterType === "night") {
        startHour = timeFilters.NIGHT.startHour;
        startMinute = 0;
        endHour = timeFilters.NIGHT.endHour;
        endMinute = timeFilters.NIGHT.endMinute;
        crossesMidnight = timeFilters.NIGHT.crossesMidnight;
      } else if (timeFilterType === "custom" && timeStart && timeEnd) {
        const startParts = timeStart.split(":");
        const endParts = timeEnd.split(":");

        startHour = parseInt(startParts[0]);
        startMinute = parseInt(startParts[1]);
        endHour = parseInt(endParts[0]);
        endMinute = parseInt(endParts[1]);

        // Verificar se cruza a meia-noite
        crossesMidnight =
          endHour < startHour ||
          (endHour === startHour && endMinute < startMinute);
      }

      // Filtrar avistamentos
      const filteredSightings = sightings.filter((sighting) => {
        const sightingDate = new Date(sighting.dateTime);

        // Filtrar por data
        if (startDate && sightingDate < startDate) return false;
        if (endDate && sightingDate > endDate) return false;

        // Filtrar por hora
        if (timeFilterType === "all") return true;

        const hour = sightingDate.getHours();
        const minute = sightingDate.getMinutes();

        // Caso especial para intervalos que cruzam a meia-noite
        if (crossesMidnight) {
          // Hora está entre meia-noite e a hora final OU após a hora inicial
          return (
            hour < endHour ||
            (hour === endHour && minute <= endMinute) ||
            hour > startHour ||
            (hour === startHour && minute >= startMinute)
          );
        }

        // Verificar se a hora está dentro do intervalo para outros casos
        const timeValue = hour * 60 + minute;
        const startValue = startHour * 60 + startMinute;
        const endValue = endHour * 60 + endMinute;

        return timeValue >= startValue && timeValue <= endValue;
      });

      Utilities.log(
        `Filtro aplicado: ${filteredSightings.length} de ${sightings.length} avistamentos`
      );

      // Atualizar badge com contagem
      updateFilteredCountBadge(filteredSightings.length, sightings.length);

      // Mostrar feedback
      Utilities.showAlert(
        `Filtro aplicado: ${filteredSightings.length} avistamentos exibidos.`,
        "success"
      );

      return {
        filteredSightings: filteredSightings,
        activeFilters: true,
      };
    } catch (error) {
      Utilities.logError("Erro ao aplicar filtros", error);
      Utilities.showAlert(
        "Erro ao aplicar filtros: " + error.message,
        "danger"
      );
      return {
        filteredSightings: sightings,
        activeFilters: false,
      };
    }
  }

  /**
   * Limpa todos os filtros
   * @param {Array} sightings - Array de avistamentos
   * @returns {Object} Objeto com avistamentos originais e estado dos filtros
   */
  function clearFilters(sightings) {
    // Limpar campos do formulário
    document.getElementById("dateFilterStart").value = "";
    document.getElementById("dateFilterEnd").value = "";
    document.getElementById("timeFilterType").value = "all";
    document.getElementById("timeFilterStart").value = "";
    document.getElementById("timeFilterEnd").value = "";
    document.getElementById("customTimeContainer").style.display = "none";
    document.getElementById("customTimeEndContainer").style.display = "none";

    // Esconder badge de contagem
    document.getElementById("filteredCountBadge").style.display = "none";

    Utilities.showAlert(
      "Filtros removidos, mostrando todos os avistamentos",
      "info"
    );

    return {
      filteredSightings: sightings,
      activeFilters: false,
    };
  }

  /**
   * Atualiza o badge de contagem de itens filtrados
   * @param {number} filteredCount - Quantidade de itens filtrados
   * @param {number} totalCount - Quantidade total de itens
   */
  function updateFilteredCountBadge(filteredCount, totalCount) {
    const filteredCountBadge = document.getElementById("filteredCountBadge");
    filteredCountBadge.textContent = `${filteredCount} de ${totalCount}`;
    filteredCountBadge.style.display = "inline-block";
  }

  /**
   * Verifica se um avistamento passa nos filtros atuais
   * @param {Object} sighting - Objeto de avistamento
   * @returns {boolean} true se passa nos filtros, false caso contrário
   */
  function checkIfPassesCurrentFilters(sighting) {
    // Se não há filtros ativos, retorna true
    if (!activeFilters) return true;

    const dateFilterStart = document.getElementById("dateFilterStart").value;
    const dateFilterEnd = document.getElementById("dateFilterEnd").value;
    const timeFilterType = document.getElementById("timeFilterType").value;

    // Se não há filtros definidos, retorna true
    if (!dateFilterStart && !dateFilterEnd && timeFilterType === "all") {
      return true;
    }

    const sightingDate = new Date(sighting.dateTime);
    let passesFilter = true;

    // Verificar data
    if (dateFilterStart || dateFilterEnd) {
      if (dateFilterStart) {
        const startDate = new Date(dateFilterStart);
        if (sightingDate < startDate) passesFilter = false;
      }

      if (dateFilterEnd && passesFilter) {
        const endDate = new Date(dateFilterEnd);
        endDate.setHours(23, 59, 59, 999);
        if (sightingDate > endDate) passesFilter = false;
      }
    }

    // Verificar hora
    if (passesFilter && timeFilterType !== "all") {
      const hour = sightingDate.getHours();
      const minute = sightingDate.getMinutes();

      if (timeFilterType === "morning") {
        if (
          hour < timeFilters.MORNING.startHour ||
          hour > timeFilters.MORNING.endHour ||
          (hour === timeFilters.MORNING.endHour &&
            minute > timeFilters.MORNING.endMinute)
        ) {
          passesFilter = false;
        }
      } else if (timeFilterType === "afternoon") {
        if (
          hour < timeFilters.AFTERNOON.startHour ||
          hour > timeFilters.AFTERNOON.endHour ||
          (hour === timeFilters.AFTERNOON.endHour &&
            minute > timeFilters.AFTERNOON.endMinute)
        ) {
          passesFilter = false;
        }
      } else if (timeFilterType === "evening") {
        if (
          hour < timeFilters.EVENING.startHour ||
          hour > timeFilters.EVENING.endHour ||
          (hour === timeFilters.EVENING.endHour &&
            minute > timeFilters.EVENING.endMinute)
        ) {
          passesFilter = false;
        }
      } else if (timeFilterType === "night") {
        // Noite cruza a meia-noite
        if (
          (hour >= timeFilters.NIGHT.startHour ||
            hour <= timeFilters.NIGHT.endHour) &&
          hour === timeFilters.NIGHT.endHour &&
          minute > timeFilters.NIGHT.endMinute
        ) {
          passesFilter = false;
        }
      } else if (timeFilterType === "custom") {
        const timeStart = document.getElementById("timeFilterStart").value;
        const timeEnd = document.getElementById("timeFilterEnd").value;

        if (timeStart && timeEnd) {
          const startParts = timeStart.split(":");
          const endParts = timeEnd.split(":");

          const startHour = parseInt(startParts[0]);
          const startMinute = parseInt(startParts[1]);
          const endHour = parseInt(endParts[0]);
          const endMinute = parseInt(endParts[1]);

          const timeValue = hour * 60 + minute;
          const startValue = startHour * 60 + startMinute;
          const endValue = endHour * 60 + endMinute;

          // Verificar se cruza a meia-noite
          const crossesMidnight =
            endHour < startHour ||
            (endHour === startHour && endMinute < startMinute);

          if (crossesMidnight) {
            if (!(timeValue >= startValue || timeValue <= endValue)) {
              passesFilter = false;
            }
          } else if (timeValue < startValue || timeValue > endValue) {
            passesFilter = false;
          }
        }
      }
    }

    return passesFilter;
  }

  /**
   * Define o estado dos filtros
   * @param {boolean} state - Estado dos filtros (ativo ou não)
   */
  function setActiveFilters(state) {
    activeFilters = state;
  }

  /**
   * Obtém o estado atual dos filtros
   * @returns {boolean} Estado dos filtros
   */
  function getActiveFilters() {
    return activeFilters;
  }

  // Interface pública do módulo
  return {
    init: init,
    applyFilters: applyFilters,
    clearFilters: clearFilters,
    checkIfPassesCurrentFilters: checkIfPassesCurrentFilters,
    setActiveFilters: setActiveFilters,
    getActiveFilters: getActiveFilters,
  };
})();
