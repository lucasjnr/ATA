import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WaveSawtooth, ArrowRight } from "@phosphor-icons/react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", institution: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Conta criada!");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  };

  const change = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative bg-[#0F172A] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/26754061/pexels-photo-26754061.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=900"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#0F172A]/70 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#0055FF] rounded flex items-center justify-center">
              <WaveSawtooth size={22} weight="bold" />
            </div>
            <div className="font-display font-black text-xl">ATA.IA</div>
          </div>
          <div>
            <div className="label-eyebrow text-slate-400 mb-4">Comece em 1 minuto</div>
            <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tight">
              Reuniões<br />
              <span className="text-[#0055FF]">com inteligência.</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleSubmit} className="w-full max-w-sm fade-up" data-testid="register-form">
          <div className="label-eyebrow mb-3">Criar conta</div>
          <h2 className="font-display text-3xl font-bold mb-8">Vamos começar</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold">Nome completo</Label>
              <Input id="name" required value={form.name} onChange={change("name")} className="mt-1.5 h-11" data-testid="register-name-input" />
            </div>
            <div>
              <Label htmlFor="institution" className="text-xs font-semibold">Instituição</Label>
              <Input id="institution" value={form.institution} onChange={change("institution")} className="mt-1.5 h-11" data-testid="register-institution-input" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={change("email")} className="mt-1.5 h-11" data-testid="register-email-input" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={change("password")} className="mt-1.5 h-11" data-testid="register-password-input" />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-[#0055FF] hover:bg-[#0044CC]" data-testid="register-submit-btn">
              {loading ? "Criando…" : (<>Criar conta <ArrowRight size={16} weight="bold" /></>)}
            </Button>
          </div>

          <div className="mt-6 text-sm text-slate-600">
            Já tem conta?{" "}
            <Link to="/login" className="text-[#0055FF] font-semibold hover:underline" data-testid="login-link">
              Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
