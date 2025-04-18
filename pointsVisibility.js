(function (namespace) {
  // Estado de visibilidade dos pontos
  let pointsVisible = true;

  function initialize() {
    // Vincular ao toggle de visibilidade dos pontos
    const pointsToggle = document.getElementById("pointsToggle");
    if (pointsToggle) {
      pointsToggle.addEventListener("change", togglePointsVisibility);
    }

    return true;
  }

  function togglePointsVisibility(e) {
    pointsVisible = e.target.checked;

    // Disparar evento para notificar sobre a alteração de visibilidade
    document.dispatchEvent(
      new CustomEvent("pointsVisibilityChanged", {
        detail: { visible: pointsVisible },
      })
    );
  }

  function arePointsVisible() {
    return pointsVisible;
  }

  // Exportar API pública
  namespace.PointsVisibility = {
    init: initialize,
    arePointsVisible: arePointsVisible,
  };
})(window.PetTrack || (window.PetTrack = {}));
