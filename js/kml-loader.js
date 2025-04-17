/**
 * Módulo para carregamento e processamento de arquivos KML
 */
const KmlModule = (function () {
  // Variáveis privadas
  let kmlLayers = []; // Array para armazenar as camadas KML

  // Paleta de cores para os KMLs (cores diferentes para cada arquivo)
  const colorPalette = [
    { line: "#3388ff", fill: "#3388ff", point: "#3388ff" }, // Azul
    { line: "#ff7800", fill: "#ff7800", point: "#ff7800" }, // Laranja
    { line: "#9c27b0", fill: "#9c27b0", point: "#9c27b0" }, // Roxo
    { line: "#4caf50", fill: "#4caf50", point: "#4caf50" }, // Verde
    { line: "#e91e63", fill: "#e91e63", point: "#e91e63" }, // Rosa
    { line: "#ffc107", fill: "#ffc107", point: "#ffc107" }, // Amarelo
    { line: "#795548", fill: "#795548", point: "#795548" }, // Marrom
    { line: "#00bcd4", fill: "#00bcd4", point: "#00bcd4" }, // Ciano
    { line: "#f44336", fill: "#f44336", point: "#f44336" }, // Vermelho
    { line: "#607d8b", fill: "#607d8b", point: "#607d8b" }, // Cinza Azulado
  ];

  /**
   * Inicializa o módulo KML
   * @returns {boolean} true se a inicialização foi bem sucedida, false caso contrário
   */
  function init() {
    try {
      Utilities.log("Inicializando módulo KML...");

      // Adicionar evento para o botão de importação KML se existir
      const importKmlBtn = document.getElementById("importKmlBtn");
      if (importKmlBtn) {
        importKmlBtn.addEventListener("click", function () {
          document.getElementById("kmlFileInput").click();
        });
      }

      // Adicionar evento para o input de arquivo KML
      const kmlFileInput = document.getElementById("kmlFileInput");
      if (kmlFileInput) {
        kmlFileInput.addEventListener("change", handleKmlFileSelect);
      } else {
        Utilities.logError("Elemento 'kmlFileInput' não encontrado", null);
        // Criar o elemento se não existir
        createKmlFileInput();
      }

      // Exibir o container de camadas KML se existir
      const kmlLayersContainer = document.getElementById("kmlLayersContainer");
      if (kmlLayersContainer) {
        kmlLayersContainer.style.display = "none"; // Inicialmente oculto, será mostrado quando houver camadas
      }

      Utilities.log("Módulo KML inicializado com sucesso");
      return true;
    } catch (error) {
      Utilities.logError("Erro ao inicializar módulo KML", error);
      return false;
    }
  }

  /**
   * Cria o input de arquivo KML se não existir
   */
  function createKmlFileInput() {
    try {
      // Criar o input file oculto para KML
      const input = document.createElement("input");
      input.type = "file";
      input.id = "kmlFileInput";
      input.accept = ".kml";
      input.multiple = true; // Permitir seleção de múltiplos arquivos
      input.style.display = "none";
      input.addEventListener("change", handleKmlFileSelect);

      // Adicionar ao body
      document.body.appendChild(input);

      // Criar o botão para importar KML se não existir
      if (!document.getElementById("importKmlBtn")) {
        // Encontrar o container de botões
        const buttonContainer = document.querySelector(".card-body .d-flex");
        if (buttonContainer) {
          const importKmlBtn = document.createElement("button");
          importKmlBtn.className = "btn btn-outline-success me-2";
          importKmlBtn.id = "importKmlBtn";
          importKmlBtn.innerHTML = '<i class="bi bi-geo"></i> Importar KML';

          // Adicionar ao container antes do botão de reset
          const resetButton = document.getElementById("resetButton");
          if (resetButton) {
            buttonContainer.insertBefore(importKmlBtn, resetButton);
          } else {
            buttonContainer.appendChild(importKmlBtn);
          }

          // Adicionar evento
          importKmlBtn.addEventListener("click", function () {
            document.getElementById("kmlFileInput").click();
          });
        }
      }

      Utilities.log("Input para arquivos KML criado");
    } catch (error) {
      Utilities.logError("Erro ao criar input KML", error);
    }
  }

  /**
   * Manipula a seleção de um arquivo KML
   * @param {Event} event - Evento de mudança do input de arquivo
   */
  function handleKmlFileSelect(event) {
    try {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      Utilities.log(`${files.length} arquivo(s) KML selecionado(s)`);

      // Limpar o valor para permitir carregar os mesmos arquivos novamente
      event.target.value = "";

      // Processar cada arquivo
      Array.from(files).forEach((file, index) => {
        // Verificar extensão do arquivo
        if (!file.name.toLowerCase().endsWith(".kml")) {
          Utilities.showAlert(
            `O arquivo "${file.name}" não é um arquivo KML válido.`,
            "warning"
          );
          return;
        }

        // Ler o arquivo como texto
        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const kmlContent = e.target.result;
            processKmlFile(kmlContent, file.name);
          } catch (error) {
            Utilities.logError(
              `Erro ao ler conteúdo do arquivo KML "${file.name}"`,
              error
            );
            Utilities.showAlert(
              `Erro ao processar o arquivo KML "${file.name}".`,
              "danger"
            );
          }
        };

        reader.onerror = function () {
          Utilities.logError(
            `Erro ao ler o arquivo KML "${file.name}"`,
            reader.error
          );
          Utilities.showAlert(
            `Erro ao ler o arquivo KML "${file.name}".`,
            "danger"
          );
        };

        reader.readAsText(file);
      });
    } catch (error) {
      Utilities.logError("Erro ao processar seleção de arquivo KML", error);
      Utilities.showAlert("Erro ao processar o arquivo KML.", "danger");
    }
  }

  /**
   * Processa o conteúdo do arquivo KML
   * @param {string} kmlContent - Conteúdo do arquivo KML
   * @param {string} fileName - Nome do arquivo KML
   */
  function processKmlFile(kmlContent, fileName) {
    try {
      // Verificar se o mapa está disponível
      if (!MapModule || !MapModule.getMap()) {
        Utilities.showAlert("O mapa não está inicializado.", "danger");
        return;
      }

      // Processar KML diretamente usando a API DOM
      const parser = new DOMParser();
      const kmlDoc = parser.parseFromString(kmlContent, "text/xml");

      // Log para depuração
      Utilities.log(`Processando arquivo KML "${fileName}"`);

      // Verificar se o arquivo KML é válido
      if (kmlDoc.getElementsByTagName("parsererror").length > 0) {
        Utilities.showAlert(
          `O arquivo KML "${fileName}" é inválido ou está corrompido.`,
          "danger"
        );
        return;
      }

      // Método 1: Usar processamento direto do XML para extrair pontos
      // Esse método é mais confiável para pontos específicos
      const points = extractPointsFromKml(kmlDoc);

      // Método 2: Converter KML para GeoJSON para linhas e polígonos
      // Esse método é melhor para geometrias complexas
      if (typeof toGeoJSON === "undefined") {
        // Carregar a biblioteca se não estiver disponível
        loadToGeoJSONLibrary(function () {
          processKmlWithCombinedApproach(kmlDoc, fileName, points);
        });
      } else {
        processKmlWithCombinedApproach(kmlDoc, fileName, points);
      }
    } catch (error) {
      Utilities.logError(`Erro ao processar arquivo KML "${fileName}"`, error);
      Utilities.showAlert(
        `Erro ao processar o arquivo KML "${fileName}": ${error.message}`,
        "danger"
      );
    }
  }

  /**
   * Extrai pontos diretamente do documento KML
   * @param {Document} kmlDoc - Documento KML parseado
   * @returns {Array} Array de pontos extraídos
   */
  function extractPointsFromKml(kmlDoc) {
    const points = [];

    try {
      // Buscar todos os elementos Placemark
      const placemarks = kmlDoc.getElementsByTagName("Placemark");

      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];

        // Obter nome e descrição se disponíveis
        let name = "";
        let description = "";

        const nameEl = placemark.getElementsByTagName("name")[0];
        if (nameEl && nameEl.textContent) {
          name = nameEl.textContent.trim();
        }

        const descEl = placemark.getElementsByTagName("description")[0];
        if (descEl && descEl.textContent) {
          description = descEl.textContent.trim();
        }

        // Buscar coordenadas em Point
        const point = placemark.getElementsByTagName("Point")[0];
        if (point) {
          const coordinates = point.getElementsByTagName("coordinates")[0];
          if (coordinates && coordinates.textContent) {
            const coords = coordinates.textContent.trim().split(",");
            if (coords.length >= 2) {
              // KML usa formato longitude,latitude,altitude
              const lng = parseFloat(coords[0]);
              const lat = parseFloat(coords[1]);

              if (!isNaN(lng) && !isNaN(lat)) {
                points.push({
                  type: "Point",
                  coordinates: [lng, lat],
                  properties: {
                    name: name,
                    description: description,
                  },
                });
              }
            }
          }
        }
      }

      Utilities.log(`Extraídos ${points.length} pontos diretamente do KML`);
    } catch (error) {
      Utilities.logError("Erro ao extrair pontos do KML", error);
    }

    return points;
  }

  /**
   * Carrega a biblioteca toGeoJSON se necessário
   * @param {Function} callback - Função de callback
   */
  function loadToGeoJSONLibrary(callback) {
    try {
      Utilities.log("Carregando biblioteca toGeoJSON...");
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/togeojson/0.16.0/togeojson.min.js";
      script.onload = callback;
      document.head.appendChild(script);
    } catch (error) {
      Utilities.logError("Erro ao carregar biblioteca toGeoJSON", error);
      Utilities.showAlert(
        "Erro ao carregar bibliotecas necessárias para KML.",
        "danger"
      );
    }
  }

  /**
   * Processa o KML usando uma abordagem combinada para garantir que todos os tipos de geometria sejam renderizados
   * @param {Document} kmlDoc - Documento KML parseado
   * @param {string} fileName - Nome do arquivo KML
   * @param {Array} extractedPoints - Pontos extraídos diretamente do KML
   */
  function processKmlWithCombinedApproach(kmlDoc, fileName, extractedPoints) {
    try {
      // Converter KML para GeoJSON usando a biblioteca
      const geojson = toGeoJSON.kml(kmlDoc);

      // Mesclar pontos extraídos diretamente se existirem
      if (extractedPoints && extractedPoints.length > 0) {
        // Garantir que o objeto GeoJSON tenha a estrutura correta
        if (!geojson.features) {
          geojson.features = [];
        }

        // Adicionar os pontos extraídos como features separadas
        extractedPoints.forEach((point) => {
          geojson.features.push({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: point.coordinates,
            },
            properties: point.properties,
          });
        });
      }

      // Verificar se há conteúdo
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        Utilities.showAlert(
          `O arquivo KML "${fileName}" não contém elementos geográficos.`,
          "warning"
        );
        return;
      }

      // Log para depuração
      Utilities.log(`GeoJSON convertido do arquivo "${fileName}":`, {
        featureCount: geojson.features.length,
      });

      // Criar uma nova camada Leaflet a partir do GeoJSON
      const map = MapModule.getMap();

      // Selecionar uma cor para este KML
      const colorIndex = kmlLayers.length % colorPalette.length;
      const colors = colorPalette[colorIndex];

      // Estilo para as features
      const style = {
        color: colors.line,
        weight: CONFIG.MAP.KML.LINE_WEIGHT || 3,
        opacity: CONFIG.MAP.KML.LINE_OPACITY || 0.7,
        fillColor: colors.fill,
        fillOpacity: CONFIG.MAP.KML.POLYGON_OPACITY || 0.2,
      };

      // Extrair tipos de geometria presentes no KML
      const geometryTypes = new Set();

      if (geojson.features) {
        geojson.features.forEach((feature) => {
          if (feature.geometry && feature.geometry.type) {
            geometryTypes.add(feature.geometry.type);
          }
        });
      }

      // Converter o Set para array para mais fácil manipulação
      const geometryTypesArray = Array.from(geometryTypes);
      Utilities.log(
        `Tipos de geometria encontrados em "${fileName}":`,
        geometryTypesArray
      );

      // Criar camada GeoJSON com estilo personalizado
      const kmlLayer = L.geoJSON(geojson, {
        style: style,
        pointToLayer: function (feature, latlng) {
          // Personalizar os pontos - garantir que sejam visíveis
          const pointOptions = {
            radius: 8,
            fillColor: colors.point,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          };

          // Usar marcador circular para pontos
          return L.circleMarker(latlng, pointOptions);
        },
        onEachFeature: function (feature, layer) {
          // Adicionar popups com informações
          if (feature.properties) {
            let popupContent = "";

            if (feature.properties.name) {
              popupContent += `<strong>${feature.properties.name}</strong>`;
            }

            if (feature.properties.description) {
              if (popupContent) popupContent += "<br>";

              // Tentar converter HTML da descrição de forma segura
              const descriptionText = document.createElement("div");
              descriptionText.innerHTML = feature.properties.description;

              // Remover scripts
              const scripts = descriptionText.querySelectorAll("script");
              scripts.forEach((script) => script.remove());

              // Adicionar conteúdo limpo
              popupContent +=
                descriptionText.textContent || descriptionText.innerHTML;
            }

            // Adicionar tipo de geometria
            if (feature.geometry && feature.geometry.type) {
              if (popupContent) popupContent += "<br>";
              popupContent += `<small>Tipo: ${feature.geometry.type}</small>`;
            }

            if (popupContent) {
              layer.bindPopup(popupContent);
            }
          }
        },
      });

      // Verificar se a camada foi criada corretamente
      if (!kmlLayer) {
        Utilities.logError(
          `Erro ao criar camada para o arquivo "${fileName}"`,
          null
        );
        Utilities.showAlert(
          `Erro ao criar camada para o arquivo "${fileName}"`,
          "danger"
        );
        return;
      }

      // Adicionar os pontos manualmente se necessário
      if (
        extractedPoints &&
        extractedPoints.length > 0 &&
        (!geometryTypesArray.includes("Point") ||
          geometryTypesArray.length === 0)
      ) {
        addPointsManually(map, extractedPoints, colors);
      }

      // Adicionar a camada ao mapa
      kmlLayer.addTo(map);

      // Determinar um nome amigável para o KML que inclua os tipos de geometria
      let friendlyName = fileName;

      // Adicionar tipos de geometria ao nome
      if (geometryTypesArray.length > 0) {
        const typesText = geometryTypesArray
          .map((type) => {
            // Converter nome do tipo para português
            switch (type) {
              case "Point":
                return "Ponto";
              case "LineString":
                return "Linha";
              case "Polygon":
                return "Polígono";
              case "MultiPoint":
                return "Multi-Ponto";
              case "MultiLineString":
                return "Multi-Linha";
              case "MultiPolygon":
                return "Multi-Polígono";
              default:
                return type;
            }
          })
          .join(", ");

        friendlyName += ` (${typesText})`;
      } else if (extractedPoints && extractedPoints.length > 0) {
        friendlyName += ` (Ponto)`;
      }

      // Armazenar a camada para referência futura
      const kmlIndex = kmlLayers.length;
      kmlLayers.push({
        name: friendlyName,
        fileName: fileName,
        layer: kmlLayer,
        color: colors,
        types: geometryTypesArray,
        points: extractedPoints,
      });

      // Adicionar item na lista de camadas KML
      addKmlToLayersList(friendlyName, kmlIndex, colors);

      // Ajustar o zoom para mostrar toda a camada
      try {
        const bounds = kmlLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        } else if (extractedPoints && extractedPoints.length > 0) {
          // Se não houver bounds válidos, mas tivermos pontos, criar bounds dos pontos
          const pointCoords = extractedPoints.map((p) => [
            p.coordinates[1],
            p.coordinates[0],
          ]);
          if (pointCoords.length > 0) {
            map.fitBounds(L.latLngBounds(pointCoords));
          }
        }
      } catch (e) {
        Utilities.logError("Erro ao ajustar zoom para a camada KML", e);
      }

      // Mostrar o container de camadas KML
      const kmlLayersContainer = document.getElementById("kmlLayersContainer");
      if (kmlLayersContainer) {
        kmlLayersContainer.style.display = "block";
      }

      // Mostrar mensagem de sucesso
      Utilities.showAlert(
        `Arquivo KML "${fileName}" carregado com sucesso!`,
        "success"
      );
    } catch (error) {
      Utilities.logError("Erro ao processar KML com bibliotecas", error);
      Utilities.showAlert(
        `Erro ao processar o arquivo KML "${fileName}": ${error.message}`,
        "danger"
      );
    }
  }

  /**
   * Adiciona pontos manualmente ao mapa quando a conversão GeoJSON falha
   * @param {Object} map - Objeto mapa do Leaflet
   * @param {Array} points - Pontos extraídos do KML
   * @param {Object} colors - Cores para os pontos
   */
  function addPointsManually(map, points, colors) {
    if (!points || points.length === 0) return;

    try {
      Utilities.log(`Adicionando ${points.length} pontos manualmente ao mapa`);

      points.forEach((point) => {
        // KML usa formato longitude,latitude,altitude
        const lat = point.coordinates[1];
        const lng = point.coordinates[0];

        // Criar círculo marcador
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: colors.point,
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

        // Adicionar popup com informações
        let popupContent = "";
        if (point.properties) {
          if (point.properties.name) {
            popupContent += `<strong>${point.properties.name}</strong>`;
          }

          if (point.properties.description) {
            if (popupContent) popupContent += "<br>";
            popupContent += point.properties.description;
          }

          if (popupContent) {
            marker.bindPopup(popupContent);
          }
        }

        // Adicionar ao mapa
        marker.addTo(map);
      });
    } catch (error) {
      Utilities.logError("Erro ao adicionar pontos manualmente", error);
    }
  }

  /**
   * Adiciona item na lista de camadas KML
   * @param {string} fileName - Nome do arquivo KML
   * @param {number} index - Índice da camada no array
   * @param {Object} colors - Cores para este KML
   */
  function addKmlToLayersList(fileName, index, colors) {
    try {
      // Verificar se o container da lista existe
      let layersList = document.getElementById("kmlLayersList");

      // Se não existir, criar
      if (!layersList) {
        // Procurar um local adequado para a lista
        const kmlLayersContainer =
          document.getElementById("kmlLayersContainer");

        if (kmlLayersContainer) {
          // Criar a lista de camadas
          layersList = document.createElement("div");
          layersList.id = "kmlLayersList";
          layersList.className = "list-group list-group-flush small";

          // Adicionar a lista ao container
          kmlLayersContainer.appendChild(layersList);
        } else {
          Utilities.logError(
            "Container 'kmlLayersContainer' não encontrado",
            null
          );
          return;
        }
      }

      // Criar item da lista
      const layerItem = document.createElement("div");
      layerItem.className =
        "list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2";
      layerItem.setAttribute("data-index", index);

      // Nome do arquivo com ícone colorido
      const nameSpan = document.createElement("span");
      nameSpan.innerHTML = `<i class="bi bi-geo-alt me-1" style="color: ${colors.point};"></i> ${fileName}`;

      // Botões de ação
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "btn-group btn-group-sm";

      // Botão de visibilidade
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "btn btn-outline-secondary btn-sm";
      toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
      toggleBtn.title = "Mostrar/Ocultar";
      toggleBtn.addEventListener("click", function () {
        toggleKmlLayerVisibility(index, toggleBtn);
      });

      // Botão de remover
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-outline-danger btn-sm";
      removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
      removeBtn.title = "Remover";
      removeBtn.addEventListener("click", function () {
        removeKmlLayer(index);
        layerItem.remove();
      });

      // Adicionar botões ao div de ações
      actionsDiv.appendChild(toggleBtn);
      actionsDiv.appendChild(removeBtn);

      // Adicionar elementos ao item
      layerItem.appendChild(nameSpan);
      layerItem.appendChild(actionsDiv);

      // Adicionar o item à lista
      layersList.appendChild(layerItem);
    } catch (error) {
      Utilities.logError("Erro ao adicionar camada KML à lista", error);
    }
  }

  /**
   * Alterna a visibilidade de uma camada KML
   * @param {number} index - Índice da camada no array
   * @param {HTMLElement} button - Botão de visibilidade
   */
  function toggleKmlLayerVisibility(index, button) {
    try {
      if (index < 0 || index >= kmlLayers.length) return;

      const kmlLayer = kmlLayers[index];
      if (!kmlLayer) return;

      const map = MapModule.getMap();
      if (!map) return;

      // Verificar se a camada está no mapa
      const isVisible = map.hasLayer(kmlLayer.layer);

      if (isVisible) {
        // Se estiver visível, remover
        map.removeLayer(kmlLayer.layer);
        // Atualizar ícone do botão
        if (button) {
          button.innerHTML = '<i class="bi bi-eye-slash"></i>';
        }
      } else {
        // Se não estiver visível, adicionar
        kmlLayer.layer.addTo(map);
        // Atualizar ícone do botão
        if (button) {
          button.innerHTML = '<i class="bi bi-eye"></i>';
        }
      }
    } catch (error) {
      Utilities.logError("Erro ao alternar visibilidade da camada KML", error);
    }
  }

  /**
   * Remove uma camada KML
   * @param {number} index - Índice da camada no array
   */
  function removeKmlLayer(index) {
    try {
      if (index < 0 || index >= kmlLayers.length) return;

      const kmlLayer = kmlLayers[index];
      if (!kmlLayer) return;

      const map = MapModule.getMap();

      if (map && kmlLayer) {
        // Remover a camada do mapa
        map.removeLayer(kmlLayer.layer);

        // Remover do array (substituir por null para manter índices)
        kmlLayers[index] = null;

        // Verificar se todas as camadas foram removidas
        const allRemoved = kmlLayers.every((layer) => layer === null);
        if (allRemoved) {
          // Ocultar o container de camadas KML
          const kmlLayersContainer =
            document.getElementById("kmlLayersContainer");
          if (kmlLayersContainer) {
            kmlLayersContainer.style.display = "none";
          }

          // Limpar o array
          kmlLayers = [];
        }

        Utilities.showAlert(`Camada KML "${kmlLayer.name}" removida.`, "info");
      }
    } catch (error) {
      Utilities.logError("Erro ao remover camada KML", error);
    }
  }

  /**
   * Limpa todas as camadas KML
   */
  function clearAllKmlLayers() {
    try {
      const map = MapModule.getMap();
      if (!map) return;

      // Remover cada camada do mapa
      kmlLayers.forEach((kmlLayer) => {
        if (kmlLayer) {
          map.removeLayer(kmlLayer.layer);
        }
      });

      // Limpar array
      kmlLayers = [];

      // Limpar lista na UI
      const layersList = document.getElementById("kmlLayersList");
      if (layersList) {
        layersList.innerHTML = "";
      }

      // Ocultar o container de camadas KML
      const kmlLayersContainer = document.getElementById("kmlLayersContainer");
      if (kmlLayersContainer) {
        kmlLayersContainer.style.display = "none";
      }

      Utilities.log("Todas as camadas KML foram removidas");
    } catch (error) {
      Utilities.logError("Erro ao limpar camadas KML", error);
    }
  }

  // Interface pública do módulo
  return {
    init: init,
    clearAllKmlLayers: clearAllKmlLayers,
    // Método para permitir que o MapModule acesse o mapa
    importKml: function () {
      const kmlFileInput = document.getElementById("kmlFileInput");
      if (kmlFileInput) {
        kmlFileInput.click();
      } else {
        createKmlFileInput();
        setTimeout(() => {
          document.getElementById("kmlFileInput").click();
        }, 100);
      }
    },
  };
})();
