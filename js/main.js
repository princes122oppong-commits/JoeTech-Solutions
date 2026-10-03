/* ===== Joseph Portfolio — main.js ===== */

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyRevealAnimations() {
  const targets = document.querySelectorAll(
    ".card, .project-card, .timeline-item, .contact-item, .ref-testimonial-item, .ref-service-item"
  );

  if (prefersReducedMotion()) {
    targets.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => {
    if (el.dataset.revealBound === "true") {
      return;
    }

    el.dataset.revealBound = "true";
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}

function setMenuOpen(hamburger, navLinks, isOpen) {
  navLinks.classList.toggle("open", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";

  const icon = hamburger.querySelector("i");
  if (icon) {
    icon.classList.toggle("fa-bars", !isOpen);
    icon.classList.toggle("fa-xmark", isOpen);
  }
}

function initializePortfolio() {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  if (hamburger && navLinks) {
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.setAttribute("aria-controls", "navLinks");

    hamburger.addEventListener("click", () => {
      const isOpen = !navLinks.classList.contains("open");
      setMenuOpen(hamburger, navLinks, isOpen);
    });

    navLinks.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => setMenuOpen(hamburger, navLinks, false))
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navLinks.classList.contains("open")) {
        setMenuOpen(hamburger, navLinks, false);
        hamburger.focus();
      }
    });
  }

  if (window.PortfolioContent && typeof window.PortfolioContent.loadAll === "function") {
    window.PortfolioContent.loadAll();
  }

  document.addEventListener("portfolio:content-loaded", applyRevealAnimations);

  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const subject = form.subject.value.trim();
      const message = form.message.value.trim();

      if (!name || !email || !message) {
        if (status) {
          status.textContent = "Please fill in all fields.";
          status.style.color = "#ff7675";
        }
        return;
      }

      if (status) {
        status.textContent = "Sending...";
        status.style.color = "#00d2a0";
      }

      try {
        const supabaseClient = window.PortfolioSupabase;
        let result = { success: false };

        if (supabaseClient && typeof supabaseClient.submitContactMessage === "function") {
          result = await supabaseClient.submitContactMessage({ name, email, subject, message });
        }

        if (!result.success) {
          throw new Error("Message was not saved");
        }

        if (status) {
          status.textContent = result.stored === "local"
            ? "✅ Message saved. I'll get back to you soon."
            : "✅ Message sent! I'll get back to you soon.";
          status.style.color = "#00d2a0";
        }

        form.reset();
      } catch (error) {
        console.error("Contact form submission failed:", error);

        if (status) {
          status.textContent = "⚠️ Something went wrong. Please try again later.";
          status.style.color = "#ff7675";
        }
      }
    });
  }

  applyRevealAnimations();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePortfolio);
} else {
  initializePortfolio();
}
