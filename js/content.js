/* ===== Public portfolio content — Supabase + admin localStorage ===== */

(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function getApi() {
    return window.PortfolioSupabase || null;
  }

  function resolveImageUrl(rawUrl, assetPrefix) {
    if (!rawUrl) {
      return `${assetPrefix}assets/images/project-placeholder.png`;
    }

    if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("/")) {
      return rawUrl;
    }

    if (rawUrl.startsWith("../") && !assetPrefix) {
      return rawUrl.replace(/^\.\.\//, "");
    }

    if (!rawUrl.startsWith("../") && assetPrefix && !rawUrl.startsWith(assetPrefix)) {
      return `${assetPrefix}${rawUrl.replace(/^\.\//, "")}`;
    }

    return rawUrl;
  }

  function getServiceIcon(title) {
    const label = String(title || "").toLowerCase();

    if (label.includes("web") || label.includes("development")) return "fa-laptop-code";
    if (label.includes("ui") || label.includes("ux") || label.includes("design")) return "fa-pencil-ruler";
    if (label.includes("api") || label.includes("integration")) return "fa-plug";
    if (label.includes("it") || label.includes("support")) return "fa-screwdriver-wrench";
    if (label.includes("database") || label.includes("backend")) return "fa-database";
    if (label.includes("mobile") || label.includes("responsive")) return "fa-mobile-alt";
    if (label.includes("commerce") || label.includes("e-commerce")) return "fa-shopping-cart";
    if (label.includes("deploy")) return "fa-rocket";
    if (label.includes("maintain")) return "fa-wrench";
    if (label.includes("javascript") || label.includes("js")) return "fa-bolt";
    if (label.includes("code")) return "fa-code";

    return "fa-briefcase";
  }

  function clampLevel(level) {
    const value = Number(level);
    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function renderProjectCard(project, assetPrefix) {
    const tags = (project.tags || [])
      .map((tag) => `<span>${escapeHtml(tag)}</span>`)
      .join("");

    const title = escapeHtml(project.title || "Project");
    const description = escapeHtml(project.description || "Project description coming soon.");
    const imageUrl = escapeAttr(resolveImageUrl(project.image_url, assetPrefix));
    const githubUrl = escapeAttr(project.github_url || "#");
    const liveUrl = escapeAttr(project.live_url || "#");

    return `
      <article class="project-card">
        <div class="project-img">
          <img src="${imageUrl}" alt="${title}" onerror="this.parentElement.textContent='📷 Project screenshot'">
        </div>
        <div class="project-body">
          <h3>${title}</h3>
          <p>${description}</p>
          <div class="tags">${tags}</div>
          <div class="project-links">
            <a href="${githubUrl}" class="btn btn-small" target="_blank" rel="noopener noreferrer"><i class="fab fa-github" aria-hidden="true"></i> Code</a>
            <a href="${liveUrl}" class="btn btn-small btn-outline" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt" aria-hidden="true"></i> Live</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderSkillItem(skill) {
    const level = clampLevel(skill.level);
    const name = escapeHtml(skill.name);

    return `
      <div class="skill">
        <div class="skill-head"><span>${name}</span><span>${level}%</span></div>
        <div class="progress-bar"><div style="--w:${level}%"></div></div>
      </div>
    `;
  }

  function renderRefServiceItem(service, servicesHref) {
    const title = escapeHtml(service.title);
    const description = escapeHtml(service.description);
    const icon = getServiceIcon(service.title);
    const href = escapeAttr(servicesHref);

    return `
      <a class="ref-service-item" href="${href}">
        <span class="ref-service-icon"><i class="fas ${icon}" aria-hidden="true"></i></span>
        <h3>${title}</h3>
        <p>${description}</p>
        <i class="fas fa-arrow-right ref-service-arrow" aria-hidden="true"></i>
      </a>
    `;
  }

  function renderCardServiceItem(service) {
    const title = escapeHtml(service.title);
    const description = escapeHtml(service.description);
    const icon = getServiceIcon(service.title);

    return `
      <div class="card">
        <i class="fas ${icon} card-icon"></i>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
    `;
  }

  function renderTestimonialItem(item) {
    const name = escapeHtml(item.name);
    const role = escapeHtml(item.role || "Client");
    const quote = escapeHtml(item.quote);

    return `
      <article class="ref-testimonial-item">
        <blockquote>“${quote}”</blockquote>
        <p class="ref-testimonial-meta"><strong>${name}</strong> · ${role}</p>
      </article>
    `;
  }

  function renderServiceStripItem(service) {
    const title = escapeHtml(service.title);
    const icon = getServiceIcon(service.title);

    return `<span><i class="fas ${icon}" aria-hidden="true"></i> ${title}</span>`;
  }

  async function loadProjectGrids() {
    const grids = document.querySelectorAll("[data-project-grid]");
    if (!grids.length) {
      return;
    }

    const api = getApi();
    if (!api || typeof api.getProjects !== "function") {
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Projects are temporarily unavailable.</p>';
      });
      return;
    }

    try {
      const projects = await api.getProjects();

      grids.forEach((grid) => {
        const assetPrefix = grid.getAttribute("data-asset-prefix") ?? "../";
        const limitAttr = grid.getAttribute("data-project-limit");
        const limit = limitAttr ? Number(limitAttr) : 0;
        const list = limit > 0 ? projects.slice(0, limit) : projects;

        if (!list.length) {
          grid.innerHTML = '<p class="loading-text">No projects yet.</p>';
          return;
        }

        grid.innerHTML = list.map((project) => renderProjectCard(project, assetPrefix)).join("");
      });
    } catch (error) {
      console.error("Failed to load projects:", error);
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Projects are temporarily unavailable.</p>';
      });
    }
  }

  async function loadSkillGrids() {
    const grids = document.querySelectorAll("[data-skill-grid]");
    if (!grids.length) {
      return;
    }

    const api = getApi();
    if (!api || typeof api.getSkills !== "function") {
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Skills are temporarily unavailable.</p>';
      });
      return;
    }

    try {
      const skills = await api.getSkills();

      grids.forEach((grid) => {
        if (!skills.length) {
          grid.innerHTML = '<p class="loading-text">No skills listed yet.</p>';
          return;
        }

        grid.innerHTML = skills.map(renderSkillItem).join("");
      });
    } catch (error) {
      console.error("Failed to load skills:", error);
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Skills are temporarily unavailable.</p>';
      });
    }
  }

  async function loadServiceGrids() {
    const grids = document.querySelectorAll("[data-service-grid]");
    if (!grids.length) {
      return;
    }

    const api = getApi();
    if (!api || typeof api.getServices !== "function") {
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Services are temporarily unavailable.</p>';
      });
      return;
    }

    try {
      const services = await api.getServices();

      grids.forEach((grid) => {
        const style = grid.getAttribute("data-service-style") || "card";
        const servicesHref = grid.getAttribute("data-services-link") || "pages/services.html";

        if (!services.length) {
          grid.innerHTML = '<p class="loading-text">No services listed yet.</p>';
          return;
        }

        if (style === "ref") {
          grid.innerHTML = services.map((service) => renderRefServiceItem(service, servicesHref)).join("");
        } else {
          grid.innerHTML = services.map(renderCardServiceItem).join("");
        }
      });
    } catch (error) {
      console.error("Failed to load services:", error);
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Services are temporarily unavailable.</p>';
      });
    }
  }

  async function loadServiceStrips() {
    const strips = document.querySelectorAll("[data-service-strip]");
    if (!strips.length) {
      return;
    }

    const api = getApi();
    if (!api || typeof api.getServices !== "function") {
      return;
    }

    try {
      const services = await api.getServices();

      strips.forEach((strip) => {
        const limitAttr = strip.getAttribute("data-service-strip-limit");
        const limit = limitAttr ? Number(limitAttr) : 5;
        const list = services.slice(0, Math.max(1, limit));

        if (!list.length) {
          strip.innerHTML = "";
          return;
        }

        strip.innerHTML = list.map(renderServiceStripItem).join("");
      });
    } catch (error) {
      console.error("Failed to load service strip:", error);
    }
  }

  async function loadTestimonialGrids() {
    const grids = document.querySelectorAll("[data-testimonial-grid]");
    if (!grids.length) {
      return;
    }

    const api = getApi();
    if (!api || typeof api.getTestimonials !== "function") {
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Testimonials are temporarily unavailable.</p>';
      });
      return;
    }

    try {
      const testimonials = await api.getTestimonials();

      grids.forEach((grid) => {
        const limitAttr = grid.getAttribute("data-testimonial-limit");
        const limit = limitAttr ? Number(limitAttr) : 0;
        const list = limit > 0 ? testimonials.slice(0, limit) : testimonials;

        if (!list.length) {
          grid.innerHTML = '<p class="loading-text">No testimonials yet.</p>';
          return;
        }

        grid.innerHTML = list.map(renderTestimonialItem).join("");
      });
    } catch (error) {
      console.error("Failed to load testimonials:", error);
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="loading-text">Testimonials are temporarily unavailable.</p>';
      });
    }
  }

  async function loadAll() {
    await Promise.all([
      loadProjectGrids(),
      loadSkillGrids(),
      loadServiceGrids(),
      loadServiceStrips(),
      loadTestimonialGrids()
    ]);

    document.dispatchEvent(new CustomEvent("portfolio:content-loaded"));
  }

  window.PortfolioContent = {
    loadAll,
    loadProjectGrids,
    loadSkillGrids,
    loadServiceGrids,
    loadServiceStrips,
    loadTestimonialGrids
  };

  window.PortfolioServices = {
    loadServiceGrids
  };
})();
