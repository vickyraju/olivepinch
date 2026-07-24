import { Hero } from "./hero"
import { HowItWorks } from "./how-it-works"
import { DietPlansTeaser } from "./diet-plans-teaser"
import { Testimonials } from "./testimonials"
import { Faq } from "./faq"
import { FinalCta } from "./final-cta"

function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <DietPlansTeaser />
      <Testimonials />
      <Faq />
      <FinalCta />
    </>
  )
}

export default Home
