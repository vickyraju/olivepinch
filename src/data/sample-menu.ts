// Showcase only: example dishes for the Meal Plans page. Photos live in public/images/sample-menu.
// The real menu changes every week and is set in the admin panel.
export interface SampleDish {
  name: string
  image: string
}

export const SAMPLE_MENU: { box: string; items: SampleDish[] }[] = [
  {
    box: "Box 1",
    items: [
      { name: "Bean and avocado burrito bowl", image: "/images/sample-menu/box-1/bean-and-avocado-burrito-bowl.webp" },
      { name: "Beef kofta with salad and tahini yoghurt", image: "/images/sample-menu/box-1/beef-kofta-with-salad-and-tahini-yoghurt.webp" },
      { name: "Chicken tikka with cauliflower rice and raita", image: "/images/sample-menu/box-1/chicken-tikka-with-cauliflower-rice-and-raita.webp" },
      { name: "Halloumi and avocado salad", image: "/images/sample-menu/box-1/halloumi-and-avocado-salad.webp" },
      { name: "Paneer tikka with salad and mint yoghurt", image: "/images/sample-menu/box-1/paneer-tikka-with-salad-and-mint-yoghurt.webp" },
      { name: "Spinach and feta frittata with salad", image: "/images/sample-menu/box-1/spinach-and-feta-frittata-with-salad.webp" },
      { name: "Tuna and sweet potato fishcakes with green beans", image: "/images/sample-menu/box-1/tuna-and-sweet-potato-fishcakes-with-green-beans.webp" },
    ],
  },
  {
    box: "Box 2",
    items: [
      { name: "Aubergine and halloumi bake", image: "/images/sample-menu/box-2/aubergine-and-halloumi-bake.webp" },
      { name: "Beef keema with courgette noodles", image: "/images/sample-menu/box-2/beef-keema-with-courgette-noodles.webp" },
      { name: "Cauliflower cheese with spinach", image: "/images/sample-menu/box-2/cauliflower-cheese-with-spinach.webp" },
      { name: "Chicken fajita bowl with brown rice and beans", image: "/images/sample-menu/box-2/chicken-fajita-bowl-with-brown-rice-and-beans.webp" },
      { name: "Crispy tofu and cabbage stir-fry with almonds", image: "/images/sample-menu/box-2/crispy-tofu-and-cabbage-stir-fry-with-almonds.webp" },
      { name: "Lamb rogan josh with sauteed greens", image: "/images/sample-menu/box-2/lamb-rogan-josh-with-sauteed-greens.webp" },
      { name: "Masala sardines with sweet potato mash and greens", image: "/images/sample-menu/box-2/masala-sardines-with-sweet-potato-mash-and-greens.webp" },
    ],
  },
  {
    box: "Box 3",
    items: [
      { name: "Banana oat pancakes with berries", image: "/images/sample-menu/box-3/banana-oat-pancakes-with-berries.webp" },
      { name: "Beef keema egg muffins", image: "/images/sample-menu/box-3/beef-keema-egg-muffins.webp" },
      { name: "Chicken, sweet potato and egg hash", image: "/images/sample-menu/box-3/chicken-sweet-potato-and-egg-hash.webp" },
      { name: "Coconut chia pudding with berries and almonds", image: "/images/sample-menu/box-3/coconut-chia-pudding-with-berries-and-almonds.webp" },
      { name: "Lamb keema omelette", image: "/images/sample-menu/box-3/lamb-keema-omelette.webp" },
      { name: "Paneer bhurji with avocado", image: "/images/sample-menu/box-3/paneer-bhurji-with-avocado.webp" },
      { name: "Sardine, egg and spinach wrap", image: "/images/sample-menu/box-3/sardine-egg-and-spinach-wrap.webp" },
    ],
  },
]
