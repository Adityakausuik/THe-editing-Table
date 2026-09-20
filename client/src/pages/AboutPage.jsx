import { m } from "framer-motion";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  Film,
  Globe2,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wand2,
  ZoomIn
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/ui/Container.jsx";
import ImageZoomModal from "../components/ui/ImageZoomModal.jsx";
import { apiFetch, mediaUrl, subscribeToCmsChanges } from "../lib/api.js";

const DEFAULT_ABOUT_DATA = {
  fullName: "Akshay Chhabra",
  designation: "Founder & Creative Director",
  location: "Mohali, Punjab • Global Remote",
  profileImage: "/assets/akshay-chhabra-founder.jpg",
  quote: "Every frame matters. Every story deserves its own visual language.",
  introBadge: "FOUNDER & CREATIVE DIRECTOR",
  introTitle: "Akshay Chhabra",
  introSubtitle:
    "Founder and creative force behind The Editing Table — crafting bespoke visual language and cinematic color science for premier storytellers worldwide.",
  aboutHeading: "Crafting Stories Beyond The Frame",
  aboutParagraphs: [
    "Founded by Akshay Chhabra, The Editing Table was established with a singular conviction: every filmmaker, photographer, and creative brand deserves post-production that elevates their visual storytelling to cinematic perfection.",
    "Over the past decade, Akshay has overseen hundreds of luxury wedding films, high-fashion editorial campaigns, and commercial master deliveries across India, the UK, Europe, and North America.",
    "Working at the intersection of raw human emotion and technical color science, Akshay personally directs the studio's workflow to preserve each client's signature aesthetic while applying calibrated 35mm analog emulation and precision color grading."
  ],
  visionHeading: "A Vision for Global Cinematic Post-Production",
  visionText:
    "To build an artist-first post-production house that bridges the gap between raw footage capture and theatrical-grade master delivery. By combining calibrated color-managed pipelines (ACES / DaVinci YRGB) with artisanal retouching, we empower filmmakers and photographers to scale their output without compromising on bespoke craftsmanship.",
  experienceYears: "10+ Years",
  experienceHeading: "A Decade of High-End Post-Production Mastery",
  experienceText:
    "With over ten years spearheading post-production pipelines, Akshay combines the technical precision of color science with an innate sensibility for pacing, tone, and editorial rhythm.",
  skills: [
    "DaVinci Resolve Studio",
    "ACES Color Science",
    "Analog 35mm Film Emulation",
    "Micro Dodge & Burn",
    "High-Fashion Retouching",
    "Dolby Vision HDR",
    "DIT & Ingest Workflows",
    "Commercial Finishing"
  ],
  whatIDo: [
    {
      title: "Creative Direction & Color Science",
      tag: "Direction",
      description:
        "Developing bespoke look profiles, custom LUTs, and color-managed pipelines tailored to each production's artistic identity."
    },
    {
      title: "Narrative Assembly & Pacing",
      tag: "Editorial",
      description:
        "Shaping raw wedding cinema, fashion films, and brand narratives into rhythmic stories that resonate emotionally."
    },
    {
      title: "High-Fashion Editorial Retouching",
      tag: "Retouching",
      description:
        "Micro-level skin texture preservation, frequency separation, and color grading for high-end campaigns and editorial spreads."
    },
    {
      title: "Studio Quality Gate & Delivery",
      tag: "Mastering",
      description:
        "Personal frame-by-frame QC on every delivery, guaranteeing DCI-P3 / Rec.709 calibration and broadcast compliance."
    }
  ],
  companyRoleHeading: "The Editing Table — Dedicated Studio Infrastructure",
  companyRoleText:
    "As Founder and Creative Director, Akshay leads the studio's dedicated post-production team in Mohali, Punjab. Every client engagement pairs boutique personal consultation with studio-scale processing speed and security.",
  turnaroundHours: "48-72 Hours",
  clientRetentionRate: "99.8%",
  globalDelivery: "Worldwide • Calibrated Cloud Workflows",
  philosophyHeading: "Creative & Production Philosophy",
  philosophyPillars: [
    {
      title: "Uncompromising Precision",
      description:
        "Every cut, curve, and grade is executed with micro-precision. We never rely on generic presets; each project receives custom look development."
    },
    {
      title: "Filmic Authenticity",
      description:
        "Inspired by classic 35mm and medium-format film stocks, our grading honors natural skin tones, organic halation, and filmic grain response."
    },
    {
      title: "Bespoke Partnership",
      description:
        "We operate as an extension of your studio team. Your signature style is strictly documented and preserved across all future seasons."
    }
  ]
};

