(function (namespace) {
  async function initApp() {
    console.log("Iniciando aplicação PetTrack...");

    try {
      // 1. Initialize map first
      console.log("Inicializando mapa...");
      const map = namespace.MapModule.init();
      if (!map) {
        throw new Error("Falha ao inicializar o mapa");
      }

      // 2. Initialize visual modules
      console.log("Inicializando módulos...");

      // Route renderer
      if (!namespace.RouteRenderer.init()) {
        console.error("Falha ao inicializar renderizador de rotas");
      }

      // Points visibility controller
      if (!namespace.PointsVisibility.init()) {
        console.error(
          "Falha ao inicializar controle de visibilidade de pontos"
        );
      }

      // Geofence manager (for KML/GeoJSON)
      if (!namespace.GeofenceManager.init()) {
        console.error("Falha ao inicializar gerenciador de pontos específicos");
      }

      // Buffer module
      try {
        if (!namespace.BufferModule.init()) {
          console.warn("Módulo de buffer inicializado com limitações");
        }
      } catch (bufferError) {
        console.error("Erro crítico no módulo de buffer:", bufferError);
        showStatusMessage("Funcionalidade de buffer limitada", "warning");
      }

      // Route manager (for CSV files)
      if (!namespace.RouteManager.init()) {
        console.error("Falha ao inicializar gerenciador de rotas");
      }

      // Dark mode
      namespace.DarkMode.init();

      // 3. Setup clear data button
      console.log("Configurando botões...");
      setupClearDataButton();

      console.log("Aplicação inicializada com sucesso!");
    } catch (error) {
      console.error("Erro na inicialização:", error);
      showStatusMessage("Erro ao inicializar a aplicação", "error");
    }
  }

  function setupClearDataButton() {
    const clearDataBtn = document.getElementById("clearDataBtn");
    if (!clearDataBtn) {
      console.warn("Botão de limpar dados não encontrado");
      return;
    }

    clearDataBtn.addEventListener("click", function () {
      if (
        confirm(
          "Tem certeza que deseja excluir todas as áreas e rotas monitoradas?"
        )
      ) {
        // Clear geofences (KML/GeoJSON)
        if (
          namespace.GeofenceManager &&
          typeof namespace.GeofenceManager.clearAll === "function"
        ) {
          namespace.GeofenceManager.clearAll();
        }

        // Clear buffers
        if (
          namespace.BufferModule &&
          typeof namespace.BufferModule.clearBuffers === "function"
        ) {
          namespace.BufferModule.clearBuffers();
        }

        // Clear routes (CSV)
        if (
          namespace.RouteManager &&
          typeof namespace.RouteManager.clearAllRoutes === "function"
        ) {
          namespace.RouteManager.clearAllRoutes();
        }

        showStatusMessage("Todos os dados foram removidos");
      }
    });
  }

  function showStatusMessage(message, type = "success") {
    try {
      const statusContainer = document.getElementById("statusMessages");
      if (!statusContainer) {
        console.warn("Container de mensagens não encontrado");
        return;
      }

      const statusDiv = document.createElement("div");
      statusDiv.className = `alert alert-${
        type === "error" ? "danger" : type === "warning" ? "warning" : "success"
      } status-message`;
      statusDiv.innerHTML = `
        <i class="bi bi-${
          type === "error"
            ? "exclamation-triangle"
            : type === "warning"
            ? "exclamation-circle"
            : "check-circle"
        }"></i> ${message}
        <span class="float-end">&times;</span>
      `;

      const closeBtn = statusDiv.querySelector(".float-end");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          statusDiv.remove();
        });
      }

      // Add to container
      statusContainer.prepend(statusDiv);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.remove();
        }
      }, 5000);
    } catch (error) {
      console.error("Erro ao exibir mensagem:", error);
    }
  }

  // Handle DOM ready state
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(initApp, 1);
  } else {
    document.addEventListener("DOMContentLoaded", initApp);
  }

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    // Cancel any active drawing
    if (namespace.BufferModule && namespace.BufferModule.cancelDrawing) {
      namespace.BufferModule.cancelDrawing();
    }
  });

  // Expose for debugging
  window.appNamespace = namespace;
})(window.PetTrack || (window.PetTrack = {}));
