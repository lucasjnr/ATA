import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { WaveSawtooth, ArrowRight } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Bem-vindo!");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="label-eyebrow text-slate-400 mb-4">Sistema Inteligente</div>
            <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tight">
              Da reunião<br />à ata pronta.<br />
              <span className="text-[#0055FF]">Em minutos.</span>
            </h1>
            <p className="mt-6 text-slate-300 text-base max-w-md leading-relaxed">
              Grave, transcreva, delibere e gere atas oficiais com inteligência artificial. Tudo em um único fluxo.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={handleSubmit} className="w-full max-w-sm fade-up" data-testid="login-form">
          <div className="label-eyebrow mb-3">Entrar</div>
          <h2 className="font-display text-3xl font-bold mb-8">Acesse sua conta</h2>

          <div className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@instituicao.org"
                className="mt-1.5 h-11"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 h-11"
                data-testid="login-password-input"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-[#0055FF] hover:bg-[#0044CC]" data-testid="login-submit-btn">
              {loading ? "Entrando…" : (<>Entrar <ArrowRight size={16} weight="bold" /></>)}
            </Button>
          </div>

          <div className="mt-6 text-sm text-slate-600">
            Ainda não tem conta?{" "}
            <Link to="/register" className="text-[#0055FF] font-semibold hover:underline" data-testid="register-link">
              Criar conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
