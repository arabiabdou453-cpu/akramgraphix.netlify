(() => {
  "use strict";

  document.documentElement.classList.add("audit-initial-paint");

  const releaseInitialPaint = () => {
    document.documentElement.classList.remove("audit-initial-paint");
  };

  const preserveProjectReturnPosition = () => {
    const storageKey = "audit-project-return-position";
    const phaseKey = `${storageKey}-phase`;
    const currentPathIsProject = () => window.location.pathname.startsWith("/projects/");
    const restorePosition = () => {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (raw === null) return;
        const saved = JSON.parse(raw);
        if (saved.pathname !== window.location.pathname || !Number.isFinite(saved.scrollY)) return;
        if (sessionStorage.getItem(phaseKey) !== "project") return;
        if (document.documentElement.dataset.auditScrollRestoreActive === "true") return;

        document.documentElement.dataset.auditScrollRestoreActive = "true";
        const finishRestore = () => {
          window.clearInterval(restoreInterval);
          delete document.documentElement.dataset.auditScrollRestoreActive;
          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(phaseKey);
        };
        const restoreInterval = window.setInterval(() => {
          window.scrollTo({ top: saved.scrollY, behavior: "auto" });
        }, 100);

        window.scrollTo({ top: saved.scrollY, behavior: "auto" });
        window.setTimeout(finishRestore, 6500);
        ["pointerdown", "touchstart", "wheel", "keydown"].forEach((eventName) => {
          window.addEventListener(eventName, finishRestore, { once: true, passive: true });
        });
      } catch (error) {
        // Storage can be unavailable in privacy-restricted browser contexts.
      }
    };

    if (document.documentElement.dataset.auditHistoryBound !== "true") {
      document.documentElement.dataset.auditHistoryBound = "true";
      window.addEventListener("popstate", () => {
        [0, 100, 300, 700].forEach((delay) => window.setTimeout(restorePosition, delay));
      });
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) restorePosition();
      });
    }

    if (currentPathIsProject()) {
      try {
        if (sessionStorage.getItem(storageKey) !== null) sessionStorage.setItem(phaseKey, "project");
      } catch (error) {
        // Storage can be unavailable in privacy-restricted browser contexts.
      }
    }

    if (document.documentElement.dataset.auditReturnMonitorBound !== "true") {
      document.documentElement.dataset.auditReturnMonitorBound = "true";
      window.setInterval(() => {
        try {
          const phase = sessionStorage.getItem(phaseKey);
          if (currentPathIsProject() && phase === "leaving") {
            sessionStorage.setItem(phaseKey, "project");
          } else if (!currentPathIsProject() && phase === "project") {
            restorePosition();
          }
        } catch (error) {
          // Storage can be unavailable in privacy-restricted browser contexts.
        }
      }, 250);
    }

    document.querySelectorAll("a[href]").forEach((link) => {
      if (link.dataset.auditScrollBound === "true") return;
      const url = new URL(link.href, window.location.href);
      const leavesHomeForProject = url.origin === window.location.origin &&
        window.location.pathname === "/" && url.pathname.startsWith("/projects/");
      if (!leavesHomeForProject) return;
      link.dataset.auditScrollBound = "true";
      link.addEventListener("click", () => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({
            pathname: window.location.pathname,
            scrollY: Math.round(window.scrollY),
          }));
          sessionStorage.setItem(phaseKey, "leaving");
        } catch (error) {
          // Storage can be unavailable in privacy-restricted browser contexts.
        }
      }, { passive: true });
    });

    try {
      restorePosition();
    } catch (error) {
      // Ignore unavailable navigation or session storage APIs.
    }
  };

  ["pointerdown", "touchstart", "keydown", "wheel"].forEach((eventName) => {
    window.addEventListener(eventName, releaseInitialPaint, { once: true, passive: true });
  });

  const socialLabels = [
    ["behance.net", "Behance"],
    ["instagram.com", "Instagram"],
    ["linkedin.com", "LinkedIn"],
  ];

  const labelForLink = (link) => {
    const href = link.getAttribute("href") || "";
    const name = link.getAttribute("data-framer-name") || "";
    const social = socialLabels.find(([domain]) => href.includes(domain));
    if (social) return social[1];
    if (href.includes("#hero")) return "Home";
    if (href.includes("#services")) return "Services";
    if (href.includes("#projects")) return "Projects";
    if (href.includes("#testimonials")) return "Testimonials";
    if (href.includes("#faq")) return "FAQ";
    if (name) return name;
    return null;
  };

  const addAccessibleNames = () => {
    document.querySelectorAll("a").forEach((link) => {
      const hasVisibleName = (link.textContent || "").trim().length > 0;
      if (!hasVisibleName && !link.getAttribute("aria-label")) {
        const label = labelForLink(link);
        if (label) link.setAttribute("aria-label", label);
      }
    });

    const fields = [...document.querySelectorAll("form input:not([type=hidden])")];
    const fieldNames = ["Name", "Email"];
    fields.slice(0, fieldNames.length).forEach((field, index) => {
      if (!field.getAttribute("aria-label")) {
        field.setAttribute("aria-label", fieldNames[index]);
      }
      field.setAttribute("autocomplete", index === 0 ? "name" : "email");
    });

    document.querySelectorAll('[aria-label="Guided Line Container"]').forEach((element) => {
      element.removeAttribute("aria-label");
      element.setAttribute("aria-hidden", "true");
    });

    document.querySelectorAll('[tabindex="0"][data-framer-name$=" - Close"],[tabindex="0"][data-framer-name$=" - Open"]').forEach((element) => {
      const question = element.querySelector("h3");
      if (!question) return;
      element.setAttribute("role", "button");
      element.setAttribute("aria-expanded", element.getAttribute("data-framer-name")?.endsWith(" - Open") ? "true" : "false");
      element.setAttribute("aria-label", (question.textContent || "Toggle FAQ answer").trim());
    });

    document.querySelectorAll('[data-framer-name][tabindex="0"]').forEach((element) => {
      if ((element.textContent || "").includes("Click to see my bio")) {
        element.removeAttribute("role");
        element.removeAttribute("aria-label");
        element.removeAttribute("tabindex");
      }
    });
  };

  const addSkipLink = () => {
    if (document.querySelector(".audit-skip-link")) return;
    const target = document.querySelector("main") || document.querySelector("#main");
    if (!target) return;
    if (!target.id) target.id = "main-content";
    const link = document.createElement("a");
    link.className = "audit-skip-link";
    link.href = `#${target.id}`;
    link.textContent = "Skip to main content";
    document.body.prepend(link);
  };

  const improveImages = () => {
    const images = [...document.images];
    let priorityImageAssigned = false;
    const projectLabels = {
      "avure-skincare": "Avure Skincare",
      "formura-labs-full-branding": "Formura Labs",
      "logofolio": "LOGOFOLIO",
      "perfumes-media-posts": "Perfumes",
      "timeplus": "TimePlus",
    };
    const pageSlug = window.location.pathname.includes("/projects/")
      ? (window.location.pathname.split("/").pop() || "").replace(/\.html$/u, "")
      : "";

    images.forEach((image) => {
      if (!image.dataset.auditOriginalAlt) {
        const currentAlt = image.getAttribute("alt");
        const namedParent = image.closest("[data-framer-name]");
        const fallback = namedParent?.getAttribute("data-framer-name") || "Portfolio image";
        image.dataset.auditOriginalAlt = currentAlt === null ? fallback : currentAlt;
      }

      const linkedProject = image.closest('a[href*="/projects/"]');
      const linkedSlug = linkedProject
        ? (new URL(linkedProject.href, window.location.href).pathname.split("/").pop() || "").replace(/\.html$/u, "")
        : "";
      const semanticProject = projectLabels[linkedSlug] || projectLabels[pageSlug] || "";
      const templateAlt = /^(Growly|Sienna|Portfolio project)\b/iu.test(image.dataset.auditOriginalAlt);
      if (semanticProject && templateAlt) {
        image.dataset.auditOriginalAlt = image.dataset.auditOriginalAlt.toLowerCase().includes("logo")
          ? `${semanticProject} logo`
          : `${semanticProject} project artwork`;
      }

      const decorative = image.dataset.auditOriginalAlt.toLowerCase().includes("background");
      const visible = image.getClientRects().length > 0;
      if (decorative || !visible) {
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.setAttribute("role", "presentation");
      } else {
        image.alt = image.dataset.auditOriginalAlt || "Portfolio image";
        image.removeAttribute("aria-hidden");
        image.removeAttribute("role");
      }

      image.decoding = "async";

      const rect = image.getBoundingClientRect();
      const intersectsViewportHorizontally = rect.right > 0 && rect.left < window.innerWidth;
      const nearInitialViewport = visible && intersectsViewportHorizontally &&
        rect.bottom >= 0 && rect.top < window.innerHeight * 1.5;

      if (nearInitialViewport) {
        image.loading = "eager";
        const isPrimaryProjectImage = image.alt === "LensRef Hero section";
        if (isPrimaryProjectImage || (!priorityImageAssigned && rect.width >= 250 && rect.height >= 180)) {
          image.setAttribute("fetchpriority", "high");
          priorityImageAssigned = true;
        } else {
          image.setAttribute("fetchpriority", "auto");
        }
      } else {
        image.loading = "lazy";
        image.setAttribute("fetchpriority", "low");
      }
    });
  };

  const ensureProjectImagesLoad = () => {
    if (!window.location.pathname.includes("/projects/")) return;

    const localProjectAssets = new Set(["logofolio", "perfumes-media-posts", "timeplus"]);
    const projectSlug = (window.location.pathname.split("/").pop() || "").replace(/\.html$/u, "");
    const projectLabels = {
      "logofolio": "LOGOFOLIO",
      "perfumes-media-posts": "Perfumes",
      "timeplus": "TimePlus",
    };
    const replaceKnownProjectImages = () => {
      if (!localProjectAssets.has(projectSlug)) return;
      const projectLabel = projectLabels[projectSlug];
      const artworkImages = [...document.images]
        .filter((image) => image.alt === `${projectLabel} project artwork`)
        .slice(0, 5);
      artworkImages.forEach((image, index) => {
        const localSource = new URL(
          `../images/${projectSlug}/${String(index + 1).padStart(2, "0")}.webp`,
          window.location.href,
        ).href;
        if (image.currentSrc === localSource || image.src === localSource) return;
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.src = localSource;
      });
    };

    replaceKnownProjectImages();

    const selectResponsiveSource = (image) => {
      const candidates = (image.getAttribute("srcset") || "")
        .split(",")
        .map((candidate) => {
          const match = candidate.trim().match(/^(.*)\s+(\d+)w$/u);
          return match ? { url: match[1], width: Number(match[2]) } : null;
        })
        .filter((candidate) => candidate !== null)
        .sort((first, second) => first.width - second.width);
      const requiredWidth = Math.max(
        320,
        Math.ceil(image.getBoundingClientRect().width * window.devicePixelRatio),
      );
      const candidate = candidates.find((item) => item.width >= requiredWidth) || candidates.at(-1);
      return candidate?.url || image.getAttribute("src") || "";
    };

    const forceSource = (image) => {
      if (image.currentSrc && image.naturalWidth > 0) return;
      const source = selectResponsiveSource(image);
      if (!source) return;
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = source;
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        window.setTimeout(() => forceSource(image), 100);
        observer.unobserve(image);
      });
    }, { rootMargin: "1200px 0px" });

    document.querySelectorAll("img").forEach((image) => {
      if (image.dataset.auditProjectImageBound === "true") return;
      image.dataset.auditProjectImageBound = "true";
      image.addEventListener("error", () => forceSource(image), { once: true });
      observer.observe(image);
    });
  };

  const hideEmptyLoadMore = () => {
    const button = [...document.querySelectorAll("button")].find(
      (candidate) => (candidate.textContent || "").trim() === "Load More",
    );
    if (!button) return;
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.classList.add("audit-hidden-load-more");
  };

  const normalizeHeadings = () => {
    const projectPage = window.location.pathname.includes("/projects/");
    if (projectPage && !document.querySelector(".audit-project-h1")) {
      const main = document.querySelector("main") || document.querySelector("#main");
      const visibleTitle = [...document.querySelectorAll("h5")].find(
        (heading) => heading.getClientRects().length > 0 && (heading.textContent || "").trim(),
      );
      if (main && visibleTitle) {
        const heading = document.createElement("h1");
        heading.className = "audit-project-h1";
        heading.textContent = (visibleTitle.textContent || "").trim();
        main.prepend(heading);
      }
    }

    document.querySelectorAll("h4").forEach((heading) => {
      if ((heading.textContent || "").trim().startsWith("Step N°")) {
        const replacement = document.createElement("h3");
        replacement.innerHTML = heading.innerHTML;
        [...heading.attributes].forEach((attribute) => {
          replacement.setAttribute(attribute.name, attribute.value);
        });
        heading.replaceWith(replacement);
      }
    });

    document.querySelectorAll("h5").forEach((heading) => {
      const replacement = document.createElement("h3");
      replacement.innerHTML = heading.innerHTML;
      [...heading.attributes].forEach((attribute) => {
        replacement.setAttribute(attribute.name, attribute.value);
      });
      heading.replaceWith(replacement);
    });
  };

  const normalizeCopy = () => {
    document.querySelectorAll("p, div, span, h1, h2, h3, h4, h5, h6").forEach((element) => {
      if (element.children.length > 0) return;
      const text = (element.textContent || "").trim();
      if (text.includes("Join 100+ professionals")) {
        element.textContent = text.replace("100+", "50+");
      }
      if (text.includes("Copyright 2025")) {
        element.textContent = text.replace("Copyright 2025", "Copyright 2026");
      }
      if (text === "Click to see my bio") {
        element.textContent = "View my work below";
      }
      if (text.includes("Formura Labs | Full Branding Copy")) {
        element.textContent = text.replace("Formura Labs | Full Branding Copy", "Formura Labs | Full Branding");
      }
    });
  };

  const normalizeSeo = () => {
    const projectSeo = {
      "avure-skincare": [
        "Avure Skincare | Complete Brand Partnership | Akram Marref",
        "A complete skincare brand partnership covering visual identity, premium art direction, packaging, and campaign design for Avure.",
      ],
      "formura-labs-full-branding": [
        "Formura Labs | Full Branding | Akram Marref",
        "Brand identity and visual system for Formura Labs, created to give an Algerian supplement company a modern and credible market presence.",
      ],
      "logofolio": [
        "LOGOFOLIO | Logos & Marks Collection | Akram Marref",
        "A curated collection of logo marks and identity explorations by Akram Marref, demonstrating clarity, versatility, and visual craft.",
      ],
      "perfumes-media-posts": [
        "Perfumes | Social Media Posts | Akram Marref",
        "A perfume social media poster series exploring product storytelling, atmosphere, typography, and premium visual art direction.",
      ],
      "timeplus": [
        "TimePlus | Logo & Visual Identity | Akram Marref",
        "Logo and visual identity design for TimePlus, creating a streamlined and trustworthy presence for a modern HR and payroll platform.",
      ],
    };
    const page = (window.location.pathname.split("/").pop() || "index").replace(/\.html$/u, "");
    const home = page === "" || page === "index";
    const [title, description] = home
      ? [
          "Art Director & Graphic Designer in Doha | Akram Marref",
          "Akram Wanisse Marref is a Doha-based art director and senior graphic designer creating brand identities, visual systems, websites, apps, and campaigns.",
        ]
      : projectSeo[page] || [document.title, ""];
    document.title = title;
    const values = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description],
    ];
    values.forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element && value) element.setAttribute("content", value);
    });
  };

  const init = () => {
    addAccessibleNames();
    addSkipLink();
    improveImages();
    ensureProjectImagesLoad();
    hideEmptyLoadMore();
    normalizeHeadings();
    normalizeCopy();
    normalizeSeo();
    preserveProjectReturnPosition();
  };

  let rerunTimer = null;

  const scheduleInit = () => {
    if (rerunTimer !== null) window.clearTimeout(rerunTimer);
    rerunTimer = window.setTimeout(() => {
      rerunTimer = null;
      init();
    }, 200);
  };

  const startAfterHydration = () => {
    window.setTimeout(() => {
      init();
      const root = document.querySelector("#main") || document.body;
      const observer = new MutationObserver((mutations) => {
        const structureChanged = mutations.some(
          (mutation) =>
            mutation.type === "attributes" ||
            mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0,
        );
        if (structureChanged) scheduleInit();
      });
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-framer-name"],
      });
      window.addEventListener("resize", scheduleInit, { passive: true });
      window.setTimeout(init, 3500);
    }, 1500);
  };

  if (document.readyState === "complete") {
    startAfterHydration();
  } else {
    window.addEventListener("load", startAfterHydration, { once: true });
  }
})();
