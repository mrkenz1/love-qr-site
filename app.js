(() => {
  const openLetterBtn = document.getElementById("openLetterBtn");
  const letterSection = document.getElementById("letter");
  const heroSubtext = document.getElementById("heroSubtext");

  const recipientHeading = document.getElementById("recipientHeading");
  const recipientInline = document.getElementById("recipientInline");
  const fromSignature = document.getElementById("fromSignature");
  const customNote = document.getElementById("customNote");

  const memoryModal = document.getElementById("memoryModal");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalCaption = document.getElementById("modalCaption");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const memoryFallbackImage = "./assets/memory-fallback.svg";

  const songList = document.getElementById("songList");
  const nowPlaying = document.getElementById("nowPlaying");
  const nowArtist = document.getElementById("nowArtist");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const progressBar = document.getElementById("progressBar");

  const shareForm = document.getElementById("shareForm");
  const toInput = document.getElementById("toInput");
  const fromInput = document.getElementById("fromInput");
  const noteInput = document.getElementById("noteInput");
  const shareUrl = document.getElementById("shareUrl");
  const qrCanvas = document.getElementById("qrCanvas");
  const copyBtn = document.getElementById("copyBtn");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const nativeShareBtn = document.getElementById("nativeShareBtn");
  const shareStatus = document.getElementById("shareStatus");
  const shareSection = document.getElementById("share");
  const shareNavLink = document.getElementById("shareNavLink");

  let isPlaying = false;
  let progressTimer = null;
  let isAdminMode = false;

  const DEFAULT_PROFILE = {
    to: "My Love",
    from: "Your Forever",
    note: ""
  };

  function safeText(value, fallback) {
    const v = (value || "").trim();
    return v.length ? v : fallback;
  }

  function getLetterBlocks() {
    return Array.from(document.querySelectorAll("[data-edit-letter]"));
  }

  function getSongItems() {
    return Array.from(document.querySelectorAll(".song-item"));
  }

  function getMemoryCards() {
    return Array.from(document.querySelectorAll(".memory-card"));
  }

  function readDefaultContent() {
    return {
      heroSubtext: safeText(heroSubtext?.textContent, "Every love story is beautiful, but ours is my favorite."),
      letters: getLetterBlocks().map((p) => safeText(p.textContent, "")),
      songs: getSongItems().map((item) => safeText(item.textContent, "")),
      memories: getMemoryCards().map((card) => ({
        title: safeText(card.getAttribute("data-title"), "Memory"),
        caption: safeText(card.getAttribute("data-caption"), ""),
        image: safeText(card.getAttribute("data-image"), memoryFallbackImage)
      }))
    };
  }

  const defaultContent = readDefaultContent();

  function utf8ToBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToUtf8(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeCfg(config) {
    try {
      return utf8ToBase64Url(JSON.stringify(config));
    } catch (_error) {
      return "";
    }
  }

  function decodeCfg(raw) {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(base64UrlToUtf8(raw));
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  function readParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      to: safeText(params.get("to"), DEFAULT_PROFILE.to),
      from: safeText(params.get("from"), DEFAULT_PROFILE.from),
      note: safeText(params.get("note"), DEFAULT_PROFILE.note),
      lock: params.get("lock") === "1",
      admin: params.get("admin") === "1",
      cfg: decodeCfg(params.get("cfg"))
    };
  }

  function applyProfile(profile) {
    recipientHeading.textContent = profile.to;
    recipientInline.textContent = profile.to;
    fromSignature.textContent = profile.from;

    if (profile.note) {
      customNote.hidden = false;
      customNote.textContent = profile.note;
    } else {
      customNote.hidden = true;
      customNote.textContent = "";
    }

    toInput.value = profile.to === DEFAULT_PROFILE.to ? "" : profile.to;
    fromInput.value = profile.from === DEFAULT_PROFILE.from ? "" : profile.from;
    noteInput.value = profile.note;
  }

  function ensureImageFallback(imgElement) {
    if (!imgElement || imgElement.dataset.fallbackBound === "1") {
      return;
    }

    imgElement.addEventListener("error", () => {
      if (imgElement.src.endsWith("memory-fallback.svg")) {
        return;
      }
      imgElement.src = memoryFallbackImage;
    });

    imgElement.dataset.fallbackBound = "1";
  }

  function applyCfg(cfg) {
    if (!cfg || typeof cfg !== "object") {
      return;
    }

    if (typeof cfg.heroSubtext === "string" && heroSubtext) {
      heroSubtext.textContent = safeText(cfg.heroSubtext, defaultContent.heroSubtext);
    }

    if (Array.isArray(cfg.letters)) {
      const letters = getLetterBlocks();
      letters.forEach((block, index) => {
        const next = cfg.letters[index];
        if (typeof next === "string") {
          block.textContent = safeText(next, defaultContent.letters[index] || "");
        }
      });
    }

    if (Array.isArray(cfg.songs)) {
      const songs = getSongItems();
      songs.forEach((item, index) => {
        const next = cfg.songs[index];
        if (typeof next === "string") {
          const songName = safeText(next, defaultContent.songs[index] || "Untitled Song");
          item.textContent = songName;
          item.setAttribute("data-song", songName);
        }
      });

      const activeSong = document.querySelector(".song-item.active");
      if (activeSong) {
        nowPlaying.textContent = safeText(activeSong.getAttribute("data-song"), activeSong.textContent);
      }
    }

    if (Array.isArray(cfg.memories)) {
      const cards = getMemoryCards();
      cards.forEach((card, index) => {
        const next = cfg.memories[index];
        if (!next || typeof next !== "object") {
          return;
        }

        const title = safeText(next.title, card.getAttribute("data-title") || "Memory");
        const caption = safeText(next.caption, card.getAttribute("data-caption") || "");
        const image = safeText(next.image, card.getAttribute("data-image") || memoryFallbackImage);

        card.setAttribute("data-title", title);
        card.setAttribute("data-caption", caption);
        card.setAttribute("data-image", image);

        const captionNode = card.querySelector("span");
        if (captionNode) {
          captionNode.textContent = title;
        }

        const cardImage = card.querySelector("img");
        if (cardImage) {
          ensureImageFallback(cardImage);
          cardImage.src = image;
        }
      });
    }
  }

  function showStatus(message, isError = false) {
    shareStatus.textContent = message;
    shareStatus.style.color = isError ? "#9f103f" : "#c81f5e";
  }

  function compactCfg(cfg) {
    const compact = {};

    if (cfg.heroSubtext !== defaultContent.heroSubtext) {
      compact.heroSubtext = cfg.heroSubtext;
    }

    if (JSON.stringify(cfg.letters) !== JSON.stringify(defaultContent.letters)) {
      compact.letters = cfg.letters;
    }

    if (JSON.stringify(cfg.songs) !== JSON.stringify(defaultContent.songs)) {
      compact.songs = cfg.songs;
    }

    if (JSON.stringify(cfg.memories) !== JSON.stringify(defaultContent.memories)) {
      compact.memories = cfg.memories;
    }

    return compact;
  }

  function collectCfgFromDom() {
    return {
      heroSubtext: safeText(heroSubtext?.textContent, defaultContent.heroSubtext),
      letters: getLetterBlocks().map((p, index) => safeText(p.textContent, defaultContent.letters[index] || "")),
      songs: getSongItems().map((item, index) => safeText(item.textContent, defaultContent.songs[index] || "Untitled Song")),
      memories: getMemoryCards().map((card, index) => ({
        title: safeText(card.getAttribute("data-title"), defaultContent.memories[index]?.title || "Memory"),
        caption: safeText(card.getAttribute("data-caption"), defaultContent.memories[index]?.caption || ""),
        image: safeText(card.getAttribute("data-image"), defaultContent.memories[index]?.image || memoryFallbackImage)
      }))
    };
  }

  function buildUrl(profile, cfg, options = {}) {
    const { lock = false, admin = false } = options;
    const url = new URL(window.location.origin + window.location.pathname);

    if (profile.to && profile.to !== DEFAULT_PROFILE.to) {
      url.searchParams.set("to", profile.to);
    }
    if (profile.from && profile.from !== DEFAULT_PROFILE.from) {
      url.searchParams.set("from", profile.from);
    }
    if (profile.note) {
      url.searchParams.set("note", profile.note);
    }

    const cfgPayload = encodeCfg(cfg);
    if (cfgPayload) {
      url.searchParams.set("cfg", cfgPayload);
    }

    if (lock) {
      url.searchParams.set("lock", "1");
    }
    if (admin) {
      url.searchParams.set("admin", "1");
    }

    return url.toString();
  }

  function renderQr(url) {
    shareUrl.value = url;

    if (!window.QRCode || !window.QRCode.toCanvas) {
      showStatus("QR library failed to load. Refresh the page and try again.", true);
      return;
    }

    window.QRCode.toCanvas(
      qrCanvas,
      url,
      {
        width: 220,
        margin: 2,
        color: {
          dark: "#c81f5e",
          light: "#fff9fc"
        }
      },
      (error) => {
        if (error) {
          showStatus("Could not generate QR. Try again.", true);
          return;
        }
        showStatus("Locked QR updated. Send this to recipient.");
      }
    );
  }

  function getCurrentProfileFromInputs() {
    return {
      to: safeText(toInput.value, DEFAULT_PROFILE.to),
      from: safeText(fromInput.value, DEFAULT_PROFILE.from),
      note: safeText(noteInput.value, DEFAULT_PROFILE.note)
    };
  }

  function refreshAdminQr(pushHistory = true) {
    if (!isAdminMode) {
      return;
    }

    const profile = getCurrentProfileFromInputs();
    applyProfile(profile);

    const cfg = compactCfg(collectCfgFromDom());
    const lockedUrl = buildUrl(profile, cfg, { lock: true, admin: false });
    const adminUrl = buildUrl(profile, cfg, { lock: false, admin: true });

    renderQr(lockedUrl);
    if (pushHistory) {
      window.history.replaceState(null, "", adminUrl);
    }
  }

  async function copyLink() {
    const url = shareUrl.value;
    if (!url) {
      showStatus("Generate a link first.", true);
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        shareUrl.focus();
        shareUrl.select();
        const ok = document.execCommand("copy");
        if (!ok) {
          throw new Error("Fallback copy failed");
        }
      }
      showStatus("Link copied.");
    } catch (_error) {
      showStatus("Copy failed. Please copy manually.", true);
    }
  }

  function downloadQr() {
    if (!shareUrl.value) {
      showStatus("Generate a link first.", true);
      return;
    }

    const png = qrCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = "love-qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showStatus("QR downloaded.");
  }

  async function nativeShare() {
    const url = shareUrl.value;
    if (!url) {
      showStatus("Generate a link first.", true);
      return;
    }

    if (!navigator.share) {
      showStatus("Native share is not available on this browser.", true);
      return;
    }

    try {
      await navigator.share({
        title: "A special message",
        text: "Open this link",
        url
      });
      showStatus("Shared.");
    } catch (_error) {
      showStatus("Share canceled.");
    }
  }

  function setSong(element) {
    const song = safeText(element.getAttribute("data-song") || element.textContent, "Timeless Love Song");
    const artist = element.getAttribute("data-artist") || "Your Playlist";

    nowPlaying.textContent = song;
    nowArtist.textContent = artist;

    document.querySelectorAll(".song-item").forEach((item) => item.classList.remove("active"));
    element.classList.add("active");

    if (!isPlaying) {
      togglePlay();
    }
  }

  function tickProgress() {
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      const current = Number.parseFloat(progressBar.style.width || "8") || 8;
      const next = current >= 100 ? 8 : current + 2.8;
      progressBar.style.width = `${next}%`;
    }, 260);
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? "Pause" : "Play";

    if (isPlaying) {
      tickProgress();
      return;
    }

    clearInterval(progressTimer);
  }

  function openModal(image, title, caption) {
    ensureImageFallback(modalImage);
    modalImage.src = image;
    modalTitle.textContent = title;
    modalCaption.textContent = caption;
    memoryModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    memoryModal.hidden = true;
    modalImage.src = "";
    document.body.style.overflow = "";
  }

  function setupReveal() {
    const revealables = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      revealables.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    revealables.forEach((el) => io.observe(el));
  }

  function setToolsVisibility(visible) {
    if (shareSection) {
      shareSection.hidden = !visible;
    }
    if (shareNavLink) {
      shareNavLink.hidden = !visible;
    }
  }

  function makeEditable(node, onChange) {
    node.contentEditable = "true";
    node.spellcheck = false;
    node.classList.add("admin-editable");
    node.addEventListener("input", onChange);
    node.addEventListener("blur", onChange);
  }

  function addMemoryEditButtons() {
    getMemoryCards().forEach((card) => {
      if (card.querySelector(".memory-edit-btn")) {
        return;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "memory-edit-btn";
      btn.textContent = "Edit";

      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const currentTitle = card.getAttribute("data-title") || "Memory";
        const currentCaption = card.getAttribute("data-caption") || "";
        const currentImage = card.getAttribute("data-image") || memoryFallbackImage;

        const nextTitle = window.prompt("Memory title", currentTitle);
        if (nextTitle === null) {
          return;
        }

        const nextCaption = window.prompt("Memory caption", currentCaption);
        if (nextCaption === null) {
          return;
        }

        const nextImage = window.prompt("Image URL / path", currentImage);
        if (nextImage === null) {
          return;
        }

        const title = safeText(nextTitle, currentTitle);
        const caption = safeText(nextCaption, currentCaption);
        const image = safeText(nextImage, currentImage);

        card.setAttribute("data-title", title);
        card.setAttribute("data-caption", caption);
        card.setAttribute("data-image", image);

        const titleNode = card.querySelector("span");
        if (titleNode) {
          titleNode.textContent = title;
        }

        const cardImage = card.querySelector("img");
        if (cardImage) {
          ensureImageFallback(cardImage);
          cardImage.src = image;
        }

        refreshAdminQr();
      });

      card.appendChild(btn);
    });
  }

  function enableAdminMode() {
    isAdminMode = true;
    document.body.classList.add("admin-mode");
    setToolsVisibility(true);

    if (heroSubtext) {
      makeEditable(heroSubtext, () => refreshAdminQr());
    }

    getLetterBlocks().forEach((block) => {
      makeEditable(block, () => refreshAdminQr());
    });

    getSongItems().forEach((item) => {
      makeEditable(item, () => {
        const songName = safeText(item.textContent, "Untitled Song");
        item.textContent = songName;
        item.setAttribute("data-song", songName);
        if (item.classList.contains("active")) {
          nowPlaying.textContent = songName;
        }
        refreshAdminQr();
      });
    });

    addMemoryEditButtons();

    [toInput, fromInput, noteInput].forEach((input) => {
      input.addEventListener("input", () => refreshAdminQr());
    });

    showStatus("Admin mode active. Every change updates locked QR.");
  }

  openLetterBtn.addEventListener("click", () => {
    letterSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  getMemoryCards().forEach((card) => {
    const cardImage = card.querySelector("img");
    if (cardImage) {
      ensureImageFallback(cardImage);
    }

    card.addEventListener("click", () => {
      openModal(
        card.getAttribute("data-image") || memoryFallbackImage,
        card.getAttribute("data-title") || "Memory",
        card.getAttribute("data-caption") || ""
      );
    });
  });

  closeModalBtn.addEventListener("click", closeModal);
  memoryModal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute("data-close-modal")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !memoryModal.hidden) {
      closeModal();
    }
  });

  if (songList) {
    songList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const item = target.closest(".song-item");
      if (item) {
        setSong(item);
      }
    });
  }

  playPauseBtn.addEventListener("click", togglePlay);

  shareForm.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshAdminQr();
  });

  copyBtn.addEventListener("click", copyLink);
  downloadQrBtn.addEventListener("click", downloadQr);
  nativeShareBtn.addEventListener("click", nativeShare);

  const initialProfile = readParams();
  applyProfile(initialProfile);
  applyCfg(initialProfile.cfg);

  if (initialProfile.admin) {
    enableAdminMode();
    refreshAdminQr(false);

    const profile = getCurrentProfileFromInputs();
    const cfg = compactCfg(collectCfgFromDom());
    const adminUrl = buildUrl(profile, cfg, { lock: false, admin: true });
    window.history.replaceState(null, "", adminUrl);
  } else {
    setToolsVisibility(false);
  }

  setupReveal();
})();
