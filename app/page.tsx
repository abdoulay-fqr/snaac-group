import Header from "./components/layout/Header";
import Hero from "./components/sections/Hero";
import Features from "./components/sections/Features";
import Together from "./components/sections/Together";
import Advantages from "./components/sections/Advantages";
import Steps from "./components/sections/Steps";
import Contact from "./components/sections/Contact";
import Footer from "./components/layout/Footer";
import { getLandingContent } from "@/lib/content";

export default async function Home() {
  const content = await getLandingContent();
  return (
    <main>
      <Header />
      <Hero content={content.hero} />
      <hr className="section-divider" />
      <Features items={content.features} />
      <hr className="section-divider" />
      <Together content={content.together} />
      <hr className="section-divider" />
      <Advantages content={content.advantages} />
      <hr className="section-divider" />
      <Steps content={content.steps} />
      <hr className="section-divider" />
      <Contact content={content.contact} />
      <hr className="section-divider" />
      <Footer content={content.footer} />
    </main>
  );
}