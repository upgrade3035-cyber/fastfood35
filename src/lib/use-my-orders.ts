import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyOrders } from "@/lib/menu.functions";
import { readMyOrders } from "@/lib/my-orders";

export function useMyOrders() {
  const fetchOrders = useServerFn(getMyOrders);
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readMyOrders().map((o) => o.id));
    sync();
    window.addEventListener("lazzat-orders-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("lazzat-orders-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return useQuery({
    queryKey: ["my-orders", ids],
    queryFn: () => fetchOrders({ data: { ids } }),
    enabled: ids.length > 0,
    refetchInterval: 15_000,
  });
}
