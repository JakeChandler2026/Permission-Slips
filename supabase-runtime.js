(function attachPermissionSlipRuntime(globalScope) {
  const fallback = {
    runtimeMode: "demo-local",
    projectName: "Activity Permission Slips",
    pdfTemplateUrl: "assets/2026-trek-paperwork-packet.pdf",
    supabase: { url: "", anonKey: "", submissionsBucket: "permission-slip-submissions" },
    defaultActivity: {
      slug: "2026-trek",
      name: "2026 Trek",
      event: "2026 Trek",
      dates: "",
      description: "",
      stake: "",
      leaderName: "",
      leaderPhone: "",
      leaderEmail: "",
      ward: ""
    }
  };

  const config = { ...fallback, ...(globalScope.PermissionSlipConfig || {}) };
  config.supabase = { ...fallback.supabase, ...(config.supabase || {}) };
  config.defaultActivity = { ...fallback.defaultActivity, ...(config.defaultActivity || {}) };

  const hasRuntimeConfig = Boolean(config.supabase.url && config.supabase.anonKey);
  const hasSupabaseSdk = Boolean(globalScope.supabase?.createClient);
  const canBootSupabase = config.runtimeMode === "supabase" && hasRuntimeConfig && hasSupabaseSdk;

  function createClient() {
    if (!canBootSupabase) return null;
    return globalScope.supabase.createClient(config.supabase.url, config.supabase.anonKey);
  }

  globalScope.PermissionSlipRuntime = {
    config,
    runtimeMode: config.runtimeMode,
    canBootSupabase,
    createClient,
    statusMessage: canBootSupabase
      ? "Connected to Supabase."
      : config.runtimeMode === "supabase"
        ? "Supabase mode is selected, but the URL, anon key, or SDK is missing."
        : "Demo local mode. Data stays in this browser until Supabase is configured."
  };
})(window);
