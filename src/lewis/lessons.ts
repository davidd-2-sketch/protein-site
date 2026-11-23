/*
  lessons.ts — the four Lewis structure lessons.

  Teaching approach (same as the other topics): one idea per step, three depth levels,
  predict-then-reveal questions, and "your turn" steps where the student builds the
  structure in the drawing and presses Check.

  Facts: standard Gen Chem (OpenStax Chemistry 2e §7.3–7.4; Tro; Zumdahl). Measured bond
  lengths are noted in molecules.ts and reference/README.md. Every structure shown here is
  checked by tests/lewis.test.ts.
*/
import type { BaseStep, Lesson } from '../lessons/types'
import type { LForm } from './molecules'

export interface LewisView {
  /** Which molecule (id in molecules.ts). */
  molecule: string
  /**
   * What to draw:
   *   'form'      one correct structure (form index `form`)
   *   'skeleton'  atoms and single bonds only
   *   'custom'    the structure in `custom` (e.g. a half-finished one)
   *   'alt'       one of the molecule's worse alternatives (index `alt`)
   *   'resonance' all resonance forms side by side
   *   'hybrid'    the resonance hybrid (partial bonds and charges)
   *   'build'     the student builds it, starting from the skeleton
   */
  show: 'form' | 'skeleton' | 'custom' | 'alt' | 'resonance' | 'hybrid' | 'build'
  form?: number
  alt?: number
  custom?: LForm
  /** Show formal charges. */
  formal?: boolean
  /** Atoms to point out (by index). */
  highlight?: number[]
  /** Show the 3D shape beside the drawing. */
  show3d?: boolean
}

/** What the student did: pressed Check on a structure. */
export interface LewisInput {
  molecule: string
  ok: boolean
}

export type LewisStep = BaseStep<LewisView, LewisInput>

const built = (id: string) => (i: LewisInput) => i.molecule === id && i.ok

