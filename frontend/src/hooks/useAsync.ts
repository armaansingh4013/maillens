import { useState } from "react";
import type { AsyncState } from "../types";

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: "idle",
    data: null,
    error: "",
  });

  async function run(fn: () => Promise<T>) {
    setState({ status: "loading", data: null, error: "" });
    try {
      const data = await fn();
      setState({ status: "success", data, error: "" });
      return data;
    } catch (e: any) {
      setState({ status: "error", data: null, error: e.message });
      return null;
    }
  }

  function reset() {
    setState({ status: "idle", data: null, error: "" });
  }

  return { ...state, run, reset };
}
