import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  Shield, 
  Clock, 
  Globe, 
  ArrowRight, 
  Menu, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ChevronRight,
  Anchor,
  Box,
  CornerDownRight,
  Car,
  UserCheck
} from 'lucide-react';

// --- Components ---

const Navbar = ({ onOpenModal }: { onOpenModal: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '#inicio' },
    { name: 'Nosotros', href: '#nosotros' },
    { name: 'Servicios', href: '#servicios' },
    { name: 'Flota', href: '#flota' },
    { name: 'Contacto', href: '#contacto' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled ? 'bg-white/80 backdrop-blur-xl shadow-xl py-3 border-b border-white/20' : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-brand-accent p-2 rounded-lg group-hover:bg-brand-blue transition-colors duration-300">
            <Truck className="text-white w-6 h-6" />
          </div>
          <span className={`text-xl font-bold font-display tracking-tight ${isScrolled ? 'text-brand-blue' : 'text-slate-900'}`}>
            RUZT<span className="text-brand-accent">MAR</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className={`text-sm font-medium hover:text-brand-accent transition-colors ${
                isScrolled ? 'text-slate-600' : 'text-slate-700'
              }`}
            >
              {link.name}
            </a>
          ))}
          <button 
            onClick={onOpenModal}
            className="bg-brand-accent hover:bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
          >
            Cotizar Envío
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-slate-900" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href}
                  className="text-lg font-medium text-slate-800"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenModal();
                }}
                className="bg-brand-blue text-white px-5 py-4 rounded-xl text-center font-bold"
              >
                Cotizar Envío
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const TruckSVG = ({ className, color = "currentColor" }: { className?: string; color?: string }) => (
  <svg viewBox="0 0 240 100" className={className} fill={color}>
    {/* Chassis */}
    <rect x="10" y="70" width="210" height="15" rx="2" fill="#334155" />
    
    {/* Trailer Body */}
    <rect x="10" y="20" width="160" height="55" rx="2" />
    <path d="M10 30 L170 30" stroke="white" strokeWidth="0.5" opacity="0.3" />
    <path d="M10 40 L170 40" stroke="white" strokeWidth="0.5" opacity="0.3" />
    <path d="M10 50 L170 50" stroke="white" strokeWidth="0.5" opacity="0.3" />
    
    {/* Cab */}
    <rect x="175" y="35" width="55" height="45" rx="4" />
    <rect x="185" y="40" width="30" height="15" rx="2" fill="white" opacity="0.3" />
    <rect x="175" y="60" width="8" height="2" fill="white" opacity="0.5" /> {/* Light */}
    
    {/* Wheels with detail */}
    <g fill="#1e293b">
      <circle cx="35" cy="85" r="10" />
      <circle cx="35" cy="85" r="4" fill="#94a3b8" />
      
      <circle cx="60" cy="85" r="10" />
      <circle cx="60" cy="85" r="4" fill="#94a3b8" />
      
      <circle cx="130" cy="85" r="10" />
      <circle cx="130" cy="85" r="4" fill="#94a3b8" />
      
      <circle cx="185" cy="85" r="10" />
      <circle cx="185" cy="85" r="4" fill="#94a3b8" />
      
      <circle cx="210" cy="85" r="10" />
      <circle cx="210" cy="85" r="4" fill="#94a3b8" />
    </g>
  </svg>
);

