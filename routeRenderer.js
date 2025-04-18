(function (namespace) {
  let routeLayer = null;
  let routePointsLayer = null;
  let isActive = true;
  let pointsVisible = true;

  // Cores fortes para as rotas
  const ROUTE_COLORS = [
    "#FF0000", // Vermelho
    "#00CC00", // Verde forte
    "#0000FF", // Azul
    "#FF00FF", // Magenta
    "#FF6600", // Laranja forte
    "#9900CC", // Roxo
    "#009999", // Ciano escuro
    "#CC0066", // Rosa escuro
    "#666600", // Oliva escuro
    "#990000", // Vermelho escuro
  ];

  function initialize() {
    const map = namespace.MapModule.getMap();
    if (!map) {
      console.error("Mapa não disponível para o renderizador de rotas!");
      return false;
    }

    // Criar camada para as linhas das rotas
    routeLayer = L.layerGroup().addTo(map);

    // Criar camada separada para os pontos/marcadores
    routePointsLayer = L.layerGroup().addTo(map);

    // Escutar toggle de visibilidade de rotas
    document
      .getElementById("routeToggle")
      ?.addEventListener("change", toggleRouteLayer);

    // Escutar toggle de visibilidade de pontos
    document.addEventListener("pointsVisibilityChanged", function (event) {
      pointsVisible = event.detail.visible;
      // Re-renderizar com a nova configuração de visibilidade
      const routes = namespace.DataModule.getRoutes();
      if (routes) {
        renderRoutes({ detail: { routes } });
      }
    });

    // Listen for route updates
    document.addEventListener("routesUpdated", renderRoutes);
    return true;
  }

  function renderRoutes(event) {
    if (!isActive || !routeLayer) return;

    // Clear existing routes
    routeLayer.clearLayers();
    routePointsLayer.clearLayers();

    const routes = event.detail.routes || {};

    // Render each route
    let colorIndex = 0;
    for (const routeId in routes) {
      const route = routes[routeId];

      // Skip if route is not visible
      if (!route.visible) continue;

      // Get points for this route
      const points = route.points;
      if (!points || points.length === 0) continue;

      // Use a color from our predefined strong colors
      const routeColor = ROUTE_COLORS[colorIndex % ROUTE_COLORS.length];
      colorIndex++;

      // Create line coordinates
      const lineCoords = points.map((point) => [
        point.latitude,
        point.longitude,
      ]);

      // Draw the route line
      L.polyline(lineCoords, {
        color: routeColor,
        weight: 4, // Linha mais grossa
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(routeLayer);

      // Add markers for each point with numbers (only if points are visible)
      if (pointsVisible) {
        points.forEach((point) => {
          // Create the numbered marker
          const marker = L.marker([point.latitude, point.longitude], {
            icon: createNumberedIcon(point.number, routeColor),
          }).addTo(routePointsLayer);

          // Add popup with information
          const popupContent = `
            <strong>Ponto #${point.number}</strong><br>
            Data: ${route.date}<br>
            Hora: ${point.time}<br>
            Coordenadas: [${point.latitude.toFixed(
              6
            )}, ${point.longitude.toFixed(6)}]
            ${
              point.observation
                ? "<br><strong>Observação:</strong> " + point.observation
                : ""
            }
          `;

          marker.bindPopup(popupContent);
        });
      }
    }
  }

  function createNumberedIcon(number, color) {
    return L.divIcon({
      className: "numbered-marker",
      html: `<div style="background-color:${color};">${number}</div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });
  }

  function toggleRouteLayer(e) {
    isActive = e?.target?.checked ?? true;
    const map = namespace.MapModule.getMap();

    if (!routeLayer || !map) return;

    if (isActive) {
      routeLayer.addTo(map);
      routePointsLayer.addTo(map);
      const routes = namespace.DataModule.getRoutes();
      if (routes) {
        renderRoutes({ detail: { routes } });
      }
    } else {
      routeLayer.remove();
      routePointsLayer.remove();
    }
  }

  namespace.RouteRenderer = {
    init: initialize,
    getLayer: function () {
      return routeLayer;
    },
    getPointsLayer: function () {
      return routePointsLayer;
    },
    renderRoutes: renderRoutes,
  };
})(window.PetTrack || (window.PetTrack = {}));
