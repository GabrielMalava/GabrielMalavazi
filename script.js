const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

const TERMINAL_PHRASES = [
  "Desenvolvo aplicações web modernas e escaláveis.",
  "Transformo problemas em soluções eficientes.",
  "Apaixonado por tecnologia e inovação.",
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createHiddenSpan(className) {
  const span = document.createElement("span");
  span.className = className;
  span.setAttribute("aria-hidden", "true");
  return span;
}

function prepareTypingLine(line) {
  const label = document.createElement("span");
  label.className = "sr-only";
  label.textContent = line.textContent.replace(/\s+/g, " ").trim();

  const ghost = createHiddenSpan("typing-ghost");
  const output = createHiddenSpan("typing-output");
  ghost.append(...line.childNodes);
  ghost.childNodes.forEach((node) => output.append(node.cloneNode(true)));
  line.append(label, ghost, output);
  line.classList.add("typing-line");

  const segments = [];
  const walker = document.createTreeWalker(output, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    segments.push({
      node: walker.currentNode,
      text: walker.currentNode.data.replace(/\s+/g, " "),
    });
  }
  segments.forEach((segment) => {
    segment.node.data = "";
  });

  return { speed: Number(line.dataset.typingSpeed) || 50, segments };
}

async function typeSegments(segments, cursor, speed) {
  for (const segment of segments) {
    segment.node.after(cursor);
    for (const character of segment.text) {
      segment.node.data += character;
      if (character.trim()) await wait(speed + Math.random() * speed * 0.6);
    }
  }
}

async function loopTerminalPhrases(target, cursor) {
  target.after(cursor);

  for (let index = 0; ; index = (index + 1) % TERMINAL_PHRASES.length) {
    const characters = Array.from(TERMINAL_PHRASES[index]);

    cursor.classList.add("is-typing");
    for (let count = 1; count <= characters.length; count++) {
      target.textContent = characters.slice(0, count).join("");
      await wait(38 + Math.random() * 30);
    }
    cursor.classList.remove("is-typing");
    await wait(2400);

    cursor.classList.add("is-typing");
    for (let count = characters.length - 1; count >= 0; count--) {
      target.textContent = characters.slice(0, count).join("");
      await wait(18);
    }
    cursor.classList.remove("is-typing");
    await wait(450);
  }
}

async function initializeHeroTyping() {
  if (prefersReducedMotion) return;

  const terminalTarget = document.getElementById("typed-text");
  const lines = Array.from(
    document.querySelectorAll("[data-typing]"),
    prepareTypingLine
  );
  if (terminalTarget) terminalTarget.textContent = "";

  const cursor = createHiddenSpan("typing-cursor");
  lines[0]?.segments[0]?.node.after(cursor);
  await wait(500);

  for (const { speed, segments } of lines) {
    cursor.classList.add("is-typing");
    await typeSegments(segments, cursor, speed);
    cursor.classList.remove("is-typing");
    await wait(320);
  }

  if (terminalTarget) loopTerminalPhrases(terminalTarget, cursor);
}

function initializeNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelectorAll(".nav-links a");
  if (!header || !toggle) return;

  function updateHeaderState() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  function setMenuOpen(open) {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  }

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  toggle.addEventListener("click", () =>
    setMenuOpen(!header.classList.contains("nav-open"))
  );
  links.forEach((link) =>
    link.addEventListener("click", () => setMenuOpen(false))
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) =>
          link.classList.toggle(
            "is-active",
            link.getAttribute("href") === `#${entry.target.id}`
          )
        );
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  document
    .querySelectorAll("main section[id]")
    .forEach((section) => sectionObserver.observe(section));
}

function initializeReveal() {
  if (prefersReducedMotion) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  document
    .querySelectorAll(
      ".section-header, .about-grid, .timeline, .cert-grid, .project-card, .contact-card"
    )
    .forEach((element) => {
      element.classList.add("reveal");
      observer.observe(element);
    });
}

