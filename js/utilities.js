/**
 * Utilitários para o aplicativo PetRadar
 */

// Objeto global para armazenar funções utilitárias
const Utilities = {
  /**
   * Mostra um alerta temporário
   * @param {string} message - Mensagem a ser exibida
   * @param {string} type - Tipo de alerta (success, info, warning, danger)
   */
  showAlert: function (message, type) {
    try {
      // Criar o elemento de alerta
      const alertDiv = document.createElement("div");
      alertDiv.classList.add(
        "alert",
        `alert-${type}`,
        "alert-dismissible",
        "fade",
        "show",
        "position-fixed"
      );
      alertDiv.style.top = "20px";
      alertDiv.style.right = "20px";
      alertDiv.style.zIndex = "9999";

      // Adicionar conteúdo
      alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      `;

      // Adicionar ao corpo do documento
      document.body.appendChild(alertDiv);

      // Remover o alerta após o tempo definido
      setTimeout(() => {
        alertDiv.classList.remove("show");
        setTimeout(() => alertDiv.remove(), 150);
      }, CONFIG.ALERT_DURATION);
    } catch (error) {
      console.error("Erro ao mostrar alerta:", error);
    }
  },

  /**
   * Calcula a distância entre dois pontos em km (fórmula de Haversine)
   * @param {number} lat1 - Latitude do ponto 1
   * @param {number} lon1 - Longitude do ponto 1
   * @param {number} lat2 - Latitude do ponto 2
   * @param {number} lon2 - Longitude do ponto 2
   * @returns {number} Distância em quilômetros
   */
  calculateDistance: function (lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distância em km
    return distance;
  },

  /**
   * Formata uma data para exibição
   * @param {Date|string} date - Objeto Date ou string ISO
   * @returns {string} Data formatada
   */
  formatDate: function (date) {
    if (typeof date === "string") {
      date = new Date(date);
    }

    return (
      date.toLocaleDateString(CONFIG.DATE_FORMAT.locale) +
      " " +
      date.toLocaleTimeString(CONFIG.DATE_FORMAT.locale)
    );
  },

  /**
   * Registra uma mensagem no console durante o desenvolvimento
   * @param {string} message - Mensagem a ser registrada
   * @param {*} data - Dados opcionais para exibir junto com a mensagem
   */
  log: function (message, data) {
    if (data) {
      console.log(`[PetRadar] ${message}:`, data);
    } else {
      console.log(`[PetRadar] ${message}`);
    }
  },

  /**
   * Registra um erro no console
   * @param {string} message - Mensagem de erro
   * @param {Error} error - Objeto de erro
   */
  logError: function (message, error) {
    console.error(`[PetRadar] ERRO - ${message}:`, error);
  },

  /**
   * Encontra um valor de coluna em um conjunto de cabeçalhos (case insensitive)
   * @param {Array} headers - Array de cabeçalhos
   * @param {Array} possibleNames - Array de possíveis nomes para a coluna
   * @returns {string|null} O cabeçalho encontrado ou null
   */
  findColumn: function (headers, possibleNames) {
    const lowerHeaders = headers.map((h) => String(h).toLowerCase());

    for (const name of possibleNames) {
      const index = lowerHeaders.findIndex((h) => h.includes(name));
      if (index !== -1) {
        return headers[index];
      }
    }

    return null;
  },

  /**
   * Salva os dados de avistamentos no armazenamento local
   * @param {Array} sightings - Array de avistamentos
   */
  saveData: function (sightings) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sightings));
      this.log(`${sightings.length} avistamentos salvos`);
    } catch (error) {
      this.logError("Erro ao salvar dados", error);
      this.showAlert(
        "Erro ao salvar dados. Seu navegador pode estar com pouco espaço disponível.",
        "danger"
      );
    }
  },

  /**
   * Carrega os dados de avistamentos do armazenamento local
   * @returns {Array} Array de avistamentos ou array vazio se não houver dados
   */
  loadData: function () {
    try {
      const savedData = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!savedData) {
        return [];
      }

      const parsed = JSON.parse(savedData);
      if (!Array.isArray(parsed)) {
        this.logError("Dados salvos não são um array válido", parsed);
        return [];
      }

      // Validar cada item do array
      const validSightings = [];
      for (const item of parsed) {
        if (
          item &&
          typeof item === "object" &&
          item.hasOwnProperty("lat") &&
          item.hasOwnProperty("lng") &&
          item.hasOwnProperty("dateTime") &&
          item.hasOwnProperty("id")
        ) {
          validSightings.push(item);
        }
      }

      return validSightings;
    } catch (error) {
      this.logError("Erro ao carregar dados salvos", error);
      return [];
    }
  },

  /**
   * Limpa os dados armazenados
   */
  clearData: function () {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    this.log("Dados limpos do armazenamento local");
  },
};
