import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Download,
  Droplets,
  Edit3,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];
type Color = Database["public"]["Tables"]["colors"]["Row"];
type Bleach = Database["public"]["Tables"]["bleach_materials"]["Row"];
type Treatment = Database["public"]["Tables"]["treatments"]["Row"];
type SmsTemplate = Database["public"]["Tables"]["sms_templates"]["Row"];
type TreatmentType = Database["public"]["Enums"]["treatment_type"];
type HairLength = Database["public"]["Enums"]["hair_length"];

type TreatmentWithClient = Treatment & { client?: Client };

const treatmentLabels: Record<TreatmentType, string> = {
  men_haircut: "Men haircut",
  women_haircut: "Women haircut",
  children_haircut: "Children haircut",
  fringe_bangs: "Fringe / bangs · מסגרת / פוני",
  highlights: "Highlights",
  men_coloring: "Men coloring",
  women_coloring: "Women coloring",
};

const treatmentOptions = Object.entries(treatmentLabels) as [TreatmentType, string][];

const clientSchema = z.object({
  full_name: z.string().trim().min(1, "Client name is required").max(160),
  phone: z.string().trim().min(3, "Phone number is required").max(40),
  email: z.string().trim().email("Add a valid email").max(255).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
});

const materialSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  code: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(120).optional(),
  strength: z.string().trim().max(80).optional(),
});

const treatmentSchema = z.object({
  client_id: z.string().uuid(),
  occurred_at: z.string().min(1),
  treatment_type: z.enum([
    "men_haircut",
    "women_haircut",
    "children_haircut",
    "fringe_bangs",
    "highlights",
    "men_coloring",
    "women_coloring",
  ]),
  hair_length: z.enum(["short", "long"]).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional(),
  price: z.string().optional(),
});

const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1000),
});

const toDateInput = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );

const csvEscape = (value: string | number | null | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const Index = () => {
  const [sessionReady, setSessionReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [bleaches, setBleaches] = useState<Bleach[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isClientOpen, setClientOpen] = useState(false);
  const [isTreatmentOpen, setTreatmentOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const selectedHistory = useMemo(
    () => treatments.filter((treatment) => treatment.client_id === selectedClient?.id),
    [selectedClient?.id, treatments],
  );

  const latestTreatments: TreatmentWithClient[] = useMemo(
    () => treatments.slice(0, 4).map((treatment) => ({ ...treatment, client: clients.find((client) => client.id === treatment.client_id) })),
    [clients, treatments],
  );

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (client) => client.full_name.toLowerCase().includes(term) || client.phone.toLowerCase().includes(term),
    );
  }, [clients, query]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email ?? null);
      setSessionReady(true);
      if (data.session) void loadData();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      if (session) void loadData();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedClientId && clients.length) setSelectedClientId(clients[0].id);
  }, [clients, selectedClientId]);

  const loadData = async () => {
    setLoading(true);
    const [clientResult, colorResult, bleachResult, treatmentResult, templateResult] = await Promise.all([
      supabase.from("clients").select("*").order("updated_at", { ascending: false }),
      supabase.from("colors").select("*").order("name"),
      supabase.from("bleach_materials").select("*").order("name"),
      supabase.from("treatments").select("*").order("occurred_at", { ascending: false }),
      supabase.from("sms_templates").select("*").order("name"),
    ]);

    const error = clientResult.error ?? colorResult.error ?? bleachResult.error ?? treatmentResult.error ?? templateResult.error;
    if (error) toast.error(error.message);
    setClients(clientResult.data ?? []);
    setColors(colorResult.data ?? []);
    setBleaches(bleachResult.data ?? []);
    setTreatments(treatmentResult.data ?? []);
    setTemplates(templateResult.data ?? []);
    setLoading(false);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const action = authMode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await action({ email: authEmail, password: authPassword });
    if (error) return toast.error(error.message);
    toast.success(authMode === "signin" ? "Welcome back" : "Check your email to confirm your account");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message);
  };

  const saveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = clientSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check client details");

    const payload = {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    };
    const request = editingClient
      ? supabase.from("clients").update(payload).eq("id", editingClient.id)
      : supabase.from("clients").insert(payload).select("id").single();
    const { data, error } = await request;
    if (error) return toast.error(error.message);
    toast.success(editingClient ? "Client updated" : "Client added");
    setClientOpen(false);
    setEditingClient(null);
    await loadData();
    if (!editingClient && data && "id" in data) setSelectedClientId(data.id);
  };

  const deleteClient = async (client: Client) => {
    const { error } = await supabase.from("clients").delete().eq("id", client.id);
    if (error) return toast.error(error.message);
    toast.success("Client deleted");
    setSelectedClientId(null);
    await loadData();
  };

  const saveTreatment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = treatmentSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check treatment details");
    const priceValue = parsed.data.price ? Number(parsed.data.price) : null;
    const { error } = await supabase.from("treatments").insert({
      client_id: parsed.data.client_id,
      occurred_at: new Date(parsed.data.occurred_at).toISOString(),
      treatment_type: parsed.data.treatment_type,
      hair_length: (parsed.data.hair_length || null) as HairLength | null,
      notes: parsed.data.notes || null,
      color_ids: selectedColorIds,
      bleach_material_id: String(form.get("bleach_material_id") || "") || null,
      price: Number.isFinite(priceValue) ? priceValue : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Treatment saved to history");
    setTreatmentOpen(false);
    setSelectedColorIds([]);
    await loadData();
  };

  const deleteTreatment = async (id: string) => {
    const { error } = await supabase.from("treatments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Treatment removed");
    await loadData();
  };

  const saveColor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = materialSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success || !parsed.data.code) return toast.error("Add color name and code");
    const { error } = await supabase.from("colors").insert({
      name: parsed.data.name,
      code: parsed.data.code,
      brand: parsed.data.brand || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Color added");
    event.currentTarget.reset();
    await loadData();
  };

  const saveBleach = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = materialSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) return toast.error("Add bleach details");
    const { error } = await supabase.from("bleach_materials").insert({
      name: parsed.data.name,
      strength: parsed.data.strength || null,
      brand: parsed.data.brand || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Bleach material added");
    event.currentTarget.reset();
    await loadData();
  };

  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = templateSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) return toast.error("Add a template name and message");
    const { error } = await supabase.from("sms_templates").insert({ name: parsed.data.name, message: parsed.data.message });
    if (error) return toast.error(error.message);
    toast.success("SMS template added");
    event.currentTarget.reset();
    await loadData();
  };

  const colorNames = (ids: string[]) => ids.map((id) => colors.find((color) => color.id === id)?.name).filter(Boolean).join(", ");

  const sendSms = (client: Client, message = "Hi, thank you for visiting today. Looking forward to seeing you again soon!") => {
    window.location.href = `sms:${encodeURIComponent(client.phone)}?&body=${encodeURIComponent(message)}`;
  };

  const exportCsv = (kind: "clients" | "history") => {
    const rows =
      kind === "clients"
        ? [["Full name", "Phone", "Email", "Notes"], ...clients.map((client) => [client.full_name, client.phone, client.email ?? "", client.notes ?? ""])]
        : [
            ["Client", "Phone", "Date", "Treatment", "Colors", "Bleach", "Price", "Notes"],
            ...treatments.map((treatment) => {
              const client = clients.find((item) => item.id === treatment.client_id);
              return [
                client?.full_name ?? "",
                client?.phone ?? "",
                treatment.occurred_at,
                treatmentLabels[treatment.treatment_type],
                colorNames(treatment.color_ids),
                bleaches.find((bleach) => bleach.id === treatment.bleach_material_id)?.name ?? "",
                treatment.price ?? "",
                treatment.notes ?? "",
              ];
            }),
          ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salon-${kind}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!sessionReady) {
    return <main className="min-h-screen bg-hero-salon" />;
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-hero-salon px-4 py-6 text-foreground">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col justify-between gap-8 rounded-lg border border-border bg-card-salon p-6 shadow-elegant salon-sheen">
          <div className="space-y-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary-salon text-primary-foreground shadow-soft">
              <Scissors className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">Salon client studio</Badge>
              <h1 className="font-display text-4xl leading-tight text-foreground">Client color history, beautifully organized.</h1>
              <p className="text-sm leading-6 text-muted-foreground">Manage clients, treatments, formulas, bleach notes, exports, and quick follow-up messages from one mobile-first workspace.</p>
            </div>
          </div>
          <form onSubmit={handleAuth} className="space-y-4 rounded-lg border border-border bg-surface-raised p-4 shadow-soft">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
              <Button type="button" variant={authMode === "signin" ? "salon" : "ghost"} onClick={() => setAuthMode("signin")}>Sign in</Button>
              <Button type="button" variant={authMode === "signup" ? "salon" : "ghost"} onClick={() => setAuthMode("signup")}>Sign up</Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} minLength={6} required />
            </div>
            <Button className="w-full" variant="salon" type="submit">{authMode === "signin" ? "Enter studio" : "Create studio"}</Button>
            <Button className="w-full" variant="soft" type="button" onClick={handleGoogle}>Continue with Google</Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-hero-salon text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="no-print sticky top-0 z-20 -mx-4 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-salon text-primary-foreground shadow-soft"><Scissors className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Hairstylist OS</p>
                <h1 className="font-display text-2xl leading-none">SalonFlow</h1>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} aria-label="Sign out"><LogOut className="h-5 w-5" /></Button>
          </div>
        </header>

        <section className="grid gap-4 py-5 lg:grid-cols-[390px_1fr]">
          <aside className="no-print space-y-4">
            <div className="rounded-lg border border-border bg-card-salon p-4 shadow-soft animate-rise-soft">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Clients</p>
                  <p className="font-display text-2xl">{clients.length} profiles</p>
                </div>
                <Dialog open={isClientOpen} onOpenChange={(open) => { setClientOpen(open); if (!open) setEditingClient(null); }}>
                  <DialogTrigger asChild><Button variant="salon" size="icon" aria-label="Add client"><Plus /></Button></DialogTrigger>
                  <ClientDialogContent editingClient={editingClient} onSubmit={saveClient} />
                </Dialog>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search name or phone" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              {loading && <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">Loading salon data…</div>}
              {!loading && filteredClients.length === 0 && (
                <div className="rounded-lg border border-border bg-card p-5 text-center shadow-soft">
                  <UserRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-semibold">No clients yet</p>
                  <p className="text-sm text-muted-foreground">Add the first client to begin tracking treatments.</p>
                </div>
              )}
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full rounded-lg border p-4 text-left shadow-soft transition hover:-translate-y-0.5 ${selectedClient?.id === client.id ? "border-primary bg-surface-tint" : "border-border bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{client.full_name}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-3.5 w-3.5" />{client.phone}</p>
                    </div>
                    <Badge variant="outline">{treatments.filter((item) => item.client_id === client.id).length}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={UserRound} label="Clients" value={clients.length} />
              <Metric icon={CalendarDays} label="Treatments" value={treatments.length} />
              <Metric icon={Sparkles} label="Colors" value={colors.length} />
              <Metric icon={Droplets} label="Bleach" value={bleaches.length} />
            </div>

            <Tabs defaultValue="client" className="w-full">
              <TabsList className="no-print grid h-auto w-full grid-cols-3 bg-muted p-1">
                <TabsTrigger value="client">Client card</TabsTrigger>
                <TabsTrigger value="library">Materials</TabsTrigger>
                <TabsTrigger value="exports">Export</TabsTrigger>
              </TabsList>

              <TabsContent value="client" className="mt-4">
                {selectedClient ? (
                  <div className="print-panel rounded-lg border border-border bg-card-salon p-4 shadow-elegant sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <Badge className="w-fit" variant="secondary">Client card</Badge>
                        <div>
                          <h2 className="font-display text-4xl leading-tight">{selectedClient.full_name}</h2>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{selectedClient.phone}</span>
                            {selectedClient.email && <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{selectedClient.email}</span>}
                          </div>
                        </div>
                        {selectedClient.notes && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{selectedClient.notes}</p>}
                      </div>
                      <div className="no-print flex flex-wrap gap-2">
                        <Button variant="soft" size="icon" aria-label="Edit client" onClick={() => { setEditingClient(selectedClient); setClientOpen(true); }}><Edit3 /></Button>
                        <Button variant="gold" size="icon" aria-label="Send SMS" onClick={() => sendSms(selectedClient)}><MessageSquare /></Button>
                        <Button variant="soft" size="icon" aria-label="Print" onClick={() => window.print()}><Printer /></Button>
                        <Button variant="destructive" size="icon" aria-label="Delete client" onClick={() => deleteClient(selectedClient)}><Trash2 /></Button>
                      </div>
                    </div>

                    <div className="no-print mt-6 flex justify-end">
                      <Dialog open={isTreatmentOpen} onOpenChange={setTreatmentOpen}>
                        <DialogTrigger asChild><Button variant="salon"><Plus /> New treatment</Button></DialogTrigger>
                        <TreatmentDialogContent clients={clients} selectedClient={selectedClient} colors={colors} bleaches={bleaches} selectedColorIds={selectedColorIds} setSelectedColorIds={setSelectedColorIds} onSubmit={saveTreatment} />
                      </Dialog>
                    </div>

                    <div className="mt-6 space-y-3">
                      <h3 className="font-display text-2xl">Treatment history</h3>
                      {selectedHistory.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">No treatments recorded yet.</div>
                      ) : (
                        selectedHistory.map((treatment) => (
                          <article key={treatment.id} className="rounded-lg border border-border bg-surface-raised p-4 shadow-soft">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{treatmentLabels[treatment.treatment_type]}</p>
                                <p className="text-sm text-muted-foreground">{formatDate(treatment.occurred_at)}{treatment.hair_length ? ` · ${treatment.hair_length}` : ""}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {treatment.price !== null && <Badge variant="secondary">₪{treatment.price}</Badge>}
                                <Button className="no-print" variant="ghost" size="icon" aria-label="Delete treatment" onClick={() => deleteTreatment(treatment.id)}><Trash2 /></Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {treatment.color_ids.length > 0 && <Badge variant="outline">Colors: {colorNames(treatment.color_ids)}</Badge>}
                              {treatment.bleach_material_id && <Badge variant="outline">Bleach: {bleaches.find((bleach) => bleach.id === treatment.bleach_material_id)?.name}</Badge>}
                            </div>
                            {treatment.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{treatment.notes}</p>}
                          </article>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-8 text-center shadow-soft">Select or add a client to open their card.</div>
                )}
              </TabsContent>

              <TabsContent value="library" className="mt-4 grid gap-4 lg:grid-cols-3">
                <LibraryForm title="Add color" icon={Sparkles} onSubmit={saveColor} fields={["name", "code", "brand"]} />
                <LibraryForm title="Add bleach" icon={Droplets} onSubmit={saveBleach} fields={["name", "strength", "brand"]} />
                <form onSubmit={saveTemplate} className="rounded-lg border border-border bg-card-salon p-4 shadow-soft">
                  <h3 className="mb-4 flex items-center gap-2 font-display text-2xl"><MessageSquare className="h-5 w-5 text-primary" /> SMS template</h3>
                  <div className="space-y-3">
                    <Input name="name" placeholder="Template name" />
                    <Textarea name="message" placeholder="Message text" />
                    <Button variant="salon" className="w-full"><Plus /> Add template</Button>
                  </div>
                </form>
                <InventoryList title="Colors" items={colors.map((color) => `${color.name} · ${color.code}${color.brand ? ` · ${color.brand}` : ""}`)} />
                <InventoryList title="Bleach" items={bleaches.map((bleach) => `${bleach.name}${bleach.strength ? ` · ${bleach.strength}` : ""}${bleach.brand ? ` · ${bleach.brand}` : ""}`)} />
                <InventoryList title="Templates" items={templates.map((template) => `${template.name} · ${template.message}`)} />
              </TabsContent>

              <TabsContent value="exports" className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <ActionPanel icon={Download} title="CSV exports" text="Download client lists or full treatment history for backups and reporting.">
                  <Button variant="salon" onClick={() => exportCsv("clients")}><Download /> Clients CSV</Button>
                  <Button variant="soft" onClick={() => exportCsv("history")}><Download /> History CSV</Button>
                </ActionPanel>
                <ActionPanel icon={Printer} title="Print views" text="Open a client card, then print the clean treatment history view for consultation or records.">
                  <Button variant="gold" onClick={() => window.print()}><Printer /> Print client card</Button>
                </ActionPanel>
                <div className="rounded-lg border border-border bg-card-salon p-4 shadow-soft lg:col-span-2">
                  <h3 className="font-display text-2xl">Recent work</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {latestTreatments.map((treatment) => (
                      <div key={treatment.id} className="rounded-lg border border-border bg-surface-raised p-4">
                        <p className="font-semibold">{treatment.client?.full_name ?? "Client"}</p>
                        <p className="text-sm text-muted-foreground">{treatmentLabels[treatment.treatment_type]} · {formatDate(treatment.occurred_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </section>
      </div>
    </main>
  );
};

const ClientDialogContent = ({ editingClient, onSubmit }: { editingClient: Client | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) => (
  <DialogContent className="max-h-[92vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{editingClient ? "Edit client" : "Add client"}</DialogTitle>
      <DialogDescription>Phone is used as the fastest salon identifier.</DialogDescription>
    </DialogHeader>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Full name</Label><Input name="full_name" defaultValue={editingClient?.full_name} required /></div>
      <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={editingClient?.phone} required /></div>
      <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={editingClient?.email ?? ""} /></div>
      <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" defaultValue={editingClient?.notes ?? ""} /></div>
      <Button variant="salon" className="w-full"><Check /> Save client</Button>
    </form>
  </DialogContent>
);

const TreatmentDialogContent = ({ clients, selectedClient, colors, bleaches, selectedColorIds, setSelectedColorIds, onSubmit }: { clients: Client[]; selectedClient: Client; colors: Color[]; bleaches: Bleach[]; selectedColorIds: string[]; setSelectedColorIds: (ids: string[]) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) => (
  <DialogContent className="max-h-[92vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>New treatment</DialogTitle>
      <DialogDescription>Save service details, formulas, bleach, notes, and optional price.</DialogDescription>
    </DialogHeader>
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Client</Label><select name="client_id" defaultValue={selectedClient.id} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{clients.map((client) => <option key={client.id} value={client.id}>{client.full_name}</option>)}</select></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label>Date & time</Label><Input name="occurred_at" type="datetime-local" defaultValue={toDateInput()} /></div>
        <div className="space-y-2"><Label>Price</Label><Input name="price" type="number" min="0" step="0.01" placeholder="Optional" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label>Treatment</Label><select name="treatment_type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{treatmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="space-y-2"><Label>Hair length</Label><select name="hair_length" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">Not needed</option><option value="short">Short</option><option value="long">Long</option></select></div>
      </div>
      <div className="space-y-2">
        <Label>Colors used</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {colors.length === 0 && <p className="text-sm text-muted-foreground">Add colors in Materials first.</p>}
          {colors.map((color) => (
            <label key={color.id} className="flex items-center gap-2 rounded-md border border-border bg-surface p-2 text-sm">
              <input type="checkbox" checked={selectedColorIds.includes(color.id)} onChange={(event) => setSelectedColorIds(event.target.checked ? [...selectedColorIds, color.id] : selectedColorIds.filter((id) => id !== color.id))} />
              {color.name} · {color.code}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2"><Label>Bleach</Label><select name="bleach_material_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"><option value="">None</option>{bleaches.map((bleach) => <option key={bleach.id} value={bleach.id}>{bleach.name}{bleach.strength ? ` · ${bleach.strength}` : ""}</option>)}</select></div>
      <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" placeholder="Formula, timing, toner, client preference…" /></div>
      <Button variant="salon" className="w-full"><Check /> Save treatment</Button>
    </form>
  </DialogContent>
);

const Metric = ({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-card-salon p-4 shadow-soft">
    <Icon className="mb-3 h-5 w-5 text-primary" />
    <p className="text-2xl font-semibold">{value}</p>
    <p className="text-xs uppercase text-muted-foreground">{label}</p>
  </div>
);

const LibraryForm = ({ title, icon: Icon, fields, onSubmit }: { title: string; icon: typeof Sparkles; fields: string[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) => (
  <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card-salon p-4 shadow-soft">
    <h3 className="mb-4 flex items-center gap-2 font-display text-2xl"><Icon className="h-5 w-5 text-primary" /> {title}</h3>
    <div className="space-y-3">
      {fields.map((field) => <Input key={field} name={field} placeholder={field[0].toUpperCase() + field.slice(1)} />)}
      <Button variant="salon" className="w-full"><Plus /> Add</Button>
    </div>
  </form>
);

const InventoryList = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
    <h3 className="font-display text-2xl">{title}</h3>
    <div className="mt-3 space-y-2">
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No items yet.</p> : items.map((item) => <p key={item} className="rounded-md bg-surface p-2 text-sm">{item}</p>)}
    </div>
  </div>
);

const ActionPanel = ({ icon: Icon, title, text, children }: { icon: typeof Download; title: string; text: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-card-salon p-5 shadow-soft">
    <Icon className="mb-3 h-6 w-6 text-primary" />
    <h3 className="font-display text-2xl">{title}</h3>
    <p className="my-3 text-sm leading-6 text-muted-foreground">{text}</p>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export default Index;