export const LEWIS_LESSONS: Lesson<LewisStep>[] = [
  /* =========================================================== 1 */
  {
    id: 'drawing',
    title: 'Drawing Lewis structures',
    summary: 'Count the electrons, connect the atoms, and give everyone an octet.',
    minutes: 5,
    steps: [
      {
        title: 'Count the valence electrons',
        text: {
          simple:
            'A Lewis structure is a map of where a molecule’s outer electrons are. Step one: count them. Each atom brings its valence electrons, which you can read off the periodic table from its group.',
          standard:
            'Step 1 is always counting valence electrons. For main-group atoms the count matches the group: H 1, C 4, N 5, O 6, F 7. Add them up for every atom. For an ion, add one electron per negative charge and remove one per positive charge.',
          deep:
            'Only valence electrons are drawn: core electrons are held too tightly to take part in bonding. The total must be used exactly; a structure with one electron too many or too few describes a different species (an ion or a radical).',
        },
        view: { molecule: 'h2o', show: 'skeleton' },
        revealView: { molecule: 'h2o', show: 'form' },
        quiz: {
          question: 'How many valence electrons does H₂O have?',
          choices: ['8', '10', '6', '3'],
          answer: 0,
          explain: 'Oxygen (group 16) brings 6 and each hydrogen brings 1: 6 + 1 + 1 = 8. In the finished structure, 4 are in the two bonds and 4 are oxygen’s two lone pairs.',
          hint: 'Oxygen is in group 16, so it has 6 valence electrons. Add one for each hydrogen.',
        },
      },
      {
        title: 'Connect the atoms, then fill in',
        text: {
          simple:
            'Put the atom that is the least “greedy” for electrons in the middle (never hydrogen). Connect everything with single bonds. Then hand out the remaining electrons as lone pairs, outer atoms first. Here, CO₂ has 16 electrons: 4 in the bonds and 12 on the oxygens. But look at carbon.',
          standard:
            'Step 2: the least electronegative atom goes in the center (H is always on the outside). Step 3: connect with single bonds (2 electrons each). Step 4: complete the outer atoms’ octets with lone pairs, then put anything left on the center. For CO₂ that uses all 16 electrons, but carbon (highlighted) has only 4 around it.',
          deep:
            'Electrons “around” an atom count every lone pair on it plus both electrons of each of its bonds. The outer-atoms-first order is just bookkeeping that makes the next step obvious: if the center falls short, the fix is to share, not to add electrons you don’t have.',
        },
        view: { molecule: 'co2', show: 'custom', custom: { bonds: [1, 1], lone: [3, 0, 3] }, highlight: [1] },
        revealView: { molecule: 'co2', show: 'form', show3d: true },
        quiz: {
          question: 'Carbon has only 4 electrons around it, and all 16 are used. What is the fix?',
          choices: [
            'Turn a lone pair on each O into a second bond to C',
            'Add 4 more electrons to carbon',
            'Remove one of the oxygens',
            'Nothing: carbon is fine with 4',
          ],
          answer: 0,
          explain: 'Sharing a lone pair as a second bond gives carbon 2 more electrons without changing the total. Doing it on both sides gives O=C=O: every atom has an octet, using exactly 16 electrons.',
          hint: 'You can’t add electrons (the total is fixed). Can the oxygens share more of the ones they have?',
        },
      },
      {
        title: 'Your turn: water',
        text: {
          simple:
            'Build water in the drawing. Click an atom to add or remove lone pairs, and click a bond to make it double or triple. Press Check when you think it’s right.',
          standard:
            'Build H₂O. The skeleton is done. Click an atom to change its lone pairs, click a bond to change single/double/triple, and press Check. The counter shows how many of the 8 electrons you’ve placed.',
          deep:
            'Build H₂O. Hydrogen is satisfied with 2 electrons (a duet), so all of oxygen’s extra electrons go on oxygen. The four electron groups on oxygen are why water is bent.',
        },
        view: { molecule: 'h2o', show: 'build' },
        task: {
          prompt: 'Build H₂O, then press Check.',
          check: built('h2o'),
          success: 'Two bonds and two lone pairs on oxygen. Four electron groups make water bent (see the 3D shape).',
          hint: 'Oxygen needs 8 electrons around it: its two bonds give 4. How many lone pairs does that leave?',
        },
      },
      {
        title: 'Your turn: hydrogen cyanide',
        text: {
          simple: 'Now HCN. It has 10 valence electrons. If carbon or nitrogen falls short, try a bigger bond between them.',
          standard: 'Build HCN (10 valence electrons). After the single bonds and nitrogen’s lone pairs, carbon will be short. Share more between C and N until both have octets.',
          deep: 'Build HCN. Carbon needs two extra shared pairs, so the C–N bond becomes a triple bond: one σ and two π bonds.',
        },
        view: { molecule: 'hcn', show: 'build' },
        task: {
          prompt: 'Build HCN, then press Check.',
          check: built('hcn'),
          success: 'H–C≡N with one lone pair on nitrogen. Two electron groups on carbon: a straight line.',
          hint: 'Click the C–N bond to make it double, then triple, and adjust nitrogen’s lone pairs so the count is 10.',
        },
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'formal-charge',
    title: 'Formal charge',
    summary: 'A quick check for which of several structures is best.',
    minutes: 5,
    steps: [
      {
        title: 'Keeping track of electrons',
        text: {
          simple:
            'Formal charge tells you whether an atom has “more” or “fewer” electrons in the drawing than it brought. Count its lone-pair electrons (dots) plus one for each bond (line), and compare with its valence electrons.',
          standard:
            'Formal charge = valence electrons − (nonbonding electrons + number of bonds). Each bond counts once because its two electrons are split between the two atoms. Formal charges always add up to the molecule’s overall charge.',
          deep:
            'Formal charge assumes every bond is shared perfectly equally, so it is bookkeeping, not the real charge on an atom (that depends on electronegativity). It is still a reliable way to compare structures.',
        },
        view: { molecule: 'nh4', show: 'form', formal: true, highlight: [0] },
        quiz: {
          question: 'What is nitrogen’s formal charge in NH₄⁺?',
          choices: ['+1', '0', '−1', '+4'],
          answer: 0,
          explain: 'Nitrogen brings 5. In NH₄⁺ it has 0 lone-pair electrons and 4 bonds: 5 − (0 + 4) = +1. That +1 is the ion’s whole charge.',
          hint: 'Use valence electrons − (dots + bonds). Nitrogen has 5 valence electrons.',
        },
      },
      {
        title: 'Two ways to draw CO₂',
        text: {
          simple:
            'Both drawings give every atom an octet. To pick the better one, look at the formal charges. The best structure has charges as close to zero as possible.',
          standard:
            'When several structures follow the octet rule, prefer (1) the one with formal charges closest to zero, and (2) if some charges remain, the one with negative charge on the more electronegative atom.',
          deep:
            'Here O≡C–O has charges +1 and −1 on two oxygens, while O=C=O has none. Separating charge costs energy, so the structure with less of it better describes the molecule. Measured: both C–O bonds in CO₂ are identical (116 pm).',
        },
        view: { molecule: 'co2', show: 'alt', alt: 0, formal: true },
        revealView: { molecule: 'co2', show: 'form', formal: true },
        quiz: {
          question: 'O≡C–O (shown) or O=C=O: which is the better structure?',
          choices: ['O=C=O: all formal charges 0', 'O≡C–O: charges +1 and −1'],
          answer: 0,
          explain: 'O=C=O has no formal charges at all, so it is the better structure, and it matches the two identical bonds that are measured.',
          hint: 'Compare the formal charges. Smaller is better.',
        },
      },
      {
        title: 'Octets come first: CO',
        text: {
          simple:
            'Carbon monoxide is a surprise: the only way to give both atoms an octet is a triple bond, and then carbon ends up with a −1 formal charge and oxygen with +1. That’s fine. Octets come first; formal charge only picks between structures that already have them.',
          standard:
            'The rules have an order: first the octets, then the formal charges. For CO, :C≡O: is the only structure where both atoms have octets, even though it puts −1 on carbon, the LESS electronegative atom.',
          deep:
            'CO is a famous case: its measured dipole moment is tiny (0.11 D), with the slightly negative end on carbon, as the formal charges hint. That carbon lone pair is how CO binds to the iron in hemoglobin.',
        },
        view: { molecule: 'co', show: 'form', formal: true },
        quiz: {
          question: 'In :C≡O:, what is carbon’s formal charge?',
          choices: ['−1', '0', '+1', '−2'],
          answer: 0,
          explain: 'Carbon brings 4 and has 2 lone-pair electrons and 3 bonds: 4 − (2 + 3) = −1. Oxygen: 6 − (2 + 3) = +1.',
          hint: 'Carbon has 4 valence electrons. Count its dots (2) and its bonds (3).',
        },
      },
      {
        title: 'Your turn: CO₂',
        text: {
          simple: 'Build carbon dioxide (16 valence electrons). Turn on Formal charges to check your work as you go.',
          standard: 'Build CO₂ with the smallest formal charges. If you make O≡C–O, Check will tell you there is a better option.',
          deep: 'Build CO₂. Two double bonds give a central carbon with two electron groups: linear, 180°.',
        },
        view: { molecule: 'co2', show: 'build', formal: true },
        task: {
          prompt: 'Build CO₂, then press Check.',
          check: built('co2'),
          success: 'O=C=O: octets everywhere and every formal charge 0. Two groups on carbon make it linear.',
          hint: 'Start by giving each oxygen lone pairs, then make both bonds double.',
        },
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'resonance',
    title: 'Resonance',
    summary: 'When one drawing isn’t enough, and what the molecule really looks like.',
    minutes: 5,
    steps: [
      {
        title: 'Which side gets the double bond?',
        text: {
          simple:
            'Ozone (O₃) needs one double bond and one single bond to give everyone an octet. But which side should the double bond go on? The left and right are exactly the same.',
          standard:
            'Drawing O₃ forces a choice: the double bond can go on either side, and both structures are equally good. Before reading on, predict what the real molecule is like.',
          deep:
            'Both structures have the same atoms in the same places and differ only in where electrons are drawn. When that happens, no single Lewis structure is correct.',
        },
        view: { molecule: 'o3', show: 'form', form: 0, formal: true },
        revealView: { molecule: 'o3', show: 'resonance', formal: true },
        quiz: {
          question: 'In real ozone, which O–O bond is the double bond?',
          choices: ['Neither: both bonds are identical, in between single and double', 'The left one', 'The right one', 'It flips back and forth'],
          answer: 0,
          explain:
            'Both O–O bonds measure 127.8 pm, between an O–O single bond (147.5 pm in H₂O₂) and a double bond (120.7 pm in O₂). The real molecule is a blend of the two drawings. It does not flip.',
          hint: 'If the two sides are equally good, would nature pick one?',
        },
      },
      {
        title: 'Resonance structures',
        text: {
          simple:
            'When more than one drawing works, we draw them all with double-headed arrows (↔) between them. The real molecule is a blend, like a mule is a blend of a horse and a donkey. It isn’t switching between them.',
          standard:
            'Resonance structures keep every atom in place and move only electrons (lone pairs and π bonds). The double-headed arrow means “the truth is a mix of these”, not “these interconvert”. Carbonate has three equivalent structures.',
          deep:
            'In MO terms, the π electrons are delocalized over all four atoms, in orbitals spanning the whole ion. Resonance is how a single-bond-per-line drawing approximates that.',
        },
        view: { molecule: 'co3', show: 'resonance', formal: true },
        quiz: {
          question: 'How many equivalent resonance structures does carbonate (CO₃²⁻) have?',
          choices: ['3', '1', '2', '4'],
          answer: 0,
          explain: 'The double bond can go to any of the three oxygens, giving three equally good structures.',
          hint: 'Count how many oxygens could hold the double bond.',
        },
      },
      {
        title: 'The real thing: the hybrid',
        text: {
          simple:
            'Average the three drawings and you get the real ion: three identical bonds, each a bit more than a single bond, and the −2 charge spread evenly over the three oxygens.',
          standard:
            'The resonance hybrid draws each C–O bond as a partial double bond (the dashed line) and spreads the charge evenly: each oxygen carries −⅔. Measured: all three C–O bonds in carbonate are the same length.',
          deep:
            'Spreading charge over several atoms (delocalization) lowers the energy, which is part of why ions like carbonate and nitrate are so stable. Bond order = total shared pairs ÷ bonds = 4 ÷ 3.',
        },
        view: { molecule: 'co3', show: 'hybrid' },
        quiz: {
          question: 'What is the bond order of each C–O bond in carbonate?',
          choices: ['1⅓', '1', '1½', '2'],
          answer: 0,
          explain: 'Four shared pairs spread over three bonds: 4 ÷ 3 = 1⅓.',
          hint: 'Count the bonds in one structure (one double + two single = 4 pairs), then share them over 3 bonds.',
        },
      },
      {
        title: 'Your turn: nitrate',
        text: {
          simple: 'Build nitrate, NO₃⁻ (24 valence electrons). Any one of its resonance structures counts.',
          standard: 'Build NO₃⁻. Remember the extra electron for the −1 charge: 5 + 3×6 + 1 = 24.',
          deep: 'Build NO₃⁻. Like carbonate, nitrate has three resonance structures; nitrogen carries a +1 formal charge in each.',
        },
        view: { molecule: 'no3', show: 'build', formal: true },
        task: {
          prompt: 'Build any resonance structure of NO₃⁻, then press Check.',
          check: built('no3'),
          success: 'One double bond and two single bonds. Nitrogen +1, the single-bonded oxygens −1 each: total −1.',
          hint: 'Nitrogen can only reach an octet with one double bond. Then complete the oxygens.',
        },
      },
    ],
  },

  /* =========================================================== 4 */
  {
    id: 'exceptions',
    title: 'When the octet rule bends',
    summary: 'Too few electrons, an odd number, and too many.',
    minutes: 5,
    steps: [
      {
        title: 'Too few: BF₃',
        text: {
          simple:
            'Boron is happy with fewer than 8 electrons. In BF₃ it has just 6. You could give it an octet with a double bond, but that would put a + charge on fluorine, which hates giving up electrons.',
          standard:
            'Boron (and beryllium) often have incomplete octets. BF₃’s usual structure has three single bonds, 6 electrons on boron, and every formal charge 0.',
          deep:
            'The empty spot on boron makes BF₃ a Lewis acid: it eagerly accepts a lone pair, for example from NH₃, to form F₃B–NH₃, where boron finally has 8.',
        },
        view: { molecule: 'bf3', show: 'form', formal: true, highlight: [0], show3d: true },
        quiz: {
          question: 'How many electrons surround boron in BF₃?',
          choices: ['6', '8', '3', '10'],
          answer: 0,
          explain: 'Three single bonds, 2 electrons each: 6. Boron has no lone pairs.',
          hint: 'Count 2 electrons for each bond to boron.',
        },
      },
      {
        title: 'An odd number: NO',
        text: {
          simple:
            'Nitric oxide (NO) has 11 valence electrons. Electrons like to pair up, but with an odd number, one is always left alone. Molecules with an unpaired electron are called radicals.',
          standard:
            'With an odd number of electrons, no structure can give every atom an octet. NO’s best structure puts the unpaired electron on nitrogen (7 electrons around it), where every formal charge is 0.',
          deep:
            'The MO theory page shows this electron in a π* orbital, giving NO a bond order of 2.5, which a Lewis structure can’t express. NO is a signaling molecule in the body (it relaxes blood vessels).',
        },
        view: { molecule: 'no', show: 'form', formal: true },
        quiz: {
          question: 'NO has 11 valence electrons. What does that force?',
          choices: ['One electron must be unpaired', 'NO must be an ion', 'A quadruple bond', 'Oxygen gets 10 electrons'],
          answer: 0,
          explain: 'An odd number of electrons can’t all be in pairs, so one is unpaired: NO is a radical.',
          hint: 'Electrons are drawn in pairs. What happens with an odd number?',
        },
      },
      {
        title: 'Too many: expanded octets',
        text: {
          simple:
            'Atoms from the third row down (like P, S, Cl, Xe) are bigger and can fit more than 8 electrons around them. Sulfur in SF₆ has 12.',
          standard:
            'Third-row and heavier central atoms can have expanded octets (10 or 12 electrons). Second-row atoms (C, N, O, F) never can: they are too small. Use expanded octets only when the structure can’t be drawn otherwise.',
          deep:
            'Older textbooks explained this with d orbitals (sp³d², etc.). Modern calculations show d orbitals contribute very little; the bigger size of third-row atoms and more ionic bonding explain it better. The Lewis structure is still a useful count.',
        },
        view: { molecule: 'sf6', show: 'form', show3d: true },
        quiz: {
          question: 'Which of these atoms can hold more than 8 electrons?',
          choices: ['S', 'C', 'N', 'O'],
          answer: 0,
          explain: 'Sulfur is in the third row, so it can have an expanded octet. Carbon, nitrogen, and oxygen are second-row atoms: 8 is their limit.',
          hint: 'Which one is in the third row of the periodic table?',
        },
      },
      {
        title: 'Your turn: XeF₄',
        text: {
          simple: 'Build xenon tetrafluoride (36 valence electrons). After the bonds and the fluorines, put the leftover electrons on xenon.',
          standard: 'Build XeF₄. Xenon starts with 8 valence electrons; after four bonds and the fluorines’ lone pairs, 4 are left over for xenon.',
          deep: 'Build XeF₄, then look at its 3D shape: four bonds plus two lone pairs is six electron groups, and the lone pairs sit opposite each other, leaving a flat square.',
        },
        view: { molecule: 'xef4', show: 'build' },
        task: {
          prompt: 'Build XeF₄, then press Check.',
          check: built('xef4'),
          success: 'Two lone pairs on xenon: 12 electrons around it. In 3D, square planar.',
          hint: 'Give each F three lone pairs first. Then count how many electrons are left, and put them on xenon as lone pairs.',
        },
      },
    ],
  },
]
