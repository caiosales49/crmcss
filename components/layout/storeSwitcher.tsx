"use client";

import { Plus, Store as StoreIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStore } from "@/contexts/storeProvider";
import { StoreService } from "@/services/storeService";

export function StoreSwitcher() {
  const { stores, activeStoreId, setActiveStoreId, createOwnedStore } = useStore();
  const [creating, setCreating] = useState(false);

  async function createStore() {
    const nome = window.prompt("Nome da nova loja");
    if (!nome?.trim()) return;
    setCreating(true);
    try {
      const storeId = await createOwnedStore({ name: nome.trim() });
      setActiveStoreId(storeId);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex">
        <StoreIcon className="h-4 w-4" />
      </div>
      <Select
        className="w-36 sm:w-[220px]"
        aria-label="Loja ativa"
        value={activeStoreId ?? ""}
        onChange={(event) => setActiveStoreId(event.target.value)}
        disabled={stores.length <= 1}
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>{StoreService.storeName(store)}</option>
        ))}
      </Select>
      <Button variant="secondary" aria-label="Criar nova loja" disabled={creating} onClick={() => void createStore()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
