
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import {
    ArrowRight,
    Heart,
    Church,
    CalendarDays,
    UsersRound,
    Menu,
    X,
    Flower2,
    Cross,
} from "lucide-react";

// Cherry blossom petals
const petals = [
    { left: "8%", delay: 0, duration: 12, size: 12 },
    { left: "20%", delay: 3, duration: 15, size: 9 },
    { left: "37%", delay: 1, duration: 13, size: 14 },
    { left: "58%", delay: 5, duration: 16, size: 10 },
    { left: "76%", delay: 2, duration: 14, size: 13 },
    { left: "91%", delay: 4, duration: 12, size: 9 },
];

// Home page features
const features = [
    {
        icon: UsersRound,
        title: "Our Lectors",
        description:
            "Keep your church lector community organised and connected.",
    },
    {
        icon: CalendarDays,
        title: "Monthly Scheduling",
        description:
            "Plan Mass responsibilities with a fair and thoughtful schedule.",
    },
    {
        icon: Heart,
        title: "Serving Together",
        description:
            "Make volunteering simpler so everyone can serve with joy.",
    },
];

export default function Home() {
    const [menuOpen, setMenuOpen] = useState(false);
    const reduceMotion = useReducedMotion();

    const goToFeatures = () => {
        document.getElementById("about")?.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
        });
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#fffefa]">

            {/* Falling cherry blossom petals */}
            {!reduceMotion && (
                <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
                    {petals.map((petal, index) => (
                        <motion.span
                            key={index}
                            className="petal"
                            style={{
                                left: petal.left,
                                width: petal.size,
                                height: petal.size * 1.4,
                            }}
                            initial={{ y: "-10vh", rotate: 0 }}
                            animate={{
                                y: "110vh",
                                x: [0, 25, -20, 10, 0],
                                rotate: 360,
                            }}
                            transition={{
                                duration: petal.duration,
                                delay: petal.delay,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                        />
                    ))}
                </div>
            )}


            {/* Navigation */}
            <header className="relative z-30 bg-[#fffefa]">
                <nav className="mx-auto grid max-w-7xl grid-cols-2 items-center px-6 py-5 lg:grid-cols-3 lg:px-10">

                    {/* Logo - Left */}
                    <a href="#" className="flex items-center gap-2 justify-self-start">
                        <img
                            src="/images/chruchlogo.png"
                            alt="Church logo"
                            className="h-10 w-10 rounded-full object-contain"
                        />

                        <div>
                            <h1 className="serif-heading text-xl font-bold text-[#493c42]">
                                ChurchBuddy
                            </h1>
                            <p className="text-[9px] font-semibold tracking-[0.18em] text-[#a18d91]">
                                SERVING IN FAITH
                            </p>
                        </div>
                    </a>

                    {/* Desktop Navigation - Center */}
                    <div className="hidden lg:flex justify-self-center">
                        <div className="flex items-center gap-1 rounded-full border border-[#f0e2e4] bg-white p-1.5 shadow-md">

                            <a
                                href="#"
                                className="rounded-full bg-[#f8edf0] px-5 py-2 text-xs font-semibold text-[#b77e8e]"
                            >
                                Home
                            </a>

                            <a
                                href="#about"
                                className="rounded-full px-5 py-2 text-xs text-[#b77e8e] transition hover:bg-[#f8edf0]"
                            >
                                About
                            </a>

                            <a
                                href="#features"
                                className="rounded-full px-5 py-2 text-xs text-[#b77e8e] transition hover:bg-[#f8edf0]"
                            >
                                Features
                            </a>

                            <a
                                href="/admin/login"
                                className="rounded-full px-5 py-2 text-xs text-[#b77e8e] transition hover:bg-[#f8edf0]"
                            >
                                Login
                            </a>

                        </div>
                    </div>

                    {/* Get Started - Right */}
                    <div className="hidden lg:flex justify-self-end">
                        <a
                            href="/admin/login"
                            className="flex items-center gap-2 rounded-full bg-[#805a68] px-6 py-3 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#694653]"
                        >
                            Get Started
                            <ArrowRight size={14} />
                        </a>
                    </div>

                    {/* Mobile Menu */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="justify-self-end rounded-full bg-[#191820] p-2.5 text-white lg:hidden"
                        aria-label="Toggle navigation"
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </nav>

                {/* Mobile Navigation */}
                {menuOpen && (
                    <div className="flex flex-col gap-4 border-t border-[#eee9e3] bg-white px-6 py-5 lg:hidden">
                        <a href="#" onClick={() => setMenuOpen(false)}>Home</a>
                        <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
                        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
                        <a href="/admin/login" onClick={() => setMenuOpen(false)}>
                            Get Started
                        </a>
                    </div>
                )}


                {/* Mobile navigation */}
                {menuOpen && (
                    <div className="flex flex-col gap-4 border-t border-[#eee9e3] bg-white px-6 py-5 md:hidden">
                        <a href="#" onClick={() => setMenuOpen(false)}>
                            Home
                        </a>

                        <a href="#about" onClick={() => setMenuOpen(false)}>
                            About
                        </a>

                        <a href="#features" onClick={() => setMenuOpen(false)}>
                            Features
                        </a>

                        <a
                            href="/admin/login"
                            className="font-semibold text-[#a96679]"
                            onClick={() => setMenuOpen(false)}
                        >
                            Get Started
                        </a>
                    </div>
                )}
            </header>

            {/* Hero section */}
            <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-16 lg:grid-cols-2 lg:px-10 lg:pb-28 lg:pt-24">

                {/* Soft decorative backgrounds */}
                <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-[#f9edf0] opacity-70 blur-3xl" />

                <div className="pointer-events-none absolute right-0 top-20 h-64 w-64 rounded-full bg-[#f7f0e5] opacity-70 blur-3xl" />

                {/* Hero text */}
                <motion.div
                    className="relative z-10"
                    initial={reduceMotion ? false : { opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#f0e2e4] bg-white px-4 py-2 shadow-sm">
                        <Cross size={14} className="text-[#ad7586]" />

                        <span className="text-xs font-semibold tracking-wide text-[#866c75]">
                            A COMMUNITY UNITED IN FAITH
                        </span>
                    </div>

                    <h2 className="serif-heading max-w-xl text-5xl font-semibold leading-[1.15] tracking-tight text-[#453a3f] sm:text-6xl lg:text-7xl">
                        Serving together,

                        <span className="mt-2 block text-[#b77e8e]">
                            blooming in faith.
                        </span>
                    </h2>

                    <p className="mt-7 max-w-lg text-base leading-8 text-[#82777a] sm:text-lg">
                        Welcome to ChurchBuddy — a peaceful space to organise
                        our lectors, coordinate Mass schedules and bring our
                        church community together in service.
                    </p>

                    {/* Hero buttons */}
                    <div className="mt-9 flex flex-wrap items-center gap-4">
                        <a
                            href="/admin/login"
                            className="group inline-flex items-center gap-3 rounded-full bg-[#805a68] px-7 py-4 text-sm font-semibold text-white shadow-lg shadow-[#805a68]/15 transition hover:-translate-y-1 hover:bg-[#694653]"
                        >
                            Get Started

                            <ArrowRight
                                size={17}
                                className="transition group-hover:translate-x-1"
                            />
                        </a>

                        <button
                            onClick={goToFeatures}
                            className="rounded-full border border-[#e9dce0] bg-white px-7 py-4 text-sm font-semibold text-[#795d68] transition hover:border-[#c89ba8] hover:bg-[#fdf7f8]"
                        >
                            Discover More
                        </button>
                    </div>

                    {/* Community message */}
                    <div className="mt-12 flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#f5dce2]">
                                <Heart size={15} className="text-[#a66b7c]" />
                            </span>

                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#eee6d8]">
                                <Church size={15} className="text-[#947d69]" />
                            </span>

                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#e7eae1]">
                                <Flower2 size={15} className="text-[#829078]" />
                            </span>
                        </div>

                        <p className="text-xs text-[#928589]">
                            Together in faith, service and love.
                        </p>
                    </div>
                </motion.div>

                {/* Cherry blossom image */}
                <motion.div
                    className="relative z-10 mx-auto w-full max-w-xl"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    {/* Decorative shapes */}
                    <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full border border-[#ead8d8]" />

                    <div className="absolute -bottom-5 -left-5 h-24 w-24 rounded-full bg-[#f8e9ec]" />

                    {/* Main image card */}
                    <div className="relative overflow-hidden rounded-[2rem] border-[8px] border-white bg-[#f7eee7] shadow-2xl shadow-[#69515a]/10">
                        <img
                            src="/images/cherry-blossom.png"
                            alt="Beautiful cherry blossom garden in spring"
                            className="h-[350px] w-full object-cover sm:h-[450px]"
                        />

                        {/* Image caption */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#382c30]/60 to-transparent p-7 pt-20">
                            <p className="serif-heading text-2xl text-white">
                                Be the voice of God’s Word.
                            </p>

                            <p className="mt-1 text-sm text-white/90">
                                Your voice carries His message.
                            </p>
                        </div>
                    </div>

                    {/* Floating flower decoration */}
                    <motion.div
                        className="absolute -right-4 top-16 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#b77e8e] shadow-lg"
                        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    >
                        <Flower2 size={27} />
                    </motion.div>
                </motion.div>
            </section>

            {/* About section */}
            <section
                id="about"
                className="border-y border-[#f0eae4] bg-[#faf8f4] px-6 py-20 lg:px-10"
            >
                <div className="mx-auto max-w-4xl text-center">
                    <span className="text-xs font-bold tracking-[0.25em] text-[#b17b8a]">
                        A LITTLE ABOUT US
                    </span>

                    <h2 className="serif-heading mt-5 text-3xl font-semibold text-[#493d42] sm:text-4xl">
                        Making service simpler,

                        <span className="text-[#b77e8e]">
                            {" "}together.
                        </span>
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#83787a]">
                        Every act of service makes a difference. ChurchBuddy
                        helps our church community coordinate lector duties
                        with care, clarity and fairness, leaving more room
                        for what matters most — serving God and one another.
                    </p>
                </div>
            </section>

            {/* Features section */}
            <section
                id="features"
                className="mx-auto max-w-7xl px-6 py-20 lg:px-10"
            >
                <div className="text-center">
                    <span className="text-xs font-bold tracking-[0.25em] text-[#b17b8a]">
                        MADE FOR OUR CHURCH
                    </span>

                    <h2 className="serif-heading mt-4 text-3xl font-semibold text-[#493d42] sm:text-4xl">
                        A little help goes a long way.
                    </h2>

                    <p className="mt-4 text-sm text-[#928589]">
                        Simple tools to help our community serve beautifully.
                    </p>
                </div>

                {/* Feature cards */}
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;

                        return (
                            <motion.div
                                key={feature.title}
                                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{
                                    duration: 0.5,
                                    delay: index * 0.12,
                                }}
                                className="rounded-3xl border border-[#eee8e5] bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#805a68]/5"
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8edf0] text-[#a66e80]">
                                    <Icon size={25} />
                                </div>

                                <h3 className="serif-heading mt-6 text-2xl font-semibold text-[#514248]">
                                    {feature.title}
                                </h3>

                                <p className="mt-3 text-sm leading-7 text-[#8a7e81]">
                                    {feature.description}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* Closing message */}
            <section className="px-6 pb-20">
                <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#f5ece8] px-7 py-14 text-center sm:px-12">
                    <Flower2 className="mx-auto text-[#b17b8a]" size={30} />

                    <h2 className="serif-heading mt-5 text-3xl font-semibold text-[#514248] sm:text-4xl">
                        Let everything you do be done with love.
                    </h2>

                    <p className="mt-4 text-sm text-[#897b7e]">
                        A community that serves together grows together.
                    </p>

                    <a
                        href="/admin/login"
                        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#805a68] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#694653]"
                    >
                        Join ChurchBuddy
                        <ArrowRight size={16} />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#eee9e3] bg-white px-6 py-8">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row lg:px-4">
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/chruchlogo.png"
                            alt="Church logo"
                            className="h-9 w-9 object-contain"
                        />

                        <p className="serif-heading text-xl font-semibold text-[#6e5660]">
                            ChurchBuddy
                        </p>
                    </div>

                    <p className="text-xs text-[#a09396]">
                        Made with love for our church community.
                    </p>

                    <p className="text-xs text-[#a09396]">
                        © {new Date().getFullYear()} ChurchBuddy
                    </p>
                </div>
            </footer>
        </main>
    );
}
