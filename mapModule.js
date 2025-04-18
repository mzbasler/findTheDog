(function (namespace) {
  let mapInstance = null;

  function initialize() {
    console.log("Inicializando o mapa...");

    if (!mapInstance) {
      mapInstance = L.map("map", {
        preferCanvas: true,
        zoomControl: false,
      }).setView([-30.05, -51.2], 13); // Centralizando em Porto Alegre como exemplo

      // Controle de zoom personalizado
      L.control
        .zoom({
          position: "topright",
        })
        .addTo(mapInstance);

      // Camada base OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstance);

      // Adicionar escala ao mapa
      L.control
        .scale({
          metric: true,
          imperial: false,
          position: "bottomright",
        })
        .addTo(mapInstance);

      // Adicionar botão de modo escuro ao mapa
      const darkModeToggle = document.createElement("button");
      darkModeToggle.className = "theme-toggle";
      darkModeToggle.innerHTML = '<i class="bi bi-moon-stars"></i>';
      darkModeToggle.title = "Alternar modo escuro";

      darkModeToggle.addEventListener("click", function () {
        document.body.classList.toggle("dark-mode");
        const icon = this.querySelector("i");
        if (icon) {
          icon.classList.toggle("bi-moon-stars");
          icon.classList.toggle("bi-sun");
        }
      });

      // Adicionar o botão ao mapa
      document.querySelector(".map-container").appendChild(darkModeToggle);

      console.log("Mapa inicializado com sucesso.");
    }

    return mapInstance;
  }

  namespace.MapModule = {
    init: initialize,
    getMap: function () {
      if (!mapInstance) return initialize();
      return mapInstance;
    },
  };
})(window.PetTrack || (window.PetTrack = {}));
