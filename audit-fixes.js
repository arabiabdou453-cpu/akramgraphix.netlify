(() => {
  "use strict";

  document.documentElement.classList.add("audit-initial-paint");

  const releaseInitialPaint = () => {
    document.documentElement.classList.remove("audit-initial-paint");
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

    images.forEach((image) => {
      if (!image.dataset.auditOriginalAlt) {
        const currentAlt = image.getAttribute("alt");
        const namedParent = image.closest("[data-framer-name]");
        const fallback = namedParent?.getAttribute("data-framer-name") || "Portfolio image";
        image.dataset.auditOriginalAlt = currentAlt === null ? fallback : currentAlt;
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
      const nearInitialViewport = visible && rect.bottom >= 0 && rect.top < window.innerHeight * 1.5;

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
    document.querySelectorAll("p, div, span").forEach((element) => {
      if (element.children.length > 0) return;
      const text = (element.textContent || "").trim();
      if (text.includes("Join 100+ professionals")) {
        element.textContent = text.replace("100+", "50+");
      }
      if (text.includes("Copyright 2025")) {
        element.textContent = text.replace("Copyright 2025", "Copyright 2026");
      }
    });
  };

  const normalizeSeo = () => {
    const projectSeo = {
      "avure-skincare.html": [
        "Avure Skincare | Complete Brand Partnership | Akram Marref",
        "A complete skincare brand partnership covering visual identity, premium art direction, packaging, and campaign design for Avure.",
      ],
      "formura-labs-full-branding.html": [
        "Formura Labs | Full Branding | Akram Marref",
        "Brand identity and visual system for Formura Labs, created to give an Algerian supplement company a modern and credible market presence.",
      ],
      "logofolio.html": [
        "LOGOFOLIO | Logos & Marks Collection | Akram Marref",
        "A curated collection of logo marks and identity explorations by Akram Marref, demonstrating clarity, versatility, and visual craft.",
      ],
      "perfumes-media-posts.html": [
        "Perfumes | Social Media Posts | Akram Marref",
        "A perfume social media poster series exploring product storytelling, atmosphere, typography, and premium visual art direction.",
      ],
      "timeplus.html": [
        "TimePlus | Logo & Visual Identity | Akram Marref",
        "Logo and visual identity design for TimePlus, creating a streamlined and trustworthy presence for a modern HR and payroll platform.",
      ],
    };
    const page = window.location.pathname.split("/").pop() || "index.html";
    const home = page === "" || page === "index.html";
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
    hideEmptyLoadMore();
    normalizeHeadings();
    normalizeCopy();
    normalizeSeo();
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
            mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0,
        );
        if (structureChanged) scheduleInit();
      });
      observer.observe(root, { childList: true, subtree: true });
    }, 1500);
  };

  if (document.readyState === "complete") {
    startAfterHydration();
  } else {
    window.addEventListener("load", startAfterHydration, { once: true });
  }
})();
