import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import {
    ArrowRight, ArrowUp, Heart, Church, CalendarDays, UsersRound,
    Flower2, Cross, BookOpen, CheckCircle2,
} from "lucide-react";

import GooeyNav from "@/components/GooeyNav";
import CardSwap, { Card } from "@/components/CardSwap";
import GlassSurface from "@/components/GlassSurface";
import ReflectiveCard from "@/components/ReflectiveCard";

const VIDEO = "/videos/reflection1.mp4";

/* ---------- Background layers (white base, soft colour on top) ---------- */

// Soft mesh of rose, lavender and peach light for the hero
const heroMesh = {
    backgroundImage: [
        "radial-gradient(55% 50% at 12% 8%, rgba(243,215,224,0.80), transparent 70%)",
        "radial-gradient(50% 45% at 90% 12%, rgba(226,222,244,0.75), transparent 70%)",
        "radial-gradient(40% 35% at 55% 60%, rgba(251,234,222,0.60), transparent 70%)",
    ].join(","),
};

// Fine grid that fades out from the top centre
const gridMask = "radial-gradient(ellipse 75% 65% at 50% 0%, #000 15%, transparent 75%)";
const gridStyle = {
    backgroundImage:
        "linear-gradient(to right, rgba(207,178,189,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(207,178,189,0.28) 1px, transparent 1px)",
    backgroundSize: "64px 64px",
    maskImage: gridMask,
    WebkitMaskImage: gridMask,
};

// Dot pattern that fades at the edges
const dotMask = "radial-gradient(ellipse 80% 70% at 50% 50%, #000 25%, transparent 78%)";
const dotStyle = {
    backgroundImage: "radial-gradient(rgba(177,134,150,0.38) 1px, transparent 1px)",
    backgroundSize: "26px 26px",
    maskImage: dotMask,
    WebkitMaskImage: dotMask,
};

const heroItems = [
    { title: "Be the voice of God's Word", image: "/images/cherry-blossom.png", icon: <Flower2 size={14} /> },
    { title: "A place to gather", image: "/images/church-interior.jpg", icon: <Church size={14} /> },
    { title: "Proclaim with joy", image: "/images/lectern-bible.jpg", icon: <BookOpen size={14} /> },
    { title: "Serving together", image: "/images/community.jpg", icon: <Heart size={14} /> },
];

const navItems = [
    { label: "Home", href: "/" },
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Login", href: "/admin/login" },
];

const features = [
    { icon: UsersRound, number: "01", title: "Our Lectors", description: "Keep your church lector community organised, connected and informed." },
    { icon: CalendarDays, number: "02", title: "Monthly Scheduling", description: "Plan Mass responsibilities with a fair and thoughtful monthly schedule." },
    { icon: Heart, number: "03", title: "Serving Together", description: "Make volunteering simpler so everyone can serve with joy and confidence." },
];

const steps = [
    { title: "Add your lectors", text: "Bring everyone into one organised list and keep track of their availability." },
    { title: "Build the schedule", text: "Assign Mass responsibilities fairly, keeping everyone's commitments in mind." },
    { title: "Serve with confidence", text: "Everyone knows their assigned Masses and has time to prepare." },
];

const readings = ["First Reading", "Responsorial Psalm", "Second Reading", "Gospel Acclamation", "Prayers of the Faithful"];

const petals = [
    { left: "9%", delay: 0, duration: 18, size: 9 },
    { left: "25%", delay: 4, duration: 22, size: 7 },
    { left: "48%", delay: 2, duration: 19, size: 10 },
    { left: "69%", delay: 6, duration: 24, size: 8 },
    { left: "88%", delay: 3, duration: 20, size: 9 },
];

function useMedia(query) {
    const [match, setMatch] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        const update = () => setMatch(media.matches);
        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, [query]);
    return match;
}

