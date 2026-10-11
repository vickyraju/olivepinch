import { Hero } from "./hero"
import { HowItWorks } from "./how-it-works"
import { DietPlansTeaser } from "./diet-plans-teaser"
import { Faq } from "./faq"

function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <DietPlansTeaser />
      <Faq />
    </>
  )
}

export default Home
