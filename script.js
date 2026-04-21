(() => {
  "use strict";

  const state = {
    images: [],
    selectedImageId: null,
    logoImage: null,
    logoLoaded: false,
    renderToken: 0
  };

  const elements = {
    fileInput: document.getElementById("fileInput"),
    selectFilesBtn: document.getElementById("selectFilesBtn"),
    dropZone: document.getElementById("dropZone"),
    thumbnailList: document.getElementById("thumbnailList"),
    imageCount: document.getElementById("imageCount"),

    logoSizeRange: document.getElementById("logoSizeRange"),
    logoSizeValue: document.getElementById("logoSizeValue"),
    opacityRange: document.getElementById("opacityRange"),
    opacityValue: document.getElementById("opacityValue"),
    bottomMarginRange: document.getElementById("bottomMarginRange"),
    bottomMarginValue: document.getElementById("bottomMarginValue"),

    exportFormat: document.getElementById("exportFormat"),
    qualityRange: document.getElementById("qualityRange"),
    qualityValue: document.getElementById("qualityValue"),

    previewCanvas: document.getElementById("previewCanvas"),
    emptyState: document.getElementById("emptyState"),

    downloadCurrentBtn: document.getElementById("downloadCurrentBtn"),
    downloadAllBtn: document.getElementById("downloadAllBtn"),

    progressBar: document.getElementById("progressBar"),
    progressText: document.getElementById("progressText")
  };

  const ctx = elements.previewCanvas.getContext("2d");

  function init() {
    bindEvents();
    loadLogo();
    updateControlLabels();
    updateUI();
  }

  function bindEvents() {
    elements.selectFilesBtn.addEventListener("click", () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener("change", (event) => {
      handleFiles(event.target.files);
      event.target.value = "";
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.remove("drag-over");
      });
    });

    elements.dropZone.addEventListener("drop", (event) => {
      const files = event.dataTransfer?.files;
      handleFiles(files);
    });

    elements.dropZone.addEventListener("click", () => {
      elements.fileInput.click();
    });

    elements.dropZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        elements.fileInput.click();
      }
    });

    [
      elements.logoSizeRange,
      elements.opacityRange,
      elements.bottomMarginRange,
      elements.exportFormat,
      elements.qualityRange
    ].forEach((input) => {
      input.addEventListener("input", () => {
        updateControlLabels();
        renderSelectedImage();
      });
      input.addEventListener("change", () => {
        updateControlLabels();
        renderSelectedImage();
      });
    });

    elements.downloadCurrentBtn.addEventListener("click", downloadCurrentImage);
    elements.downloadAllBtn.addEventListener("click", downloadAllImages);
  }

  function loadLogo() {
    const logo = new Image();

    // Important pour garantir un rendu fiable une fois le logo chargé
    logo.onload = () => {
      state.logoImage = logo;
      state.logoLoaded = true;
      renderSelectedImage();
    };

    logo.onerror = () => {
      state.logoLoaded = false;
      setProgress(0, "Erreur : impossible de charger le logo njqds.png");
      console.error("Impossible de charger le fichier logo 'njqds.png'.");
    };

    logo.src = "njqds.png";
  }

  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const validMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const files = Array.from(fileList).filter((file) => validMimeTypes.has(file.type));

    if (files.length === 0) {
      setProgress(0, "Aucun fichier image valide sélectionné.");
      return;
    }

    const loadPromises = files.map(loadImageFile);

    Promise.all(loadPromises)
      .then((loadedImages) => {
        const newItems = loadedImages.filter(Boolean);
        state.images.push(...newItems);

        if (!state.selectedImageId && newItems.length > 0) {
          state.selectedImageId = newItems[0].id;
        }

               renderThumbnailList();
        updateUI();
        renderSelectedImage();
        setProgress(0, `${newItems.length} image(s) ajoutée(s).`);
      })
      .catch((error) => {
        console.error(error);
        setProgress(0, "Une erreur est survenue lors du chargement des images.");
      });
  }

  function loadImageFile(file) {
    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const item = {
          id: generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          width: image.naturalWidth,
          height: image.naturalHeight,
          image,
          objectUrl,
          thumbnailUrl: objectUrl
        };

        resolve(item);
      };

      image.onerror = () => {
        console.warn(`Image ignorée : ${file.name}`);
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };

      image.src = objectUrl;
    });
  }

  function generateId() {
    return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function renderThumbnailList() {
    elements.thumbnailList.innerHTML = "";

    state.images.forEach((item) => {
      const card = document.createElement("div");
      card.className = "thumbnail-item";
      if (item.id === state.selectedImageId) {
        card.classList.add("active");
      }

      const thumb = document.createElement("img");
      thumb.className = "thumbnail-image";
      thumb.src = item.thumbnailUrl;
      thumb.alt = item.name;

      const meta = document.createElement("div");
      meta.className = "thumbnail-meta";

      const name = document.createElement("p");
      name.className = "thumbnail-name";
      name.textContent = item.name;

      const size = document.createElement("p");
      size.className = "thumbnail-size";
      size.textContent = `${formatBytes(item.size)} • ${item.width}×${item.height}`;

      meta.appendChild(name);
      meta.appendChild(size);

      const actions = document.createElement("div");
      actions.className = "thumbnail-actions";

      const selectBtn = document.createElement("button");
      selectBtn.className = "thumbnail-select-btn";
      selectBtn.type = "button";
      selectBtn.textContent = "Aperçu";
      selectBtn.addEventListener("click", () => {
        state.selectedImageId = item.id;
        renderThumbnailList();
        updateUI();
        renderSelectedImage();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "thumbnail-delete-btn";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Supprimer";
      deleteBtn.addEventListener("click", () => {
        removeImage(item.id);
      });

      actions.appendChild(selectBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(thumb);
      card.appendChild(meta);
      card.appendChild(actions);

      elements.thumbnailList.appendChild(card);
    });
  }

  function removeImage(imageId) {
    const index = state.images.findIndex((img) => img.id === imageId);
    if (index === -1) return;

    const [removed] = state.images.splice(index, 1);

    if (removed?.objectUrl) {
      URL.revokeObjectURL(removed.objectUrl);
    }

    if (state.selectedImageId === imageId) {
      state.selectedImageId = state.images.length > 0 ? state.images[0].id : null;
    }

    renderThumbnailList();
    updateUI();
    renderSelectedImage();
    setProgress(0, "Image supprimée.");
  }

  function updateControlLabels() {
    elements.logoSizeValue.textContent = `${elements.logoSizeRange.value}%`;
    elements.opacityValue.textContent = Number(elements.opacityRange.value).toFixed(2);
    elements.bottomMarginValue.textContent = `${elements.bottomMarginRange.value} px`;
    elements.qualityValue.textContent = Number(elements.qualityRange.value).toFixed(2);
  }

  function updateUI() {
    const imageCount = state.images.length;
    const hasSelection = Boolean(getSelectedImage());

    elements.imageCount.textContent = String(imageCount);
    elements.downloadCurrentBtn.disabled = !hasSelection || !state.logoLoaded;
    elements.downloadAllBtn.disabled = imageCount === 0 || !state.logoLoaded;
    elements.emptyState.style.display = hasSelection ? "none" : "flex";
  }

  function getSelectedImage() {
    return state.images.find((img) => img.id === state.selectedImageId) || null;
  }

  function renderSelectedImage() {
    const selected = getSelectedImage();
    const currentToken = ++state.renderToken;

    if (!selected) {
      clearCanvas();
      updateUI();
      return;
    }

    if (!state.logoLoaded || !state.logoImage) {
      clearCanvas();
      elements.emptyState.style.display = "flex";
      elements.emptyState.innerHTML = "<p>Chargement du logo en cours…</p>";
      return;
    }

    elements.emptyState.style.display = "none";

    drawImageWithWatermark(selected.image, {
      canvas: elements.previewCanvas,
      context: ctx,
      logo: state.logoImage,
      settings: getSettings()
    }).then(() => {
      if (currentToken !== state.renderToken) {
        return;
      }
      updateUI();
    }).catch((error) => {
      console.error(error);
      setProgress(0, "Erreur lors du rendu de l’aperçu.");
    });
  }

  function clearCanvas() {
    elements.previewCanvas.width = 0;
    elements.previewCanvas.height = 0;
    ctx.clearRect(0, 0, 1, 1);
  }

  function getSettings() {
    return {
      logoSizePercent: Number(elements.logoSizeRange.value),
      opacity: Number(elements.opacityRange.value),
      bottomMargin: Number(elements.bottomMarginRange.value),
      exportFormat: elements.exportFormat.value,
      quality: Number(elements.qualityRange.value)
    };
  }

  async function drawImageWithWatermark(sourceImage, options) {
    const { canvas, context, logo, settings } = options;

    const imageWidth = sourceImage.naturalWidth || sourceImage.width;
    const imageHeight = sourceImage.naturalHeight || sourceImage.height;

    canvas.width = imageWidth;
    canvas.height = imageHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Dessin de l'image source
    context.globalAlpha = 1;
    context.drawImage(sourceImage, 0, 0, imageWidth, imageHeight);

    // Calcul de la taille du logo en fonction de la largeur de l'image
    const targetLogoWidth = Math.max(1, imageWidth * (settings.logoSizePercent / 100));
    const logoRatio = logo.naturalWidth / logo.naturalHeight;
    const targetLogoHeight = targetLogoWidth / logoRatio;

    // Position fixe : bas-centre
    const x = (imageWidth - targetLogoWidth) / 2;
    const y = imageHeight - targetLogoHeight - settings.bottomMargin;

    // Si la marge pousse le logo hors image, on le contraint
    const safeY = Math.max(0, y);

    context.save();
    context.globalAlpha = settings.opacity;
    context.drawImage(logo, x, safeY, targetLogoWidth, targetLogoHeight);
    context.restore();
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      const qualitySupported = mimeType === "image/jpeg" || mimeType === "image/webp";
      const finalQuality = qualitySupported ? quality : undefined;

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Échec de génération du blob."));
          return;
        }
        resolve(blob);
      }, mimeType, finalQuality);
    });
  }

  async function downloadCurrentImage() {
    const selected = getSelectedImage();
    if (!selected || !state.logoLoaded) return;

    try {
      setProgress(0, "Préparation du téléchargement...");
      const blob = await renderImageToBlob(selected);
      downloadBlob(blob, buildExportFileName(selected.name));
      setProgress(100, "Téléchargement prêt.");
      setTimeout(() => setProgress(0, "En attente…"), 1000);
    } catch (error) {
      console.error(error);
      setProgress(0, "Erreur lors du téléchargement de l’image.");
    }
  }

  async function downloadAllImages() {
    if (state.images.length === 0 || !state.logoLoaded) return;

    const total = state.images.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = state.images[i];
        const progress = Math.round((i / total) * 100);
        setProgress(progress, `Traitement de ${i + 1} / ${total} : ${item.name}`);

        const blob = await renderImageToBlob(item);
        downloadBlob(blob, buildExportFileName(item.name));

        // Laisse le navigateur respirer entre les téléchargements
        await wait(150);
      }

      setProgress(100, "Traitement terminé.");
      setTimeout(() => setProgress(0, "En attente…"), 1500);
    } catch (error) {
      console.error(error);
      setProgress(0, "Erreur lors du traitement en lot.");
    }
  }

  async function renderImageToBlob(item) {
    const settings = getSettings();
    const offscreenCanvas = document.createElement("canvas");
    const offscreenContext = offscreenCanvas.getContext("2d");

    await drawImageWithWatermark(item.image, {
      canvas: offscreenCanvas,
      context: offscreenContext,
      logo: state.logoImage,
      settings
    });

    return canvasToBlob(offscreenCanvas, settings.exportFormat, settings.quality);
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function buildExportFileName(originalName) {
    const settings = getSettings();
    const extensionMap = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp"
    };

    const extension = extensionMap[settings.exportFormat] || "png";
    const baseName = originalName.replace(/\.[^.]+$/, "");
    return `${baseName}-watermarked.${extension}`;
  }

  function setProgress(percent, text) {
    elements.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    elements.progressText.textContent = text;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  window.addEventListener("beforeunload", () => {
    state.images.forEach((item) => {
      if (item.objectUrl) {
        URL.revokeObjectURL(item.objectUrl);
      }
    });
  });

  init();
})();