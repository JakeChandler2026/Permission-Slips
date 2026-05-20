window.PermissionSlipConfig = {
  runtimeMode: "demo-local",
  projectName: "Activity Permission Slips",
  pdfTemplateUrl: "assets/2026-trek-paperwork-packet.pdf",
  supabase: {
    url: "https://YOUR_PROJECT.supabase.co",
    anonKey: "YOUR_SUPABASE_ANON_KEY",
    submissionsBucket: "permission-slip-submissions"
  },
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