function FeatureBody({ feature }) {
    const Icon = feature.icon;
    return (
        <div className="relative flex h-full flex-col overflow-hidden rounded-[inherit] bg-white p-8">
            <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EFE6E9] bg-[#FBF4F6] text-[#9c7181]">
                    <Icon size={25} strokeWidth={1.7} />
                </div>
                <span className="text-xs font-semibold tracking-widest text-[#c8b4bb]">{feature.number}</span>
            </div>
            <h3 className="serif-heading mt-7 text-2xl font-semibold text-[#514248]">{feature.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#897e82]">{feature.description}</p>
            <div className="mt-auto pt-7">
                <div className="h-px w-full bg-gradient-to-r from-[#e6cbd4] via-[#eee5e8] to-transparent" />
            </div>
        </div>
    );
}

export default function Home() {
    const reduceMotion = useReducedMotion();
    const isSmall = useMedia("(max-width: 640px)");

    const { scrollYProgress, scrollY } = useScroll();
    const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 25 });
    const blobY = useTransform(scrollY, [0, 900], [0, reduceMotion ? 0 : 100]);
    const blobY2 = useTransform(scrollY, [0, 900], [0, reduceMotion ? 0 : -70]);

    const reveal = (delay = 0) => ({
        initial: reduceMotion ? false : { opacity: 0, y: 25 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-70px" },
        transition: { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] },
    });

    const word = (index) => ({
        initial: reduceMotion ? false : { opacity: 0, y: 25, filter: "blur(5px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        transition: { duration: 0.8, delay: 0.15 + index * 0.1, ease: [0.22, 1, 0.36, 1] },
    });

    return (
        <main className="relative min-h-screen overflow-x-clip bg-white text-[#40383C]" style={{ colorScheme: "light" }}>

            {/* ===== HERO BACKGROUND: mesh light + fading grid + two drifting orbs ===== */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[1000px] overflow-hidden" aria-hidden="true">
                <div className="absolute inset-0" style={heroMesh} />
                <div className="absolute inset-0" style={gridStyle} />
                <motion.div
                    style={{ y: blobY }}
                    className="absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-[#F1D3DD]/50 blur-[110px]"
                />
                <motion.div
                    style={{ y: blobY2 }}
                    className="absolute -right-40 top-40 h-[440px] w-[440px] rounded-full bg-[#DAD6F1]/50 blur-[120px]"
                />
                <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-b from-transparent to-white" />
            </div>

            {/* Scroll progress */}
            <motion.div
                className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-[#DAB7C3] via-[#A77C8C] to-[#8C718D]"
                style={{ scaleX: progress }}
            />

            {/* Falling petals */}
            {!reduceMotion && (
                <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
                    {petals.map((petal, index) => (
                        <motion.span
                            key={index}
                            className="petal"
                            style={{ left: petal.left, width: petal.size, height: petal.size * 1.4, opacity: 0.55 }}
                            initial={{ y: "-10vh", rotate: 0 }}
                            animate={{ y: "110vh", x: [0, 15, -12, 8, 0], rotate: 360 }}
                            transition={{ duration: petal.duration, delay: petal.delay, repeat: Infinity, ease: "linear" }}
                        />
                    ))}
                </div>
            )}

            {/* ===== HEADER ===== */}
            <header className="sticky top-0 z-50 px-4 pt-4">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                    <a href="/" className="flex shrink-0 items-center gap-3" aria-label="ChurchBuddy home">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white bg-white/85 p-1 shadow-[0_4px_18px_rgba(92,64,77,0.10)] backdrop-blur-xl">
                            <img src="/images/chruchlogo.png" alt="ChurchBuddy" className="h-full w-full rounded-full object-contain" />
                        </div>
                        <span className="serif-heading hidden text-xl font-semibold tracking-tight text-[#735766] xl:block">ChurchBuddy</span>
                    </a>

                    <div className="rounded-full border border-white/80 bg-white/70 p-1 shadow-[0_8px_30px_rgba(90,65,75,0.09)] backdrop-blur-2xl">
                        <GooeyNav
                            items={navItems}
                            initialActiveIndex={0}
                            theme="light"
                            size={isSmall ? "sm" : "md"}
                            frame
                            color="#916A79"
                            activeTextColor="#ffffff"
                            colors={["#E8CAD4", "#C394A3", "#EDE3EF"]}
                            particleCount={12}
                            spread={48}
                            animationTime={550}
                            timeVariance={250}
                            gooeyness={0.45}
                            wobble={0.4}
                            hoverEffect
                            style={{
                                "--gn-frame": "rgba(255,255,255,0.75)",
                                "--gn-frame-edge": "rgba(195,148,163,0.25)",
                                "--gn-frame-highlight": "#ffffff",
                                "--gn-frame-shadow": "0 8px 25px rgba(100,70,85,0.08)",
                                "--gn-ink": "#735766",
                                "--gn-muted": "rgba(115,87,102,0.7)",
                            }}
                        />
                    </div>

                    <div className="hidden w-12 shrink-0 sm:block" />
                </div>
            </header>

            {/* ===== HERO ===== */}
            <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-2 lg:px-10 lg:pb-32 lg:pt-20">
                <div className="relative z-10">
                    <motion.div
                        {...word(0)}
                        className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[#EADDE1] bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-xl"
                    >
                        <Cross size={14} className="text-[#A77989]" />
                        <span className="text-[11px] font-semibold tracking-[0.13em] text-[#806A72]">A COMMUNITY UNITED IN FAITH</span>
                    </motion.div>

                    <h1 className="serif-heading max-w-2xl text-5xl font-semibold leading-[1.12] tracking-tight text-[#40383C] sm:text-6xl lg:text-[76px]">
                        <motion.span className="mr-[0.22em] inline-block" {...word(1)}>Serving</motion.span>
                        <motion.span className="inline-block" {...word(2)}>together,</motion.span>
                        <span className="mt-2 block text-[#B27E90]">
                            {["blooming", "in", "faith."].map((w, i) => (
                                <motion.span key={w} className="mr-[0.22em] inline-block" {...word(i + 3)}>{w}</motion.span>
                            ))}
                        </span>
                    </h1>

                    <motion.p {...word(6)} className="mt-8 max-w-lg text-base leading-8 text-[#82777A] sm:text-lg">
                        Welcome to ChurchBuddy, a peaceful space to organise our lectors, coordinate Mass schedules and bring our church community together in service.
                    </motion.p>

                    <motion.div {...word(7)} className="mt-9 flex flex-wrap items-center gap-4">
                        <a
                            href="/admin/login"
                            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[#916A79] px-8 py-4 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(145,106,121,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#795665] hover:shadow-[0_15px_30px_rgba(145,106,121,0.30)]"
                        >
                            <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 transition-all duration-700 group-hover:left-[130%]" />
                            Get Started
                            <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                        </a>
                        <a
                            href="#about"
                            className="inline-flex items-center gap-2 rounded-full border border-[#E7D8DD] bg-white/80 px-8 py-4 text-sm font-semibold text-[#795D68] shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#C69AAA] hover:bg-white"
                        >
                            Discover More
                        </a>
                    </motion.div>

                    <motion.div {...word(8)} className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {[Heart, Church, Flower2].map((Icon, i) => (
                                <div key={i} className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-white shadow-sm">
                                    <Icon size={15} className="text-[#A77989]" />
                                </div>
                            ))}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#715A64]">Together in faith</p>
                            <p className="mt-0.5 text-xs text-[#9A8B90]">Service, community and love.</p>
                        </div>
                    </motion.div>
                </div>

                {/* Hero image stack */}
                <motion.div
                    className="relative z-10 mx-auto w-full max-w-xl"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.3 }}
                >
                    <motion.div
                        className="pointer-events-none absolute left-1/2 top-1/2 h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#DCC4CD]/70"
                        animate={reduceMotion ? undefined : { rotate: 360 }}
                        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute left-1/2 top-1/2 h-[65%] w-[65%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EEDCE5]/60 blur-[90px]" />

                    <div className="relative h-[490px] sm:h-[540px]">
                        <CardSwap
                            items={heroItems}
                            theme="light"
                            cardDistance={60}
                            verticalDistance={70}
                            depth={90}
                            skewAmount={5}
                            visibleCards={4}
                            cardRadius={20}
                            delay={4500}
                            speed={1}
                            bounce={0.3}
                            parallax={0.4}
                            hoverSpread={0.1}
                            dim={0.4}
                            autoplay={!reduceMotion}
                            pauseOnHover
                            draggable
                        />
                    </div>

                    <motion.div
                        className="pointer-events-none absolute -left-2 top-12 z-30 hidden sm:block"
                        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <GlassSurface width={178} height={54} borderRadius={28} backgroundOpacity={0.72} mixBlendMode="normal" brightness={85} blur={16}>
                            <span className="flex items-center gap-2 text-xs font-semibold text-[#745461]">
                                <CalendarDays size={15} />
                                Sunday 9:00 Mass
                            </span>
                        </GlassSurface>
                    </motion.div>

                    <motion.div
                        className="pointer-events-none absolute -right-1 bottom-12 z-30 hidden sm:block"
                        animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    >
                        <GlassSurface width={195} height={54} borderRadius={28} backgroundOpacity={0.72} mixBlendMode="normal" brightness={85} blur={16}>
                            <span className="flex items-center gap-2 text-xs font-semibold text-[#745461]">
                                <UsersRound size={15} />
                                Lectors scheduled
                            </span>
                        </GlassSurface>
                    </motion.div>
                </motion.div>
            </section>

            {/* ===== READINGS MARQUEE ===== */}
            <section className="relative z-10 overflow-hidden border-y border-[#F0E6EA] bg-white py-5">
                <motion.div
                    className="flex w-max items-center gap-12 whitespace-nowrap"
                    animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
                    transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
                >
                    {[...readings, ...readings, ...readings, ...readings].map((reading, index) => (
                        <span key={index} className="serif-heading flex items-center gap-12 text-lg text-[#927C85]">
                            {reading}
                            <Flower2 size={15} className="text-[#C99BAA]" />
                        </span>
                    ))}
                </motion.div>
            </section>

            {/* ===== ABOUT: white with a soft centre glow, dots and rings ===== */}
            <section id="about" className="relative scroll-mt-24 overflow-hidden px-6 py-28 lg:px-10">
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="absolute inset-0" style={dotStyle} />
                    <div
                        className="absolute inset-0"
                        style={{ backgroundImage: "radial-gradient(45% 55% at 50% 50%, rgba(247,232,238,0.85), transparent 72%)" }}
                    />
                    <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#EBD9E0]/70" />
                    <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F0E3E8]/70" />
                </div>

                <motion.div {...reveal()} className="relative mx-auto max-w-3xl text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#EAD9E0] bg-white text-[#A77C8C] shadow-sm">
                        <Church size={21} />
                    </div>
                    <span className="mt-7 block text-[11px] font-bold tracking-[0.25em] text-[#AE8190]">A LITTLE ABOUT US</span>
                    <h2 className="serif-heading mt-5 text-3xl font-semibold leading-tight text-[#493D42] sm:text-5xl">
                        Making service simpler,
                        <span className="text-[#B27E90]"> together.</span>
                    </h2>
                    <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#82777A]">
                        Every act of service makes a difference. ChurchBuddy helps our church community coordinate lector duties with care, clarity and fairness, leaving more room for what matters most: serving God and one another.
                    </p>
                    <div className="mx-auto mt-9 flex items-center justify-center gap-3 text-xs font-semibold tracking-wide text-[#A17D89]">
                        <span className="h-px w-10 bg-[#DCC2CC]" />
                        FAITH · SERVICE · COMMUNITY
                        <span className="h-px w-10 bg-[#DCC2CC]" />
                    </div>
                </motion.div>
            </section>

            {/* ===== FEATURES: white with a lavender glow behind the cards ===== */}
            <section id="features" className="relative scroll-mt-24 overflow-hidden">
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(40% 50% at 85% 50%, rgba(233,229,246,0.85), transparent 70%), radial-gradient(35% 45% at 5% 20%, rgba(250,236,241,0.8), transparent 70%)",
                        }}
                    />
                </div>

                <div className="relative mx-auto max-w-7xl px-6 py-28 lg:px-10">
                    <div className="grid items-center gap-14 lg:grid-cols-2">
                        <motion.div {...reveal()} className="text-center lg:text-left">
                            <span className="text-[11px] font-bold tracking-[0.25em] text-[#AE8190]">MADE FOR OUR CHURCH</span>
                            <h2 className="serif-heading mt-5 text-3xl font-semibold leading-tight text-[#493D42] sm:text-5xl">
                                A little help goes a long way.
                            </h2>
                            <p className="mt-6 max-w-md text-base leading-8 text-[#82777A] lg:mx-0">
                                Simple, thoughtful tools to help our community serve beautifully. Organise your lectors, coordinate responsibilities and make every Mass easier to prepare for.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-5 text-sm text-[#806B73] lg:justify-start">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-[#AF8191]" />
                                    Simple organisation
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-[#AF8191]" />
                                    Fair scheduling
                                </div>
                            </div>
                        </motion.div>

                        {/* Desktop card swap */}
                        <div className="relative hidden h-[440px] lg:block">
                            <div className="absolute inset-0 rounded-full bg-[#EFE5F1]/60 blur-[90px]" />
                            <CardSwap width={420} height={310} theme="light" cardDistance={50} verticalDistance={55} delay={4500} pauseOnHover>
                                {features.map((feature) => (
                                    <Card key={feature.title}>
                                        <FeatureBody feature={feature} />
                                    </Card>
                                ))}
                            </CardSwap>
                        </div>

                        {/* Mobile cards */}
                        <div className="grid gap-5 lg:hidden">
                            {features.map((feature, index) => (
                                <motion.div
                                    key={feature.title}
                                    {...reveal(index * 0.12)}
                                    className="overflow-hidden rounded-3xl border border-[#EFE6E9] bg-white shadow-[0_12px_35px_rgba(91,66,78,0.06)]"
                                >
                                    <FeatureBody feature={feature} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== HOW IT WORKS: white fading to blush, with grid ===== */}
            <section className="relative overflow-hidden border-y border-[#F0E6EA] bg-gradient-to-b from-white via-[#FBF4F6] to-white px-6 py-28 lg:px-10">
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(207,178,189,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(207,178,189,0.22) 1px, transparent 1px)",
                        backgroundSize: "56px 56px",
                        maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 75%)",
                        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, #000 10%, transparent 75%)",
                    }}
                />

                <div className="relative mx-auto max-w-6xl">
                    <motion.div {...reveal()} className="text-center">
                        <span className="text-[11px] font-bold tracking-[0.25em] text-[#AE8190]">SIMPLE BY DESIGN</span>
                        <h2 className="serif-heading mt-5 text-3xl font-semibold text-[#493D42] sm:text-5xl">
                            From list to lectern
                            <span className="text-[#B27E90]"> in three steps.</span>
                        </h2>
                        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#897D81]">
                            Everything you need to keep your lector community organised, with less effort and more peace of mind.
                        </p>
                    </motion.div>

                    <div className="relative mt-20 grid gap-14 md:grid-cols-3">
                        <motion.div
                            className="absolute left-[16%] right-[16%] top-8 hidden h-px origin-left bg-gradient-to-r from-[#D9B7C3] via-[#AE8291] to-[#D9B7C3] md:block"
                            initial={reduceMotion ? false : { scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.4, ease: "easeOut" }}
                        />

                        {steps.map((step, index) => (
                            <motion.div key={step.title} {...reveal(index * 0.15)} className="relative text-center">
                                <motion.div
                                    whileHover={reduceMotion ? undefined : { y: -5, scale: 1.06 }}
                                    className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[5px] border-white bg-[#916A79] text-xl font-semibold text-white shadow-[0_8px_25px_rgba(145,106,121,0.23)]"
                                >
                                    {index + 1}
                                </motion.div>
                                <h3 className="serif-heading mt-7 text-xl font-semibold text-[#514248]">{step.title}</h3>
                                <p className="mx-auto mt-3 max-w-[17rem] text-sm leading-7 text-[#897E82]">{step.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CLOSING CTA ===== */}
            <section className="relative overflow-hidden px-6 py-28">
                <motion.div
                    {...reveal()}
                    className="relative mx-auto grid max-w-6xl items-center gap-12 overflow-hidden rounded-[32px] border border-[#EFE6E9] bg-gradient-to-br from-[#F6EAEE] via-[#F8F2F4] to-[#EFEBF6] px-7 py-16 shadow-[0_20px_65px_rgba(95,68,81,0.08)] sm:px-14 lg:grid-cols-2"
                >
                    <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/70 blur-[80px]" />
                    <div className="pointer-events-none absolute inset-0 opacity-70" style={dotStyle} />

                    <div className="relative z-10 text-center lg:text-left">
                        <Flower2 className="mx-auto text-[#AE8190] lg:mx-0" size={32} />
                        <span className="mt-6 block text-[11px] font-bold tracking-[0.23em] text-[#A27B89]">GROW TOGETHER</span>
                        <h2 className="serif-heading mt-5 text-3xl font-semibold leading-tight text-[#514248] sm:text-5xl">
                            Let everything you do be done with love.
                        </h2>
                        <p className="mt-5 max-w-md text-sm leading-8 text-[#897D81]">
                            A community that serves together grows together. Make every act of service meaningful with ChurchBuddy.
                        </p>
                        <a
                            href="/admin/login"
                            className="mt-9 inline-flex items-center gap-3 rounded-full border border-white/80 bg-white px-7 py-4 text-sm font-semibold text-[#795766] shadow-[0_8px_25px_rgba(91,66,78,0.10)] transition duration-300 hover:-translate-y-1"
                        >
                            Join ChurchBuddy
                            <ArrowRight size={16} />
                        </a>
                    </div>

                    <div className="relative z-10 mx-auto flex w-full justify-center">
                        <ReflectiveCard
                            theme="light"
                            name="Lector of the Month"
                            role="Sunday 9:00 Mass"
                            badge="Serving"
                            status="Scheduled"
                            statusColor="#B27E90"
                            idLabel="Next Mass"
                            idValue="Sun · 9:00 AM"
                            {...(VIDEO ? { videoSrc: VIDEO } : {})}
                            webcam={false}
                            tint="#F3DDE5"
                            width={300}
                            height={440}
                            radius={24}
                            tiltStrength={reduceMotion ? 0 : 10}
                            enableTilt={!reduceMotion}
                            intro={!reduceMotion}
                        />
                    </div>
                </motion.div>
            </section>

            {/* ===== FOOTER: same white, blush and rose palette as the page ===== */}
            <footer className="relative isolate overflow-hidden bg-gradient-to-b from-[#F3E5EC] via-[#EFE5F1] to-[#E6DEF0] px-6 pb-8 pt-28 lg:px-10">
                <svg className="absolute left-0 top-0 z-10 h-16 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
                    <path
                        fill="#FFFFFF"
                        d="M0 0 H1440 V18 C1320 76 1200 76 1080 18 C960 -20 840 -20 720 18 C600 76 480 76 360 18 C240 -20 120 -20 0 18 Z"
                    />
                </svg>

                <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={dotStyle} />
                <div className="pointer-events-none absolute -left-32 top-32 h-80 w-80 rounded-full bg-[#F1D3DD]/45 blur-[100px]" />
                <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#D9D3F0]/55 blur-[110px]" />

                <p className="serif-heading pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[18vw] font-semibold leading-none text-[#916A79]/[0.10] lg:text-[13rem]">
                    ChurchBuddy
                </p>

                <motion.div
                    className="pointer-events-none absolute right-[9%] top-24 text-[#DCA9B9]"
                    animate={reduceMotion ? undefined : { y: [0, -12, 0], rotate: [0, 12, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Flower2 size={44} />
                </motion.div>
                <motion.div
                    className="pointer-events-none absolute left-[6%] top-48 text-[#E9BDCA]"
                    animate={reduceMotion ? undefined : { y: [0, 10, 0], rotate: [0, -10, 0] }}
                    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                >
                    <Flower2 size={28} />
                </motion.div>

                <div className="relative z-10 mx-auto max-w-6xl">
                    <div className="grid gap-14 md:grid-cols-[1.4fr_1fr_1fr]">
                        <motion.div {...reveal()}>
                            <a href="/" className="inline-flex items-center gap-3">
                                <img
                                    src="/images/chruchlogo.png"
                                    alt="ChurchBuddy logo"
                                    className="h-12 w-12 rounded-full border border-white bg-white/90 object-contain p-1 shadow-[0_4px_18px_rgba(92,64,77,0.10)]"
                                />
                                <div>
                                    <p className="serif-heading text-2xl font-semibold text-[#735766]">ChurchBuddy</p>
                                    <p className="text-[10px] font-bold tracking-[0.2em] text-[#A18D91]">SERVING IN FAITH</p>
                                </div>
                            </a>
                            <p className="serif-heading mt-7 max-w-xs text-lg italic leading-8 text-[#7D6670]">
                                “Let everything you do be done with love.”
                            </p>
                            <p className="mt-2 text-xs text-[#A18D91]">1 Corinthians 16:14</p>
                        </motion.div>

                        <motion.nav {...reveal(0.1)} aria-label="Explore">
                            <h3 className="text-xs font-bold tracking-[0.22em] text-[#AE8190]">EXPLORE</h3>
                            <ul className="mt-6 space-y-4">
                                {[
                                    { label: "Home", href: "/" },
                                    { label: "About", href: "#about" },
                                    { label: "Features", href: "#features" },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <a href={item.href} className="group relative inline-block text-sm text-[#806D74] transition-colors duration-300 hover:text-[#916A79]">
                                            {item.label}
                                            <span className="absolute -bottom-1 left-0 h-px w-0 bg-[#B27E90] transition-all duration-300 group-hover:w-full" />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </motion.nav>

                        <motion.div {...reveal(0.2)}>
                            <h3 className="text-xs font-bold tracking-[0.22em] text-[#AE8190]">FOR LECTORS</h3>
                            <p className="mt-6 max-w-[15rem] text-sm leading-7 text-[#82777A]">
                                Check your Masses, stay informed and keep the month organised.
                            </p>
                            <a
                                href="/admin/login"
                                className="group mt-6 inline-flex items-center gap-3 rounded-full bg-[#916A79] px-6 py-3 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(145,106,121,0.24)] transition duration-300 hover:-translate-y-1 hover:bg-[#795665]"
                            >
                                Log in
                                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                            </a>
                        </motion.div>
                    </div>

                    <div className="mt-16 flex flex-col items-center justify-between gap-5 pt-5 sm:flex-row">
                        <p className="text-xs text-[#A18D91]">© {new Date().getFullYear()} ChurchBuddy. All rights reserved.</p>
                        <p className="flex items-center gap-2 text-xs text-[#A18D91]">
                            Made with
                            <motion.span
                                animate={reduceMotion ? undefined : { scale: [1, 1.25, 1] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                className="inline-flex text-[#C27A8F]"
                            >
                                <Heart size={14} fill="currentColor" />
                            </motion.span>
                            for our church community
                        </p>
                        <button
                            type="button"
                            onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" })}
                            className="group inline-flex items-center gap-2 rounded-full border border-[#E7D8DD] bg-white/80 px-5 py-3 text-xs font-semibold text-[#795D68] shadow-sm backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md"
                        >
                            Back to top
                            <ArrowUp size={14} className="transition-transform group-hover:-translate-y-1" />
                        </button>
                    </div>
                </div>
            </footer>
        </main>
    );
}