const RESPONSIBILITY_ICONS = [Palette, Film, Wand2, ShieldCheck];
const PILLAR_ICONS = [Target, Compass, Award];

const DEFAULT_TEAM = [
  {
    _id: "team-1",
    fullName: "Akshay Chhabra",
    designation: "Founder & Creative Director",
    category: "Creative Direction",
    shortBio: "Leading post-production direction, creative color science, and strategic studio vision.",
    profileImage: "/assets/akshay-chhabra-founder.jpg"
  },
  {
    _id: "team-2",
    fullName: "Elena Rostova",
    designation: "Lead DaVinci Colorist",
    category: "Color Science",
    shortBio: "Specializing in 35mm Kodak stock emulation, skin tone preservation, and Dolby Vision HDR mastering.",
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85"
  },
  {
    _id: "team-3",
    fullName: "Marcus Vance",
    designation: "Head of Photo Retouching",
    category: "Editorial Retouching",
    shortBio: "Overseeing high-fashion editorial retouching, frequency separation, and micro dodge & burn.",
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85"
  },
  {
    _id: "team-4",
    fullName: "Claire Beaumont",
    designation: "Supervising Sound Editor",
    category: "Sound Design",
    shortBio: "Crafting immersive spatial soundscapes, dialogue clarity, and theatrical dynamic range audio finishing.",
    profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=85"
  }
];