function initializeSkillsDoors() {
  const section = document.querySelector(".skills-section");
  if (!section || prefersReducedMotion) return;

  const scroller = section.querySelector(".skills-scroller");
  const pin = section.querySelector(".skills-pin");
  const grid = section.querySelector(".skills-grid");
  const cards = Array.from(grid.children);
  const steps = Array.from(section.querySelectorAll(".skills-step"));
  const counter = section.querySelector(".skills-counter-current");
  const lastIndex = cards.length - 1;
  if (lastIndex < 1) return;

  const SNAP_THRESHOLD = 0.2;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const smoothstep = (value) => value * value * (3 - 2 * value);

  let targetProgress = 0;
  let currentProgress = 0;
  let anchorIndex = 0;
  let activeIndex = -1;
  let frame = null;

  section.classList.add("skills-3d");
  section.style.setProperty("--skills-count", cards.length);

  function getScrollRange() {
    const start = scroller.getBoundingClientRect().top + window.scrollY;
    const distance = Math.max(scroller.offsetHeight - pin.offsetHeight, 1);
    return { start, distance };
  }

  function updateTargetProgress() {
    const { start, distance } = getScrollRange();
    targetProgress = clamp((window.scrollY - start) / distance, 0, 1);
    if (targetProgress === 0) anchorIndex = 0;
    if (targetProgress === 1) anchorIndex = lastIndex;
  }

  function render(progress) {
    const position = progress * lastIndex;
    const step = Math.min(Math.floor(position), lastIndex - 1);
    const doorProgress = smoothstep(clamp((position - step - 0.15) / 0.7, 0, 1));
    const eased = step + doorProgress;

    grid.style.setProperty("--turn", Math.sin(doorProgress * Math.PI).toFixed(4));
    section.style.setProperty("--progress", ((eased + 1) / cards.length).toFixed(4));

    cards.forEach((card, index) => {
      card.style.setProperty("--enter", clamp(eased - index + 1, 0, 1).toFixed(4));
      card.style.setProperty("--exit", clamp(eased - index, 0, 1).toFixed(4));
    });

    const nearestIndex = Math.round(eased);
    if (nearestIndex === activeIndex) return;

    activeIndex = nearestIndex;
    cards.forEach((card, index) =>
      card.classList.toggle("is-active", index === activeIndex)
    );
    steps.forEach((stepButton, index) =>
      stepButton.classList.toggle("is-active", index === activeIndex)
    );
    if (counter) counter.textContent = String(activeIndex + 1).padStart(2, "0");
  }

  function animate() {
    currentProgress += (targetProgress - currentProgress) * 0.12;
    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
      currentProgress = targetProgress;
    }
    render(currentProgress);
    frame =
      currentProgress === targetProgress ? null : requestAnimationFrame(animate);
  }

  function requestUpdate() {
    updateTargetProgress();
    if (frame === null) frame = requestAnimationFrame(animate);
  }

  function scrollToStep(index) {
    anchorIndex = index;
    const { start, distance } = getScrollRange();
    const top = start + (index / lastIndex) * distance;
    if (Math.abs(top - window.scrollY) < 2) return;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function snapToStep() {
    updateTargetProgress();
    if (targetProgress <= 0 || targetProgress >= 1) return;

    const position = targetProgress * lastIndex;
    const offset = position - anchorIndex;
    let destination = anchorIndex;
    if (offset > SNAP_THRESHOLD) destination = Math.ceil(position - SNAP_THRESHOLD);
    if (offset < -SNAP_THRESHOLD) destination = Math.floor(position + SNAP_THRESHOLD);

    scrollToStep(clamp(destination, 0, lastIndex));
  }

  const supportsScrollEnd = "onscrollend" in window;
  let snapTimer;

  window.addEventListener(
    "scroll",
    () => {
      requestUpdate();
      if (supportsScrollEnd) return;
      clearTimeout(snapTimer);
      snapTimer = setTimeout(snapToStep, 180);
    },
    { passive: true }
  );

  if (supportsScrollEnd) window.addEventListener("scrollend", snapToStep);
  window.addEventListener("resize", requestUpdate);
  steps.forEach((stepButton, index) =>
    stepButton.addEventListener("click", () => scrollToStep(index))
  );

  updateTargetProgress();
  currentProgress = targetProgress;
  render(currentProgress);
}

function initializeCarousels() {
  document.querySelectorAll(".project-carousel").forEach((carousel) => {
    const slides = carousel.querySelectorAll(".carousel-slide");
    const dots = carousel.querySelectorAll(".carousel-dot");
    const prevButton = carousel.querySelector(".carousel-button.prev");
    const nextButton = carousel.querySelector(".carousel-button.next");
    let currentSlide = 0;
    let autoplay;

    function showSlide(index) {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) =>
        slide.classList.toggle("active", slideIndex === currentSlide)
      );
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === currentSlide);
        dot.setAttribute("aria-current", String(dotIndex === currentSlide));
      });
    }

    function restartAutoplay() {
      clearInterval(autoplay);
      if (prefersReducedMotion) return;
      autoplay = setInterval(() => showSlide(currentSlide + 1), 5000);
    }

    prevButton?.addEventListener("click", () => {
      showSlide(currentSlide - 1);
      restartAutoplay();
    });

    nextButton?.addEventListener("click", () => {
      showSlide(currentSlide + 1);
      restartAutoplay();
    });

    dots.forEach((dot, index) =>
      dot.addEventListener("click", () => {
        showSlide(index);
        restartAutoplay();
      })
    );

    restartAutoplay();
  });
}

function initializeParticles() {
  if (typeof particlesJS !== "function") return;

  particlesJS("particles-js", {
    particles: {
      number: { value: 60, density: { enable: true, value_area: 900 } },
      color: { value: "#4cc417" },
      shape: { type: "circle" },
      opacity: { value: 0.35, random: true },
      size: { value: 2.5, random: true },
      line_linked: {
        enable: true,
        distance: 150,
        color: "#2e9100",
        opacity: 0.25,
        width: 1,
      },
      move: {
        enable: !prefersReducedMotion,
        speed: 1.2,
        direction: "none",
        random: false,
        straight: false,
        out_mode: "out",
        bounce: false,
      },
    },
    interactivity: {
      detect_on: "window",
      events: {
        onhover: { enable: true, mode: "grab" },
        onclick: { enable: false },
        resize: true,
      },
      modes: {
        grab: { distance: 160, line_linked: { opacity: 0.6 } },
      },
    },
    retina_detect: true,
  });
}

initializeParticles();
initializeNavigation();
initializeReveal();
initializeSkillsDoors();
initializeCarousels();
initializeHeroTyping();
