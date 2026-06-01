window.PermissionSlipConfig = {
  runtimeMode: "supabase",
  projectName: "Activity Permission Slips",
  pdfTemplateUrl: "assets/2026-trek-paperwork-packet.pdf",
  supabase: {
    url: "https://sfdqctljsozhnsokevgh.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZHFjdGxqc296aG5zb2tldmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODM5NjIsImV4cCI6MjA5NDg1OTk2Mn0.Qgtk3LRyjeRu2-IDUCPFIWrQEhw7_s9aV7ps5xP_h-w",
    submissionsBucket: "permission-slip-submissions",
    templatesBucket: "permission-slip-templates"
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
    ward: "",
    pdfTemplateUrl: "assets/2026-trek-paperwork-packet.pdf",
    defaultValues: {}
  }
};