const Hero = ({ onOpenModal }: { onOpenModal: () => void }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // More dramatic truck movement
  const leftTruckX = useTransform(scrollYProgress, [0, 0.6], [0, -1500]);
  const rightTruckX = useTransform(scrollYProgress, [0, 0.6], [0, 1500]);
  const trucksOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const trucksScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.2]);
  
  // Content reveal
  const contentOpacity = useTransform(scrollYProgress, [0.4, 0.7], [0, 1]);
  const contentY = useTransform(scrollYProgress, [0.4, 0.7], [60, 0]);

  return (
    <section id="inicio" ref={containerRef} className="relative h-[250vh] bg-slate-50 selection:bg-brand-accent selection:text-white">
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        
        {/* Animated Liquid Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 100, 0],
              y: [0, 50, 0] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-blue blur-[120px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              x: [0, -100, 0],
              y: [0, -50, 0] 
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-accent blur-[150px] rounded-full"
          />
        </div>
        
        {/* Background Grid Accent */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(to right, #003a8c 1px, transparent 1px), linear-gradient(to bottom, #003a8c 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Trucks Layer */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            style={{ x: leftTruckX, opacity: trucksOpacity, scale: trucksScale }}
            className="absolute left-[10%] text-slate-700 w-80 md:w-[500px]"
          >
            <TruckSVG className="transform scale-x-[-1]" color="#1e293b" />
          </motion.div>
          <motion.div 
            style={{ x: rightTruckX, opacity: trucksOpacity, scale: trucksScale }}
            className="absolute right-[10%] text-brand-accent w-80 md:w-[500px]"
          >
            <TruckSVG />
          </motion.div>
        </div>

        {/* Initial Overlay Title */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]), scale: useTransform(scrollYProgress, [0, 0.3], [1, 0.9]) }}
          className="z-10 text-center px-6"
        >
          <h2 className="text-lg uppercase tracking-[0.4em] font-bold text-brand-accent mb-6 drop-shadow-sm">
            RUZTMAR
          </h2>
          <h1 className="text-7xl md:text-9xl font-black text-brand-blue leading-none select-none">
            RUZTMAR
          </h1>
          <p className="mt-8 text-slate-500 font-medium tracking-[0.2em] uppercase">Logística y Transporte de Confianza</p>
        </motion.div>

        {/* Revealed Content */}
        <motion.div 
          style={{ opacity: contentOpacity, y: contentY }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 max-w-5xl mx-auto text-center"
        >
          <span className="px-5 py-2 bg-orange-100 text-brand-accent text-xs font-black rounded-full uppercase tracking-widest mb-8 border border-orange-200">
            Excelencia en Movimiento
          </span>
          <h2 className="text-5xl md:text-7xl font-black text-brand-blue mb-8 leading-tight">
            Logística y Transporte <br/> 
            <span className="text-brand-accent">Ruztmar</span>
          </h2>
          <p className="text-xl text-slate-600 mb-12 max-w-3xl font-medium leading-relaxed">
            Soluciones integrales de transporte de carga pesada. Comprometidos con la seguridad, la puntualidad y el crecimiento de tu empresa. 
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            <button 
              onClick={onOpenModal}
              className="bg-brand-accent text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/30 group"
            >
              COTIZAR ENVÍO <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <button className="bg-white border-2 border-slate-200 text-brand-blue px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:border-brand-accent hover:text-brand-accent transition-all shadow-lg">
              HABLAR CON UN ASESOR
            </button>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
        >
          <span className="text-[10px] uppercase tracking-widest font-bold">Desliza</span>
          <div className="w-1 h-12 bg-slate-200 rounded-full relative overflow-hidden">
            <motion.div 
              animate={{ y: [0, 48, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 w-full h-1/4 bg-brand-yellow" 
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const About = () => {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Seguridad Garantizada",
      desc: "Protocolos estrictos de monitoreo GPS 24/7 y seguros de carga de cobertura total para tu mercancía."
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Puntualidad Ruztmar",
      desc: "Entregas precisas mediante optimización avanzada de rutas y conductores expertos."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Logística Integral",
      desc: "Más que transporte, somos tu aliado estratégico en toda la cadena de suministro."
    }
  ];

  return (
    <section id="nosotros" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-sm font-black text-brand-accent uppercase tracking-[0.3em] mb-4">Sobre Ruztmar</h2>
            <h3 className="text-4xl md:text-6xl font-black text-brand-blue mb-8 leading-tight">
              Moviendo el futuro <br/> con pasión y fuerza.
            </h3>
            <p className="text-slate-600 text-xl font-medium mb-10 leading-relaxed">
              En Logística y Transporte Ruztmar, nuestra misión es simplificar la complejidad del movimiento de carga pesada. Nos enfocamos en brindar un servicio excepcional que supere las expectativas de cada cliente.
            </p>
            <div className="grid gap-6">
              {features.map((f, i) => (
                <div key={i} className="flex gap-5 p-8 rounded-3xl border border-white/40 bg-white/40 backdrop-blur-md hover:border-brand-accent transition-all group cursor-default liquid-shadow">
                  <div className="text-brand-accent shrink-0 group-hover:scale-110 transition-transform duration-500">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-brand-blue mb-2">{f.title}</h4>
                    <p className="text-slate-500 font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] bg-slate-900 rounded-[4rem] overflow-hidden shadow-3xl liquid-glass-dark relative group">
              <img 
                src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=1000" 
                alt="Ruztmar Operations" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/40 to-transparent group-hover:opacity-0 transition-opacity duration-700" />
              <div className="absolute inset-0 glossy-gradient" />
            </div>
            {/* Stats Overlay */}
            <div className="absolute -bottom-8 -left-8 bg-brand-accent/90 backdrop-blur-xl text-white p-12 rounded-[3.5rem] shadow-2xl hidden md:block border border-white/20">
              <div className="text-6xl font-black mb-3">100%</div>
              <div className="text-sm uppercase tracking-[0.2em] font-black opacity-90">Compromiso Ruztmar</div>
              <div className="mt-8 flex gap-2">
                {[1, 2, 3].map(s => <div key={s} className="w-8 h-1.5 bg-white/40 rounded-full" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  const items = [
    {
      title: "Transporte de Carga Pesada",
      desc: "Movimiento de maquinaria especializada y piezas industriales de gran escala con total seguridad.",
      icon: <Truck className="w-12 h-12" />,
      color: "bg-orange-50"
    },
    {
      title: "Transporte Ejecutivo",
      desc: "Servicio premium de traslados ejecutivos y VIP con vehículos de alta gama y conductores profesionales.",
      icon: <Car className="w-12 h-12" />,
      color: "bg-slate-100"
    },
    {
      title: "Logística Industrial",
      desc: "Gestión completa de traslados a plantas, puertos y centros de distribución a nivel nacional.",
      icon: <Anchor className="w-12 h-12" />,
      color: "bg-orange-50"
    },
    {
      title: "Acompañamiento VIP",
      desc: "Seguridad y puntualidad para traslados corporativos con atención personalizada 24/7.",
      icon: <UserCheck className="w-12 h-12" />,
      color: "bg-slate-100"
    }
  ];

  return (
    <section id="servicios" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-sm font-black text-brand-accent uppercase tracking-[0.3em] mb-4">Nuestros Servicios</h2>
          <h3 className="text-4xl md:text-6xl font-black text-brand-blue">Soluciones Ruztmar</h3>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {items.map((item, i) => (
            <div key={i} className="bg-white/60 backdrop-blur-lg p-10 rounded-[3rem] shadow-xl border border-white hover:border-brand-accent transition-all duration-700 group liquid-shadow relative overflow-hidden">
              <div className="absolute inset-0 glossy-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className={`${item.color} p-5 rounded-3xl w-fit mb-8 text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-all duration-500 relative z-10`}>
                {item.icon}
              </div>
              <h4 className="text-2xl font-bold text-brand-blue mb-4 leading-tight relative z-10">{item.title}</h4>
              <p className="text-slate-500 font-medium leading-relaxed mb-10 relative z-10">{item.desc}</p>
              <button className="flex items-center gap-3 text-brand-accent font-black text-xs uppercase tracking-widest hover:gap-5 transition-all relative z-10">
                MÁS INFORMACIÓN <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Fleet = () => {
  return (
    <section id="flota" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div>
            <h2 className="text-sm font-black text-brand-accent uppercase tracking-[0.3em] mb-4">Nuestra Capacidad</h2>
            <h3 className="text-4xl md:text-6xl font-black text-brand-blue uppercase">Nuestra Flota</h3>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Truck */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="lg:col-span-2 group relative h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white"
          >
            <img 
              src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=1200" 
              alt="Vehículo Principal Ruztmar" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/95 via-brand-blue/20 to-transparent" />
            <div className="absolute top-8 left-8">
              <span className="bg-brand-accent text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                ACTUALMENTE DISPONIBLE
              </span>
            </div>
            <div className="absolute bottom-0 left-0 p-12">
              <h4 className="text-4xl font-black text-white mb-3">Tractomula Ref. R1</h4>
              <p className="text-slate-300 text-lg font-medium max-w-md">Capacidad extrema de 35 toneladas con sistema de monitoreo satelital avanzado.</p>
            </div>
          </motion.div>

          {/* Coming Soon */}
          <div className="bg-brand-blue rounded-[3rem] p-12 flex flex-col justify-center items-center text-center border-4 border-slate-800">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8">
              <Clock className="text-brand-accent w-10 h-10 animate-pulse" />
            </div>
            <h4 className="text-3xl font-black text-white mb-4">Próximamente</h4>
            <p className="text-slate-400 font-medium leading-relaxed">
              Estamos expandiendo nuestra flota para brindarte mayor cobertura y opciones de transporte especializado.
            </p>
            <div className="mt-10 flex gap-2">
               {[1, 2, 3].map(i => <div key={i} className="w-3 h-3 rounded-full bg-brand-accent/20" />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const QuotationForm = ({ isModal = false }: { isModal?: boolean }) => {
  return (
    <form className="space-y-6 relative z-10" onSubmit={(e) => e.preventDefault()}>
      <div className={`grid ${isModal ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Tu Nombre</label>
          <input type="text" placeholder="Ej. Carlos Rodríguez" className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-6 py-5 focus:outline-none focus:border-brand-accent transition-all font-medium shadow-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Empresa</label>
          <input type="text" placeholder="Nombre de tu compañía" className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-6 py-5 focus:outline-none focus:border-brand-accent transition-all font-medium shadow-sm" />
        </div>
      </div>
      <div className={`grid ${isModal ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Punto de Origen</label>
          <input type="text" placeholder="Ciudad / Puerto" className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-6 py-5 focus:outline-none focus:border-brand-accent transition-all font-medium shadow-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Punto de Destino</label>
          <input type="text" placeholder="Ciudad / Planta" className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-6 py-5 focus:outline-none focus:border-brand-accent transition-all font-medium shadow-sm" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Especifícación de Carga</label>
        <select className="w-full bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded-2xl px-6 py-5 focus:outline-none focus:border-brand-accent transition-all appearance-none font-medium cursor-pointer shadow-sm">
          <option>Maquinaria Pesada</option>
          <option>Carga de Volumen / Granel</option>
          <option>Contenedores</option>
          <option>Otros Proyectos</option>
        </select>
      </div>
      <button className="w-full bg-brand-accent text-white py-6 rounded-2xl font-black text-xl hover:bg-orange-600 transition-all shadow-2xl shadow-orange-500/40 uppercase tracking-[0.2em] relative overflow-hidden group">
        <div className="absolute inset-0 glossy-gradient opacity-20 group-hover:opacity-40 transition-opacity" />
        <span className="relative z-10">ENVIAR SOLICITUD</span>
      </button>
    </form>
  );
};

const QuotationModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-3xl border border-white p-8 md:p-12 overflow-y-auto max-h-[90vh] liquid-shadow"
          >
            <button 
              onClick={onClose}
              className="absolute top-8 right-8 text-slate-400 hover:text-brand-accent transition-colors"
            >
              <X size={32} />
            </button>
            <div className="mb-10 text-center">
              <span className="px-4 py-1.5 bg-orange-100 text-brand-accent text-[10px] font-black rounded-full uppercase tracking-widest border border-orange-200 inline-block mb-4">
                Solicitud Prioritaria
              </span>
              <h3 className="text-3xl md:text-5xl font-black text-brand-blue mb-4">Cotiza tu Envío</h3>
              <p className="text-slate-500 font-medium max-w-md mx-auto">
                Recibe una propuesta comercial personalizada en minutos.
              </p>
            </div>
            <QuotationForm isModal={true} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Contact = () => {
  return (
    <section id="contacto" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-white/40 backdrop-blur-[40px] rounded-[4rem] shadow-3xl overflow-hidden border border-white/60 liquid-shadow">
          <div className="grid lg:grid-cols-2">
            
            {/* Form */}
            <div className="p-8 md:p-16 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 blur-[80px] rounded-full pointer-events-none" />
              <h3 className="text-4xl md:text-5xl font-black text-brand-blue mb-6">Cotiza Ahora</h3>
              <p className="text-slate-500 text-lg mb-12 font-medium">Completa el formulario y un especialista logístico te contactará en minutos.</p>
              
              <QuotationForm />
            </div>

            {/* Contact Info */}
            <div className="liquid-glass-dark p-8 md:p-16 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/10 blur-[100px] rounded-full" />
              <div className="relative z-10">
                <h4 className="text-4xl font-black mb-12 tracking-tight">Línea Ruztmar</h4>
                <div className="space-y-10">
                  <div className="flex gap-6 items-start group">
                    <div className="bg-brand-accent p-4 rounded-2xl group-hover:rotate-12 transition-transform duration-500">
                      <Phone className="text-white w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest opacity-60 font-black mb-1">Atención Inmediata</div>
                      <div className="text-3xl font-black">+(57) 300 000 0000</div>
                    </div>
                  </div>
                  <div className="flex gap-6 items-start group">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl group-hover:scale-110 transition-transform duration-500 border border-white/5">
                      <Mail className="text-brand-accent w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest opacity-60 font-black mb-1">Consultas</div>
                      <div className="text-3xl font-black underline decoration-brand-accent underline-offset-8 decoration-4">contacto@ruztmar.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Map Simulation */}
              <div className="mt-16 h-64 bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] relative overflow-hidden border-2 border-white/10 group cursor-crosshair liquid-shadow">
                <div className="absolute inset-0 opacity-20 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s-l+f24e1e(-74.13,4.68)/-74.13,4.68,14/600x400?access_token=none')] bg-cover scale-110 group-hover:scale-100 transition-transform duration-2000" />
                <div className="absolute inset-0 bg-brand-blue/30" />
                <div className="absolute inset-0 glossy-gradient opacity-30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="w-10 h-10 bg-brand-accent/30 rounded-full animate-ping absolute" />
                  <div className="w-5 h-5 bg-brand-accent rounded-full relative z-10 shadow-[0_0_30px_rgba(242,78,30,0.8)] border-2 border-white" />
                </div>
                <div className="absolute bottom-6 left-6 text-[10px] uppercase font-black tracking-[0.4em] text-white/60">Cobertura Privilegiada Ruztmar</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 pb-20 border-bottom border-slate-100">
          <div className="col-span-1 lg:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-brand-accent p-2.5 rounded-xl">
                <Truck className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-black font-display tracking-tight text-brand-blue uppercase">
                RUZT<span className="text-brand-accent">MAR</span>
              </span>
            </div>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed text-lg">
              Expertos en logística y transporte de carga pesada. Comprometidos con el desarrollo industrial.
            </p>
            <div className="flex gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-12 h-12 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-brand-accent hover:border-brand-accent cursor-pointer transition-all">
                   <div className="w-5 h-5 bg-current rounded-md" />
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h5 className="text-lg font-black text-brand-blue mb-8 uppercase tracking-widest">Ruztmar</h5>
            <ul className="space-y-5 text-slate-500 font-medium">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Nosotros</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Nuestra Capacidad</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Seguridad Logística</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Trayectoria</a></li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-lg font-black text-brand-blue mb-8 uppercase tracking-widest">Servicios</h5>
            <ul className="space-y-5 text-slate-500 font-medium">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Carga Pesada</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Maquinaria</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Traslados Especiales</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Asesoría Logística</a></li>
            </ul>
          </div>

          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
            <h5 className="text-lg font-black text-white mb-6 uppercase tracking-widest">Atención Digital</h5>
            <p className="text-sm text-slate-400 mb-8 font-medium leading-relaxed">
              Conéctate con nuestro centro operativo para cualquier requerimiento urgente o cotización personalizada.
            </p>
            <button className="w-full bg-brand-accent text-white py-4 rounded-xl font-black text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
              ESCRIBIR POR WHATSAPP <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-slate-100">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            © 2026 Logística y Transporte Ruztmar.
          </div>
          <div className="flex gap-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <a href="#" className="hover:text-brand-blue transition-colors">Legal</a>
            <a href="#" className="hover:text-brand-blue transition-colors">Pólizas</a>
            <a href="#" className="hover:text-brand-blue transition-colors">Antifraude</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- App ---

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen font-sans">
      <Navbar onOpenModal={() => setIsModalOpen(true)} />
      <Hero onOpenModal={() => setIsModalOpen(true)} />
      <About />
      <Services />
      <Fleet />
      <Contact />
      <Footer />
      
      <QuotationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </main>
  );
}
