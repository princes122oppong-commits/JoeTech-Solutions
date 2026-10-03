(function () {
  const storageKeys = {
    session: "portfolio_admin_session",
    projects: "portfolio_projects",
    skills: "portfolio_skills",
    services: "portfolio_services",
    testimonials: "portfolio_testimonials",
    messages: "portfolio_contact_messages"
  };

  const portfolioDefaults = window.PortfolioDefaults || {};
  const defaultProjects = portfolioDefaults.projects || [];
  const defaultSkills = portfolioDefaults.skills || [];
  const defaultServices = portfolioDefaults.services || [];
  const defaultTestimonials = portfolioDefaults.testimonials || [];
  const defaultMessages = portfolioDefaults.sampleMessages || [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getStorageValue(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function setStorageValue(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function showStatus(element, message, isError) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#ff7675" : "#00d2a0";
  }

  function normalizeTags(value) {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function isSupabaseReady() {
    const configured = typeof window.PortfolioSupabase?.isConfigured === "function"
      ? window.PortfolioSupabase.isConfigured()
      : Boolean(
          window.SUPABASE_CONFIG &&
          window.SUPABASE_CONFIG.url &&
          window.SUPABASE_CONFIG.key &&
          window.SUPABASE_CONFIG.url !== "https://your-project.supabase.co" &&
          window.SUPABASE_CONFIG.key !== "your-anon-key"
        );

    return Boolean(configured && window.supabase);
  }

  function getSupabaseAuthClient() {
    if (!isSupabaseReady()) {
      return null;
    }

    return window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
  }

  async function signInWithSupabase(email, password) {
    const client = getSupabaseAuthClient();

    if (!client) {
      throw new Error("Supabase is not configured");
    }

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }

    return data;
  }

  async function signOutFromSupabase() {
    const client = getSupabaseAuthClient();

    if (!client) {
      return;
    }

    try {
      await client.auth.signOut();
    } catch (error) {
      console.warn("Supabase sign out failed:", error);
    }
  }

  function isAdminSessionActive() {
    const session = localStorage.getItem(storageKeys.session);
    return Boolean(session);
  }

  function setAdminSession(email) {
    localStorage.setItem(storageKeys.session, JSON.stringify({ email, loggedInAt: new Date().toISOString() }));
  }

  function clearAdminSession() {
    localStorage.removeItem(storageKeys.session);
  }

  function handleLoginPage() {
    const loginForm = document.getElementById("adminLoginForm");
    const status = document.getElementById("adminStatus");
    const passwordInput = document.getElementById("adminPassword");
    const passwordToggle = document.getElementById("toggleAdminPassword");

    if (!loginForm) return;

    if (passwordInput && passwordToggle) {
      passwordToggle.addEventListener("click", () => {
        const showPassword = passwordInput.type === "password";
        passwordInput.type = showPassword ? "text" : "password";
        passwordToggle.setAttribute("aria-pressed", String(showPassword));
        passwordToggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
        passwordToggle.title = showPassword ? "Hide password" : "Show password";

        const icon = passwordToggle.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye", !showPassword);
          icon.classList.toggle("fa-eye-slash", showPassword);
        }
      });
    }

    if (!isSupabaseReady()) {
      showStatus(
        status,
        "Admin sign-in requires Supabase. Set js/supabase.js and create a user in Supabase Auth.",
        true
      );
    }

    if (isAdminSessionActive()) {
      window.location.href = "dashboard.html";
      return;
    }

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      if (!email || !password) {
        showStatus(status, "Please enter both email and password.", true);
        return;
      }

      if (!isSupabaseReady()) {
        showStatus(status, "Supabase is not configured. Admin login is unavailable.", true);
        return;
      }

      try {
        showStatus(status, "Signing in...", false);
        await signInWithSupabase(email, password);
        setAdminSession(email);
        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("Login failed:", error);
        showStatus(status, "Invalid email or password.", true);
      }
    });
  }

  function ensureDashboardAccess() {
    const path = window.location.pathname.toLowerCase();
    const isAdminPage = path.includes("/admin/") && !path.endsWith("login.html");

    if (isAdminPage && !isAdminSessionActive()) {
      window.location.href = "login.html";
      return false;
    }

    return true;
  }

  async function resolveStorageList(storageKey, fallback, getterName) {
    const supabaseApi = window.PortfolioSupabase;

    if (supabaseApi && typeof supabaseApi.isConfigured === "function" && supabaseApi.isConfigured()) {
      const getter = supabaseApi[getterName];
      if (typeof getter === "function") {
        try {
          return await getter();
        } catch (error) {
          console.warn(`Supabase ${getterName} load failed:`, error);
        }
      }
    }

    return getStorageValue(storageKey, fallback);
  }

  async function renderProjectList() {
    const container = document.getElementById("projectList");
    if (!container) return;

    const projects = await resolveStorageList(storageKeys.projects, defaultProjects, "getProjects");

    if (!projects.length) {
      container.innerHTML = '<div class="empty-state">No projects yet.</div>';
      return;
    }

    container.innerHTML = projects.map((project) => `
      <div class="admin-item">
        <div class="admin-item-main">
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
          <div class="chip-row">${(project.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-small" data-project-action="edit" data-project-id="${project.id}">Edit</button>
          <button class="btn btn-small btn-outline" data-project-action="delete" data-project-id="${project.id}">Delete</button>
        </div>
      </div>
    `).join("");
    bindProjectActions();
  }

  async function renderSkillList() {
    const container = document.getElementById("skillList");
    if (!container) return;

    const skills = await resolveStorageList(storageKeys.skills, defaultSkills, "getSkills");

    if (!skills.length) {
      container.innerHTML = '<div class="empty-state">No skills yet.</div>';
      return;
    }

    container.innerHTML = skills.map((skill) => `
      <div class="admin-item small-list-item">
        <div class="skill-meta">
          <strong>${escapeHtml(skill.name)}</strong>
          <span>${escapeHtml(skill.level)}%</span>
        </div>
        <div class="progress-bar"><div style="--w:${skill.level}%"></div></div>
        <div class="admin-item-actions compact-actions">
          <button class="btn btn-small" data-skill-action="edit" data-skill-id="${skill.id}">Edit</button>
          <button class="btn btn-small btn-outline" data-skill-action="delete" data-skill-id="${skill.id}">Delete</button>
        </div>
      </div>
    `).join("");
    bindSkillActions();
  }

  async function renderServiceList() {
    const container = document.getElementById("serviceList");
    if (!container) return;

    const services = await resolveStorageList(storageKeys.services, defaultServices, "getServices");

    if (!services.length) {
      container.innerHTML = '<div class="empty-state">No services yet.</div>';
      return;
    }

    container.innerHTML = services.map((service) => `
      <div class="admin-item">
        <div class="admin-item-main">
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-small" data-service-action="edit" data-service-id="${service.id}">Edit</button>
          <button class="btn btn-small btn-outline" data-service-action="delete" data-service-id="${service.id}">Delete</button>
        </div>
      </div>
    `).join("");
    bindServiceActions();
  }

  async function renderTestimonialList() {
    const container = document.getElementById("testimonialList");
    if (!container) return;

    const testimonials = await resolveStorageList(storageKeys.testimonials, defaultTestimonials, "getTestimonials");

    if (!testimonials.length) {
      container.innerHTML = '<div class="empty-state">No testimonials yet.</div>';
      return;
    }

    container.innerHTML = testimonials.map((item) => `
      <div class="admin-item">
        <div class="admin-item-main">
          <h3>${escapeHtml(item.name)}</h3>
          <p class="muted-text">${escapeHtml(item.role || "Client")}</p>
          <blockquote>“${escapeHtml(item.quote)}”</blockquote>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-small" data-testimonial-action="edit" data-testimonial-id="${item.id}">Edit</button>
          <button class="btn btn-small btn-outline" data-testimonial-action="delete" data-testimonial-id="${item.id}">Delete</button>
        </div>
      </div>
    `).join("");
    bindTestimonialActions();
  }

  async function renderMessagesList() {
    const container = document.getElementById("messageList");
    if (!container) return;

    const messages = await resolveStorageList(storageKeys.messages, defaultMessages, "getMessages");

    if (!messages.length) {
      container.innerHTML = '<div class="empty-state">No contact messages yet.</div>';
      return;
    }

    container.innerHTML = messages.map((message) => `
      <div class="admin-item message-item">
        <div class="admin-item-main">
          <h3>${escapeHtml(message.name)}</h3>
          <p><strong>${escapeHtml(message.email)}</strong> · ${escapeHtml(message.subject || "General enquiry")}</p>
          <p>${escapeHtml(message.message)}</p>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-small btn-outline" data-message-action="delete" data-message-id="${message.id}">Delete</button>
        </div>
      </div>
    `).join("");
    bindMessageActions();
  }

  async function loadAllDashboardContent() {
    await renderProjectList();
    await renderSkillList();
    await renderServiceList();
    await renderTestimonialList();
    await renderMessagesList();
  }

  async function renderAdminOverview() {
    const container = document.getElementById("adminOverviewGrid");
    if (!container) return;

    const [projects, skills, services, testimonials, messages] = await Promise.all([
      resolveStorageList(storageKeys.projects, defaultProjects, "getProjects"),
      resolveStorageList(storageKeys.skills, defaultSkills, "getSkills"),
      resolveStorageList(storageKeys.services, defaultServices, "getServices"),
      resolveStorageList(storageKeys.testimonials, defaultTestimonials, "getTestimonials"),
      resolveStorageList(storageKeys.messages, defaultMessages, "getMessages")
    ]);

    const sections = [
      { href: "projects.html", label: "Projects", count: projects.length, icon: "fa-folder-open" },
      { href: "skills.html", label: "Skills", count: skills.length, icon: "fa-code" },
      { href: "services.html", label: "Services", count: services.length, icon: "fa-briefcase" },
      { href: "testimonials.html", label: "Testimonials", count: testimonials.length, icon: "fa-quote-left" },
      { href: "messages.html", label: "Messages", count: messages.length, icon: "fa-envelope" }
    ];

    container.innerHTML = sections.map((section) => `
      <a class="admin-overview-card" href="${escapeHtml(section.href)}">
        <span class="admin-overview-icon"><i class="fa-solid ${escapeHtml(section.icon)}" aria-hidden="true"></i></span>
        <span class="admin-overview-count">${escapeHtml(section.count)}</span>
        <span class="admin-overview-label">${escapeHtml(section.label)}</span>
      </a>
    `).join("");
  }

  function confirmDeletion(type, name) {
    const itemName = name ? ` "${name}"` : "";
    return window.confirm(`Delete ${type}${itemName}? This cannot be undone.`);
  }

  function bindProjectActions() {
    document.querySelectorAll("[data-project-action]").forEach((button) => {
      const action = button.getAttribute("data-project-action");
      const id = Number(button.getAttribute("data-project-id"));

      button.addEventListener("click", async () => {
        const projects = await resolveStorageList(storageKeys.projects, defaultProjects, "getProjects");
        const project = projects.find((item) => item.id === id);

        if (action === "delete") {
          if (!confirmDeletion("project", project?.title)) return;

          if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
            await window.PortfolioSupabase.deleteProject(id);
          } else {
            const updated = projects.filter((item) => item.id !== id);
            setStorageValue(storageKeys.projects, updated);
          }
          await renderProjectList();
          return;
        }

        if (project) {
          document.getElementById("projectId").value = project.id;
          document.getElementById("projectTitle").value = project.title;
          document.getElementById("projectDescription").value = project.description;
          document.getElementById("projectTags").value = (project.tags || []).join(", ");
          document.getElementById("projectGithub").value = project.github_url || "";
          document.getElementById("projectLive").value = project.live_url || "";
          document.getElementById("cancelProjectEdit").classList.remove("hidden");
        }
      });
    });
  }

  function bindSkillActions() {
    document.querySelectorAll("[data-skill-action]").forEach((button) => {
      const action = button.getAttribute("data-skill-action");
      const id = Number(button.getAttribute("data-skill-id"));

      button.addEventListener("click", async () => {
        const skills = await resolveStorageList(storageKeys.skills, defaultSkills, "getSkills");
        const item = skills.find((skill) => skill.id === id);

        if (action === "delete") {
          if (!confirmDeletion("skill", item?.name)) return;

          if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
            await window.PortfolioSupabase.deleteSkill(id);
          } else {
            setStorageValue(storageKeys.skills, skills.filter((skill) => skill.id !== id));
          }
          await renderSkillList();
          return;
        }

        if (item) {
          document.getElementById("skillId").value = item.id;
          document.getElementById("skillName").value = item.name;
          document.getElementById("skillLevel").value = item.level;
          document.getElementById("cancelSkillEdit").classList.remove("hidden");
        }
      });
    });
  }

  function bindServiceActions() {
    document.querySelectorAll("[data-service-action]").forEach((button) => {
      const action = button.getAttribute("data-service-action");
      const id = Number(button.getAttribute("data-service-id"));

      button.addEventListener("click", async () => {
        const services = await resolveStorageList(storageKeys.services, defaultServices, "getServices");
        const item = services.find((service) => service.id === id);

        if (action === "delete") {
          if (!confirmDeletion("service", item?.title)) return;

          if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
            await window.PortfolioSupabase.deleteService(id);
          } else {
            setStorageValue(storageKeys.services, services.filter((service) => service.id !== id));
          }
          await renderServiceList();
          return;
        }

        if (item) {
          document.getElementById("serviceId").value = item.id;
          document.getElementById("serviceTitle").value = item.title;
          document.getElementById("serviceDescription").value = item.description;
          document.getElementById("cancelServiceEdit").classList.remove("hidden");
        }
      });
    });
  }

  function bindTestimonialActions() {
    document.querySelectorAll("[data-testimonial-action]").forEach((button) => {
      const action = button.getAttribute("data-testimonial-action");
      const id = Number(button.getAttribute("data-testimonial-id"));

      button.addEventListener("click", async () => {
        const items = await resolveStorageList(storageKeys.testimonials, defaultTestimonials, "getTestimonials");
        const item = items.find((entry) => entry.id === id);

        if (action === "delete") {
          if (!confirmDeletion("testimonial", item?.name)) return;

          if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
            await window.PortfolioSupabase.deleteTestimonial(id);
          } else {
            setStorageValue(storageKeys.testimonials, items.filter((entry) => entry.id !== id));
          }
          await renderTestimonialList();
          return;
        }

        if (item) {
          document.getElementById("testimonialId").value = item.id;
          document.getElementById("testimonialName").value = item.name;
          document.getElementById("testimonialRole").value = item.role || "";
          document.getElementById("testimonialQuote").value = item.quote || "";
          document.getElementById("cancelTestimonialEdit").classList.remove("hidden");
        }
      });
    });
  }

  function bindMessageActions() {
    document.querySelectorAll("[data-message-action]").forEach((button) => {
      const id = Number(button.getAttribute("data-message-id"));
      button.addEventListener("click", async () => {
        const messages = await resolveStorageList(storageKeys.messages, defaultMessages, "getMessages");
        const message = messages.find((item) => item.id === id);
        if (!confirmDeletion("contact message", message?.name || message?.email)) return;

        if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
          await window.PortfolioSupabase.deleteMessage(id);
        } else {
          setStorageValue(storageKeys.messages, messages.filter((message) => message.id !== id));
        }
        await renderMessagesList();
      });
    });
  }

  function bindAdminNavigation() {
    const menuToggle = document.querySelector(".admin-menu-toggle");
    const drawerClose = document.querySelector(".admin-drawer-close");
    const sidebar = document.getElementById("adminSidebar");
    const backdrop = document.getElementById("adminSidebarBackdrop");
    const adminContent = document.querySelector(".admin-content");
    const drawerModeQuery = window.matchMedia("(max-width: 860px)");

    const setSidebarOpen = (isOpen) => {
      if (menuToggle) {
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Close admin menu" : "Open admin menu");
        const icon = menuToggle.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-bars", !isOpen);
          icon.classList.toggle("fa-xmark", isOpen);
        }
      }

      if (sidebar) {
        sidebar.classList.toggle("open", isOpen);
        sidebar.inert = drawerModeQuery.matches && !isOpen;

        if (drawerModeQuery.matches && isOpen) {
          sidebar.setAttribute("role", "dialog");
          sidebar.setAttribute("aria-modal", "true");
          sidebar.removeAttribute("aria-hidden");
        } else if (drawerModeQuery.matches) {
          sidebar.setAttribute("aria-hidden", "true");
          sidebar.removeAttribute("role");
          sidebar.removeAttribute("aria-modal");
        } else {
          sidebar.removeAttribute("aria-hidden");
          sidebar.removeAttribute("role");
          sidebar.removeAttribute("aria-modal");
        }
      }
      if (adminContent) adminContent.inert = drawerModeQuery.matches && isOpen;
      if (backdrop) {
        backdrop.hidden = !isOpen;
        backdrop.classList.toggle("open", isOpen);
      }
      document.body.classList.toggle("admin-nav-open", isOpen);
    };

    setSidebarOpen(false);

    if (menuToggle && sidebar) {
      menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") !== "true";
        setSidebarOpen(isOpen);
        if (isOpen) drawerClose?.focus();
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", () => {
        setSidebarOpen(false);
        menuToggle?.focus();
      });
    }

    if (drawerClose) {
      drawerClose.addEventListener("click", () => {
        setSidebarOpen(false);
        menuToggle?.focus();
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar?.classList.contains("open")) {
        setSidebarOpen(false);
        menuToggle?.focus();
        return;
      }

      if (event.key !== "Tab" || !drawerModeQuery.matches || !sidebar?.classList.contains("open")) {
        return;
      }

      const focusable = Array.from(sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first) {
        event.preventDefault();
        drawerClose?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });

    const handleNavBreakpoint = () => {
      const focusWasInSidebar = sidebar?.contains(document.activeElement);
      setSidebarOpen(false);

      if (!focusWasInSidebar) return;
      if (drawerModeQuery.matches) {
        menuToggle?.focus();
      } else {
        sidebar?.querySelector('a[aria-current="page"]')?.focus();
      }
    };

    if (typeof drawerModeQuery.addEventListener === "function") {
      drawerModeQuery.addEventListener("change", handleNavBreakpoint);
    } else if (typeof drawerModeQuery.addListener === "function") {
      drawerModeQuery.addListener(handleNavBreakpoint);
    }
  }

  function bindDashboardForms() {
    const projectForm = document.getElementById("projectForm");
    if (projectForm) {
      projectForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = Number(document.getElementById("projectId").value || Date.now());
        const project = {
          id,
          title: document.getElementById("projectTitle").value.trim(),
          description: document.getElementById("projectDescription").value.trim(),
          tags: normalizeTags(document.getElementById("projectTags").value),
          github_url: document.getElementById("projectGithub").value.trim(),
          live_url: document.getElementById("projectLive").value.trim(),
          image_url: "../assets/images/oppong-joseph-hero.png"
        };

        if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
          await window.PortfolioSupabase.upsertProject(project);
        } else {
          const projects = getStorageValue(storageKeys.projects, defaultProjects);
          const isUpdate = projects.some((item) => item.id === id);
          const updated = isUpdate ? projects.map((item) => (item.id === id ? project : item)) : [project, ...projects];
          setStorageValue(storageKeys.projects, updated);
        }

        projectForm.reset();
        document.getElementById("projectId").value = "";
        document.getElementById("cancelProjectEdit").classList.add("hidden");
        await renderProjectList();
      });
    }

    const skillForm = document.getElementById("skillForm");
    if (skillForm) {
      skillForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = Number(document.getElementById("skillId").value || Date.now());
        const skill = {
          id,
          name: document.getElementById("skillName").value.trim(),
          level: Number(document.getElementById("skillLevel").value)
        };

        if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
          await window.PortfolioSupabase.upsertSkill(skill);
        } else {
          const skills = getStorageValue(storageKeys.skills, defaultSkills);
          const updated = skills.some((item) => item.id === id)
            ? skills.map((item) => (item.id === id ? skill : item))
            : [skill, ...skills];
          setStorageValue(storageKeys.skills, updated);
        }

        skillForm.reset();
        document.getElementById("skillId").value = "";
        document.getElementById("cancelSkillEdit").classList.add("hidden");
        await renderSkillList();
      });
    }

    const serviceForm = document.getElementById("serviceForm");
    if (serviceForm) {
      serviceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = Number(document.getElementById("serviceId").value || Date.now());
        const service = {
          id,
          title: document.getElementById("serviceTitle").value.trim(),
          description: document.getElementById("serviceDescription").value.trim()
        };

        if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
          await window.PortfolioSupabase.upsertService(service);
        } else {
          const services = getStorageValue(storageKeys.services, defaultServices);
          const updated = services.some((item) => item.id === id)
            ? services.map((item) => (item.id === id ? service : item))
            : [service, ...services];
          setStorageValue(storageKeys.services, updated);
        }

        serviceForm.reset();
        document.getElementById("serviceId").value = "";
        document.getElementById("cancelServiceEdit").classList.add("hidden");
        await renderServiceList();
      });
    }

    const testimonialForm = document.getElementById("testimonialForm");
    if (testimonialForm) {
      testimonialForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = Number(document.getElementById("testimonialId").value || Date.now());
        const testimonial = {
          id,
          name: document.getElementById("testimonialName").value.trim(),
          role: document.getElementById("testimonialRole").value.trim(),
          quote: document.getElementById("testimonialQuote").value.trim()
        };

        if (window.PortfolioSupabase && typeof window.PortfolioSupabase.isConfigured === "function" && window.PortfolioSupabase.isConfigured()) {
          await window.PortfolioSupabase.upsertTestimonial(testimonial);
        } else {
          const testimonials = getStorageValue(storageKeys.testimonials, defaultTestimonials);
          const updated = testimonials.some((item) => item.id === id)
            ? testimonials.map((item) => (item.id === id ? testimonial : item))
            : [testimonial, ...testimonials];
          setStorageValue(storageKeys.testimonials, updated);
        }

        testimonialForm.reset();
        document.getElementById("testimonialId").value = "";
        document.getElementById("cancelTestimonialEdit").classList.add("hidden");
        await renderTestimonialList();
      });
    }

    document.getElementById("cancelProjectEdit")?.addEventListener("click", () => {
      document.getElementById("projectForm").reset();
      document.getElementById("projectId").value = "";
      document.getElementById("cancelProjectEdit").classList.add("hidden");
    });

    document.getElementById("cancelSkillEdit")?.addEventListener("click", () => {
      document.getElementById("skillForm").reset();
      document.getElementById("skillId").value = "";
      document.getElementById("cancelSkillEdit").classList.add("hidden");
    });

    document.getElementById("cancelServiceEdit")?.addEventListener("click", () => {
      document.getElementById("serviceForm").reset();
      document.getElementById("serviceId").value = "";
      document.getElementById("cancelServiceEdit").classList.add("hidden");
    });

    document.getElementById("cancelTestimonialEdit")?.addEventListener("click", () => {
      document.getElementById("testimonialForm").reset();
      document.getElementById("testimonialId").value = "";
      document.getElementById("cancelTestimonialEdit").classList.add("hidden");
    });

    document.querySelectorAll(".js-admin-logout").forEach((logoutBtn) => {
      logoutBtn.addEventListener("click", async () => {
        await signOutFromSupabase();
        clearAdminSession();
        window.location.href = "login.html";
      });
    });

  }

  async function repairKnownServiceTypos() {
    const repair = window.PortfolioSupabase?.repairServiceTypos;

    if (typeof repair !== "function") {
      return;
    }

    try {
      await repair();
    } catch (error) {
      console.warn("Service typo repair failed:", error);
    }
  }

  async function initializeDashboard() {
    if (!ensureDashboardAccess()) return;
    bindAdminNavigation();
    await repairKnownServiceTypos();

    if (document.getElementById("adminOverviewGrid")) {
      await renderAdminOverview();
    } else {
      await loadAllDashboardContent();
    }

    bindDashboardForms();
  }

  function initializePage() {
    if (window.location.pathname.includes("login.html")) {
      handleLoginPage();
      return;
    }

    if (window.location.pathname.toLowerCase().includes("/admin/")
      && !window.location.pathname.toLowerCase().endsWith("login.html")) {
      initializeDashboard();
    }
  }

  document.addEventListener("DOMContentLoaded", initializePage);
})();