export default function AboutPage() {
  const [data, setData] = useState(DEFAULT_ABOUT_DATA);
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [activeZoomImage, setActiveZoomImage] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadAbout = () => {
      apiFetch("/api/v1/cms/about-me")
        .then((res) => {
          if (isMounted && res?.data) {
            setData((prev) => ({
              ...prev,
              ...res.data,
              aboutParagraphs:
                Array.isArray(res.data.aboutParagraphs) && res.data.aboutParagraphs.length > 0
                  ? res.data.aboutParagraphs
                  : prev.aboutParagraphs,
              skills:
                Array.isArray(res.data.skills) && res.data.skills.length > 0
                  ? res.data.skills
                  : prev.skills,
              whatIDo:
                Array.isArray(res.data.whatIDo) && res.data.whatIDo.length > 0
                  ? res.data.whatIDo
                  : prev.whatIDo,
              philosophyPillars:
                Array.isArray(res.data.philosophyPillars) && res.data.philosophyPillars.length > 0
                  ? res.data.philosophyPillars
                  : prev.philosophyPillars
            }));
          }
        })
        .catch(() => {
          // Fallback default state remains active
        });
    };

    loadAbout();

    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (!detail?.key || detail.key === "about-me") {
        loadAbout();
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadTeam = async () => {
      try {
        const res = await apiFetch("/api/v1/cms/team");
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const activeList = list.filter((item) => item.active !== false);
        if (isMounted && activeList.length > 0) {
          setTeamMembers(activeList);
        }
      } catch {
        // Keep DEFAULT_TEAM fallback
      }
    };

    loadTeam();

    const unsubscribe = subscribeToCmsChanges((detail) => {
      if (!detail?.key || detail.key === "team") {
        loadTeam();
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === "#team") {
      const el = document.getElementById("team");
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    }
  }, []);

  const portraitUrl = mediaUrl(data.profileImage || "/assets/akshay-chhabra-founder.jpg");

  return (
    <div className="pt-28 pb-20 bg-sage-bg text-forest space-y-20 select-none overflow-x-hidden">
      {/* 1. HERO SPOTLIGHT & INTRO */}
      <section className="relative py-14 sm:py-20 bg-sage-secondary/40 border-b border-sage-border/60">
        <Container className="max-w-5xl text-center space-y-6">
          <m.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/90 px-4 py-1.5 backdrop-blur-md shadow-soft"
          >
            <Sparkles className="h-4 w-4 text-site" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-site">
              {data.introBadge || "FOUNDER & CREATIVE DIRECTOR"}
            </span>
          </m.div>

          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-normal text-forest leading-[1.08]"
          >
            {data.introTitle || data.fullName}
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-sage-muted max-w-3xl mx-auto leading-relaxed"
          >
            {data.introSubtitle}
          </m.p>
        </Container>
      </section>

      {/* 2. FOUNDER PROFILE & ABOUT THE JOURNEY */}
      <section>
        <Container className="grid gap-12 lg:grid-cols-[1.05fr_1.25fr] items-center max-w-[1280px] mx-auto">
          {/* Portrait Card with Zoom Modal Trigger */}
          <m.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={`Zoom photo of ${data.fullName}`}
              onClick={() =>
                setActiveZoomImage({
                  src: portraitUrl,
                  name: data.fullName,
                  role: data.designation
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setActiveZoomImage({
                    src: portraitUrl,
                    name: data.fullName,
                    role: data.designation
                  });
                }
              }}
              className="group relative rounded-3xl overflow-hidden border border-sage-border bg-sage-card p-3 shadow-editorial cursor-pointer transition-all duration-300 hover:shadow-deep"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-forest">
                <img
                  src={portraitUrl}
                  alt={`${data.fullName} - ${data.designation}`}
                  className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/85 via-forest/20 to-transparent pointer-events-none" />

                {/* Hover Zoom Badge Overlay */}
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-white backdrop-blur-[2px]">
                  <ZoomIn className="h-6 w-6 text-site animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-widest">Click to Zoom Portrait</span>
                </div>

                {/* Floating Portrait Badge */}
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-forest/80 backdrop-blur-md p-4 text-white space-y-1 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-site">
                    {data.designation}
                  </span>
                  <h3 className="font-heading text-2xl font-semibold">{data.fullName}</h3>
                  <p className="text-xs text-white/80">{data.location}</p>
                </div>
              </div>
            </div>
          </m.div>

          {/* About & Journey Text */}
          <m.div
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-6 text-left"
          >
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-site">
                ABOUT &amp; PROFESSIONAL JOURNEY
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl text-forest font-normal leading-tight">
                {data.aboutHeading}
              </h2>
            </div>

            {/* Direct Quote Box */}
            <div className="rounded-2xl border-l-4 border-[rgb(72,125,72)] bg-sage-secondary/40 p-5 shadow-soft">
              <p className="font-serif italic text-base sm:text-lg text-forest leading-relaxed">
                &ldquo;{data.quote}&rdquo;
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-site mt-2">
                — {data.fullName}, {data.designation}
              </p>
            </div>

            {/* Story Paragraphs */}
            <div className="space-y-4 text-sage-muted text-sm sm:text-base leading-relaxed">
              {data.aboutParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-sage-border/80">
              <div>
                <p className="font-heading text-3xl text-forest font-semibold">{data.experienceYears}</p>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider mt-0.5">Post Mastery</p>
              </div>
              <div>
                <p className="font-heading text-3xl text-forest font-semibold">{data.turnaroundHours}</p>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider mt-0.5">Rapid Delivery</p>
              </div>
              <div>
                <p className="font-heading text-3xl text-forest font-semibold">{data.clientRetentionRate}</p>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider mt-0.5">Client Satisfaction</p>
              </div>
              <div>
                <p className="font-heading text-3xl text-forest font-semibold">100%</p>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider mt-0.5">Founder QC</p>
              </div>
            </div>
          </m.div>
        </Container>
      </section>

      {/* 3. VISION FOR GLOBAL CINEMATIC POST-PRODUCTION */}
      <section className="py-16 bg-sage-secondary/30 border-y border-sage-border/60">
        <Container className="max-w-4xl text-center space-y-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-site">
            STUDIO VISION
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-forest font-normal leading-tight">
            {data.visionHeading}
          </h2>
          <p className="text-base sm:text-lg text-sage-muted leading-relaxed max-w-3xl mx-auto">
            {data.visionText}
          </p>
        </Container>
      </section>

      {/* 4. EXPERIENCE & SPECIALIZED SKILLS */}
      <section>
        <Container className="max-w-[1280px] mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              TECHNICAL EXPERTISE
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl text-forest font-normal">
              {data.experienceHeading}
            </h2>
            <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
              {data.experienceText}
            </p>
          </div>

          {/* Skill Badges Flow */}
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {data.skills.map((skill, index) => (
              <m.div
                key={skill}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card px-5 py-2.5 text-xs sm:text-sm font-medium text-forest shadow-soft hover:border-[rgb(72,125,72)] hover:bg-sage-secondary transition-all"
              >
                <Sparkles className="h-3.5 w-3.5 text-site shrink-0" />
                <span>{skill}</span>
              </m.div>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. WHAT I DO — CORE RESPONSIBILITIES */}
      <section className="py-16 bg-sage-secondary/20 border-y border-sage-border/60">
        <Container className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              CORE PRACTICE AREAS
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl text-forest font-normal">
              What I Do — Craft &amp; Responsibilities
            </h2>
            <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
              From creative consultation to final delivery, every touchpoint is engineered for cinematic impact.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {data.whatIDo.map((item, index) => {
              const Icon = RESPONSIBILITY_ICONS[index % RESPONSIBILITY_ICONS.length];
              return (
                <m.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="rounded-3xl border border-sage-border bg-sage-card p-6 space-y-4 shadow-soft transition-all duration-300 hover:shadow-editorial hover:-translate-y-1 text-left flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-[rgb(72,125,72)]/10 flex items-center justify-center text-site">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-site bg-sage-secondary px-2.5 py-0.5 rounded-full border border-[rgb(72,125,72)]/20">
                        {item.tag || "Focus"}
                      </span>
                    </div>

                    <h3 className="font-heading text-xl text-forest font-semibold leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-sage-muted leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-sage-border/40 text-[11px] font-semibold text-site flex items-center gap-1">
                    <span>Precision Standard</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </m.div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 6. THE EDITING TABLE STUDIO & INFRASTRUCTURE */}
      <section>
        <Container className="max-w-[1280px] mx-auto grid gap-10 lg:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-site">
                STUDIO INFRASTRUCTURE
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl text-forest font-normal leading-tight">
                {data.companyRoleHeading}
              </h2>
            </div>

            <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
              {data.companyRoleText}
            </p>

            <div className="grid gap-4 sm:grid-cols-3 pt-2">
              <div className="rounded-2xl border border-sage-border bg-sage-card p-4 space-y-1 shadow-soft">
                <Clock className="h-5 w-5 text-site" />
                <h4 className="font-heading text-lg text-forest font-semibold">{data.turnaroundHours}</h4>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider">Fast Turnaround</p>
              </div>

              <div className="rounded-2xl border border-sage-border bg-sage-card p-4 space-y-1 shadow-soft">
                <Globe2 className="h-5 w-5 text-site" />
                <h4 className="font-heading text-lg text-forest font-semibold">Worldwide</h4>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider">Calibrated Delivery</p>
              </div>

              <div className="rounded-2xl border border-sage-border bg-sage-card p-4 space-y-1 shadow-soft">
                <Layers className="h-5 w-5 text-site" />
                <h4 className="font-heading text-lg text-forest font-semibold">DaVinci / ACES</h4>
                <p className="text-[11px] text-sage-muted uppercase tracking-wider">Color Science</p>
              </div>
            </div>
          </div>

          {/* Delivery & Security Guarantee Box */}
          <div className="rounded-3xl border border-sage-border bg-forest p-8 sm:p-10 text-white space-y-6 shadow-deep text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-site">
              <ShieldCheck className="h-4 w-4" /> Confidential &amp; Calibrated
            </div>

            <h3 className="font-heading text-2xl sm:text-3xl font-normal leading-snug">
              Encrypted Pipelines &amp; Broadcast Precision
            </h3>

            <ul className="space-y-3 text-xs sm:text-sm text-white/80">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-site shrink-0 mt-0.5" />
                <span>DCI-P3 and Rec.709 color-calibrated Flanders Scientific grading monitors.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-site shrink-0 mt-0.5" />
                <span>Encrypted cloud asset exchange via ultra-fast multi-gigabit fiber connections.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-site shrink-0 mt-0.5" />
                <span>Strict Non-Disclosure Agreements (NDA) honoring brand and wedding confidentiality.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-site hover:text-white transition"
              >
                <span>Explore Full Service Suite</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* 7. STUDIO TEAM & MASTER ARTISTS */}
      <section id="team" className="py-20 bg-sage-secondary/25 border-y border-sage-border/60">
        <Container className="max-w-[1280px] mx-auto space-y-12 text-center">
          <div className="space-y-4 max-w-3xl mx-auto">
            <m.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[rgb(72,125,72)]/30 bg-sage-card/90 px-4 py-1.5 backdrop-blur-md shadow-soft"
            >
              <Users className="h-4 w-4 text-site" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-site">
                THE STUDIO ENSEMBLE
              </span>
            </m.div>

            <m.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading text-3xl sm:text-4xl lg:text-5xl text-forest font-normal"
            >
              Master Artists &amp; Craftsmen
            </m.h2>

            <m.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm sm:text-base text-sage-muted max-w-2xl mx-auto leading-relaxed"
            >
              A specialized collective of colorists, retouching artists, and audio engineers collaborating under the creative direction of Akshay Chhabra to deliver theatrical-grade master finishing.
            </m.p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-4">
            {teamMembers.map((member, index) => {
              const memberName = member.fullName || member.name || "Studio Artist";
              const memberRole = member.designation || member.role || "Specialist";
              const memberBio = member.shortBio || member.bio || "";
              const memberCategory = member.category || "Post-Production";
              const memberPhoto = mediaUrl(
                member.profileImage || member.avatar || member.image || "/assets/akshay-chhabra-founder.jpg"
              );

              return (
                <m.div
                  key={member._id || member.slug || index}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group relative rounded-3xl border border-sage-border bg-sage-card p-6 shadow-soft hover:shadow-editorial transition-all duration-500 flex flex-col items-center text-center overflow-hidden hover:-translate-y-1.5"
                >
                  {/* Member Portrait with Zoom Modal Trigger */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Zoom photo of ${memberName}`}
                    onClick={() =>
                      setActiveZoomImage({
                        src: memberPhoto,
                        name: memberName,
                        role: memberRole
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setActiveZoomImage({
                          src: memberPhoto,
                          name: memberName,
                          role: memberRole
                        });
                      }
                    }}
                    className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-2xl overflow-hidden mb-5 bg-forest/5 border border-sage-border group-hover:border-[rgb(72,125,72)]/60 transition-all duration-300 shadow-inner cursor-pointer"
                  >
                    <img
                      src={memberPhoto}
                      alt={memberName}
                      loading="lazy"
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    <div className="absolute inset-0 bg-forest/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-forest shadow-soft">
                        <ZoomIn className="h-3.5 w-3.5 text-site" />
                        <span>Inspect</span>
                      </span>
                    </div>
                  </div>

                  {/* Category Pill */}
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-site bg-[rgb(72,125,72)]/10 px-3 py-0.5 rounded-full mb-2">
                    {memberCategory}
                  </span>

                  {/* Name */}
                  <h3 className="font-heading text-xl sm:text-2xl text-forest font-normal group-hover:text-site transition-colors leading-snug">
                    {memberName}
                  </h3>

                  {/* Role */}
                  <p className="text-xs font-semibold text-sage-muted tracking-wide mt-1 mb-3">
                    {memberRole}
                  </p>

                  <div className="w-8 h-px bg-sage-border group-hover:w-16 group-hover:bg-[rgb(72,125,72)]/60 transition-all duration-300 mb-3" />

                  {/* Bio */}
                  {memberBio && (
                    <p className="text-xs text-sage-muted leading-relaxed line-clamp-3">
                      {memberBio}
                    </p>
                  )}

                  <div className="mt-auto pt-4 flex items-center gap-1.5 text-[11px] font-semibold text-site">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Studio Resident</span>
                  </div>
                </m.div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 8. CREATIVE & PRODUCTION PHILOSOPHY */}
      <section className="py-16 bg-sage-secondary/30 border-y border-sage-border/60">
        <Container className="max-w-[1280px] mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-site">
              CORE PHILOSOPHY
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl text-forest font-normal">
              {data.philosophyHeading}
            </h2>
            <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
              Three unyielding pillars that govern every cut, curve, and frame grade produced at The Editing Table.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {data.philosophyPillars.map((pillar, index) => {
              const Icon = PILLAR_ICONS[index % PILLAR_ICONS.length];
              return (
                <div
                  key={pillar.title}
                  className="rounded-3xl border border-sage-border bg-sage-card p-8 space-y-4 shadow-soft text-left"
                >
                  <div className="h-12 w-12 rounded-2xl bg-[rgb(72,125,72)]/10 flex items-center justify-center text-site">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-2xl text-forest font-semibold">{pillar.title}</h3>
                  <p className="text-sm text-sage-muted leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 8. CALL TO ACTION */}
      <section className="text-center py-12">
        <Container className="max-w-2xl space-y-6">
          <h2 className="font-heading text-4xl sm:text-5xl text-forest font-normal">
            Ready to Elevate Your Post-Production?
          </h2>
          <p className="text-sm sm:text-base text-sage-muted leading-relaxed">
            Let&apos;s discuss your upcoming wedding season, editorial campaign, or film project. Work directly with Akshay Chhabra and our specialized team.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              to="/contactus"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[rgb(72,125,72)] px-8 py-3.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[#7C9B69]"
            >
              <span>Connect with Akshay</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sage-border bg-sage-card px-8 py-3.5 text-sm font-semibold text-forest hover:border-[rgb(72,125,72)] hover:text-site transition"
            >
              <span>View Portfolio</span>
            </Link>
          </div>
        </Container>
      </section>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={Boolean(activeZoomImage)}
        onClose={() => setActiveZoomImage(null)}
        imageSrc={activeZoomImage?.src}
        imageName={activeZoomImage?.name}
        imageRole={activeZoomImage?.role}
      />
    </div>
  );
}
