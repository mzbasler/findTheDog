(function (namespace) {
  let trackPoints = {}; // Object to store tracking points by date
  let routes = {}; // Object to store routes by date
  let lastUpdate = null;

  // Debugging function to log CSV data
  function debugLog(message, data) {
    console.log(`DEBUG: ${message}`);
    console.log(data);
  }

  // Get all routes
  function getAllRoutes() {
    return routes;
  }

  // Format date from DD/MM/YYYY to a standard format
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("/");
    if (parts.length !== 3) return dateStr;

    // Return in original format DD/MM/YYYY
    return dateStr;
  }

  // Detect CSV delimiter (auto-detect comma or semicolon)
  function detectDelimiter(csvContent) {
    // Check a sample of the content
    const sampleLines = csvContent.split("\n").slice(0, 5).join("\n");

    const semicolonCount = (sampleLines.match(/;/g) || []).length;
    const commaCount = (sampleLines.match(/,/g) || []).length;

    // If we have more semicolons than commas, probably semicolon is the delimiter
    // But we must be careful because commas could be in the coordinates
    if (semicolonCount > 0) {
      return ";";
    }

    return ","; // Default to comma
  }

  // Parse CSV content into structured data
  function parseCSVData(csvContent) {
    try {
      // Debug the raw CSV content
      debugLog(
        "Raw CSV content (first 200 chars):",
        csvContent.substring(0, 200)
      );

      // Detect delimiter
      const delimiter = detectDelimiter(csvContent);
      debugLog("Detected delimiter:", delimiter);

      // Split the CSV content into lines
      const lines = csvContent.split(/\r\n|\n/);
      debugLog("Número de linhas no CSV:", lines.length);
      debugLog("Primeiras 3 linhas:", lines.slice(0, 3));

      // Check if there's a header line and skip it if needed
      let startIndex = 0;
      if (
        lines[0].toLowerCase().includes("data") ||
        lines[0].toLowerCase().includes("hora") ||
        lines[0].toLowerCase().includes("coordenada")
      ) {
        startIndex = 1;
        debugLog("Cabeçalho detectado:", lines[0]);
      }

      // Create an object to store sightings by date
      const pointsByDate = {};

      // Process each line
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split the line into columns using the detected delimiter
        let columns = line.split(delimiter).map((col) => col.trim());

        // Debug
        debugLog(`Processando linha ${i + 1}:`, columns);

        if (columns.length < 3) {
          console.warn(
            `Linha inválida (${
              i + 1
            }): ${line} - Número insuficiente de colunas`
          );
          continue;
        }

        // Extract basic values
        const date = columns[0];
        const time = columns[1];

        // Handle coordinate format (might be in different formats)
        let latitude, longitude;
        let coordColumn = columns[2];

        try {
          // Check if coordinates are in brackets format like [-30.123, -51.456]
          if (coordColumn.includes("[") && coordColumn.includes("]")) {
            // Extract the coordinates from the brackets
            const coordsMatch = coordColumn.match(/\[(.*?)\]/);
            if (coordsMatch && coordsMatch[1]) {
              const coordParts = coordsMatch[1]
                .split(",")
                .map((c) => parseFloat(c.trim()));
              if (coordParts.length >= 2) {
                latitude = coordParts[0];
                longitude = coordParts[1];
              }
            }
          }
          // Check if it's just a plain number (latitude) and the next column is longitude
          else if (
            !isNaN(parseFloat(coordColumn)) &&
            columns.length > 3 &&
            !isNaN(parseFloat(columns[3]))
          ) {
            latitude = parseFloat(coordColumn);
            longitude = parseFloat(columns[3]);
            // Shift the columns for the observation
            columns = [
              columns[0],
              columns[1],
              columns[2],
              columns[3],
              columns.slice(4).join(delimiter),
            ];
          }
          // Try to parse as "lat,lng" format - this is the most common case in the data
          else {
            // Strip any quotes if present
            coordColumn = coordColumn.replace(/['"]/g, "");

            // Handle the case where the coordinates are like "-30.123, -51.456"
            const coordParts = coordColumn
              .split(",")
              .map((c) => parseFloat(c.trim()));
            if (coordParts.length >= 2) {
              latitude = coordParts[0];
              longitude = coordParts[1];
            }
          }

          // Validate coordinates
          if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error(
              `Coordenadas inválidas: latitude=${latitude}, longitude=${longitude}`
            );
          }

          // Debug
          debugLog(`Coordenadas extraídas:`, { latitude, longitude });
        } catch (error) {
          console.warn(
            `Erro ao processar coordenadas na linha ${i + 1}: ${error.message}`
          );
          continue;
        }

        // Get observation if available
        let observation = "";
        if (columns.length >= 4) {
          observation = columns[3];
          debugLog("Observação encontrada:", observation);
        }

        // Create a datetime object for sorting
        const dateParts = date.split("/");
        if (dateParts.length !== 3) {
          console.warn(`Formato de data inválido na linha ${i + 1}: ${date}`);
          continue;
        }

        const timeParts = time.replace("h", ":").split(":");

        // Ensure proper date format (DD/MM/YYYY)
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-indexed
        const year = parseInt(dateParts[2]);

        // Parse time (default to 00:00 if hours or minutes are not provided)
        const hour = timeParts.length > 0 ? parseInt(timeParts[0]) || 0 : 0;
        const minute = timeParts.length > 1 ? parseInt(timeParts[1]) || 0 : 0;

        const datetime = new Date(year, month, day, hour, minute);
        const formattedDate = formatDate(date);

        debugLog("Data/hora processada:", {
          original: { date, time },
          parsed: { day, month, year, hour, minute },
          datetime: datetime,
        });

        // Store the point in the appropriate date group
        if (!pointsByDate[formattedDate]) {
          pointsByDate[formattedDate] = [];
        }

        // Add the point to the collection
        pointsByDate[formattedDate].push({
          latitude,
          longitude,
          time,
          datetime, // Store the parsed datetime for sorting
          observation, // Store observation
          originalIndex: i - startIndex, // Keep track of the original index in the CSV
        });
      }

      // Debug summary of points by date
      debugLog(
        "Pontos agrupados por data:",
        Object.keys(pointsByDate).map((date) => ({
          date: date,
          count: pointsByDate[date].length,
        }))
      );

      // Sort points by datetime within each date group and add numbers
      for (const date in pointsByDate) {
        if (pointsByDate[date].length > 0) {
          pointsByDate[date].sort((a, b) => a.datetime - b.datetime);

          // Add point number after sorting
          pointsByDate[date].forEach((point, index) => {
            point.number = index + 1;
          });

          debugLog(
            `Pontos ordenados para ${date}:`,
            pointsByDate[date].map((p) => ({
              number: p.number,
              time: p.time,
              coords: [p.latitude, p.longitude],
            }))
          );
        }
      }

      return pointsByDate;
    } catch (error) {
      console.error("Erro fatal ao processar arquivo CSV:", error);
      return null;
    }
  }

  // Process a CSV file and create routes
  function processCSVFile(csvContent, fileName) {
    console.log("========== INICIANDO PROCESSAMENTO DE CSV ==========");
    console.log("Arquivo:", fileName);

    const parsedPoints = parseCSVData(csvContent);

    if (!parsedPoints) {
      console.error("Falha ao processar pontos do arquivo CSV");
      return 0;
    }

    // Store the parsed points
    trackPoints = {
      ...trackPoints,
      ...parsedPoints,
    };

    // Create routes for each date
    const routesCreated = createRoutes(parsedPoints, fileName);

    lastUpdate = new Date();

    // Dispatch event to notify that routes have been updated
    document.dispatchEvent(
      new CustomEvent("routesUpdated", {
        detail: {
          routes: routes,
          fileName: fileName,
        },
      })
    );

    // Count total points processed
    let totalPoints = 0;
    for (const date in parsedPoints) {
      totalPoints += parsedPoints[date].length;
    }

    console.log(
      `Total de ${totalPoints} pontos processados em ${routesCreated} rotas`
    );
    console.log("========== FIM DO PROCESSAMENTO DE CSV ==========");

    return totalPoints;
  }

  // Create routes from the parsed points
  function createRoutes(pointsByDate, fileName) {
    let routesCreated = 0;

    for (const date in pointsByDate) {
      const points = pointsByDate[date];
      if (!points || points.length === 0) continue;

      const routeId = `${fileName}-${date}-${Date.now()}`;
      debugLog(
        `Criando rota para ${date} com ${points.length} pontos:`,
        routeId
      );

      // Generate a random color for this route
      const routeColor = getRandomColor();

      routes[routeId] = {
        id: routeId,
        date: date,
        fileName: fileName,
        color: routeColor,
        points: points,
        visible: true,
      };

      routesCreated++;
    }

    return routesCreated;
  }

  // Generate a random color for routes
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

  // Delete a route
  function deleteRoute(routeId) {
    if (routes[routeId]) {
      delete routes[routeId];

      // Notify that routes have been updated
      document.dispatchEvent(
        new CustomEvent("routesUpdated", {
          detail: { routes: routes },
        })
      );

      return true;
    }
    return false;
  }

  // Toggle route visibility
  function toggleRouteVisibility(routeId) {
    if (routes[routeId]) {
      routes[routeId].visible = !routes[routeId].visible;

      // Notify that routes have been updated
      document.dispatchEvent(
        new CustomEvent("routesUpdated", {
          detail: { routes: routes },
        })
      );

      return routes[routeId].visible;
    }
    return false;
  }

  // Export the public API
  namespace.DataModule = {
    processCSVFile: processCSVFile,
    getRoutes: function () {
      return routes;
    },
    getAllRoutes: getAllRoutes,
    getTrackPoints: function () {
      return trackPoints;
    },
    getLastUpdate: function () {
      return lastUpdate;
    },
    deleteRoute: deleteRoute,
    toggleRouteVisibility: toggleRouteVisibility,
    // For debugging
    debug: {
      parseCSVData: parseCSVData,
    },
  };
})(window.PetTrack || (window.PetTrack = {}));
