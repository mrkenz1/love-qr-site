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
  const playerStatus = document.getElementById("playerStatus");
  const soundcloudEmbed = document.getElementById("soundcloudEmbed");

  const shareForm = document.getElementById("shareForm");
  const toInput = document.getElementById("toInput");
  const fromInput = document.getElementById("fromInput");
  const noteInput = document.getElementById("noteInput");
  const shareUrl = document.getElementById("shareUrl");
  const qrCanvas = document.getElementById("qrCanvas");
  const qrFallbackImage = document.getElementById("qrFallbackImage");
  const copyBtn = document.getElementById("copyBtn");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const nativeShareBtn = document.getElementById("nativeShareBtn");
  const shareStatus = document.getElementById("shareStatus");
  const shareSection = document.getElementById("share");
  const shareNavLink = document.getElementById("shareNavLink");

  let isAdminMode = false;
  let soundcloudWidget = null;
  let soundcloudWidgetReady = false;
  let usingQrFallbackImage = false;
  let lastQrFallbackUrl = "";

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

  function showStatus(message, isError = false) {
    if (!shareStatus) {
      return;
    }
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

  const LZ_URI_SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

  function lzGetBaseValue(alphabet, character) {
    const idx = alphabet.indexOf(character);
    return idx < 0 ? 0 : idx;
  }

  function lzCompressToEncodedURIComponent(input) {
    if (input == null) {
      return "";
    }
    return lzCompress(input, 6, (value) => LZ_URI_SAFE_ALPHABET.charAt(value));
  }

  function lzDecompressFromEncodedURIComponent(input) {
    if (input == null) {
      return "";
    }
    if (input === "") {
      return null;
    }
    const safeInput = input.replace(/ /g, "+");
    return lzDecompress(safeInput.length, 32, (index) => lzGetBaseValue(LZ_URI_SAFE_ALPHABET, safeInput.charAt(index)));
  }

  function lzCompress(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) {
      return "";
    }

    const dictionary = Object.create(null);
    const dictionaryToCreate = Object.create(null);
    let c = "";
    let wc = "";
    let w = "";
    let enlargeIn = 2;
    let dictSize = 3;
    let numBits = 2;
    const data = [];
    let dataVal = 0;
    let dataPosition = 0;

    const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

    const writeBit = (bit) => {
      dataVal = (dataVal << 1) | bit;
      if (dataPosition === bitsPerChar - 1) {
        dataPosition = 0;
        data.push(getCharFromInt(dataVal));
        dataVal = 0;
      } else {
        dataPosition += 1;
      }
    };

    const writeBits = (value, bitCount) => {
      let remaining = bitCount;
      let val = value;
      while (remaining > 0) {
        writeBit(val & 1);
        val >>= 1;
        remaining -= 1;
      }
    };

    for (let ii = 0; ii < uncompressed.length; ii += 1) {
      c = uncompressed.charAt(ii);
      if (!hasOwn(dictionary, c)) {
        dictionary[c] = dictSize;
        dictSize += 1;
        dictionaryToCreate[c] = true;
      }

      wc = w + c;
      if (hasOwn(dictionary, wc)) {
        w = wc;
      } else {
        if (hasOwn(dictionaryToCreate, w)) {
          if (w.charCodeAt(0) < 256) {
            writeBits(0, numBits);
            writeBits(w.charCodeAt(0), 8);
          } else {
            writeBits(1, numBits);
            writeBits(w.charCodeAt(0), 16);
          }

          enlargeIn -= 1;
          if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits += 1;
          }
          delete dictionaryToCreate[w];
        } else {
          writeBits(dictionary[w], numBits);
        }

        enlargeIn -= 1;
        if (enlargeIn === 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits += 1;
        }

        dictionary[wc] = dictSize;
        dictSize += 1;
        w = String(c);
      }
    }

    if (w !== "") {
      if (hasOwn(dictionaryToCreate, w)) {
        if (w.charCodeAt(0) < 256) {
          writeBits(0, numBits);
          writeBits(w.charCodeAt(0), 8);
        } else {
          writeBits(1, numBits);
          writeBits(w.charCodeAt(0), 16);
        }

        enlargeIn -= 1;
        if (enlargeIn === 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits += 1;
        }
        delete dictionaryToCreate[w];
      } else {
        writeBits(dictionary[w], numBits);
      }

      enlargeIn -= 1;
      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }
    }

    writeBits(2, numBits);

    while (true) {
      dataVal <<= 1;
      if (dataPosition === bitsPerChar - 1) {
        data.push(getCharFromInt(dataVal));
        break;
      } else {
        dataPosition += 1;
      }
    }

    return data.join("");
  }

  function lzDecompress(length, resetValue, getNextValue) {
    const dictionary = [];
    let next;
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = "";
    const result = [];
    let w;
    let bits;
    let c;
    const data = {
      val: getNextValue(0),
      position: resetValue,
      index: 1
    };

    for (let i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    const readBits = (bitCount) => {
      let bitsValue = 0;
      let maxpower = Math.pow(2, bitCount);
      let power = 1;
      while (power !== maxpower) {
        const resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index);
          data.index += 1;
        }
        bitsValue |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      return bitsValue;
    };

    next = readBits(2);
    switch (next) {
      case 0:
        c = String.fromCharCode(readBits(8));
        break;
      case 1:
        c = String.fromCharCode(readBits(16));
        break;
      case 2:
        return "";
      default:
        c = "";
        break;
    }

    dictionary[3] = c;
    w = c;
    result.push(c);

    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = readBits(numBits);

      if (bits === 0) {
        dictionary[dictSize] = String.fromCharCode(readBits(8));
        bits = dictSize;
        dictSize += 1;
        enlargeIn -= 1;
      } else if (bits === 1) {
        dictionary[dictSize] = String.fromCharCode(readBits(16));
        bits = dictSize;
        dictSize += 1;
        enlargeIn -= 1;
      } else if (bits === 2) {
        return result.join("");
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }

      if (dictionary[bits]) {
        entry = dictionary[bits];
      } else if (bits === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }

      result.push(entry);
      dictionary[dictSize] = w + entry.charAt(0);
      dictSize += 1;
      enlargeIn -= 1;
      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }
    }
  }

  function packSong(song) {
    return [
      safeText(song?.name, ""),
      safeText(song?.artist, ""),
      safeText(song?.scUrl ?? song?.src, "")
    ];
  }

  function packMemory(memory) {
    return [
      safeText(memory?.title, ""),
      safeText(memory?.caption, ""),
      safeText(memory?.image, "")
    ];
  }

  function serializeCfg(config) {
    const packed = {};

    if (typeof config?.heroSubtext === "string") {
      packed.h = config.heroSubtext;
    }

    if (Array.isArray(config?.letters)) {
      packed.l = config.letters.map((x) => safeText(x, ""));
    }

    if (Array.isArray(config?.songs)) {
      packed.s = config.songs.map((song) => packSong(song));
    }

    if (Number.isInteger(config?.activeSongIndex)) {
      packed.i = config.activeSongIndex;
    }

    if (Array.isArray(config?.memories)) {
      packed.m = config.memories.map((memory) => packMemory(memory));
    }

    return packed;
  }

  function deserializeCfg(raw) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const result = {};

    if (typeof raw.h === "string") {
      result.heroSubtext = raw.h;
    } else if (typeof raw.heroSubtext === "string") {
      result.heroSubtext = raw.heroSubtext;
    }

    if (Array.isArray(raw.l)) {
      result.letters = raw.l.map((x) => safeText(x, ""));
    } else if (Array.isArray(raw.letters)) {
      result.letters = raw.letters.map((x) => safeText(x, ""));
    }

    if (Array.isArray(raw.s)) {
      result.songs = raw.s.map((song) => normalizeSong({
        name: Array.isArray(song) ? song[0] : song?.name,
        artist: Array.isArray(song) ? song[1] : song?.artist,
        scUrl: Array.isArray(song) ? song[2] : (song?.scUrl ?? song?.src)
      }));
    } else if (Array.isArray(raw.songs)) {
      result.songs = raw.songs.map((song) => normalizeSong(song));
    }

    if (Number.isInteger(raw.i)) {
      result.activeSongIndex = raw.i;
    } else if (Number.isInteger(raw.activeSongIndex)) {
      result.activeSongIndex = raw.activeSongIndex;
    }

    if (Array.isArray(raw.m)) {
      result.memories = raw.m.map((memory) => ({
        title: safeText(Array.isArray(memory) ? memory[0] : memory?.title, "Memory"),
        caption: safeText(Array.isArray(memory) ? memory[1] : memory?.caption, ""),
        image: safeText(Array.isArray(memory) ? memory[2] : memory?.image, memoryFallbackImage)
      }));
    } else if (Array.isArray(raw.memories)) {
      result.memories = raw.memories.map((memory) => ({
        title: safeText(memory?.title, "Memory"),
        caption: safeText(memory?.caption, ""),
        image: safeText(memory?.image, memoryFallbackImage)
      }));
    }

    return result;
  }

  function encodeCfg(config) {
    try {
      const packed = serializeCfg(config);
      return lzCompressToEncodedURIComponent(JSON.stringify(packed));
    } catch (_error) {
      return "";
    }
  }

  function decodeCfg(raw) {
    if (!raw) {
      return null;
    }

    try {
      const lzText = lzDecompressFromEncodedURIComponent(raw);
      if (lzText) {
        const parsed = JSON.parse(lzText);
        return deserializeCfg(parsed);
      }
    } catch (_error) {
      // fall through to legacy decode
    }

    try {
      const legacyParsed = JSON.parse(base64UrlToUtf8(raw));
      return deserializeCfg(legacyParsed);
    } catch (_legacyError) {
      return null;
    }
  }

  function normalizeSoundcloudTarget(rawUrl) {
    const source = safeText(rawUrl, "");
    if (!source) {
      return "";
    }

    try {
      const url = new URL(source);
      if (url.hostname.includes("w.soundcloud.com") && url.pathname.includes("/player/")) {
        const inner = url.searchParams.get("url");
        return safeText(inner, source);
      }
    } catch (_error) {
      return source;
    }

    return source;
  }

  function toSoundcloudEmbedUrl(rawUrl, autoPlay = true) {
    const target = normalizeSoundcloudTarget(rawUrl);
    if (!target) {
      return "";
    }

    const encoded = encodeURIComponent(target);
    const autoPlayValue = autoPlay ? "true" : "false";
    return `https://w.soundcloud.com/player/?url=${encoded}&color=%23e53a78&auto_play=${autoPlayValue}&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  }

  function getSoundcloudLoadOptions(autoPlay = true) {
    return {
      auto_play: autoPlay,
      color: "#e53a78",
      show_comments: false,
      show_user: true,
      show_reposts: false,
      show_teaser: true,
      visual: true
    };
  }

  function playNextSong() {
    const songs = getSongItems();
    if (!songs.length) {
      return;
    }

    const currentIndex = Math.max(0, getActiveSongIndex());
    for (let step = 1; step <= songs.length; step += 1) {
      const nextIndex = (currentIndex + step) % songs.length;
      const candidate = songs[nextIndex];
      const entry = songEntryFromItem(candidate);
      if (!entry.scUrl) {
        continue;
      }
      setSong(candidate, { syncQr: isAdminMode, showMissing: false, autoPlay: true });
      showPlayerStatus("Daraa song auto togloj baina.");
      return;
    }

    showPlayerStatus("Auto-next hiih song link oldsongui.", true);
  }

  function bindSoundcloudWidgetEvents() {
    if (!soundcloudWidget || !window.SC || !window.SC.Widget) {
      return;
    }

    soundcloudWidget.bind(window.SC.Widget.Events.READY, () => {
      soundcloudWidgetReady = true;
    });

    soundcloudWidget.bind(window.SC.Widget.Events.PLAY, () => {
      showPlayerStatus("Playing.");
    });

    soundcloudWidget.bind(window.SC.Widget.Events.FINISH, () => {
      playNextSong();
    });

    soundcloudWidget.bind(window.SC.Widget.Events.ERROR, () => {
      showPlayerStatus("SoundCloud aldaa garlaa. Link-ee shalgana uu.", true);
    });
  }

  function initSoundcloudWidget() {
    if (!soundcloudEmbed) {
      return false;
    }

    if (!window.SC || !window.SC.Widget) {
      return false;
    }

    if (soundcloudWidget) {
      return true;
    }

    soundcloudWidget = window.SC.Widget(soundcloudEmbed);
    bindSoundcloudWidgetEvents();
    return true;
  }

  function setSoundcloudSource(source, options = {}) {
    const { autoPlay = true } = options;
    const normalized = normalizeSoundcloudTarget(source);
    if (!soundcloudEmbed) {
      return;
    }

    if (!normalized) {
      soundcloudEmbed.removeAttribute("src");
      soundcloudEmbed.setAttribute("data-source", "");
      showPlayerStatus("SoundCloud URL alga. Admin: Link tovchoor nemeerei.", true);
      return;
    }

    soundcloudEmbed.setAttribute("data-source", normalized);
    const embedUrl = toSoundcloudEmbedUrl(normalized, autoPlay);

    if (initSoundcloudWidget() && soundcloudWidget && soundcloudWidgetReady) {
      soundcloudWidget.load(normalized, getSoundcloudLoadOptions(autoPlay));
      return;
    }

    soundcloudEmbed.src = embedUrl;
    setTimeout(() => {
      initSoundcloudWidget();
    }, 350);
  }

  function songEntryFromItem(item, fallback = {}) {
    const nameNode = getSongNameNode(item);
    const visualName = nameNode ? nameNode.textContent : item.textContent;

    return {
      name: safeText(item.getAttribute("data-song") || visualName, fallback.name || "Untitled Song"),
      artist: safeText(item.getAttribute("data-artist"), fallback.artist || "Your Playlist"),
      scUrl: safeText(item.getAttribute("data-sc-url"), fallback.scUrl || "")
    };
  }

  function normalizeSong(raw, fallback = {}) {
    if (typeof raw === "string") {
      return {
        name: safeText(raw, fallback.name || "Untitled Song"),
        artist: safeText(fallback.artist, "Your Playlist"),
        scUrl: safeText(fallback.scUrl, "")
      };
    }

    if (raw && typeof raw === "object") {
      const urlCandidate = raw.scUrl ?? raw.src ?? "";
      return {
        name: safeText(raw.name, fallback.name || "Untitled Song"),
        artist: safeText(raw.artist, fallback.artist || "Your Playlist"),
        scUrl: safeText(urlCandidate, fallback.scUrl || "")
      };
    }

    return {
      name: safeText(fallback.name, "Untitled Song"),
      artist: safeText(fallback.artist, "Your Playlist"),
      scUrl: safeText(fallback.scUrl, "")
    };
  }

  function refreshSongVisual(item) {
    const url = safeText(item.getAttribute("data-sc-url"), "");
    if (url) {
      item.removeAttribute("data-empty-url");
    } else {
      item.setAttribute("data-empty-url", "1");
    }
  }

  function refreshActiveSongHeading() {
    const active = document.querySelector(".song-item.active");
    if (!active) {
      return;
    }

    const entry = songEntryFromItem(active);
    if (nowPlaying) {
      nowPlaying.textContent = entry.name;
    }
    if (nowArtist) {
      nowArtist.textContent = entry.artist;
    }
  }

  function setSongDataOnItem(item, song) {
    const normalized = normalizeSong(song);
    item.setAttribute("data-song", normalized.name);
    item.setAttribute("data-artist", normalized.artist);
    item.setAttribute("data-sc-url", normalized.scUrl);

    const nameNode = getSongNameNode(item);
    if (nameNode) {
      nameNode.textContent = normalized.name;
    }

    refreshSongVisual(item);
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

    let linkBtn = item.querySelector(".song-src-btn");
    if (!linkBtn) {
      linkBtn = document.createElement("button");
      linkBtn.type = "button";
      linkBtn.className = "song-src-btn";
      linkBtn.textContent = "Link";
      linkBtn.setAttribute("aria-label", "Edit SoundCloud link");
      item.appendChild(linkBtn);
    }

    if (item.dataset.songBound !== "1") {
      linkBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!isAdminMode) {
          return;
        }

        const current = safeText(item.getAttribute("data-sc-url"), "");
        const next = window.prompt("SoundCloud track or playlist URL", current);
        if (next === null) {
          return;
        }

        item.setAttribute("data-sc-url", safeText(next, ""));
        refreshSongVisual(item);

        if (item.classList.contains("active")) {
          setSong(item, { syncQr: false, showMissing: true });
        }

        refreshAdminQr();
      });

      item.dataset.songBound = "1";
    }

    refreshSongVisual(item);
  }

  function getActiveSongIndex() {
    const songs = getSongItems();
    return songs.findIndex((item) => item.classList.contains("active"));
  }

  function readDefaultContent() {
    return {
      heroSubtext: safeText(heroSubtext?.textContent, "Every love story is beautiful, but ours is my favorite."),
      letters: getLetterBlocks().map((p) => safeText(p.textContent, "")),
      songs: getSongItems().map((item) => songEntryFromItem(item)),
      activeSongIndex: Math.max(0, getActiveSongIndex()),
      memories: getMemoryCards().map((card) => ({
        title: safeText(card.getAttribute("data-title"), "Memory"),
        caption: safeText(card.getAttribute("data-caption"), ""),
        image: safeText(card.getAttribute("data-image"), memoryFallbackImage)
      }))
    };
  }

  getSongItems().forEach((item) => ensureSongMarkup(item));
  const defaultContent = readDefaultContent();

  function applyProfile(profile) {
    if (recipientHeading) {
      recipientHeading.textContent = profile.to;
    }
    if (recipientInline) {
      recipientInline.textContent = profile.to;
    }
    if (fromSignature) {
      fromSignature.textContent = profile.from;
    }

    if (customNote) {
      if (profile.note) {
        customNote.hidden = false;
        customNote.textContent = profile.note;
      } else {
        customNote.hidden = true;
        customNote.textContent = "";
      }
    }

    if (toInput) {
      toInput.value = profile.to === DEFAULT_PROFILE.to ? "" : profile.to;
    }
    if (fromInput) {
      fromInput.value = profile.from === DEFAULT_PROFILE.from ? "" : profile.from;
    }
    if (noteInput) {
      noteInput.value = profile.note;
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
        setSongDataOnItem(item, normalizeSong(cfg.songs[index], fallback));
      });
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

    if (Number.isInteger(cfg.activeSongIndex)) {
      const songs = getSongItems();
      const idx = Math.max(0, Math.min(songs.length - 1, cfg.activeSongIndex));
      songs.forEach((item, i) => {
        item.classList.toggle("active", i === idx);
      });
    }
  }

  function collectCfgFromDom() {
    return {
      heroSubtext: safeText(heroSubtext?.textContent, defaultContent.heroSubtext),
      letters: getLetterBlocks().map((p, index) => safeText(p.textContent, defaultContent.letters[index] || "")),
      songs: getSongItems().map((item, index) => songEntryFromItem(item, defaultContent.songs[index] || {})),
      activeSongIndex: Math.max(0, getActiveSongIndex()),
      memories: getMemoryCards().map((card, index) => ({
        title: safeText(card.getAttribute("data-title"), defaultContent.memories[index]?.title || "Memory"),
        caption: safeText(card.getAttribute("data-caption"), defaultContent.memories[index]?.caption || ""),
        image: safeText(card.getAttribute("data-image"), defaultContent.memories[index]?.image || memoryFallbackImage)
      }))
    };
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

    if (cfg.activeSongIndex !== defaultContent.activeSongIndex) {
      compact.activeSongIndex = cfg.activeSongIndex;
    }

    if (JSON.stringify(cfg.memories) !== JSON.stringify(defaultContent.memories)) {
      compact.memories = cfg.memories;
    }

    return compact;
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

  function setQrDisplayMode(useFallback) {
    if (qrCanvas) {
      qrCanvas.hidden = !!useFallback;
    }
    if (qrFallbackImage) {
      qrFallbackImage.hidden = !useFallback;
    }
  }

  function drawRoundedRect(ctx, x, y, size, radius) {
    const r = Math.max(0, Math.min(radius, size / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + size, y, x + size, y + size, r);
    ctx.arcTo(x + size, y + size, x, y + size, r);
    ctx.arcTo(x, y + size, x, y, r);
    ctx.arcTo(x, y, x + size, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function drawHeartPath(ctx, centerX, centerY, size) {
    const h = size;
    const w = size * 1.05;
    const topY = centerY - h * 0.18;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + h * 0.38);
    ctx.bezierCurveTo(centerX + w * 0.52, centerY + h * 0.04, centerX + w * 0.56, topY - h * 0.34, centerX, topY);
    ctx.bezierCurveTo(centerX - w * 0.56, topY - h * 0.34, centerX - w * 0.52, centerY + h * 0.04, centerX, centerY + h * 0.38);
    ctx.closePath();
  }

  function isStructuralQrModule(row, col, moduleCount) {
    const inTopLeftFinder = row <= 8 && col <= 8;
    const inTopRightFinder = row <= 8 && col >= moduleCount - 9;
    const inBottomLeftFinder = row >= moduleCount - 9 && col <= 8;
    const inTiming = row === 6 || col === 6;
    return inTopLeftFinder || inTopRightFinder || inBottomLeftFinder || inTiming;
  }

  function isHeartQrModule(row, col, moduleCount) {
    const nx = ((col + 0.5) / moduleCount) * 2 - 1;
    const ny = ((row + 0.5) / moduleCount) * 2 - 1;
    const y = ny * 1.24 + 0.1;
    const heartValue = Math.pow(nx * nx + y * y - 1, 3) - nx * nx * Math.pow(y, 3);
    return heartValue <= 0;
  }

  function renderHeartStyleQr(url) {
    if (!window.QRCode || typeof window.QRCode.create !== "function" || !qrCanvas) {
      return false;
    }

    let qrData;
    try {
      qrData = window.QRCode.create(url, { errorCorrectionLevel: "M" });
    } catch (_error) {
      return false;
    }

    const modules = qrData?.modules?.data;
    const moduleCount = qrData?.modules?.size || 0;
    if (!modules || !moduleCount) {
      return false;
    }

    const marginModules = 4;
    const targetSize = 360;
    const totalModules = moduleCount + marginModules * 2;
    const cellSize = Math.max(2, Math.floor(targetSize / totalModules));
    const canvasSize = cellSize * totalModules;

    qrCanvas.width = canvasSize;
    qrCanvas.height = canvasSize;

    const ctx = qrCanvas.getContext("2d");
    if (!ctx) {
      return false;
    }

    const qrAreaSize = moduleCount * cellSize;
    const qrOffset = marginModules * cellSize;
    const heartCenterX = qrOffset + qrAreaSize / 2;
    const heartCenterY = qrOffset + qrAreaSize / 2 + qrAreaSize * 0.03;
    const heartSize = qrAreaSize * 0.95;

    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = "#fff9fc";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    ctx.save();
    drawHeartPath(ctx, heartCenterX, heartCenterY, heartSize);
    ctx.fillStyle = "rgba(255, 190, 214, 0.28)";
    ctx.fill();
    ctx.restore();

    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        const index = row * moduleCount + col;
        if (!modules[index]) {
          continue;
        }

        const structural = isStructuralQrModule(row, col, moduleCount);
        const inHeart = isHeartQrModule(row, col, moduleCount);
        const scale = structural || inHeart ? 0.94 : 0.62;
        const size = cellSize * scale;
        const offset = (cellSize - size) / 2;
        const x = qrOffset + col * cellSize + offset;
        const y = qrOffset + row * cellSize + offset;

        ctx.fillStyle = "#cf1f60";

        if (structural || inHeart) {
          drawRoundedRect(ctx, x, y, size, Math.max(1, size * 0.24));
        } else {
          ctx.beginPath();
          ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.save();
    drawHeartPath(ctx, heartCenterX, heartCenterY, heartSize);
    ctx.lineWidth = Math.max(1, cellSize * 0.25);
    ctx.strokeStyle = "rgba(205, 36, 95, 0.26)";
    ctx.stroke();
    ctx.restore();

    return true;
  }

  function buildFallbackQrImageUrl(url) {
    const encoded = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&ecc=M&format=png&data=${encoded}`;
  }

  function showFallbackQr(url) {
    if (!qrFallbackImage) {
      return false;
    }

    lastQrFallbackUrl = buildFallbackQrImageUrl(url);
    qrFallbackImage.src = lastQrFallbackUrl;
    usingQrFallbackImage = true;
    setQrDisplayMode(true);
    return true;
  }

  function renderQr(url) {
    if (!shareUrl || !qrCanvas) {
      return;
    }

    shareUrl.value = url;

    if (!window.QRCode || !window.QRCode.toCanvas) {
      if (showFallbackQr(url)) {
        showStatus("QR fallback mode active. QR ready.");
      } else {
        showStatus("QR library failed to load. Refresh the page and try again.", true);
      }
      return;
    }

    if (renderHeartStyleQr(url)) {
      usingQrFallbackImage = false;
      lastQrFallbackUrl = "";
      setQrDisplayMode(false);
      showStatus("Heart style QR ready. Send this image.");
      return;
    }

    window.QRCode.toCanvas(
      qrCanvas,
      url,
      {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#c81f5e",
          light: "#fff9fc"
        }
      },
      (error) => {
        if (error) {
          if (showFallbackQr(url)) {
            showStatus("QR fallback mode active. QR ready.");
          } else {
            if (url.length > 2600) {
              showStatus("QR link mash urt bn. Text/Note/song link-ee bogino bolgoj daraad oroldooroi.", true);
            } else {
              showStatus("Could not generate QR. Refresh hiigeed dahin oroldooroi.", true);
            }
          }
          return;
        }
        usingQrFallbackImage = false;
        lastQrFallbackUrl = "";
        setQrDisplayMode(false);
        showStatus("Locked QR updated. Send this to recipient.");
      }
    );
  }

  function getCurrentProfileFromInputs() {
    return {
      to: safeText(toInput?.value, DEFAULT_PROFILE.to),
      from: safeText(fromInput?.value, DEFAULT_PROFILE.from),
      note: safeText(noteInput?.value, DEFAULT_PROFILE.note)
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
    const url = shareUrl?.value;
    if (!url) {
      showStatus("Generate a link first.", true);
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (shareUrl) {
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
    if (!shareUrl?.value) {
      showStatus("Generate a link first.", true);
      return;
    }

    let png = "";
    if (usingQrFallbackImage && lastQrFallbackUrl) {
      png = lastQrFallbackUrl;
    } else if (qrCanvas) {
      png = qrCanvas.toDataURL("image/png");
    }

    if (!png) {
      showStatus("QR not ready yet. Try again.", true);
      return;
    }

    const a = document.createElement("a");
    a.href = png;
    a.download = "love-qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showStatus("QR downloaded.");
  }

  async function nativeShare() {
    const url = shareUrl?.value;
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

  function setSong(item, options = {}) {
    const { syncQr = false, showMissing = true, autoPlay = true } = options;

    getSongItems().forEach((node) => node.classList.remove("active"));
    item.classList.add("active");

    const entry = songEntryFromItem(item);
    if (nowPlaying) {
      nowPlaying.textContent = entry.name;
    }
    if (nowArtist) {
      nowArtist.textContent = entry.artist;
    }

    if (!entry.scUrl) {
      if (showMissing) {
        showPlayerStatus("Song link alga. Admin mode дээр Link дарж SoundCloud URL оруул.", true);
      }
    } else {
      setSoundcloudSource(entry.scUrl, { autoPlay });
      showPlayerStatus("Song soligdloo.");
    }

    if (syncQr && isAdminMode) {
      refreshAdminQr();
    }
  }

  function setupSongUi() {
    const songs = getSongItems();
    songs.forEach((item, index) => {
      const fallback = defaultContent.songs[index] || songEntryFromItem(item);
      setSongDataOnItem(item, songEntryFromItem(item, fallback));
      ensureSongMarkup(item);
    });

    let active = document.querySelector(".song-item.active");
    if (!active && songs.length > 0) {
      active = songs[0];
      active.classList.add("active");
    }

    if (active) {
      setSong(active, { syncQr: false, showMissing: false, autoPlay: false });
    }
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
        refreshActiveSongHeading();
        refreshAdminQr();
      });
    });

    addMemoryEditButtons();

    [toInput, fromInput, noteInput].forEach((input) => {
      if (!input) {
        return;
      }
      input.addEventListener("input", () => refreshAdminQr());
    });

    showStatus("Admin mode active. Change buriin daraa QR auto shinechlэгдэнэ.");
    showPlayerStatus("Song ner deer darj solino. Link tovchoor SoundCloud URL solino.");
  }

  openLetterBtn?.addEventListener("click", () => {
    letterSection?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  closeModalBtn?.addEventListener("click", closeModal);
  memoryModal?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute("data-close-modal")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && memoryModal && !memoryModal.hidden) {
      closeModal();
    }
  });

  songList?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest(".song-src-btn")) {
      return;
    }

    const item = target.closest(".song-item");
    if (item) {
      setSong(item, { syncQr: isAdminMode, showMissing: true });
    }
  });

  shareForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshAdminQr();
  });

  copyBtn?.addEventListener("click", copyLink);
  downloadQrBtn?.addEventListener("click", downloadQr);
  nativeShareBtn?.addEventListener("click", nativeShare);

  const initialProfile = readParams();
  applyProfile(initialProfile);
  applyCfg(initialProfile.cfg);
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
  }

  setupReveal();
})();
