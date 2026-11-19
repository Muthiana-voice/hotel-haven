import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const hotelsQuery = (city?: string) =>
  queryOptions({
    queryKey: ["hotels", city ?? ""],
    queryFn: async () => {
      let q = supabase.from("hotels").select("*").order("rating", { ascending: false });
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
      const { data, error } = await supabase
        .from("hotels")
        .select("*, rooms(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
