'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Star, UtensilsCrossed, Vote, Download, Edit3, X,
  BarChart3, TrendingUp, Clock, Award, ChevronRight, Save, LogOut, Image as ImageIcon, Settings, Upload, QrCode, Shield, AlertTriangle
} from 'lucide-react';

const InstagramIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
import ImageDropZone from '@/components/ImageDropZone';
import QRCard from '@/components/QRCard';
import VoterModal from '@/components/VoterModal';
import StatsCard from '@/components/StatsCard';
import BarChart from '@/components/BarChart';
import { useRouter } from 'next/navigation';


interface Stats {
  summary: {
    totalVotes: number;
    uniqueVoters: number;
    avgRating: number;
    totalRestaurants: number;
  };
  restaurantStats: {
    id: number;
    name: string;
    slug: string;
    instagram: string;
    image_url: string | null;
    total_votes: number;
    avg_rating: number;
    min_rating: number;
    max_rating: number;
  }[];
  votesByHour: { hour: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  votesByDay: { date: string; count: number }[];
  recentVotes: {
    id: number;
    nombre: string;
    whatsapp: string;
    rating: number;
    voted_at: string;
    restaurant_name: string;
    opinion: string | null;
  }[];
  topVoters: {
    nombre: string;
    whatsapp: string;
    votes_count: number;
    avg_rating: number;
    vote_details: {
      restaurant_name: string;
      rating: number;
      opinion: string | null;
      voted_at: string;
    }[];
  }[];
}

type Tab = 'dashboard' | 'restaurantes' | 'qr' | 'seguridad' | 'votos' | 'contactos' | 'configuracion';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', instagram: '', image_url: '' });
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsForm, setSettingsForm] = useState({ event_name: '', event_tagline: '', logo_url: '' });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBurger, setUploadingBurger] = useState<number | null>(null);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [securitySummary, setSecuritySummary] = useState<Record<string, number>>({});
  const [logFilter, setLogFilter] = useState<string>('');
  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [voterModalOpen, setVoterModalOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactRestaurantFilter, setContactRestaurantFilter] = useState('');

  useEffect(() => {
    fetchStats();
    // Load settings
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      if (data.data) {
        setSettings(data.data);
        setSettingsForm({
          event_name: data.data.event_name || '',
          event_tagline: data.data.event_tagline || '',
          logo_url: data.data.logo_url || '',
        });
      }
    }).catch(() => {});
  }, []);

  // Fetch security logs when tab changes
  useEffect(() => {
    if (tab === 'seguridad') fetchSecurityLogs();
  }, [tab, logFilter]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSecurityLogs = async () => {
    try {
      const params = logFilter ? `?type=${logFilter}` : '';
      const res = await fetch(`/api/admin/security-logs${params}`);
      if (res.status === 401) { router.push('/admin/login'); return; }
      const data = await res.json();
      setSecurityLogs(data.data || []);
      setSecuritySummary(data.summary || {});
    } catch (e) { console.error(e); }
  };

  const startEdit = (restaurant: any) => {
    setEditingId(restaurant.id);
    setEditForm({
      name: restaurant.name,
      description: restaurant.description || '',
      instagram: restaurant.instagram || '',
      image_url: restaurant.image_url || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetch('/api/admin/restaurants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      setEditingId(null);
      fetchStats();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      setSettings(settingsForm);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setSettingsForm(prev => ({ ...prev, logo_url: data.url }));
      }
    } catch (e) { console.error(e); }
    finally { setUploadingLogo(false); }
  };

  const handleBurgerUpload = async (restaurantId: number, slug: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBurger(restaurantId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'restaurant');
      formData.append('slug', slug);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        // Update restaurant image_url
        await fetch('/api/admin/restaurants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: restaurantId, image_url: data.url }),
        });
        fetchStats();
      }
    } catch (e) { console.error(e); }
    finally { setUploadingBurger(null); }
  };

  // Upload helpers for ImageDropZone (take File, return URL)
  const uploadRestaurantImage = (restaurantId: number, slug: string) => async (file: File): Promise<string | null> => {
    if (!file.size) return null; // empty file = remove
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'restaurant');
    formData.append('slug', slug);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.url) return null;
    await fetch('/api/admin/restaurants', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: restaurantId, image_url: data.url }),
    });
    fetchStats();
    return data.url;
  };

  const uploadLogoImage = async (file: File): Promise<string | null> => {
    if (!file.size) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'logo');
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.url) {
      setSettingsForm(prev => ({ ...prev, logo_url: data.url }));
    }
    return data.url || null;
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-5xl">🍔</motion.div>
      </div>
    );
  }

  const starColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'restaurantes', label: 'Restaurantes', icon: UtensilsCrossed },
    { id: 'qr', label: 'Códigos QR', icon: QrCode },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
    { id: 'votos', label: 'Votos', icon: Vote },
    { id: 'contactos', label: 'Contactos', icon: Users },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-surface-3 bg-surface-1/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍔</span>
            <div>
              <h1 className="text-lg font-bold">Uraba Food Fest</h1>
              <p className="text-xs text-gray-500">Panel de control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              Ver sitio <ChevronRight size={14} />
            </a>
            <button onClick={handleLogout} className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-gray-400 hover:text-red-400" title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-surface-3 bg-surface-1/50">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard title="Total Votos" value={stats.summary.totalVotes} icon={Vote} color="bg-brand/20 text-brand" delay={0} />
                <StatsCard title="Votantes Únicos" value={stats.summary.uniqueVoters} icon={Users} color="bg-blue-500/20 text-blue-400" delay={0.1} />
                <StatsCard title="Rating Promedio" value={`${stats.summary.avgRating} ⭐`} icon={Star} color="bg-gold/20 text-gold" delay={0.2} />
                <StatsCard title="Restaurantes" value={stats.summary.totalRestaurants} icon={UtensilsCrossed} color="bg-green-500/20 text-green-400" delay={0.3} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <BarChart title="Distribución de Calificaciones"
                  data={stats.ratingDistribution.map((r) => ({ label: `${r.rating} ⭐`, value: r.count, color: starColors[r.rating] || 'bg-gray-500' }))} />
                <BarChart title="Votos por Día"
                  data={stats.votesByDay.map((d) => ({ label: d.date.slice(5), value: d.count, color: 'bg-brand' }))} />
              </div>

              {/* Ranking */}
              <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5 mb-8">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Award size={16} className="text-gold" /> Ranking
                </h3>
                <div className="space-y-2">
                  {stats.restaurantStats.filter((r) => r.total_votes > 0)
                    .sort((a, b) => b.avg_rating - a.avg_rating || b.total_votes - a.total_votes)
                    .map((r, i) => (
                      <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-gold text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-surface-3 text-gray-400'
                        }`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{r.name}</p>
                          <p className="text-xs text-gray-500">{r.total_votes} votos</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gold">{r.avg_rating || '—'}</p>
                          <p className="text-xs text-gray-500">{r.min_rating !== null ? `${r.min_rating}-${r.max_rating}` : ''}</p>
                        </div>
                      </motion.div>
                    ))}
                  {stats.restaurantStats.filter((r) => r.total_votes > 0).length === 0 && (
                    <p className="text-center text-gray-500 py-8">Aún no hay votos</p>
                  )}
                </div>
              </div>

              {/* Recent votes */}
              <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-brand" /> Votos Recientes
                </h3>
                <div className="space-y-2">
                  {stats.recentVotes.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.nombre}</p>
                        <p className="text-xs text-gray-500">{v.restaurant_name} · {v.whatsapp}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gold font-bold">{'⭐'.repeat(v.rating)}</p>
                        <p className="text-xs text-gray-500">{new Date(v.voted_at).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* RESTAURANTES */}
          {tab === 'restaurantes' && (
            <motion.div key="restaurantes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Restaurantes</h2>
                <span className="text-sm text-gray-400">{stats.restaurantStats.length} total</span>
              </div>

              <div className="space-y-3">
                {stats.restaurantStats.map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="bg-surface-1 border border-surface-3 rounded-2xl p-4">
                    {editingId === r.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Nombre</label>
                          <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Descripción</label>
                          <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            rows={2} className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand resize-none" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><InstagramIcon size={12} /> Instagram</label>
                          <input value={editForm.instagram} onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                            placeholder="@usuario" className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand" />
                        </div>
                        <div>
                          <ImageDropZone
                            label="Foto del restaurante"
                            currentUrl={editForm.image_url}
                            onUpload={uploadRestaurantImage(editingId!, stats.restaurantStats.find(r => r.id === editingId)?.slug || '')}
                            size="md"
                            hint="Arrastra la foto de la hamburguesa · JPG, PNG, WebP · Máx 20MB"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors">
                            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-surface-3 hover:bg-surface-2 rounded-lg text-sm transition-colors">
                            <X size={14} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                        <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                          {r.image_url ? (
                            <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
                          ) : '🍔'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold truncate">{r.name}</h3>
                            {r.avg_rating && <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-medium">{r.avg_rating} ⭐</span>}
                          </div>
                          {r.instagram && (
                            <p className="text-xs text-pink-400 flex items-center gap-1"><InstagramIcon size={10} /> {r.instagram}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{r.total_votes} votos · <span className="text-gray-500">/restaurante/{r.slug}</span></p>
                        </div>
                        <label className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-gray-400 hover:text-white cursor-pointer" title="Subir foto">
                          <Upload size={16} />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBurgerUpload(r.id, r.slug, e)} />
                        </label>
                        <button onClick={() => startEdit(r)} className="p-2 hover:bg-surface-2 rounded-lg transition-colors text-gray-400 hover:text-white">
                          <Edit3 size={16} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CODIGOS QR */}
          {tab === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Códigos QR</h2>
                  <p className="text-sm text-gray-400 mt-1">Genera y descarga los QR de cada restaurante</p>
                </div>
                <button
                  onClick={async () => {
                    // Download all QR cards sequentially
                    for (const r of stats.restaurantStats) {
                      const btn = document.querySelector(`[data-qr-download="${r.slug}"]`) as HTMLButtonElement;
                      if (btn) { btn.click(); await new Promise(res => setTimeout(res, 500)); }
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark rounded-xl text-sm font-medium transition-colors"
                >
                  <Download size={16} /> Descargar Todos
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.restaurantStats.map((r, i) => {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const qrUrl = `${baseUrl}/restaurante/${r.slug}`;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <QRCard
                        name={r.name}
                        slug={r.slug}
                        imageUrl={r.image_url}
                        instagram={r.instagram}
                        qrUrl={qrUrl}
                        eventName={settings.event_name || undefined}
                        logoUrl={settings.logo_url || undefined}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {stats.restaurantStats.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📱</p>
                  <p className="text-gray-500">No hay restaurantes todavía</p>
                </div>
              )}
            </motion.div>
          )}

          {/* SEGURIDAD */}
          {tab === 'seguridad' && (
            <motion.div key="seguridad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Seguridad</h2>
                  <p className="text-sm text-gray-400 mt-1">Intentos bloqueados y actividad sospechosa (últimas 24h)</p>
                </div>
                <button onClick={fetchSecurityLogs}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 hover:bg-surface-3 rounded-xl text-sm transition-colors">
                  <Shield size={16} /> Actualizar
                </button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {[
                  { key: 'datacenter_blocked', label: 'Datacenter', color: 'bg-red-500/20 text-red-400', icon: '🖥️' },
                  { key: 'ip_rate_limit', label: 'Rate Limit IP', color: 'bg-orange-500/20 text-orange-400', icon: '⏱️' },
                  { key: 'subnet_rate_limit', label: 'Rate Limit Subred', color: 'bg-yellow-500/20 text-yellow-400', icon: '🌐' },
                  { key: 'missing_token', label: 'Sin Token', color: 'bg-purple-500/20 text-purple-400', icon: '🔑' },
                  { key: 'invalid_token', label: 'Token Inválido', color: 'bg-pink-500/20 text-pink-400', icon: '❌' },
                  { key: 'anomaly_detected', label: 'Anomalía', color: 'bg-red-600/20 text-red-300', icon: '🚨' },
                ].map((item) => (
                  <div key={item.key} className={`rounded-xl p-3 border border-surface-3 ${item.color.split(' ')[0]}`}>
                    <div className="text-lg mb-1">{item.icon}</div>
                    <div className="text-xl font-bold">{securitySummary[item.key] || 0}</div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter buttons */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <button onClick={() => setLogFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!logFilter ? 'bg-brand text-white' : 'bg-surface-2 text-gray-400 hover:text-white'}`}>
                  Todos
                </button>
                {['datacenter_blocked', 'ip_rate_limit', 'subnet_rate_limit', 'missing_token', 'invalid_token', 'anomaly_detected', 'invalid_pow'].map(type => (
                  <button key={type} onClick={() => setLogFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${logFilter === type ? 'bg-brand text-white' : 'bg-surface-2 text-gray-400 hover:text-white'}`}>
                    {type.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              {/* Logs table */}
              <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-3">
                        <th className="text-left p-3 text-gray-400 font-medium">Hora</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Tipo</th>
                        <th className="text-left p-3 text-gray-400 font-medium">IP</th>
                        <th className="text-left p-3 text-gray-400 font-medium">WhatsApp</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityLogs.map((log) => (
                        <tr key={log.id} className="border-b border-surface-3/50 hover:bg-surface-2/50">
                          <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              log.event_type === 'anomaly_detected' ? 'bg-red-500/20 text-red-400' :
                              log.event_type === 'datacenter_blocked' ? 'bg-orange-500/20 text-orange-400' :
                              log.event_type.includes('rate_limit') ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {log.event_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs">{log.ip}</td>
                          <td className="p-3 text-xs">{log.whatsapp || '—'}</td>
                          <td className="p-3 text-xs text-gray-400 max-w-xs truncate">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {securityLogs.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-3xl mb-2">🛡️</p>
                    <p className="text-gray-500">Sin eventos de seguridad</p>
                    <p className="text-xs text-gray-600 mt-1">Todo está tranquilo</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* VOTOS */}
          {tab === 'votos' && (
            <motion.div key="votos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-bold mb-6">Todos los Votos</h2>
              <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand" /> Top Votantes
                </h3>
                <div className="space-y-2">
                  {stats.topVoters.map((v, i) => (
                    <div key={v.whatsapp} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-gold text-black' : 'bg-surface-3 text-gray-400'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.nombre}</p>
                        <p className="text-xs text-gray-500">{v.whatsapp}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{v.votes_count} votos</p>
                        <p className="text-xs text-gold">{v.avg_rating} ⭐</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-3">
                        <th className="text-left p-3 text-gray-400 font-medium">Nombre</th>
                        <th className="text-left p-3 text-gray-400 font-medium">WhatsApp</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Restaurante</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Rating</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Opinión</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentVotes.map((v) => (
                        <tr key={v.id} className="border-b border-surface-3/50 hover:bg-surface-2/50">
                          <td className="p-3 font-medium">{v.nombre}</td>
                          <td className="p-3 text-gray-400">{v.whatsapp}</td>
                          <td className="p-3">{v.restaurant_name}</td>
                          <td className="p-3 text-gold font-bold">{v.rating} ⭐</td>
                          <td className="p-3 text-xs text-gray-300 max-w-[200px]">
                            {v.opinion ? (
                              <span className="italic">"{v.opinion}"</span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{new Date(v.voted_at).toLocaleString('es-CO')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* CONTACTOS */}
          {tab === 'contactos' && (
            <motion.div key="contactos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Contactos</h2>
                  <p className="text-sm text-gray-400 mt-1">Click en un usuario para ver sus votos</p>
                </div>
                <a href="/api/admin/export"
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark rounded-xl text-sm font-medium transition-colors">
                  <Download size={16} /> Exportar CSV
                </a>
              </div>

              {/* Search + Filter bar */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Buscar por nombre o WhatsApp..."
                    className="w-full px-4 py-2.5 pl-10 bg-surface-1 border border-surface-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                </div>
                <select
                  value={contactRestaurantFilter}
                  onChange={(e) => setContactRestaurantFilter(e.target.value)}
                  className="px-4 py-2.5 bg-surface-1 border border-surface-3 rounded-xl text-sm text-white focus:outline-none focus:border-brand transition-colors appearance-none min-w-[180px]"
                >
                  <option value="">Todos los restaurantes</option>
                  {stats.restaurantStats.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Filtered voters */}
              {(() => {
                const filtered = stats.topVoters.filter((v) => {
                  const searchMatch = !contactSearch ||
                    v.nombre.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    v.whatsapp.includes(contactSearch);
                  const restaurantMatch = !contactRestaurantFilter ||
                    v.vote_details.some(d => d.restaurant_name === contactRestaurantFilter);
                  return searchMatch && restaurantMatch;
                });

                return (
                  <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-3">
                            <th className="text-left p-3 text-gray-400 font-medium">Nombre</th>
                            <th className="text-left p-3 text-gray-400 font-medium">WhatsApp</th>
                            <th className="text-left p-3 text-gray-400 font-medium">Restaurantes</th>
                            <th className="text-left p-3 text-gray-400 font-medium">Rating Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((v) => (
                            <tr
                              key={v.whatsapp}
                              onClick={() => { setSelectedVoter(v); setVoterModalOpen(true); }}
                              className="border-b border-surface-3/50 hover:bg-surface-2/50 cursor-pointer transition-colors"
                            >
                              <td className="p-3 font-medium">{v.nombre}</td>
                              <td className="p-3 text-gray-400">{v.whatsapp}</td>
                              <td className="p-3">
                                <span className="text-xs bg-surface-2 px-2 py-0.5 rounded-full">
                                  {v.votes_count} {v.votes_count === 1 ? 'restaurante' : 'restaurantes'}
                                </span>
                              </td>
                              <td className="p-3 text-gold font-bold">{v.avg_rating} ⭐</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filtered.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        {contactSearch || contactRestaurantFilter ? 'Sin resultados' : 'Aún no hay contactos'}
                      </p>
                    )}
                    <div className="p-3 border-t border-surface-3 text-xs text-gray-500">
                      {filtered.length} {filtered.length === 1 ? 'contacto' : 'contactos'}
                      {(contactSearch || contactRestaurantFilter) && ` (filtrado de ${stats.topVoters.length})`}
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 p-4 bg-surface-2 rounded-xl text-xs text-gray-500">
                💡 El CSV exporta: Nombre, WhatsApp, Restaurantes Votados, Rating Promedio, Primer y Último Voto.
              </div>

              {/* Voter detail modal */}
              {selectedVoter && (
                <VoterModal
                  isOpen={voterModalOpen}
                  onClose={() => { setVoterModalOpen(false); setSelectedVoter(null); }}
                  nombre={selectedVoter.nombre}
                  whatsapp={selectedVoter.whatsapp}
                  votes={selectedVoter.vote_details}
                  avgRating={selectedVoter.avg_rating}
                />
              )}
            </motion.div>
          )}

          {/* =================== CONFIGURACIÓN =================== */}
          {tab === 'configuracion' && (
            <motion.div key="configuracion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-xl font-bold mb-6">Configuración del Evento</h2>

              <div className="space-y-6 max-w-lg">
                {/* Logo */}
                <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4">Logo del Evento</h3>
                  <ImageDropZone
                    currentUrl={settingsForm.logo_url}
                    onUpload={uploadLogoImage}
                    size="md"
                    hint="Logo del evento · JPG, PNG, WebP · Máx 20MB · Recomendado 400x400"
                  />
                </div>

                {/* Nombre y tagline */}
                <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5 space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Nombre del Evento</label>
                    <input
                      value={settingsForm.event_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, event_name: e.target.value })}
                      placeholder="Uraba Food Fest"
                      className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Tagline / Eslogan</label>
                    <input
                      value={settingsForm.event_tagline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, event_tagline: e.target.value })}
                      placeholder="Vota por la mejor hamburguesa"
                      className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm focus:outline-none focus:border-brand"
                    />
                  </div>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
