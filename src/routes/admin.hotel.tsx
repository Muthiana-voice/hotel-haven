import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LocationPickerMap } from "@/components/LocationPickerMap";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";

const db = supabase as any;
type Hotel = { id:string; name:string; province:string|null; city:string; address:string|null; description:string|null; image_url:string|null; latitude:number|null; longitude:number|null; owner_id:string|null; approved:boolean; paused:boolean };
type Room = { id:string; hotel_id:string; name:string; price_per_night:number; capacity:number; amenities:string[]; images:string[]; description:string|null };
type Booking = { id:string; guest_name:string; guest_email:string; check_in:string; check_out:string; guests:number; total_amount:number; status:string };

export const Route = createFileRoute("/admin/hotel")({ component: HotelAdminPage });

async function uploadImage(file: File, userId: string) {
  if (!file.type.startsWith("image/")) throw new Error("Seleccione um ficheiro de imagem.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Cada imagem deve ter no máximo 8 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = userId + "/" + Date.now() + "-" + crypto.randomUUID() + "-" + safeName;
  const { error } = await supabase.storage.from("hotel-images").upload(path, file, { contentType:file.type, upsert:false });
  if (error) throw error;
  return supabase.storage.from("hotel-images").getPublicUrl(path).data.publicUrl;
}

function HotelAdminPage() {
  const [userId,setUserId] = useState("");
  const [role,setRole] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [hotels,setHotels] = useState<Hotel[]>([]);
  const [hotelId,setHotelId] = useState("");
  const [rooms,setRooms] = useState<Room[]>([]);
  const [bookings,setBookings] = useState<Booking[]>([]);
  const [name,setName] = useState(""); const [province,setProvince] = useState(""); const [city,setCity] = useState("");
  const [address,setAddress] = useState(""); const [description,setDescription] = useState(""); const [imageUrl,setImageUrl] = useState("");
  const [lat,setLat] = useState("-25.9692"); const [lng,setLng] = useState("32.5732");
  const [mainPhoto,setMainPhoto] = useState<File|null>(null);
  const [roomId,setRoomId] = useState(""); const [roomName,setRoomName] = useState(""); const [price,setPrice] = useState("0");
  const [capacity,setCapacity] = useState("2"); const [amenities,setAmenities] = useState(""); const [roomDescription,setRoomDescription] = useState("");
  const [roomPhotos,setRoomPhotos] = useState<FileList|null>(null);

  const selectedHotel = useMemo(()=>hotels.find(h=>h.id===hotelId) ?? null,[hotels,hotelId]);

  async function loadHotelData(id:string) {
    if (!id) { setRooms([]); setBookings([]); return; }
    const [r,b] = await Promise.all([
      db.from("rooms").select("*").eq("hotel_id",id).order("created_at",{ascending:false}),
      db.from("bookings").select("*").eq("hotel_id",id).order("created_at",{ascending:false}),
    ]);
    if (r.error) toast.error("Não foi possível carregar os quartos: "+r.error.message); else setRooms(r.data ?? []);
    if (b.error) {
      if (b.error.code === "42P01" || b.error.code === "PGRST205") setBookings([]);
      else toast.error("Não foi possível carregar as reservas: "+b.error.message);
    } else setBookings(b.data ?? []);
  }

  async function refreshHotels(uid:string, accountRole:string) {
    const query = db.from("hotels").select("*").order("created_at",{ascending:false});
    const {data,error} = accountRole === "super_admin" ? await query : await query.eq("owner_id",uid);
    if (error) throw error;
    const list = (data ?? []) as Hotel[];
    setHotels(list);
    const current = list.find(h=>h.id===hotelId) ?? list[0];
    if (current) { setHotelId(current.id); fillHotel(current); await loadHotelData(current.id); }
    else { setHotelId(""); setRooms([]); setBookings([]); }
  }

  function fillHotel(h:Hotel) {
    setName(h.name ?? ""); setProvince(h.province ?? ""); setCity(h.city ?? "");
    setAddress(h.address ?? ""); setDescription(h.description ?? ""); setImageUrl(h.image_url ?? "");
    setLat(String(h.latitude ?? -25.9692)); setLng(String(h.longitude ?? 32.5732));
  }

  useEffect(()=>{
    let active=true;
    (async()=>{
      try {
        const {data:{session}}=await supabase.auth.getSession();
        if (!session?.user) { if(active) { setLoading(false); setRole("guest"); } return; }
        const {data:profile,error}=await db.from("profiles").select("role").eq("id",session.user.id).single();
        if (error) throw error;
        if (!active) return;
        setUserId(session.user.id); setRole(profile.role);
        if (!["hotel_admin","super_admin"].includes(profile.role)) { setLoading(false); return; }
        await refreshHotels(session.user.id,profile.role);
      } catch(e) { toast.error(e instanceof Error?e.message:"Falha ao carregar o painel."); }
      finally { if(active) setLoading(false); }
    })();
    return ()=>{active=false;};
  },[]);

  async function saveHotel(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      let photo=imageUrl;
      if (mainPhoto) photo=await uploadImage(mainPhoto,userId);
      const payload={name:name.trim(),province:province.trim(),city:city.trim(),address:address.trim(),description:description.trim(),image_url:photo,latitude:Number(lat),longitude:Number(lng),owner_id:selectedHotel?.owner_id ?? userId};
      if (!payload.name || !payload.city || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) throw new Error("Preencha nome, cidade e coordenadas válidas.");
      const request=hotelId
        ? await db.from("hotels").update(payload).eq("id",hotelId).select("*").single()
        : await db.from("hotels").insert({...payload,approved:false,paused:false}).select("*").single();
      if (request.error) throw request.error;
      const saved=request.data as Hotel;
      setImageUrl(saved.image_url ?? ""); setMainPhoto(null);
      await refreshHotels(userId,role);
      setHotelId(saved.id); fillHotel(saved); toast.success("Dados do hotel guardados.");
    } catch(e) { toast.error(e instanceof Error?e.message:"Não foi possível guardar o hotel."); }
    finally { setBusy(false); }
  }

  async function saveRoom(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!hotelId) {toast.error("Guarde primeiro os dados do hotel.");return;}
    setBusy(true);
    try {
      const uploaded:string[]=[];
      if(roomPhotos?.length) for(const file of Array.from(roomPhotos)) uploaded.push(await uploadImage(file,userId));
      const existing=rooms.find(r=>r.id===roomId);
      const payload={hotel_id:hotelId,name:roomName.trim(),price_per_night:Number(price),capacity:Number(capacity),amenities:amenities.split(",").map(x=>x.trim()).filter(Boolean),description:roomDescription.trim(),images:[...(existing?.images ?? []),...uploaded]};
      if(!payload.name || !Number.isFinite(payload.price_per_night) || payload.price_per_night<0 || !Number.isInteger(payload.capacity) || payload.capacity<1) throw new Error("Verifique o nome, preço e capacidade do quarto.");
      const result=roomId ? await db.from("rooms").update(payload).eq("id",roomId) : await db.from("rooms").insert(payload);
      if(result.error) throw result.error;
      await loadHotelData(hotelId); setRoomId("");setRoomName("");setPrice("0");setCapacity("2");setAmenities("");setRoomDescription("");setRoomPhotos(null);
      toast.success("Quarto guardado.");
    } catch(e) {toast.error(e instanceof Error?e.message:"Não foi possível guardar o quarto.");}
    finally {setBusy(false);}
  }

  async function deleteRoom(id:string) {
    if(!window.confirm("Eliminar este quarto?")) return;
    const {error}=await db.from("rooms").delete().eq("id",id);
    if(error) toast.error(error.message); else {await loadHotelData(hotelId);toast.success("Quarto removido.");}
  }

  if(loading) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin"/></div>;
  if(role==="guest") return <main className="mx-auto max-w-xl p-10 text-center"><h1 className="text-2xl font-semibold">Acesso reservado</h1><p className="mt-2 text-muted-foreground">Entre na sua conta para gerir um hotel.</p><Button asChild className="mt-5"><Link to="/auth">Entrar / Conta</Link></Button></main>;
  if(!["hotel_admin","super_admin"].includes(role)) return <main className="mx-auto max-w-xl p-10 text-center"><h1 className="text-2xl font-semibold">Sem permissão</h1><p className="mt-2 text-muted-foreground">Esta área está disponível para gestores de hotel e administradores gerais.</p></main>;

  return <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <header><p className="text-sm font-medium text-primary">LUV CONECT · Área reservada</p><h1 className="font-display text-3xl font-semibold">Painel do Hotel</h1><p className="mt-1 text-sm text-muted-foreground">Actualize a sua unidade, quartos e acompanhe reservas.</p></header>
    {role==="super_admin" && <div className="rounded-xl border bg-muted/40 p-3 text-sm">Está a aceder como administrador geral. Pode seleccionar qualquer hotel para prestar assistência.</div>}
    {hotels.length>0 && <label className="block max-w-xl text-sm font-medium">Hotel a gerir
      <select value={hotelId} onChange={async e=>{const id=e.target.value;setHotelId(id);const h=hotels.find(x=>x.id===id);if(h)fillHotel(h);await loadHotelData(id);}} className="mt-1 h-11 w-full rounded-lg border bg-background px-3">
        {hotels.map(h=><option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
      </select>
    </label>}
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="mb-5 text-xl font-semibold">{hotelId?"Dados do hotel":"Cadastrar hotel"}</h2>
      <form onSubmit={saveHotel} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Nome do hotel<input required value={name} onChange={e=>setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Província<input value={province} onChange={e=>setProvince(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Cidade / Distrito<input required value={city} onChange={e=>setCity(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Endereço<input value={address} onChange={e=>setAddress(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium md:col-span-2">Descrição<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-background p-3"/></label>
        <label className="text-sm font-medium md:col-span-2">Foto principal
          <input type="file" accept="image/*" onChange={e=>setMainPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm"/>
          {imageUrl && <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">Ver foto actual</a>}
        </label>
        <div className="space-y-3 md:col-span-2"><h3 className="font-medium">Localização exacta no mapa</h3><p className="text-xs text-muted-foreground">Clique no mapa ou arraste o marcador para definir as coordenadas do hotel.</p>
          <LocationPickerMap latitude={Number(lat)||-25.9692} longitude={Number(lng)||32.5732} onChange={(a,b)=>{setLat(a.toFixed(7));setLng(b.toFixed(7));}}/>
        </div>
        <label className="text-sm font-medium">Latitude<input type="number" step="any" required value={lat} onChange={e=>setLat(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Longitude<input type="number" step="any" required value={lng} onChange={e=>setLng(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        {selectedHotel && <p className="text-xs text-muted-foreground md:col-span-2">Estado: {selectedHotel.approved?"Aprovado":"A aguardar aprovação"} · {selectedHotel.paused?"Pausado":"Activo"}</p>}
        <div className="md:col-span-2"><Button disabled={busy} type="submit"><Save className="mr-2 size-4"/>{busy?"A guardar…":"Guardar hotel"}</Button></div>
      </form>
    </section>
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Quartos do hotel</h2><span className="text-sm text-muted-foreground">{rooms.length} quarto(s)</span></div>
      <div className="space-y-3">{rooms.map(room=><article key={room.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
        <div><h3 className="font-medium">{room.name}</h3><p className="text-sm text-muted-foreground">{Number(room.price_per_night).toLocaleString("pt-MZ")} MZN/noite · {room.capacity} pessoa(s)</p><p className="text-xs text-muted-foreground">{room.amenities?.join(", ")}</p></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>{setRoomId(room.id);setRoomName(room.name);setPrice(String(room.price_per_night));setCapacity(String(room.capacity));setAmenities(room.amenities?.join(", ")??"");setRoomDescription(room.description??"");}}>Editar</Button><Button size="icon" variant="destructive" onClick={()=>void deleteRoom(room.id)} aria-label="Eliminar quarto"><Trash2 className="size-4"/></Button></div>
      </article>)}</div>
      <form onSubmit={saveRoom} className="mt-6 grid gap-4 border-t pt-6 md:grid-cols-2">
        <h3 className="font-semibold md:col-span-2">{roomId?"Editar quarto":"Adicionar quarto"}</h3>
        <label className="text-sm font-medium">Nome<input required value={roomName} onChange={e=>setRoomName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Preço por noite (MZN)<input type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Capacidade<input type="number" min="1" step="1" required value={capacity} onChange={e=>setCapacity(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium">Comodidades (separadas por vírgulas)<input value={amenities} onChange={e=>setAmenities(e.target.value)} placeholder="Wi-Fi, Ar condicionado, TV" className="mt-1 h-11 w-full rounded-lg border bg-background px-3"/></label>
        <label className="text-sm font-medium md:col-span-2">Descrição<textarea value={roomDescription} onChange={e=>setRoomDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background p-3"/></label>
        <label className="text-sm font-medium md:col-span-2">Fotos do quarto<input type="file" multiple accept="image/*" onChange={e=>setRoomPhotos(e.target.files)} className="mt-1 block w-full text-sm"/></label>
        <div className="flex flex-wrap gap-2 md:col-span-2"><Button type="submit" disabled={busy||!hotelId}><Plus className="mr-2 size-4"/>Guardar quarto</Button>{roomId&&<Button type="button" variant="outline" onClick={()=>{setRoomId("");setRoomName("");setPrice("0");setCapacity("2");setAmenities("");setRoomDescription("");}}>Cancelar edição</Button>}</div>
      </form>
    </section>
    <section className="rounded-2xl border bg-card p-5 sm:p-7"><h2 className="mb-4 text-xl font-semibold">Reservas recebidas</h2>
      {bookings.length===0?<p className="text-sm text-muted-foreground">Ainda não existem reservas para este hotel.</p>:<div className="space-y-3">{bookings.map(b=><article key={b.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2 font-medium"><span>{b.guest_name} · {b.guest_email}</span><span>{b.status}</span></div><p className="mt-1 text-muted-foreground">{b.check_in} → {b.check_out} · {b.guests} hóspede(s) · {Number(b.total_amount).toLocaleString("pt-MZ")} MZN</p></article>)}</div>}
    </section>
    <p className="text-xs text-muted-foreground">As imagens são guardadas no bucket público hotel-images. Novos hotéis ficam pendentes de aprovação pela administração geral.</p>
  </main>;
}
