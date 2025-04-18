(function (namespace) {
  let geofenceLayer = null;
  let importedGeofences = [];
  let isActive = true;
  const STORAGE_KEY = "pettrack_geofences";

  function initialize() {
    const map = namespace.MapModule.getMap();
    if (!map) {
      console.error(
        "Mapa não disponível para o gerenciador de pontos específicos!"
      );
      return false;
    }

    geofenceLayer = L.layerGroup().addTo(map);

    // Configurar toggle de visibilidade
    document
      .getElementById("geofenceToggle")
      ?.addEventListener("change", toggleGeofenceLayer);

    // Permitir seleção múltipla de arquivos
    const fileInput = document.getElementById("geofenceFile");
    if (fileInput) {
      fileInput.setAttribute("multiple", "true");
      fileInput.addEventListener("change", handleFileSelect);
    }

    // Carregar pontos específicos salvos do localStorage
    loadSavedGeofences();

    return true;
  }

  function toggleGeofenceLayer(e) {
    isActive = e?.target?.checked ?? true;
    const map = namespace.MapModule.getMap();

    if (!geofenceLayer || !map) return;

    if (isActive) {
      geofenceLayer.addTo(map);
      // Restaurar visibilidade de cada item conforme seu estado
      updateGeofencesVisibility();
    } else {
      geofenceLayer.remove();
    }
  }

  // Atualiza a visibilidade de cada item com base em seu estado
  function updateGeofencesVisibility() {
    if (!geofenceLayer) return;

    importedGeofences.forEach((geofence) => {
      if (geofence.visible) {
        if (!geofenceLayer.hasLayer(geofence.layer)) {
          geofenceLayer.addLayer(geofence.layer);
        }
      } else {
        if (geofenceLayer.hasLayer(geofence.layer)) {
          geofenceLayer.removeLayer(geofence.layer);
        }
      }
    });
  }

  function handleFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          let geojson;
          if (file.name.endsWith(".kml")) {
            const kml = new DOMParser().parseFromString(
              e.target.result,
              "text/xml"
            );
            geojson = toGeoJSON.kml(kml);
          } else {
            geojson = JSON.parse(e.target.result);
          }

          addGeofenceToMap(geojson, file.name, e.target.result);
          showStatusMessage(
            `Pontos específicos importados com sucesso: ${file.name}`
          );
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file.name}:`, error);
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

  function addGeofenceToMap(geojson, name, rawContent) {
    const color = getRandomColor();
    const layer = L.geoJSON(geojson, {
      style: {
        color: color,
        weight: 3,
        opacity: 0.7,
        fillColor: color,
        fillOpacity: 0.2,
      },
      onEachFeature: function (feature, layer) {
        if (feature.properties) {
          const props = Object.entries(feature.properties)
            .filter(
              ([key, value]) =>
                value !== null && value !== undefined && value !== ""
            )
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join("<br>");

          if (props) layer.bindPopup(props);
        }
      },
      // Adiciona a propriedade interactive para garantir que a interação com o mapa funcione sobre os pontos
      interactive: false,
    }).addTo(geofenceLayer);

    const geofenceInfo = {
      id: `geofence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name,
      layer: layer,
      color: color,
      type: name.split(".").pop().toLowerCase(),
      rawContent: rawContent,
      visible: true, // Todos os novos itens começam visíveis
    };

    importedGeofences.push(geofenceInfo);
    addGeofenceToList(geofenceInfo);
    saveGeofencesToLocalStorage();
  }

  function addGeofenceToList(geofence) {
    const geofenceList = document.getElementById("plantingAreaList");
    if (!geofenceList) return;

    const emptyAlert = geofenceList.querySelector(".alert-info");
    if (emptyAlert) emptyAlert.remove();

    const geofenceItem = document.createElement("div");
    geofenceItem.className = "geofence-item";
    geofenceItem.dataset.id = geofence.id;
    geofenceItem.innerHTML = `
      <div class="geofence-header">
        <span class="geofence-name ${!geofence.visible ? "route-hidden" : ""}">
          <span class="geofence-color" style="display:inline-block; width:12px; height:12px; background-color:${
            geofence.color
          }; margin-right:5px; border-radius:50%;"></span>
          ${geofence.name}
        </span>
        <div class="route-controls">
          <button class="visibility-btn" title="${
            geofence.visible ? "Ocultar" : "Mostrar"
          } pontos">
            <i class="bi ${geofence.visible ? "bi-eye" : "bi-eye-slash"}"></i>
          </button>
          <button class="delete-btn" title="Excluir pontos">&times;</button>
        </div>
      </div>
    `;

    // Adicionar funcionalidade de toggle de visibilidade
    geofenceItem
      .querySelector(".visibility-btn")
      .addEventListener("click", () => {
        const geofenceObj = importedGeofences.find((g) => g.id === geofence.id);
        if (geofenceObj) {
          geofenceObj.visible = !geofenceObj.visible;

          // Atualizar o ícone do botão
          const icon = geofenceItem.querySelector(".visibility-btn i");
          icon.classList.toggle("bi-eye", geofenceObj.visible);
          icon.classList.toggle("bi-eye-slash", !geofenceObj.visible);

          // Atualizar o estilo do nome
          geofenceItem
            .querySelector(".geofence-name")
            .classList.toggle("route-hidden", !geofenceObj.visible);

          // Atualizar a camada no mapa
          if (isActive) {
            if (geofenceObj.visible) {
              geofenceLayer.addLayer(geofenceObj.layer);
            } else {
              geofenceLayer.removeLayer(geofenceObj.layer);
            }
          }

          // Salvar as alterações
          saveGeofencesToLocalStorage();
        }
      });

    // Funcionalidade de exclusão
    geofenceItem.querySelector(".delete-btn").addEventListener("click", () => {
      removeGeofence(geofence.id);
      geofenceItem.remove();

      if (geofenceList.children.length === 0) {
        const emptyAlert = document.createElement("div");
        emptyAlert.className = "alert alert-info";
        emptyAlert.innerHTML =
          '<i class="bi bi-info-circle"></i> Nenhum ponto cadastrado';
        geofenceList.appendChild(emptyAlert);
      }
    });

    // Centralizar no mapa ao clicar no nome
    geofenceItem
      .querySelector(".geofence-name")
      .addEventListener("click", () => {
        const map = namespace.MapModule.getMap();
        if (map && geofence.layer && geofence.layer.getBounds) {
          map.fitBounds(geofence.layer.getBounds());
        }
      });

    geofenceList.appendChild(geofenceItem);
  }

  function removeGeofence(id) {
    const geofence = importedGeofences.find((g) => g.id === id);
    if (geofence && geofenceLayer) {
      geofenceLayer.removeLayer(geofence.layer);
    }

    importedGeofences = importedGeofences.filter((g) => g.id !== id);
    saveGeofencesToLocalStorage();
  }

  function saveGeofencesToLocalStorage() {
    try {
      const geofencesToSave = importedGeofences.map((g) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        type: g.type,
        rawContent: g.rawContent,
        visible: g.visible,
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(geofencesToSave));
    } catch (error) {
      console.error(
        "Erro ao salvar pontos específicos no localStorage:",
        error
      );
    }
  }

  function loadSavedGeofences() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return;

      const geofences = JSON.parse(savedData);

      geofences.forEach((geofence) => {
        try {
          let geojson;

          if (geofence.type === "kml") {
            const kml = new DOMParser().parseFromString(
              geofence.rawContent,
              "text/xml"
            );
            geojson = toGeoJSON.kml(kml);
          } else {
            geojson = JSON.parse(geofence.rawContent);
          }

          // Recriar a camada com a mesma cor original
          const layer = L.geoJSON(geojson, {
            style: {
              color: geofence.color,
              weight: 3,
              opacity: 0.7,
              fillColor: geofence.color,
              fillOpacity: 0.2,
            },
            onEachFeature: function (feature, layer) {
              if (feature.properties) {
                const props = Object.entries(feature.properties)
                  .filter(
                    ([key, value]) =>
                      value !== null && value !== undefined && value !== ""
                  )
                  .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                  .join("<br>");

                if (props) layer.bindPopup(props);
              }
            },
            interactive: false,
          });

          // Adicionar ao mapa apenas se estiver visível
          if (isActive && geofence.visible !== false) {
            layer.addTo(geofenceLayer);
          }

          // Reconstruir o objeto geofence com a nova camada
          const restoredGeofence = {
            ...geofence,
            layer: layer,
            visible: geofence.visible !== false, // Default para true se não especificado
          };

          importedGeofences.push(restoredGeofence);
          addGeofenceToList(restoredGeofence);
        } catch (error) {
          console.error(`Erro ao restaurar pontos ${geofence.name}:`, error);
        }
      });
    } catch (error) {
      console.error(
        "Erro ao carregar pontos específicos do localStorage:",
        error
      );
    }
  }

  function getRandomColor() {
    const colors = [
      "#3388FF",
      "#33A02C",
      "#FB9A99",
      "#E31A1C",
      "#FF7F00",
      "#6A3D9A",
      "#CAB2D6",
      "#FFFF99",
      "#B15928",
      "#1F78B4",
      "#FF5733",
      "#C70039",
      "#900C3F",
      "#581845",
      "#FFC300",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function showStatusMessage(message, type = "success") {
    const statusContainer = document.getElementById("statusMessages");
    if (!statusContainer) return;

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

  function clearAll() {
    if (geofenceLayer) {
      geofenceLayer.clearLayers();
    }
    importedGeofences = [];
    localStorage.removeItem(STORAGE_KEY);

    // Limpar a lista de pontos específicos
    const areaList = document.getElementById("plantingAreaList");
    if (areaList) {
      areaList.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> Nenhum ponto cadastrado
        </div>
      `;
    }
  }

  namespace.GeofenceManager = {
    init: initialize,
    getGeofences: function () {
      return importedGeofences;
    },
    clearAll: clearAll,
  };
})(window.PetTrack || (window.PetTrack = {}));
