(function (namespace) {
  let routesList = [];
  let isActive = true;
  const STORAGE_KEY = "pettrack_routes";

  function initialize() {
    const map = namespace.MapModule.getMap();
    if (!map) {
      console.error("Mapa não disponível para o gerenciador de rotas!");
      return false;
    }

    // Configurar toggle de visibilidade
    document
      .getElementById("routeToggle")
      ?.addEventListener("change", toggleRouteLayer);

    // Permitir seleção de arquivos CSV
    const csvFileInput = document.getElementById("csvFileInput");
    if (csvFileInput) {
      csvFileInput.addEventListener("change", handleCSVFileSelect);
    }

    // Listen for route updates
    document.addEventListener("routesUpdated", updateRouteList);

    // Carregar rotas salvas do localStorage
    loadSavedRoutes();

    return true;
  }

  function toggleRouteLayer(e) {
    isActive = e?.target?.checked ?? true;

    if (isActive) {
      // Notify RouteRenderer to update
      const routes = namespace.DataModule.getRoutes();
      if (routes) {
        document.dispatchEvent(
          new CustomEvent("routesUpdated", {
            detail: { routes: routes },
          })
        );
      }
    }
  }

  function handleCSVFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`Processando ${files.length} arquivo(s) CSV...`);

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          console.log(`Iniciando leitura do arquivo: ${file.name}`);
          const csvContent = e.target.result;

          // Debug - print first few lines
          const firstLines = csvContent.split("\n").slice(0, 3).join("\n");
          console.log(`Primeiras linhas de ${file.name}:`, firstLines);

          const pointsCount = namespace.DataModule.processCSVFile(
            csvContent,
            file.name
          );

          if (pointsCount > 0) {
            showStatusMessage(
              `Sucesso: ${pointsCount} pontos importados de ${file.name}`
            );
          } else {
            showStatusMessage(
              `Aviso: Nenhum ponto válido encontrado em ${file.name}`,
              "warning"
            );
          }
        } catch (error) {
          console.error(`Erro ao processar arquivo CSV ${file.name}:`, error);
          showStatusMessage(`Erro ao processar arquivo: ${file.name}`, "error");
        }
      };
      reader.onerror = () => {
        console.error(`Erro ao ler arquivo ${file.name}`);
        showStatusMessage(`Erro ao ler arquivo: ${file.name}`, "error");
      };
      reader.readAsText(file);
    });

    event.target.value = "";
  }

  function updateRouteList(event) {
    const routeListEl = document.getElementById("routeList");
    if (!routeListEl) return;

    // Get routes from event or data module
    const routes =
      event.detail?.routes || namespace.DataModule.getRoutes() || {};

    // Debug
    console.log("Atualizando lista de rotas:", Object.keys(routes).length);

    // Clear existing list
    routeListEl.innerHTML = "";

    // Check if there are any routes
    if (Object.keys(routes).length === 0) {
      routeListEl.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> Nenhuma rota cadastrada
        </div>
      `;
      return;
    }

    // Add each route to the list
    for (const routeId in routes) {
      const route = routes[routeId];
      addRouteToList(route, routeListEl);
    }

    // Save routes to localStorage
    saveRoutesToLocalStorage();
  }

  function addRouteToList(route, listElement) {
    const routeItem = document.createElement("div");
    routeItem.className = "route-item";
    routeItem.dataset.id = route.id;

    // Count the points in the route
    const pointsCount = route.points ? route.points.length : 0;

    routeItem.innerHTML = `
      <div class="route-header">
        <span class="route-name ${!route.visible ? "route-hidden" : ""}">
          <span class="route-color" style="background-color:${
            route.color
          };"></span>
          ${route.date} (${pointsCount} pontos)
        </span>
        <div class="route-controls">
          <button class="visibility-btn" title="${
            route.visible ? "Ocultar" : "Mostrar"
          } rota">
            <i class="bi ${route.visible ? "bi-eye" : "bi-eye-slash"}"></i>
          </button>
          <button class="delete-btn" title="Excluir rota">&times;</button>
        </div>
      </div>
    `;

    // Add visibility toggle
    routeItem.querySelector(".visibility-btn").addEventListener("click", () => {
      const newVisibility = namespace.DataModule.toggleRouteVisibility(
        route.id
      );

      // Update button icon
      const icon = routeItem.querySelector(".visibility-btn i");
      icon.classList.toggle("bi-eye", newVisibility);
      icon.classList.toggle("bi-eye-slash", !newVisibility);

      // Update route name styling
      routeItem
        .querySelector(".route-name")
        .classList.toggle("route-hidden", !newVisibility);
    });

    // Add delete functionality
    routeItem.querySelector(".delete-btn").addEventListener("click", () => {
      if (
        confirm(
          `Tem certeza que deseja excluir esta rota?\n${route.date} (${pointsCount} pontos)`
        )
      ) {
        namespace.DataModule.deleteRoute(route.id);
        routeItem.remove();

        // If list is now empty, show message
        if (listElement.children.length === 0) {
          listElement.innerHTML = `
            <div class="alert alert-info">
              <i class="bi bi-info-circle"></i> Nenhuma rota cadastrada
            </div>
          `;
        }
      }
    });

    // Add click to center on map
    routeItem.querySelector(".route-name").addEventListener("click", () => {
      const map = namespace.MapModule.getMap();
      if (map && route.points && route.points.length > 0) {
        const bounds = L.latLngBounds(
          route.points.map((p) => [p.latitude, p.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    });

    listElement.appendChild(routeItem);
  }

  function saveRoutesToLocalStorage() {
    try {
      const routes = namespace.DataModule.getRoutes();
      if (!routes) return;

      // We need to serialize routes without the circular references
      const routesToSave = {};

      for (const routeId in routes) {
        const route = routes[routeId];

        // Simplify points to save only necessary data
        const simplifiedPoints = route.points.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          time: point.time,
          number: point.number,
          observation: point.observation || "",
        }));

        routesToSave[routeId] = {
          id: route.id,
          date: route.date,
          fileName: route.fileName,
          color: route.color,
          visible: route.visible,
          points: simplifiedPoints,
        };
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(routesToSave));
    } catch (error) {
      console.error("Erro ao salvar rotas no localStorage:", error);
    }
  }

  function loadSavedRoutes() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      console.log("Carregando rotas do localStorage...");

      const routes = JSON.parse(savedData);

      // Register all routes with DataModule
      for (const routeId in routes) {
        const route = routes[routeId];

        // We need to reconstruct datetime objects
        if (route.points && Array.isArray(route.points)) {
          route.points.forEach((point) => {
            // If the point already has a datetime object, skip
            if (point.datetime) return;

            // Create datetime from date+time
            const dateParts = route.date.split("/");
            const timeParts = point.time.replace("h", ":").split(":");

            if (dateParts.length !== 3) {
              console.warn(`Formato de data inválido: ${route.date}`);
              return;
            }

            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
            const year = parseInt(dateParts[2]);
            const hour = timeParts.length > 0 ? parseInt(timeParts[0]) || 0 : 0;
            const minute =
              timeParts.length > 1 ? parseInt(timeParts[1]) || 0 : 0;

            point.datetime = new Date(year, month, day, hour, minute);
          });
        }
      }

      // Import all saved routes into the data module
      // We're injecting them directly, which is a bit of a hack
      if (namespace.DataModule._importSavedRoutes) {
        namespace.DataModule._importSavedRoutes(routes);
      } else {
        // Fallback if direct import function is not available
        // This is less ideal as it might cause duplicate event dispatches
        Object.assign(namespace.DataModule.getRoutes(), routes);
      }

      // Notify components about imported routes
      document.dispatchEvent(
        new CustomEvent("routesUpdated", {
          detail: {
            routes: routes,
          },
        })
      );

      console.log(
        `${Object.keys(routes).length} rotas carregadas do localStorage`
      );
    } catch (error) {
      console.error("Erro ao carregar rotas do localStorage:", error);
    }
  }

  function showStatusMessage(message, type = "success") {
    const statusContainer = document.getElementById("statusMessages");
    if (!statusContainer) return;

    const statusDiv = document.createElement("div");
    statusDiv.className = `alert alert-${
      type === "error" ? "danger" : type === "warning" ? "warning" : "success"
    }`;
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

    statusDiv.querySelector(".float-end").addEventListener("click", () => {
      statusDiv.remove();
    });

    statusContainer.prepend(statusDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.remove();
      }
    }, 5000);
  }

  function clearAllRoutes() {
    const routes = namespace.DataModule.getRoutes();
    if (!routes) return;

    // Delete each route
    for (const routeId in routes) {
      namespace.DataModule.deleteRoute(routeId);
    }

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);

    // Update the list
    const routeListEl = document.getElementById("routeList");
    if (routeListEl) {
      routeListEl.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> Nenhuma rota cadastrada
        </div>
      `;
    }

    showStatusMessage("Todas as rotas foram removidas");
  }

  namespace.RouteManager = {
    init: initialize,
    clearAllRoutes: clearAllRoutes,
  };
})(window.PetTrack || (window.PetTrack = {}));
