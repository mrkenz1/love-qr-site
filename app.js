(() => {
  const openLetterBtn = document.getElementById("openLetterBtn");
  const letterSection = document.getElementById("letter");

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

  function safeText(value, fallback) {
    const v = (value || "").trim();
    return v.length ? v : fallback;
  }

  function readParams() {
    const params = new URLSearchParams(window.location.search);
    const to = safeText(params.get("to"), "My Love");
    const from = safeText(params.get("from"), "Your Forever");
    const note = safeText(params.get("note"), "");
    const lock = params.get("lock") === "1";
    const admin = params.get("admin") === "1";
    return { to, from, note, lock, admin };
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

    toInput.value = profile.to === "My Love" ? "" : profile.to;
    fromInput.value = profile.from === "Your Forever" ? "" : profile.from;
    noteInput.value = profile.note;
  }

  function buildPersonalUrl(to, from, note, options = {}) {
    const { lock = true, admin = false } = options;
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";

    if (to && to !== "My Love") {
      url.searchParams.set("to", to);
    }
    if (from && from !== "Your Forever") {
      url.searchParams.set("from", from);
    }
    if (note) {
      url.searchParams.set("note", note);
    }
    if (lock) {
      url.searchParams.set("lock", "1");
    }
    if (admin) {
      url.searchParams.set("admin", "1");
    }

    return url.toString();
  }

  function showStatus(message, isError = false) {
    shareStatus.textContent = message;
    shareStatus.style.color = isError ? "#9f103f" : "#c81f5e";
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
        showStatus("QR is ready. Send the image or link.");
      }
    );
  }

  function updateShareFromForm() {
    const to = safeText(toInput.value, "My Love");
    const from = safeText(fromInput.value, "Your Forever");
    const note = safeText(noteInput.value, "");

    const profile = { to, from, note };
    applyProfile(profile);

    const lockedUrl = buildPersonalUrl(to, from, note, { lock: true, admin: false });
    const previewUrl = buildPersonalUrl(to, from, note, { lock: false, admin: isAdminMode });
    renderQr(lockedUrl);
    window.history.replaceState(null, "", previewUrl);
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

  function ensureImageFallback(imgElement) {
    imgElement.addEventListener(
      "error",
      () => {
        if (imgElement.src.endsWith("memory-fallback.svg")) {
          return;
        }
        imgElement.src = memoryFallbackImage;
      },
      { once: true }
    );
  }

  function setRecipientView(isLockedView, adminView) {
    if (!isLockedView || adminView) {
      return;
    }
    if (shareSection) {
      shareSection.hidden = true;
    }
    if (shareNavLink) {
      shareNavLink.hidden = true;
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

  function setSong(element) {
    const song = element.getAttribute("data-song") || "Timeless Love Song";
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

  openLetterBtn.addEventListener("click", () => {
    letterSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll(".memory-card").forEach((card) => {
    const cardImage = card.querySelector("img");
    if (cardImage) {
      ensureImageFallback(cardImage);
    }

    card.addEventListener("click", () => {
      openModal(
        card.getAttribute("data-image") || "",
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
    updateShareFromForm();
  });

  copyBtn.addEventListener("click", copyLink);
  downloadQrBtn.addEventListener("click", downloadQr);
  nativeShareBtn.addEventListener("click", nativeShare);

  const initialProfile = readParams();
  isAdminMode = initialProfile.admin;

  applyProfile(initialProfile);
  setRecipientView(initialProfile.lock, initialProfile.admin);

  if (!initialProfile.lock || initialProfile.admin) {
    renderQr(buildPersonalUrl(initialProfile.to, initialProfile.from, initialProfile.note, { lock: true, admin: false }));
  }

  setupReveal();
})();
