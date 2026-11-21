import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// New public hotel discovery only returns listings approved by the platform.
const db = supabase as any;

export const hotelsQuery = (city?: string) =>
  queryOptions({
    queryKey: ["hotels", city ?? ""],
    queryFn: async () => {
      let q = db.from("hotels").select("*").eq("approved", true).eq("paused", false).order("rating", { ascending: false });
      if (city) q = q.ilike("city", `%${city}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const hotelQuery = (id: string) =>
  queryOptions({
    queryKey: ["hotel", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("hotels")
        .select("*, rooms(*)")
        .eq("id", id)
        .eq("approved", true)
        .eq("paused", false)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
