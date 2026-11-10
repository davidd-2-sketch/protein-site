/*
  lessons.ts — the four periodic-trends lessons.

  Every number quoted here comes from elementData.ts (sources listed there):
    • Radius (calculated, pm): Li 167, Be 112, B 87, C 67, N 56, O 48, F 42, Ne 38;
      group 1: Li 167, Na 190, K 243, Rb 265, Cs 298 (no value for Fr).
    • First ionization energy (kJ/mol): Li 520, Be 900, B 801, C 1086, N 1402, O 1314,
      F 1681, Ne 2081; Mg 738, Al 578; P 1012, S 1000; He 2372 (highest); Cs 376.
    • Electronegativity (Pauling): F 3.98, O 3.44, Cl 3.16, N 3.04, C 2.55, H 2.20, Cs 0.79.
    • Electron affinity (kJ/mol): Cl 349, Br 325, F 322, I 295.
  Explanations (effective nuclear charge, shielding, the Be→B and N→O dips, Cl > F) are
  standard Gen Chem (e.g. OpenStax Chemistry 2e §6.5; Tro; Zumdahl).
  Effective nuclear charge for the outer electrons rises from about 1.3 (Li) to about 5.8 (Ne)
  by both Slater's rules and the Clementi–Raimondi values.
*/
import type { BaseStep, Lesson } from '../lessons/types'
import { MAIN_GROUP_Z, groupZ, periodZ, type PropId } from './elements'

/** What the table shows for a step. */
export interface TrendLessonView {
  props: PropId[]
  flat?: boolean
  /** Atomic numbers to emphasize (everything else is dimmed). */
  focus?: number[]
}

/** Tasks check which element the student clicked (its atomic number). */
export type TrendStep = BaseStep<TrendLessonView, number>

const P2 = periodZ(2)
const G1 = groupZ(1).filter((z) => z !== 1) // the alkali metals (hydrogen is not a metal)
const G17 = groupZ(17)

