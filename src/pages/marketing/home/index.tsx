import { Hero } from "./hero"
import { HowItWorks } from "./how-it-works"
import { DietPlansTeaser } from "./diet-plans-teaser"
import { Faq } from "./faq"
import { FinalCta } from "./final-cta"

function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <DietPlansTeaser />
      <Faq />
      <FinalCta />
    </>
  )
}

export default Home
