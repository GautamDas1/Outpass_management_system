"use client";
import { useEffect, useState } from "react";
import { getAllGatekeepers, addGatekeeper, deleteGatekeeper } from "@/lib/db";
import type { Gatekeeper } from "@/types";
import toast from "react-hot-toast";
import { Shield, Plus, Trash2, X, Phone, User } from "lucide-react";

export default function WardenGatekeepers() {
  const [gatekeepers, setGatekeepers] = useState<Gatekeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await getAllGatekeepers();
    setGatekeepers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setSaving(true);
    await addGatekeeper({ name: form.name, phone: form.phone, password: form.password });
    toast.success("Gatekeeper added!");
    setForm({ name: "", phone: "", password: "" });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from gatekeepers?`)) return;
    await deleteGatekeeper(id);
    toast.success("Gatekeeper removed");
    await load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Gatekeepers</h1>
          <p className="text-slate-400 text-sm mt-1">{gatekeepers.length} registered security personnel</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Gatekeeper</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6" style={{ borderColor: "rgba(92,124,250,0.3)" }}>
          <h3 className="font-bold font-display mb-4">Add New Gatekeeper</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="e.g. Rajan Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input className="input" type="tel" placeholder="9876543210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary mt-4">
            <Shield size={16} />
            {saving ? "Adding..." : "Add Gatekeeper"}
          </button>
        </form>
      )}

      {gatekeepers.length === 0 ? (
        <div className="card text-center py-16">
          <Shield size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No gatekeepers registered yet.</p>
          <p className="text-slate-500 text-sm mt-1">Add gatekeepers so they can scan QR codes at the gate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gatekeepers.map(gk => (
            <div key={gk.id} className="card flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold font-display shrink-0"
                  style={{ background: "linear-gradient(135deg, #5c7cfa, #748ffc)", color: "white" }}>
                  {gk.name[0]}
                </div>
                <div>
                  <p className="font-bold">{gk.name}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <Phone size={11} /> {gk.phone}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="badge" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                  <Shield size={10} /> Active
                </span>
                <button onClick={() => handleDelete(gk.id, gk.name)} className="text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 text-xs">
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