export const TREND_LESSONS: Lesson<TrendStep>[] = [
  /* =========================================================== 1 */
  {
    id: 'reading-the-table',
    title: 'Reading the table',
    summary: 'Rows, columns, and the tug of war that explains every trend.',
    minutes: 4,
    steps: [
      {
        title: 'The table is a map',
        text: {
          simple:
            'The periodic table lists every element in order of how many protons it has, starting with hydrogen (1). It wraps onto a new row at just the right spots, so that elements that behave alike line up in columns.',
          standard:
            'Elements are ordered by atomic number (the number of protons). Each row is a [[period]] and each column is a [[group]]. The layout is not arbitrary: it follows how electrons fill shells.',
          deep:
            'The table’s shape mirrors the order in which orbitals fill: two columns for s, six for p, ten for d, and fourteen for f. That is why the blocks have the widths they do.',
        },
        view: { props: [], flat: true },
        task: {
          prompt: 'Find and click sodium (Na), element 11.',
          check: (z) => z === 11,
          success: 'That’s sodium: period 3, group 1. Its 11 electrons fill two shells and start a third.',
          hint: 'Not that one. Sodium’s symbol is Na. Look in the first column, third row.',
        },
      },
      {
        title: 'Columns are families',
        text: {
          simple:
            'Elements in the same column are like siblings: they have the same number of outer electrons, so they react in similar ways. Lithium, sodium, and potassium each have one outer electron, and all three react violently with water.',
          standard:
            'Elements in a [[group]] have the same number of [[valence electrons]], which is why they have similar chemistry. Going down a group, those electrons sit in a higher shell each time.',
          deep:
            'Group 1 configurations all end in ns¹: Li [He]2s¹, Na [Ne]3s¹, K [Ar]4s¹. Chemical behavior is set mostly by that outer configuration, not by the total number of electrons.',
        },
        view: { props: [], flat: true, focus: G1 },
        quiz: {
          question: 'Li, Na, and K are in the same column. What do they have in common?',
          choices: ['The same number of protons', 'The same number of outer (valence) electrons', 'The same size'],
          answer: 1,
          explain: 'One valence electron each. That shared outer electron is why the alkali metals react so similarly.',
          hint: 'Protons increase with every element. What stays the same going down a column?',
        },
      },
      {
        title: 'The tug of war',
        text: {
          simple:
            'Every trend on this table comes from one tug of war. The nucleus pulls electrons in. Inner electrons get in the way and block part of that pull. What’s left over is the pull the outer electrons actually feel.',
          standard:
            'Outer electrons are attracted by the nucleus but partly blocked by inner electrons ([[shielding]]). The net pull is the [[effective nuclear charge]], Z_eff. Across a period, protons are added but the shielding barely changes, so Z_eff rises.',
          deep:
            'Electrons in the same shell shield each other poorly, so each added proton raises Z_eff by most of a full unit. For the outer electrons, Z_eff climbs from about 1.3 in lithium to about 5.8 in neon.',
        },
        view: { props: [], flat: true, focus: P2 },
        quiz: {
          question: 'From Li to Ne, protons go from 3 to 10, but the outer electrons stay in the same shell. What happens to the pull on those outer electrons?',
          choices: ['It gets stronger', 'It gets weaker', 'It stays the same'],
          answer: 0,
          explain: 'Stronger. More protons, about the same shielding: the outer electrons are pulled in harder. Hold on to this idea; it explains the next three lessons.',
          hint: 'The inner shell (which does the blocking) is the same for all eight elements.',
        },
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'atomic-radius',
    title: 'Atomic radius',
    summary: 'Why atoms shrink across a row and grow down a column.',
    minutes: 4,
    steps: [
      {
        title: 'Across a row',
        text: {
          simple: 'Going left to right across a row, each atom has one more proton and one more electron. Do atoms get bigger or smaller? Make a guess before you look.',
          standard: 'Across a period, each element adds one proton and one electron to the same shell. Predict what happens to the [[atomic radius]].',
          deep: 'The added electrons go into the same shell, so shielding hardly changes while nuclear charge rises by one each step.',
        },
        view: { props: [], focus: P2 },
        revealView: { props: ['radius'], focus: P2 },
        quiz: {
          question: 'From lithium to neon, the atoms get…',
          choices: ['Bigger: they have more electrons', 'Smaller: the nucleus pulls harder', 'No change'],
          answer: 1,
          explain: 'Smaller. The stronger pull (higher Z_eff) draws the same shell inward: from 167 pm for Li down to 38 pm for Ne. More electrons does not mean a bigger atom.',
          hint: 'Remember the tug of war: what happens to the pull across a row?',
        },
      },
      {
        title: 'Down a column',
        text: {
          simple: 'Now go down a column instead. Each step down, the outer electrons are in a new shell, farther out, like adding a layer to an onion.',
          standard: 'Down a group, each element’s valence electrons are in a higher shell. Predict the trend in radius.',
          deep: 'Nuclear charge rises a lot down a group, but so does shielding from the added inner shells, so Z_eff for the valence electrons changes only slowly. The larger shell (higher n) wins.',
        },
        view: { props: [], focus: G1 },
        revealView: { props: ['radius'], focus: G1 },
        quiz: {
          question: 'From lithium down to cesium, the atoms get…',
          choices: ['Bigger', 'Smaller', 'No change'],
          answer: 0,
          explain: 'Bigger: Li 167, Na 190, K 243, Rb 265, Cs 298 pm. Each row adds a whole new shell of electrons.',
        },
      },
      {
        title: 'Find the biggest atom',
        text: {
          simple: 'Put the two rules together: atoms grow going down and shrink going right. So where on the table is the biggest atom?',
          standard: 'Radius increases down a group and decreases across a period. Use both trends to find the largest atom shown.',
          deep: 'These radii are calculated for free atoms and stop at radon (element 86), so francium has no value here. Other definitions of radius (covalent, van der Waals, metallic) give different numbers but the same overall pattern.',
        },
        view: { props: ['radius'], focus: MAIN_GROUP_Z },
        task: {
          prompt: 'Click the element with the largest atomic radius.',
          check: (z) => z === 55,
          success: 'Cesium, at 298 pm: bottom-left. The smallest is helium (31 pm), at the top-right.',
          hint: 'Not the largest. Go as far down and as far left as you can (among elements that have a column).',
        },
        note: 'Radii here are calculated values for free atoms (Clementi et al., 1967), available for elements 1–86.',
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'ionization-energy',
    title: 'Ionization energy',
    summary: 'How hard it is to remove an electron, and the two dips that show up on exams.',
    minutes: 5,
    steps: [
      {
        title: 'Pulling an electron off',
        text: {
          simple: '[[Ionization energy]] is how much energy it takes to pull one electron off an atom. Think of it as how tightly the atom holds on.',
          standard: 'The first [[ionization energy]] is the energy needed to remove the outermost electron from a gas-phase atom. Predict where on the table it is highest.',
          deep: 'X(g) → X⁺(g) + e⁻. It is always positive (energy must be put in). Successive ionization energies jump sharply once a noble-gas core is reached.',
        },
        view: { props: [], focus: MAIN_GROUP_Z },
        revealView: { props: ['ie'], focus: MAIN_GROUP_Z },
        quiz: {
          question: 'Which kind of atom holds its outer electron most tightly?',
          choices: ['A large atom with a weak pull on its outer electrons', 'A small atom with a strong pull on its outer electrons', 'Size and pull don’t matter'],
          answer: 1,
          explain: 'Small atoms with a strong pull. So ionization energy is highest at the top-right: helium needs 2372 kJ/mol, cesium only 376.',
          hint: 'An electron close to a strongly pulling nucleus is harder to remove.',
        },
      },
      {
        title: 'Opposite of radius',
        text: {
          simple: 'Here are radius (blue) and ionization energy (purple) side by side. Where one is tall, the other is short. Big atoms let go of electrons easily; small atoms hold tight.',
          standard: 'Ionization energy rises across a period and falls down a group: the reverse of atomic radius. Both follow from the same cause, the pull on the outer electrons.',
          deep: 'Roughly, the energy of an outer electron scales with Z_eff²/n². Across a period Z_eff rises (higher ionization energy); down a group n rises (lower).',
        },
        view: { props: ['radius', 'ie'], focus: MAIN_GROUP_Z },
        task: {
          prompt: 'Click the element with the highest ionization energy.',
          check: (z) => z === 2,
          success: 'Helium: 2372 kJ/mol. Its two electrons are in the first shell, right next to the nucleus, with almost no shielding.',
          hint: 'Look for the tallest purple column: top-right corner.',
        },
      },
      {
        title: 'The first dip',
        text: {
          simple: 'The climb across row 2 isn’t perfectly smooth. Look closely at the purple columns: there are two places where the height drops before climbing again.',
          standard: 'Across period 2, ionization energy generally rises, but with two small dips. The first comes where a new kind of orbital starts to fill.',
          deep: 'Boron’s outermost electron is its first 2p electron. A 2p orbital is higher in energy than 2s and is partly shielded by the 2s electrons, so it is easier to remove.',
        },
        view: { props: ['ie'], focus: P2 },
        task: {
          prompt: 'Click the first element in this row where ionization energy goes DOWN.',
          check: (z) => z === 5,
          success: 'Boron (801) is lower than beryllium (900). Boron’s outer electron is in a 2p orbital, which is higher in energy than beryllium’s 2s, so it comes off more easily.',
          hint: 'Compare each column with the one to its left. Which is the first that’s shorter?',
        },
      },
      {
        title: 'The second dip',
        text: {
          simple: 'The second dip is at oxygen. Nitrogen has three p electrons, each in its own orbital. Oxygen has a fourth, which has to share an orbital with another electron.',
          standard: 'Oxygen (1314 kJ/mol) is lower than nitrogen (1402). Nitrogen’s 2p subshell is half full: one electron in each orbital. Oxygen’s fourth 2p electron must pair up.',
          deep: 'The same two dips appear in period 3: Mg 738 → Al 578 (first 3p electron) and P 1012 → S 1000 (first paired 3p electron).',
        },
        view: { props: ['ie'], focus: P2 },
        quiz: {
          question: 'Why is it easier to remove an electron from oxygen than from nitrogen?',
          choices: [
            'Oxygen has fewer protons',
            'Oxygen’s extra electron shares an orbital, and the two electrons repel each other',
            'Oxygen is a much bigger atom',
          ],
          answer: 1,
          explain: 'Two electrons in the same orbital repel each other, which makes one of them easier to remove. That outweighs oxygen’s extra proton.',
          hint: 'Oxygen has more protons than nitrogen and is slightly smaller, so it isn’t those.',
        },
      },
    ],
  },

  /* =========================================================== 4 */
  {
    id: 'electronegativity',
    title: 'Pulling on electrons',
    summary: 'Electronegativity, electron affinity, and why bonds are polar.',
    minutes: 5,
    steps: [
      {
        title: 'Electronegativity',
        text: {
          simple: '[[Electronegativity]] is how hard an atom pulls on electrons it is sharing in a bond, like how hard each person pulls in a tug of war over a rope.',
          standard: '[[Electronegativity]] measures how strongly an atom attracts shared electrons. It follows the same pattern as ionization energy: higher toward the top-right.',
          deep: 'The Pauling scale is built from bond energies, so it only exists for elements that form bonds. That is why most noble gases have no value: helium, neon, and argon form no stable compounds to measure.',
        },
        view: { props: ['en'], focus: MAIN_GROUP_Z },
        task: {
          prompt: 'Click the most electronegative element.',
          check: (z) => z === 9,
          success: 'Fluorine, at 3.98: small, with a strong pull, and one electron short of a full shell.',
          hint: 'Find the tallest gold column. It’s near the top-right, but not a noble gas.',
        },
      },
      {
        title: 'Why it matters: polar bonds',
        text: {
          simple: 'When two different atoms share electrons, the one that pulls harder gets more than its share. That end of the bond becomes slightly negative, and the other end slightly positive.',
          standard: 'A difference in electronegativity makes a bond polar: the shared electrons sit closer to the more electronegative atom, giving it a partial negative charge (δ−).',
          deep: 'As a rough guide, a difference under about 0.4 is treated as nonpolar covalent, 0.4 to about 1.8 as polar covalent, and larger as ionic. These cut-offs are conventions, not sharp boundaries.',
        },
        view: { props: ['en'], focus: [1, 17] },
        quiz: {
          question: 'In an H–Cl bond, which atom pulls the shared electrons closer?',
          choices: ['Hydrogen', 'Chlorine', 'Neither: they share equally'],
          answer: 1,
          explain: 'Chlorine (3.16) is more electronegative than hydrogen (2.20), so chlorine ends up slightly negative (δ−) and hydrogen slightly positive (δ+).',
          hint: 'Compare the heights of the two highlighted columns.',
        },
      },
      {
        title: 'Electron affinity',
        text: {
          simple: '[[Electron affinity]] is how much energy an atom gives off when it gains an extra electron. The more energy released, the more the atom "wants" that electron.',
          standard: '[[Electron affinity]] is the energy released when a gas-phase atom gains an electron. The halogens release the most. Elements with no column here do not form a stable negative ion.',
          deep: 'This trend is messier than the others. Noble gases, and elements with filled or half-filled subshells such as Be, Mg, and N, have no stable negative ion, because the added electron would have to enter a higher-energy orbital or pair up.',
        },
        view: { props: ['ea'], focus: MAIN_GROUP_Z },
        quiz: {
          question: 'Why do the halogens (group 17) release the most energy when they gain an electron?',
          choices: ['One more electron completes their outer shell', 'They are the largest atoms', 'They have the fewest protons'],
          answer: 0,
          explain: 'They are one electron short of a full outer shell, and they have a strong pull on outer electrons. Gaining one electron is very favorable.',
        },
      },
      {
        title: 'An exception worth knowing',
        text: {
          simple: 'Fluorine is the most electronegative element, so you might expect it to release the most energy when it gains an electron. Make a prediction, then check.',
          standard: 'Predict which halogen has the largest electron affinity. The answer is a classic exception.',
          deep: 'Fluorine’s n = 2 valence shell is very compact, so an added electron experiences strong repulsion from the seven already there. Chlorine’s larger n = 3 shell has more room.',
        },
        view: { props: [], focus: G17 },
        revealView: { props: ['ea'], focus: G17 },
        quiz: {
          question: 'Which halogen releases the most energy when it gains an electron?',
          choices: ['Fluorine', 'Chlorine', 'Iodine'],
          answer: 1,
          explain: 'Chlorine (349 kJ/mol), not fluorine (322). Fluorine is so small that the incoming electron is crowded by the electrons already there.',
          hint: 'The most electronegative atom isn’t the answer this time. Think about how crowded a very small atom is.',
        },
        note: 'Electron affinity values differ slightly between sources (fluorine is often listed as 328 kJ/mol). Chlorine is higher either way.',
      },
    ],
  },
]
