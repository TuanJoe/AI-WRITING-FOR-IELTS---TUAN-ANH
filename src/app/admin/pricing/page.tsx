"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { formatDate } from "@/lib/format";

interface Pricing {
  id: string;
  provider: string;
  modelName: string;
  inputPricePer1mTokens: number;
  outputPricePer1mTokens: number;
  cachedInputPricePer1mTokens: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
interface Rate {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string | null;
  effectiveDate: string;
}

export default function PricingPage() {
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [pf, setPf] = useState({ modelName: "", input: "", output: "", cached: "" });
  const [rf, setRf] = useState({ rate: "" });

  function load() {
    api.get<Pricing[]>("/api/admin/pricing/models").then(setPricing);
    api.get<Rate[]>("/api/admin/pricing/exchange-rates").then(setRates);
  }
  useEffect(load, []);

  async function addPricing() {
    setError(null);
    try {
      await api.post("/api/admin/pricing/models", {
        provider: "gemini",
        modelName: pf.modelName,
        inputPricePer1mTokens: parseFloat(pf.input),
        outputPricePer1mTokens: parseFloat(pf.output),
        cachedInputPricePer1mTokens: pf.cached ? parseFloat(pf.cached) : 0,
      });
      setPf({ modelName: "", input: "", output: "", cached: "" });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    }
  }

  async function addRate() {
    setError(null);
    try {
      await api.post("/api/admin/pricing/exchange-rates", {
        baseCurrency: "USD",
        targetCurrency: "VND",
        rate: parseFloat(rf.rate),
      });
      setRf({ rate: "" });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Pricing & exchange rates</h1>
      {error && <p className="text-red-600">{error}</p>}

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Model pricing (per 1M tokens)</h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="th">Model</th>
              <th className="th">Input $</th>
              <th className="th">Output $</th>
              <th className="th">Cached $</th>
              <th className="th">Effective from</th>
              <th className="th">To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pricing.map((p) => (
              <tr key={p.id}>
                <td className="table-cell">{p.modelName}</td>
                <td className="table-cell">{p.inputPricePer1mTokens}</td>
                <td className="table-cell">{p.outputPricePer1mTokens}</td>
                <td className="table-cell">{p.cachedInputPricePer1mTokens}</td>
                <td className="table-cell text-xs">{formatDate(p.effectiveFrom)}</td>
                <td className="table-cell text-xs">
                  {p.effectiveTo ? formatDate(p.effectiveTo) : "current"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <input className="input max-w-[180px]" placeholder="Model name" value={pf.modelName} onChange={(e) => setPf({ ...pf, modelName: e.target.value })} />
          <input className="input max-w-[120px]" placeholder="Input $/1M" value={pf.input} onChange={(e) => setPf({ ...pf, input: e.target.value })} />
          <input className="input max-w-[120px]" placeholder="Output $/1M" value={pf.output} onChange={(e) => setPf({ ...pf, output: e.target.value })} />
          <input className="input max-w-[120px]" placeholder="Cached $/1M" value={pf.cached} onChange={(e) => setPf({ ...pf, cached: e.target.value })} />
          <button className="btn-primary" onClick={addPricing} disabled={!pf.modelName || !pf.input || !pf.output}>
            Add price
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Adding a price closes the previous one&apos;s effective window — historical costs are never altered.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">USD → VND exchange rates</h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="th">Rate</th>
              <th className="th">Source</th>
              <th className="th">Effective</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rates.map((r) => (
              <tr key={r.id}>
                <td className="table-cell">{r.rate.toLocaleString()}</td>
                <td className="table-cell">{r.source}</td>
                <td className="table-cell text-xs">{formatDate(r.effectiveDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-end gap-3">
          <input className="input max-w-[180px]" placeholder="New rate (e.g. 25400)" value={rf.rate} onChange={(e) => setRf({ rate: e.target.value })} />
          <button className="btn-primary" onClick={addRate} disabled={!rf.rate}>
            Add rate
          </button>
        </div>
      </div>
    </div>
  );
}
