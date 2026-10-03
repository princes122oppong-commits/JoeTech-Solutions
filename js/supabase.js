(function () {
  const fallbackConfig = {
    url: "https://oupjuvwtapvdmudkajhq.supabase.co",
    key: "sb_publishable_PrD-U7hwoxGPkFqLA-6bjA_M5VkVZqR"
  };

  window.SUPABASE_CONFIG = window.SUPABASE_CONFIG || fallbackConfig;

  const portfolioDefaults = window.PortfolioDefaults || {};
  const sampleProjects = portfolioDefaults.projects || [];

  function isConfigured() {
    const { url, key } = window.SUPABASE_CONFIG || {};
    return Boolean(
      url &&
      key &&
      url !== "https://your-project.supabase.co" &&
      key !== "your-anon-key"
    );
  }

  function getClient() {
    if (!window.supabase || !isConfigured()) {
      return null;
    }

    return window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.key);
  }

  const defaultSkills = portfolioDefaults.skills || [];
  const defaultTestimonials = portfolioDefaults.testimonials || [];

  function readLocalStorageList(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  async function getProjects() {
    const client = getClient();

    if (client) {
      const { data, error } = await client
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase project query failed:", error.message);
      } else if (data && data.length) {
        return data;
      }
    }

    const localProjects = readLocalStorageList("portfolio_projects");
    if (localProjects) {
      return localProjects;
    }

    return sampleProjects;
  }

  async function getSkills() {
    const client = getClient();

    if (client) {
      const { data, error } = await client
        .from("skills")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase skills query failed:", error.message);
      } else if (data && data.length) {
        return data;
      }
    }

    const localSkills = readLocalStorageList("portfolio_skills");
    if (localSkills) {
      return localSkills;
    }

    return defaultSkills;
  }

  const defaultServices = portfolioDefaults.services || [];

  function fixKnownServiceTypos(text) {
    if (text == null || text === "") {
      return text;
    }

    return String(text).replace(/\bbussines\b/gi, (match) => {
      if (match === match.toUpperCase()) {
        return "BUSINESS";
      }

      if (match[0] === match[0].toUpperCase()) {
        return "Business";
      }

      return "business";
    });
  }

  function normalizeServiceRecord(service) {
    if (!service) {
      return service;
    }

    return {
      ...service,
      title: fixKnownServiceTypos(service.title),
      description: fixKnownServiceTypos(service.description)
    };
  }

  function normalizeServiceList(services) {
    return (services || []).map(normalizeServiceRecord);
  }

  async function repairServiceTypos() {
    const client = getClient();

    if (client) {
      const { data, error } = await client
        .from("services")
        .select("*");

      if (error) {
        console.warn("Supabase service typo repair skipped:", error.message);
        return false;
      }

      let repaired = false;

      for (const service of data || []) {
        const normalized = normalizeServiceRecord(service);

        if (
          normalized.title !== service.title ||
          normalized.description !== service.description
        ) {
          await upsertRecord("services", normalized);
          repaired = true;
        }
      }

      return repaired;
    }

    const localServices = readLocalStorageList("portfolio_services");

    if (!localServices) {
      return false;
    }

    const normalized = normalizeServiceList(localServices);
    const changed = normalized.some(
      (service, index) =>
        service.title !== localServices[index].title ||
        service.description !== localServices[index].description
    );

    if (changed) {
      try {
        localStorage.setItem("portfolio_services", JSON.stringify(normalized));
      } catch (storageError) {
        console.warn("Local service typo repair failed:", storageError);
        return false;
      }
    }

    return changed;
  }

  async function getServices() {
    const client = getClient();

    if (client) {
      const { data, error } = await client
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase services query failed:", error.message);
      } else if (data && data.length) {
        return normalizeServiceList(data);
      }
    }

    const localServices = readLocalStorageList("portfolio_services");
    if (localServices) {
      return normalizeServiceList(localServices);
    }

    return defaultServices;
  }

  async function getTestimonials() {
    const client = getClient();

    if (client) {
      const { data, error } = await client
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase testimonials query failed:", error.message);
      } else if (data && data.length) {
        return data;
      }
    }

    const localTestimonials = readLocalStorageList("portfolio_testimonials");
    if (localTestimonials) {
      return localTestimonials;
    }

    return defaultTestimonials;
  }

  function readLocalContactMessages() {
    const stored = readLocalStorageList("portfolio_contact_messages");
    return stored || portfolioDefaults.sampleMessages || [];
  }

  async function getMessages() {
    const client = getClient();

    if (!client) {
      return readLocalContactMessages();
    }

    const { data, error } = await client
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase contact messages query failed:", error.message);
      return readLocalContactMessages();
    }

    if (data && data.length) {
      return data;
    }

    return readLocalContactMessages();
  }

  async function upsertRecord(table, record) {
    const client = getClient();

    if (!client) {
      return { success: true, simulated: true, data: record };
    }

    const payload = { ...record };
    const { data, error } = await client
      .from(table)
      .upsert([payload], { onConflict: "id" })
      .select();

    if (error) {
      throw error;
    }

    return { success: true, simulated: false, data: data && data[0] ? data[0] : payload };
  }

  async function deleteRecord(table, id) {
    const client = getClient();

    if (!client) {
      return { success: true, simulated: true };
    }

    const { error } = await client.from(table).delete().eq("id", id);

    if (error) {
      throw error;
    }

    return { success: true, simulated: false };
  }

  function saveContactMessageLocally({ name, email, subject, message }) {
    const payload = {
      id: Date.now(),
      name,
      email,
      subject: subject || "General enquiry",
      message,
      created_at: new Date().toISOString()
    };

    const existing = readLocalStorageList("portfolio_contact_messages") || [];
    localStorage.setItem("portfolio_contact_messages", JSON.stringify([payload, ...existing]));
    return payload;
  }

  async function submitContactMessage({ name, email, subject, message }) {
    const payload = {
      name,
      email,
      subject: subject || "General enquiry",
      message,
      created_at: new Date().toISOString()
    };

    const client = getClient();

    if (!client) {
      saveContactMessageLocally(payload);
      return { success: true, simulated: true, stored: "local" };
    }

    const { error } = await client.from("contact_messages").insert([payload]);

    if (error) {
      throw error;
    }

    return { success: true, simulated: false, stored: "supabase" };
  }

  window.PortfolioSupabase = {
    sampleProjects,
    isConfigured,
    getProjects,
    getSkills,
    getServices,
    repairServiceTypos,
    getTestimonials,
    getMessages,
    upsertRecord,
    deleteRecord,
    submitContactMessage,
    upsertProject: (project) => upsertRecord("projects", project),
    deleteProject: (id) => deleteRecord("projects", id),
    upsertSkill: (skill) => upsertRecord("skills", skill),
    deleteSkill: (id) => deleteRecord("skills", id),
    upsertService: (service) => upsertRecord("services", service),
    deleteService: (id) => deleteRecord("services", id),
    upsertTestimonial: (testimonial) => upsertRecord("testimonials", testimonial),
    deleteTestimonial: (id) => deleteRecord("testimonials", id),
    deleteMessage: (id) => deleteRecord("contact_messages", id)
  };
})();
