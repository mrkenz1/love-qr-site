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
  const playerStatus = document.getElementById("playerStatus");
  const audioPlayer = document.getElementById("audioPlayer");
  const soundcloudEmbed = document.getElementById("soundcloudEmbed");
  const soundcloudUrlInput = document.getElementById("soundcloudUrlInput");
  const applySoundcloudBtn = document.getElementById("applySoundcloudBtn");
  const embedAdminControls = document.getElementById("embedAdminControls");

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

  function getSongNameNode(item) {
    return item.querySelector(".song-name");
  }

  function songEntryFromItem(item, fallback = {}) {
    const defaultName = fallback.name || "Untitled Song";
    const defaultArtist = fallback.artist || "Your Playlist";
    const defaultSrc = fallback.src || "";

    const nameNode = getSongNameNode(item);
    const visualName = nameNode ? nameNode.textContent : item.textContent;

    return {
      name: safeText(item.getAttribute("data-song") || visualName, defaultName),
      artist: safeText(item.getAttribute("data-artist"), defaultArtist),
      src: safeText(item.getAttribute("data-src"), defaultSrc)
    };
  }

  function readDefaultContent() {
    const defaultSoundcloudSource = safeText(
      soundcloudEmbed?.getAttribute("data-source"),
      "https://soundcloud.com/chillhopdotcom/sets/lofi-beats"
    );

    return {
      heroSubtext: safeText(heroSubtext?.textContent, "Every love story is beautiful, but ours is my favorite."),
      letters: getLetterBlocks().map((p) => safeText(p.textContent, "")),
      songs: getSongItems().map((item) => songEntryFromItem(item)),
      soundcloudSource: defaultSoundcloudSource,
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

  function showStatus(message, isError = false) {
    shareStatus.textContent = message;
    shareStatus.style.color = isError ? "#9f103f" : "#c81f5e";
  }

  function showPlayerStatus(message, isError = false) {
    if (!playerStatus) {
      return;
    }
    playerStatus.textContent = message;
    playerStatus.style.color = isError ? "#9f103f" : "#8f1d4f";
  }

  function toSoundcloudEmbedUrl(rawUrl) {
    const source = safeText(rawUrl, defaultContent.soundcloudSource);
    if (!source) {
      return "";
    }

    if (source.includes("w.soundcloud.com/player/")) {
      return source;
    }

    const encoded = encodeURIComponent(source);
    return `https://w.soundcloud.com/player/?url=${encoded}&color=%23e53a78&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  }

  function setSoundcloudSource(source) {
    const normalizedSource = safeText(source, defaultContent.soundcloudSource);
    const embedUrl = toSoundcloudEmbedUrl(normalizedSource);

    if (soundcloudEmbed) {
      soundcloudEmbed.setAttribute("data-source", normalizedSource);
      soundcloudEmbed.src = embedUrl;
    }

    if (soundcloudUrlInput) {
      soundcloudUrlInput.value = normalizedSource;
    }
  }

  function normalizeSongConfig(raw, fallback = {}) {
    if (typeof raw === "string") {
      return {
        name: safeText(raw, fallback.name || "Untitled Song"),
        artist: safeText(fallback.artist, "Your Playlist"),
        src: safeText(fallback.src, "")
      };
    }

    if (raw && typeof raw === "object") {
      return {
        name: safeText(raw.name, fallback.name || "Untitled Song"),
        artist: safeText(raw.artist, fallback.artist || "Your Playlist"),
        src: safeText(raw.src, fallback.src || "")
      };
    }

    return {
      name: safeText(fallback.name, "Untitled Song"),
      artist: safeText(fallback.artist, "Your Playlist"),
      src: safeText(fallback.src, "")
    };
  }

  function refreshSongVisual(item) {
    const src = safeText(item.getAttribute("data-src"), "");
    if (src) {
      item.removeAttribute("data-empty-src");
    } else {
      item.setAttribute("data-empty-src", "1");
    }
  }

  function ensureSongMarkup(item) {
    let nameNode = getSongNameNode(item);
    if (!nameNode) {
      const initialName = safeText(item.getAttribute("data-song") || item.textContent, "Untitled Song");
      item.textContent = "";
      nameNode = document.createElement("span");
      nameNode.className = "song-name";
      nameNode.textContent = initialName;
      item.appendChild(nameNode);
    }

    let srcBtn = item.querySelector(".song-src-btn");
    if (!srcBtn) {
      srcBtn = document.createElement("button");
      srcBtn.type = "button";
      srcBtn.className = "song-src-btn";
      srcBtn.textContent = "Audio";
      srcBtn.setAttribute("aria-label", "Edit audio source");
      item.appendChild(srcBtn);
    }

    if (item.dataset.songBound !== "1") {
      srcBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAdminMode) {
          return;
        }

        const current = safeText(item.getAttribute("data-src"), "");
        const next = window.prompt("Audio URL or path (example: ./assets/music/song-1.mp3)", current);
        if (next === null) {
          return;
        }

        item.setAttribute("data-src", safeText(next, ""));
        refreshSongVisual(item);

        if (item.classList.contains("active")) {
          setSong(item, { autoplay: false, showMissing: false });
        }

        refreshAdminQr();
      });

      item.dataset.songBound = "1";
    }

    refreshSongVisual(item);
  }

  function setSongEntryOnItem(item, entry) {
    const normalized = normalizeSongConfig(entry);
    item.setAttribute("data-song", normalized.name);
    item.setAttribute("data-artist", normalized.artist);
    item.setAttribute("data-src", normalized.src);

    ensureSongMarkup(item);
    const nameNode = getSongNameNode(item);
    if (nameNode) {
      nameNode.textContent = normalized.name;
    }

    refreshSongVisual(item);
  }

  function getActiveSongItem() {
    return document.querySelector(".song-item.active");
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
        const fallback = defaultContent.songs[index] || songEntryFromItem(item);
        const next = normalizeSongConfig(cfg.songs[index], fallback);
        setSongEntryOnItem(item, next);
      });
    }

    if (typeof cfg.soundcloudSource === "string") {
      setSoundcloudSource(cfg.soundcloudSource);
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

    if (cfg.soundcloudSource !== defaultContent.soundcloudSource) {
      compact.soundcloudSource = cfg.soundcloudSource;
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
      songs: getSongItems().map((item, index) => songEntryFromItem(item, defaultContent.songs[index])),
      soundcloudSource: safeText(
        soundcloudEmbed?.getAttribute("data-source"),
        defaultContent.soundcloudSource
      ),
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

  function setPlayingState(next) {
    isPlaying = next;
    playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
  }

  function updateProgressFromAudio() {
    if (!audioPlayer || !Number.isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) {
      progressBar.style.width = "0%";
      return;
    }

    const pct = Math.max(0, Math.min(100, (audioPlayer.currentTime / audioPlayer.duration) * 100));
    progressBar.style.width = `${pct}%`;
  }

  function applySongToHeader(item) {
    const entry = songEntryFromItem(item);
    nowPlaying.textContent = entry.name;
    nowArtist.textContent = entry.artist;
  }

  function loadAudioForSong(item) {
    const entry = songEntryFromItem(item);
    if (!entry.src) {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.removeAttribute("src");
        audioPlayer.dataset.songSrc = "";
        audioPlayer.load();
      }
      progressBar.style.width = "0%";
      return false;
    }

    if (audioPlayer && audioPlayer.dataset.songSrc !== entry.src) {
      audioPlayer.pause();
      audioPlayer.src = entry.src;
      audioPlayer.dataset.songSrc = entry.src;
      audioPlayer.load();
      progressBar.style.width = "0%";
    }

    return true;
  }

  function setSong(item, options = {}) {
    const { autoplay = true, showMissing = true } = options;

    document.querySelectorAll(".song-item").forEach((node) => node.classList.remove("active"));
    item.classList.add("active");
    applySongToHeader(item);

    const hasSource = loadAudioForSong(item);
    if (!hasSource) {
      setPlayingState(false);
      if (showMissing) {
        showPlayerStatus("No audio source. Admin mode: set Audio path.", true);
      }
      return;
    }

    if (!audioPlayer) {
      return;
    }

    if (!autoplay) {
      setPlayingState(!audioPlayer.paused);
      showPlayerStatus("Audio ready.");
      return;
    }

    audioPlayer.play()
      .then(() => {
        setPlayingState(true);
        showPlayerStatus("Playing.");
      })
      .catch(() => {
        setPlayingState(false);
        showPlayerStatus("Could not play this audio. Check file path/format.", true);
      });
  }

  function togglePlay() {
    const active = getActiveSongItem() || getSongItems()[0];
    if (!active) {
      return;
    }

    if (!audioPlayer) {
      return;
    }

    const entry = songEntryFromItem(active);
    if (!entry.src) {
      showPlayerStatus("No audio source. Admin mode: set Audio path.", true);
      return;
    }

    if (!audioPlayer.paused && audioPlayer.dataset.songSrc === entry.src) {
      audioPlayer.pause();
      setPlayingState(false);
      showPlayerStatus("Paused.");
      return;
    }

    setSong(active, { autoplay: true, showMissing: true });
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
    if (!node) {
      return;
    }
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

  function setupSongUi() {
    getSongItems().forEach((item, index) => {
      const fallback = defaultContent.songs[index] || songEntryFromItem(item);
      setSongEntryOnItem(item, songEntryFromItem(item, fallback));
    });

    const active = getActiveSongItem() || getSongItems()[0];
    if (active && !getActiveSongItem()) {
      active.classList.add("active");
    }

    const selected = getActiveSongItem() || getSongItems()[0];
    if (selected) {
      setSong(selected, { autoplay: false, showMissing: false });
    }
  }

  function enableAdminMode() {
    isAdminMode = true;
    document.body.classList.add("admin-mode");
    setToolsVisibility(true);

    makeEditable(heroSubtext, () => refreshAdminQr());

    getLetterBlocks().forEach((block) => {
      makeEditable(block, () => refreshAdminQr());
    });

    getSongItems().forEach((item) => {
      const nameNode = getSongNameNode(item);
      makeEditable(nameNode, () => {
        const songName = safeText(nameNode?.textContent, "Untitled Song");
        item.setAttribute("data-song", songName);
        if (nameNode) {
          nameNode.textContent = songName;
        }

        if (item.classList.contains("active")) {
          nowPlaying.textContent = songName;
        }

        refreshAdminQr();
      });
    });

    addMemoryEditButtons();
    if (embedAdminControls) {
      embedAdminControls.hidden = false;
    }

    [toInput, fromInput, noteInput].forEach((input) => {
      input.addEventListener("input", () => refreshAdminQr());
    });

    showStatus("Admin mode active. Every change updates locked QR.");
    showPlayerStatus("Admin mode: Edit song name inline, click Audio to set file path.");
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

      if (target.closest(".song-src-btn")) {
        return;
      }

      const item = target.closest(".song-item");
      if (item) {
        setSong(item, { autoplay: true, showMissing: true });
      }
    });
  }

  playPauseBtn.addEventListener("click", togglePlay);

  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", updateProgressFromAudio);
    audioPlayer.addEventListener("play", () => {
      setPlayingState(true);
    });
    audioPlayer.addEventListener("pause", () => {
      setPlayingState(false);
    });
    audioPlayer.addEventListener("ended", () => {
      setPlayingState(false);
      progressBar.style.width = "0%";
      showPlayerStatus("Playback ended.");
    });
    audioPlayer.addEventListener("error", () => {
      setPlayingState(false);
      showPlayerStatus("Audio failed to load. Check file path.", true);
    });
  }

  shareForm.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshAdminQr();
  });

  copyBtn.addEventListener("click", copyLink);
  downloadQrBtn.addEventListener("click", downloadQr);
  nativeShareBtn.addEventListener("click", nativeShare);

  if (applySoundcloudBtn) {
    applySoundcloudBtn.addEventListener("click", () => {
      if (!isAdminMode) {
        return;
      }
      setSoundcloudSource(soundcloudUrlInput?.value || "");
      refreshAdminQr();
      showStatus("SoundCloud embed updated.");
    });
  }

  if (soundcloudUrlInput) {
    soundcloudUrlInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || !isAdminMode) {
        return;
      }
      event.preventDefault();
      setSoundcloudSource(soundcloudUrlInput.value);
      refreshAdminQr();
      showStatus("SoundCloud embed updated.");
    });
  }

  const initialProfile = readParams();
  applyProfile(initialProfile);
  applyCfg(initialProfile.cfg);
  setSoundcloudSource(soundcloudEmbed?.getAttribute("data-source") || defaultContent.soundcloudSource);
  setupSongUi();

  if (initialProfile.admin) {
    enableAdminMode();
    refreshAdminQr(false);

    const profile = getCurrentProfileFromInputs();
    const cfg = compactCfg(collectCfgFromDom());
    const adminUrl = buildUrl(profile, cfg, { lock: false, admin: true });
    window.history.replaceState(null, "", adminUrl);
  } else {
    setToolsVisibility(false);
    showPlayerStatus("Select a song and press Play.");
  }

  setupReveal();
})();
