import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Building2, BedDouble, Users, Trash2, MailPlus, X } from "lucide-react";

const db=supabase as any;
type Hotel={id:string;name:string;city:string;province:string|null;approved:boolean;paused:boolean};
type Role="cliente"|"hotel_admin"|"super_admin";
type Profile={id:string;email:string|null;full_name:string|null;role:Role;created_at:string};
type Invite={email:string;role:"hotel_admin";created_at:string;accepted_at:string|null};

const ROLE_LABEL:Record<Role,string>={cliente:"Cliente",hotel_admin:"Gestor de Hotel",super_admin:"Administrador Geral"};

export const Route=createFileRoute("/admin/geral")({beforeLoad:()=>requireRole(["super_admin"]),component:GeneralAdminPage});

function GeneralAdminPage(){
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [allowed,setAllowed]=useState(false);
  const [hotels,setHotels]=useState<Hotel[]>([]);
  const [profiles,setProfiles]=useState<Profile[]>([]);
  const [invites,setInvites]=useState<Invite[]>([]);
  const [inviteEmail,setInviteEmail]=useState("");
  const [roomCount,setRoomCount]=useState(0);

  async function load(){
    const [h,p,r,i]=await Promise.all([
      db.from("hotels").select("id,name,city,province,approved,paused").order("created_at",{ascending:false}),
      db.from("profiles").select("id,email,full_name,role,created_at").order("created_at",{ascending:false}),
      db.from("rooms").select("id",{count:"exact",head:true}),
      db.from("role_invites").select("email,role,created_at,accepted_at").order("created_at",{ascending:false}),
    ]);
    if(h.error) throw h.error;if(p.error) throw p.error;if(r.error) throw r.error;if(i.error) throw i.error;
    setHotels(h.data??[]);setProfiles(p.data??[]);setRoomCount(r.count??0);setInvites(i.data??[]);
  }

  useEffect(()=>{
    let active=true;
    (async()=>{
      try{
        const {data:{session}}=await supabase.auth.getSession();
        if(!session?.user){if(active)setLoading(false);return;}
        const {data:profile,error}=await db.from("profiles").select("role").eq("id",session.user.id).single();
        if(error) throw error;
        if(profile.role!=="super_admin"){if(active){setAllowed(false);setLoading(false);}return;}
        if(active)setAllowed(true);
        await load();
      }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível carregar a administração.");}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[]);

  async function setHotelState(hotel:Hotel,change:{approved?:boolean;paused?:boolean}){
    setBusy(hotel.id);
    const {error}=await db.from("hotels").update(change).eq("id",hotel.id);
    if(error) toast.error(error.message); else {await load();toast.success("Estado do hotel actualizado.");}
    setBusy("");
  }
  async function deleteHotel(hotel:Hotel){
    if(!window.confirm("Excluir definitivamente "+hotel.name+" e os seus quartos?"))return;
    setBusy(hotel.id);
    const {error}=await db.from("hotels").delete().eq("id",hotel.id);
    if(error) toast.error("Não foi possível excluir: "+error.message);else{await load();toast.success("Hotel excluído.");}
    setBusy("");
  }
  async function changeRole(profile:Profile,role:Profile["role"]){
    if(profile.role==="super_admin"&&role!=="super_admin"&&!window.confirm("Está a retirar o cargo de administrador geral desta conta. Continuar?"))return;
    setBusy(profile.id);
    const {error}=await db.from("profiles").update({role}).eq("id",profile.id);
    if(error) toast.error(error.message);else{await load();toast.success("Cargo actualizado.");}
    setBusy("");
  }

  // Convite por e-mail: se a conta já existe é promovida de imediato; caso contrário o convite
  // fica pendente e o cargo é aplicado quando a pessoa entrar (com o e-mail confirmado).
  async function inviteHotelAdmin(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const email=inviteEmail.trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast.error("Indique um e-mail válido.");return;}
    setBusy("invite");
    try{
      const existing=profiles.find(p=>(p.email??"").toLowerCase()===email);
      if(existing){
        if(existing.role!=="cliente"){toast.info("Esta conta já tem o cargo: "+ROLE_LABEL[existing.role]+".");return;}
        const {error}=await db.from("profiles").update({role:"hotel_admin"}).eq("id",existing.id);
        if(error) throw error;
        toast.success("Conta existente promovida a Gestor de Hotel.");
      }else{
        const {data:{session}}=await supabase.auth.getSession();
        const {error}=await db.from("role_invites").upsert(
          {email,role:"hotel_admin",invited_by:session?.user.id ?? null,accepted_at:null},
          {onConflict:"email"},
        );
        if(error) throw error;
        toast.success("Convite registado. A pessoa deve entrar no LUV CONECT com este e-mail para receber o cargo.");
      }
      setInviteEmail("");
      await load();
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível registar o convite.");}
    finally{setBusy("");}
  }
  async function cancelInvite(email:string){
    if(!window.confirm("Cancelar o convite para "+email+"?"))return;
    setBusy("invite:"+email);
    const {error}=await db.from("role_invites").delete().eq("email",email);
    if(error) toast.error(error.message);else{await load();toast.success("Convite removido.");}
    setBusy("");
  }

  if(loading)return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin"/></div>;
  if(!allowed)return <main className="mx-auto max-w-xl p-10 text-center"><ShieldCheck className="mx-auto size-10 text-muted-foreground"/><h1 className="mt-3 text-2xl font-semibold">Acesso restrito</h1><p className="mt-2 text-muted-foreground">A administração geral está disponível exclusivamente para contas super_admin.</p><Button asChild className="mt-5"><Link to="/auth">Entrar / Conta</Link></Button></main>;

  const pendingInvites=invites.filter(i=>!i.accepted_at);
  const acceptedInvites=invites.filter(i=>i.accepted_at);

  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <header><p className="text-sm font-medium text-primary">LUV CONECT · Controlo da plataforma</p><h1 className="font-display text-3xl font-semibold">Administração Geral</h1><p className="mt-1 text-sm text-muted-foreground">Aprove hotéis, acompanhe a plataforma e administre os cargos de acesso.</p></header>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <article className="rounded-2xl border bg-card p-4"><Building2 className="size-5 text-primary"/><p className="mt-3 text-2xl font-semibold">{hotels.length}</p><p className="text-sm text-muted-foreground">Hotéis registados</p></article>
      <article className="rounded-2xl border bg-card p-4"><BedDouble className="size-5 text-primary"/><p className="mt-3 text-2xl font-semibold">{roomCount}</p><p className="text-sm text-muted-foreground">Quartos</p></article>
      <article className="col-span-2 rounded-2xl border bg-card p-4 md:col-span-1"><Users className="size-5 text-primary"/><p className="mt-3 text-2xl font-semibold">{profiles.length}</p><p className="text-sm text-muted-foreground">Utilizadores</p></article>
    </section>
    <section className="rounded-2xl border bg-card p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Gestão de hotéis</h2><span className="text-sm text-muted-foreground">{hotels.filter(h=>!h.approved).length} pendente(s)</span></div>
      {hotels.length===0?<p className="text-sm text-muted-foreground">Ainda não existem hotéis.</p>:<div className="space-y-3">{hotels.map(h=><article key={h.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{h.name}</h3><p className="text-sm text-muted-foreground">{[h.province,h.city].filter(Boolean).join(" · ")}</p><p className="mt-1 text-xs">{h.approved?"Aprovado":"A aguardar aprovação"} · {h.paused?"Pausado":"Publicado"}</p></div><div className="flex flex-wrap gap-2">
          {!h.approved&&<Button size="sm" disabled={busy===h.id} onClick={()=>void setHotelState(h,{approved:true,paused:false})}>Aprovar</Button>}
          {h.approved&&<Button size="sm" variant="outline" disabled={busy===h.id} onClick={()=>void setHotelState(h,{paused:!h.paused})}>{h.paused?"Reactivar":"Pausar"}</Button>}
          <Button size="icon" variant="destructive" aria-label="Excluir hotel" disabled={busy===h.id} onClick={()=>void deleteHotel(h)}><Trash2 className="size-4"/></Button>
        </div></div>
      </article>)}</div>}
    </section>
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="text-xl font-semibold">Convidar gestor de hotel</h2>
      <p className="mt-1 text-sm text-muted-foreground">Indique o e-mail da pessoa. Se já tiver conta, passa a Gestor de Hotel de imediato; caso contrário o cargo é aplicado quando entrar no LUV CONECT com esse e-mail.</p>
      <form onSubmit={inviteHotelAdmin} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input type="email" required value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="gestor@hotel.co.mz" aria-label="E-mail do gestor de hotel" className="h-11 w-full rounded-lg border bg-background px-3 sm:max-w-sm" autoComplete="off"/>
        <Button type="submit" disabled={busy==="invite"}><MailPlus className="mr-2 size-4"/>{busy==="invite"?"A registar…":"Convidar"}</Button>
      </form>
      {pendingInvites.length>0&&<div className="mt-5 space-y-2">
        <h3 className="text-sm font-medium">Convites pendentes ({pendingInvites.length})</h3>
        {pendingInvites.map(i=><article key={i.email} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
          <div className="min-w-0"><p className="truncate font-medium">{i.email}</p><p className="text-xs text-muted-foreground">Convidado em {new Date(i.created_at).toLocaleDateString("pt-MZ")} · aguarda a primeira entrada</p></div>
          <Button size="icon" variant="ghost" aria-label={"Cancelar convite de "+i.email} disabled={busy==="invite:"+i.email} onClick={()=>void cancelInvite(i.email)}><X className="size-4"/></Button>
        </article>)}
      </div>}
      {acceptedInvites.length>0&&<p className="mt-4 text-xs text-muted-foreground">Convites já aceites: {acceptedInvites.length}.</p>}
    </section>
    <section className="rounded-2xl border bg-card p-5 sm:p-7"><h2 className="mb-5 text-xl font-semibold">Utilizadores e cargos</h2>
      {profiles.length===0?<p className="text-sm text-muted-foreground">Não existem perfis para apresentar.</p>:<div className="space-y-3">{profiles.map(p=><article key={p.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="truncate font-medium">{p.full_name||"Sem nome definido"}</p><p className="truncate text-sm text-muted-foreground">{p.email||p.id}</p><p className="text-xs text-muted-foreground">Registado em {new Date(p.created_at).toLocaleDateString("pt-MZ")}</p></div>
        <select aria-label={"Cargo de "+(p.email??p.id)} value={p.role} disabled={busy===p.id} onChange={e=>void changeRole(p,e.target.value as Profile["role"])} className="h-10 rounded-lg border bg-background px-3 text-sm sm:min-w-48">
          <option value="cliente">Cliente</option><option value="hotel_admin">Gestor de Hotel</option><option value="super_admin">Administrador Geral</option>
        </select>
      </article>)}</div>}
    </section>
    <p className="text-xs text-muted-foreground">As alterações de cargo são validadas no Supabase. A interface não substitui as políticas de segurança da base de dados.</p>
  </main>;
}
