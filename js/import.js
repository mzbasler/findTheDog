/**
 * Gerenciamento da importação de dados
 */
const ImportModule = (function () {
  // Configuração
  const fileConfig = CONFIG.FILE_PROCESSING;

  /**
   * Inicializa o módulo de importação
   */
  function init() {
    try {
      Utilities.log("Inicializando módulo de importação...");
      return true;
    } catch (error) {
      Utilities.logError("Erro ao inicializar módulo de importação", error);
      return false;
    }
  }

  /**
   * Cria uma pré-visualização do arquivo selecionado
   * @param {Event} event - Evento de mudança do input de arquivo
   */
  function previewFile(event) {
    try {
      const fileInput = event.target || document.getElementById("fileInput");
      const file = fileInput.files[0];

      if (!file) return;

      // Criar elemento para a pré-visualização
      const previewDiv = document.createElement("div");
      previewDiv.id = "tablePreview";
      previewDiv.className = "table-preview";

      // Mostrar mensagem de carregamento
      previewDiv.innerHTML =
        '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Processando arquivo...</div>';

      // Remover pré-visualização anterior, se existir
      const oldPreview = document.getElementById("tablePreview");
      if (oldPreview) oldPreview.remove();

      // Adicionar à modal
      const modalBody = document.querySelector("#importModal .modal-body");
      modalBody.appendChild(previewDiv);

      // Processar o arquivo
      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = e.target.result;

        try {
          // Determinar o tipo de arquivo
          if (file.name.endsWith(".csv")) {
            // Processar CSV com PapaParse
            Papa.parse(contents, {
              header: true,
              preview: fileConfig.CSV_PREVIEW_ROWS,
              complete: function (results) {
                displayPreviewTable(results.data, results.meta.fields);
              },
            });
          } else {
            // Processar Excel com SheetJS
            const workbook = XLSX.read(contents, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (data.length > 0) {
              const headers = data[0];
              const rows = data.slice(1, 1 + fileConfig.CSV_PREVIEW_ROWS);

              // Converter para o formato necessário para exibição
              const previewData = rows.map((row) => {
                const rowObj = {};
                headers.forEach((header, i) => {
                  rowObj[header] = row[i];
                });
                return rowObj;
              });

              displayPreviewTable(previewData, headers);
            }
          }
        } catch (error) {
          previewDiv.innerHTML = `<div class="alert alert-danger">Erro ao processar o arquivo: ${error.message}</div>`;
        }
      };

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      Utilities.logError("Erro ao pré-visualizar arquivo", error);
      Utilities.showAlert(
        "Erro ao pré-visualizar arquivo: " + error.message,
        "danger"
      );
    }
  }

  /**
   * Exibe uma tabela de pré-visualização dos dados
   * @param {Array} data - Dados para exibir
   * @param {Array} headers - Cabeçalhos das colunas
   */
  function displayPreviewTable(data, headers) {
    const previewDiv = document.getElementById("tablePreview");
    if (!previewDiv) return;

    const table = document.createElement("table");
    table.className = "table table-sm table-striped table-bordered";

    // Criar cabeçalho da tabela
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      th.style.fontSize = "0.8rem";
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Criar corpo da tabela
    const tbody = document.createElement("tbody");

    data.forEach((row) => {
      const tr = document.createElement("tr");

      headers.forEach((header) => {
        const td = document.createElement("td");
        td.textContent = row[header] || "";
        td.style.fontSize = "0.8rem";
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // Limpar e adicionar a tabela
    previewDiv.innerHTML = "";
    previewDiv.appendChild(document.createElement("h6")).textContent =
      "Pré-visualização dos dados:";
    previewDiv.appendChild(table);
  }

  /**
   * Importa dados de um arquivo
   * @param {Event} event - Evento do clique no botão de importação
   * @param {Array} sightings - Array atual de avistamentos
   * @param {boolean} activeFilters - Indica se há filtros ativos
   * @param {Function} onImportComplete - Callback chamado após a importação
   */
  function importFile(event, sightings, activeFilters, onImportComplete) {
    try {
      const fileInput = document.getElementById("fileInput");
      const file = fileInput.files[0];

      if (!file) {
        Utilities.showAlert(
          "Por favor, selecione um arquivo para importar.",
          "warning"
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = e.target.result;

        try {
          // Determinar o tipo de arquivo
          if (file.name.endsWith(".csv")) {
            // Processar CSV - tentar primeiro com cabeçalho
            let results = Papa.parse(contents, {
              header: true,
              skipEmptyLines: true,
            });

            // Se não tiver headers ou tiver poucos dados, tentar sem cabeçalho
            if (
              results.data.length === 0 ||
              Object.keys(results.data[0]).length <= 1
            ) {
              results = Papa.parse(contents, {
                header: false,
                skipEmptyLines: true,
              });

              // Verificar se temos pelo menos 3 colunas (Data, Horário, Coordenadas)
              if (results.data[0] && results.data[0].length >= 3) {
                // Cabeçalhos artificiais mais específicos
                const headers = fileConfig.DEFAULT_HEADERS;

                // Converter dados para formato com cabeçalho
                const formattedData = results.data.map((row) => {
                  const obj = {};
                  for (
                    let i = 0;
                    i < Math.min(headers.length, row.length);
                    i++
                  ) {
                    obj[headers[i]] = row[i];
                  }
                  return obj;
                });

                processImportedData(
                  formattedData,
                  headers,
                  sightings,
                  activeFilters,
                  onImportComplete
                );
                return;
              }
            } else {
              processImportedData(
                results.data,
                results.meta.fields,
                sightings,
                activeFilters,
                onImportComplete
              );
              return;
            }
          } else {
            // Processar Excel com SheetJS
            const workbook = XLSX.read(contents, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Tentar com cabeçalhos
            let data = XLSX.utils.sheet_to_json(worksheet);

            if (data.length > 0) {
              processImportedData(
                data,
                Object.keys(data[0]),
                sightings,
                activeFilters,
                onImportComplete
              );
              return;
            } else {
              // Tentar sem cabeçalhos
              data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

              if (data.length > 1 && data[0].length >= 3) {
                // Assumir primeira linha como cabeçalho
                const headers = data[0];
                const rows = data.slice(1);

                // Converter para formato com cabeçalho
                const formattedData = rows.map((row) => {
                  const obj = {};
                  for (
                    let i = 0;
                    i < Math.min(headers.length, row.length);
                    i++
                  ) {
                    obj[headers[i]] = row[i];
                  }
                  return obj;
                });

                processImportedData(
                  formattedData,
                  headers,
                  sightings,
                  activeFilters,
                  onImportComplete
                );
                return;
              } else if (data.length > 0 && data[0].length >= 3) {
                // Sem cabeçalho, criar cabeçalhos artificiais
                const headers = fileConfig.DEFAULT_HEADERS;

                // Converter para formato com cabeçalho
                const formattedData = data.map((row) => {
                  const obj = {};
                  for (
                    let i = 0;
                    i < Math.min(headers.length, row.length);
                    i++
                  ) {
                    obj[headers[i]] = row[i];
                  }
                  return obj;
                });

                processImportedData(
                  formattedData,
                  headers,
                  sightings,
                  activeFilters,
                  onImportComplete
                );
                return;
              }
            }
          }

          // Se chegou aqui, não conseguiu processar o arquivo
          Utilities.showAlert(
            "Não foi possível reconhecer o formato do arquivo. Verifique se ele contém as colunas necessárias.",
            "danger"
          );
        } catch (error) {
          Utilities.logError("Erro na importação", error);
          Utilities.showAlert(
            `Erro ao processar o arquivo: ${error.message}`,
            "danger"
          );
        }
      };

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      Utilities.logError("Erro durante a importação", error);
      Utilities.showAlert(
        "Erro ao importar arquivo: " + error.message,
        "danger"
      );
    }
  }

  /**
   * Processa os dados importados
   * @param {Array} data - Dados importados
   * @param {Array} headers - Cabeçalhos das colunas
   * @param {Array} sightings - Array atual de avistamentos
   * @param {boolean} hasActiveFilter - Indica se há filtros ativos
   * @param {Function} onComplete - Callback a ser chamado após o processamento
   */
  function processImportedData(
    data,
    headers,
    sightings,
    hasActiveFilter,
    onComplete
  ) {
    try {
      Utilities.log("Processando dados importados...");

      // Debug dos dados importados
      Utilities.log("Dados importados", data);
      Utilities.log("Cabeçalhos", headers);

      // Se não houver dados, parar aqui
      if (!data || data.length === 0) {
        Utilities.showAlert("Arquivo vazio ou sem dados válidos.", "warning");
        return;
      }

      // Normalizar cabeçalhos para comparação case-insensitive
      const normalizedHeaders = headers.map((h) =>
        String(h).toLowerCase().trim()
      );

      // Identificar colunas com base no formato da tabela
      let dateColumn = null;
      let timeColumn = null;
      let coordsColumn = null;
      let latColumn = null;
      let lngColumn = null;
      let notesColumn = null;

      // Tentar encontrar colunas pelos nomes comuns
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const header = normalizedHeaders[i];
        const originalHeader = headers[i];

        if (
          header.includes("data") ||
          header.includes("date") ||
          header.includes("dia")
        ) {
          dateColumn = originalHeader;
        } else if (
          header.includes("hora") ||
          header.includes("time") ||
          header.includes("horario") ||
          header.includes("horário")
        ) {
          timeColumn = originalHeader;
        } else if (header.includes("coord") || header.includes("location")) {
          coordsColumn = originalHeader;
        } else if (header.includes("lat") || header === "y") {
          latColumn = originalHeader;
        } else if (
          header.includes("lon") ||
          header.includes("lng") ||
          header === "x"
        ) {
          lngColumn = originalHeader;
        } else if (
          header.includes("obs") ||
          header.includes("note") ||
          header.includes("coment") ||
          header.includes("comment") ||
          header.includes("desc")
        ) {
          notesColumn = originalHeader;
        }
      }

      // Verificar se temos uma quarta coluna explicitamente chamada 'Obs'
      const obsIndex = normalizedHeaders.findIndex((h) => h === "obs");
      if (obsIndex !== -1 && !notesColumn) {
        notesColumn = headers[obsIndex];
      }

      // Se não encontrar cabeçalhos por nome, tentar pela posição
      if (!dateColumn && normalizedHeaders.length >= 1) {
        dateColumn = headers[0];
      }
      if (!timeColumn && normalizedHeaders.length >= 2) {
        timeColumn = headers[1];
      }
      if (!coordsColumn && !latColumn && normalizedHeaders.length >= 3) {
        coordsColumn = headers[2];
      }
      if (!notesColumn && normalizedHeaders.length >= 4) {
        notesColumn = headers[3];
      }

      // Tentar identificar colunas pela primeira linha se ainda não conseguiu
      if (!dateColumn || !timeColumn || (!coordsColumn && !latColumn)) {
        identifyColumnsByContent(data, headers);
      }

      // Verificar se temos um formato válido para trabalhar
      let hasCombinedFormat = dateColumn && timeColumn && coordsColumn;
      let hasSeparateFormat =
        dateColumn && timeColumn && latColumn && lngColumn;

      if (!hasCombinedFormat && !hasSeparateFormat) {
        Utilities.showAlert(
          "Formato da tabela não reconhecido. Verifique se há colunas para Data, Horário e Coordenadas, ou Data, Horário, Latitude e Longitude.",
          "danger"
        );
        return;
      }

      // Converter para o formato de avistamentos
      const importedSightings = [];
      let errorsCount = 0;

      data.forEach((row, index) => {
        try {
          let dateValue = row[dateColumn];
          let timeValue = row[timeColumn];
          let latValue, lngValue;

          // Verificar se temos valores válidos para data e hora
          if (!dateValue || !timeValue) {
            errorsCount++;
            return;
          }

          // Obter coordenadas dependendo do formato
          if (coordsColumn) {
            // Extrair lat e lng de uma única coluna de coordenadas
            const coordsStr = String(row[coordsColumn]).trim();

            // Padrão: latitude,longitude
            const coordParts = coordsStr
              .split(",")
              .map((p) => parseFloat(p.trim()));

            if (
              coordParts.length === 2 &&
              !isNaN(coordParts[0]) &&
              !isNaN(coordParts[1])
            ) {
              latValue = coordParts[0];
              lngValue = coordParts[1];
            } else {
              errorsCount++;
              return;
            }
          } else if (latColumn && lngColumn) {
            // Usar colunas separadas
            latValue = parseFloat(row[latColumn]);
            lngValue = parseFloat(row[lngColumn]);

            if (isNaN(latValue) || isNaN(lngValue)) {
              errorsCount++;
              return;
            }
          } else {
            errorsCount++;
            return;
          }

          const notesValue = notesColumn
            ? String(row[notesColumn] || "").trim()
            : "";

          // Processar data e hora para criar objeto Date
          const dateObj = parseDateTime(dateValue, timeValue);

          // Validar se a data é válida
          if (isNaN(dateObj.getTime())) {
            errorsCount++;
            return;
          }

          // Converter para formato ISO para o input datetime-local
          const isoDate = dateObj.toISOString().slice(0, 16);

          // Criar objeto de avistamento
          const newSighting = {
            id: Date.now() + index, // ID único
            dateTime: isoDate,
            lat: latValue,
            lng: lngValue,
            notes: notesValue || "",
            timestamp: dateObj.getTime(),
          };

          importedSightings.push(newSighting);
        } catch (e) {
          Utilities.logError("Erro ao processar linha", e);
          errorsCount++;
        }
      });

      // Adicionar avistamentos importados
      if (importedSightings.length > 0) {
        // Preparar objeto de resultado
        const result = {
          sightings: [...sightings, ...importedSightings].sort(
            (a, b) => a.timestamp - b.timestamp
          ),
          importedCount: importedSightings.length,
          errorsCount: errorsCount,
        };

        // Chamar callback com os resultados
        if (onComplete) {
          onComplete(result);
        }
      } else {
        Utilities.showAlert(
          "Não foi possível importar nenhum avistamento. Verifique o formato do arquivo.",
          "danger"
        );
      }
    } catch (error) {
      Utilities.logError("Erro ao processar dados importados", error);
      Utilities.showAlert(
        "Erro ao processar dados: " + error.message,
        "danger"
      );
    }
  }

  /**
   * Tenta identificar colunas com base no conteúdo da primeira linha
   * @param {Array} data - Dados a analisar
   * @param {Object} columns - Objeto com as colunas já identificadas
   * @returns {Object} Objeto atualizado com as colunas identificadas
   */
  function identifyColumnsByContent(data, columns) {
    if (data.length > 0) {
      const firstRow = data[0];
      const keys = Object.keys(firstRow);

      for (const key of keys) {
        const value = String(firstRow[key]).trim();

        // Verificar formato de data
        if (
          !columns.dateColumn &&
          fileConfig.DATE_PATTERNS.some((pattern) => pattern.test(value))
        ) {
          columns.dateColumn = key;
          continue;
        }

        // Verificar formato de hora
        if (
          !columns.timeColumn &&
          (fileConfig.TIME_PATTERNS.HHhMM.test(value) ||
            fileConfig.TIME_PATTERNS.HHh.test(value) ||
            fileConfig.TIME_PATTERNS.HHMM.test(value) ||
            value.toLowerCase() === "manhã" ||
            value.toLowerCase() === "manha")
        ) {
          columns.timeColumn = key;
          continue;
        }

        // Verificar formato de coordenadas
        if (!columns.coordsColumn && fileConfig.COORDS_PATTERN.test(value)) {
          columns.coordsColumn = key;
          continue;
        }

        // Verificar latitude/longitude
        if (!columns.latColumn && !columns.lngColumn) {
          const isNumeric = !isNaN(parseFloat(value));
          if (isNumeric) {
            const num = parseFloat(value);
            if (num >= -90 && num <= 90) {
              columns.latColumn = key;
            } else if (num >= -180 && num <= 180) {
              columns.lngColumn = key;
            }
          }
        }

        // Verificar formato de observações/comentários
        if (
          !columns.notesColumn &&
          value.length > 5 &&
          /[a-zA-Z]/.test(value)
        ) {
          columns.notesColumn = key;
          continue;
        }
      }
    }

    return columns;
  }

  /**
   * Analisa strings de data e hora para criar um objeto Date
   * @param {string} dateStr - String contendo a data
   * @param {string} timeStr - String contendo a hora
   * @returns {Date} Objeto Date criado com os valores
   */
  function parseDateTime(dateValue, timeValue) {
    // Garantir que dateValue e timeValue sejam strings
    const dateStr = String(dateValue).trim();
    const timeStr = String(timeValue).trim();

    let dateObj;

    // Processar data no formato DD/MM/YYYY ou qualquer formato DD/MM/YY
    if (
      fileConfig.DATE_PATTERNS[0].test(dateStr) ||
      fileConfig.DATE_PATTERNS[1].test(dateStr)
    ) {
      const parts = dateStr.split("/");
      let year = parseInt(parts[2]);

      // Ajustar ano se for formato de 2 dígitos (assumindo século 21)
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      const month = parseInt(parts[1]) - 1; // Mês em JS é 0-11
      const day = parseInt(parts[0]);

      // Processar hora (pode estar em diversos formatos)
      let hours = 0,
        minutes = 0;

      if (
        timeStr.toLowerCase() === "manhã" ||
        timeStr.toLowerCase() === "manha"
      ) {
        hours = 8; // Assumir 8h para "manhã"
      } else if (fileConfig.TIME_PATTERNS.HHhMM.test(timeStr)) {
        // Formato HHhMM ou HhMM (ex: 09h00 ou 9h00)
        const timeParts = timeStr.split("h");
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
      } else if (fileConfig.TIME_PATTERNS.HHMM.test(timeStr)) {
        // Formato HH:MM
        const timeParts = timeStr.split(":");
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
      } else if (fileConfig.TIME_PATTERNS.HHh.test(timeStr)) {
        // Formato HHh ou Hh (ex: 09h ou 9h)
        hours = parseInt(timeStr.replace("h", ""));
      } else {
        // Tentar outros formatos
        try {
          const tempTime = new Date(`2000-01-01T${timeStr}`);
          if (!isNaN(tempTime.getTime())) {
            hours = tempTime.getHours();
            minutes = tempTime.getMinutes();
          } else {
            // Último recurso: tentar extrair números do início da string
            const timeMatch = timeStr.match(/^(\d{1,2})[^\d]*(\d{1,2})?/);
            if (timeMatch) {
              hours = parseInt(timeMatch[1]);
              minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            } else {
              hours = 12; // Default se não conseguir extrair
            }
          }
        } catch (e) {
          hours = 12; // Default para erro
        }
      }

      // Criar objeto de data
      dateObj = new Date(year, month, day, hours, minutes);
    } else if (
      fileConfig.DATE_PATTERNS[2].test(dateStr) ||
      fileConfig.DATE_PATTERNS[3].test(dateStr)
    ) {
      // Processar data em formato YYYY-MM-DD ou DD-MM-YYYY
      let year, month, day;

      if (fileConfig.DATE_PATTERNS[2].test(dateStr)) {
        // DD-MM-YYYY
        const parts = dateStr.split("-");
        day = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        year = parseInt(parts[2]);
      } else {
        // YYYY-MM-DD
        const parts = dateStr.split("-");
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
        day = parseInt(parts[2]);
      }

      // Processar hora
      let hours = 0,
        minutes = 0;

      if (
        timeStr.toLowerCase() === "manhã" ||
        timeStr.toLowerCase() === "manha"
      ) {
        hours = 8;
      } else if (fileConfig.TIME_PATTERNS.HHhMM.test(timeStr)) {
        const timeParts = timeStr.split("h");
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
      } else if (fileConfig.TIME_PATTERNS.HHMM.test(timeStr)) {
        const timeParts = timeStr.split(":");
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);
      } else if (fileConfig.TIME_PATTERNS.HHh.test(timeStr)) {
        hours = parseInt(timeStr.replace("h", ""));
      } else {
        try {
          const tempTime = new Date(`2000-01-01T${timeStr}`);
          if (!isNaN(tempTime.getTime())) {
            hours = tempTime.getHours();
            minutes = tempTime.getMinutes();
          } else {
            const timeMatch = timeStr.match(/^(\d{1,2})[^\d]*(\d{1,2})?/);
            if (timeMatch) {
              hours = parseInt(timeMatch[1]);
              minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            } else {
              hours = 12;
            }
          }
        } catch (e) {
          hours = 12;
        }
      }

      dateObj = new Date(year, month, day, hours, minutes);
    } else {
      // Tentar processar outros formatos de data
      try {
        // Tentativa 1: Combinar data e hora
        dateObj = new Date(`${dateStr} ${timeStr}`);

        // Se falhar, tentar outros formatos
        if (isNaN(dateObj.getTime())) {
          throw new Error("Formato inválido");
        }
      } catch (e) {
        // Tentativa 2: Usar Date.parse
        try {
          const timestamp = Date.parse(`${dateStr} ${timeStr}`);
          if (!isNaN(timestamp)) {
            dateObj = new Date(timestamp);
          } else {
            // Vamos criar uma data simples para não perder as coordenadas
            dateObj = new Date(); // Usar data atual como fallback
          }
        } catch (e2) {
          // Último recurso
          dateObj = new Date();
        }
      }
    }

    return dateObj;
  }

  // Interface pública do módulo
  return {
    init: init,
    previewFile: previewFile,
    importFile: importFile,
  };
})();
