/*
  lessons.ts — the four molecular orbital (MO) theory lessons.

  Same approach as the other topics: one idea per step, three depth levels, predict-then-
  reveal questions, and "click the level" tasks in the diagram.

  Facts: standard Gen Chem MO theory (OpenStax Chemistry 2e §8.4; Tro; Zumdahl; Housecroft).
  Bond orders and magnetism come from filling the diagrams in diatomics.ts and are checked
  against the textbook values in tests/mo.test.ts. Measured data: see diatomics.ts.
*/
import type { BaseStep, Lesson } from '../lessons/types'

export interface MoView {
  /** Which molecule (id in diatomics.ts). */
  molecule: string
  /** Electrons to place (default: the neutral molecule's). */
  electrons?: number
  /** Show the electrons (default true). */
  filled?: boolean
  /** The level whose 3D shape is shown (and which is highlighted). */
  selected?: string
  /** The student fills in the electrons themselves, then presses Check. */
  build?: boolean
}

/** What the student did: clicked a level, or pressed Check on their own filling. */
export interface MoInput {
  level?: string
  filled?: boolean
}

export type MoStep = BaseStep<MoView, MoInput>

export const MO_LESSONS: Lesson<MoStep>[] = [
  /* =========================================================== 1 */
  {
    id: 'basics',
    title: 'Bonding and antibonding',
    summary: 'Two atomic orbitals make two molecular orbitals, and why H₂ holds together.',
    minutes: 5,
    steps: [
      {
        title: 'Orbitals for the whole molecule',
        text: {
          simple:
            'In MO theory, electrons in a molecule don’t belong to one atom. When two hydrogen atoms meet, their 1s orbitals combine into two new orbitals that cover both atoms. One is lower in energy (bonding) and one is higher (antibonding).',
          standard:
            'Atomic orbitals (AOs) combine into the same number of molecular orbitals (MOs). Two 1s orbitals give σ_1s (in phase: electron density builds up between the nuclei, lower energy) and σ*_1s (out of phase: a node between the nuclei, higher energy). The 3D view shows the selected orbital.',
          deep:
            'Adding the two wavefunctions (ψ_A + ψ_B) gives constructive interference between the nuclei; subtracting them (ψ_A − ψ_B) gives a nodal plane there. The antibonding orbital is raised slightly more than the bonding one is lowered. Click a level to see its shape.',
        },
        view: { molecule: 'h2', filled: false, selected: 's1s' },
        task: {
          prompt: 'Click the antibonding orbital in the diagram.',
          check: (i) => i.level === 's1s*',
          success: 'σ*_1s: higher in energy, with a node (no electron density) right between the nuclei.',
          hint: 'Antibonding orbitals are drawn above the atomic orbitals they come from, and their name has a *.',
        },
      },
      {
        title: 'Filling the electrons',
        text: {
          simple: 'Electrons go into the lowest orbital first, two per orbital (one spin up, one spin down), just like in atoms.',
          standard:
            'Fill MOs exactly like atomic orbitals: lowest energy first (Aufbau), at most two electrons per orbital with opposite spins (Pauli), and one per orbital in a set of equal-energy orbitals before pairing (Hund).',
          deep: 'H₂’s two electrons pair in σ_1s. The energy they gain by dropping below the atomic 1s level is the bond energy: 436 kJ/mol, measured.',
        },
        view: { molecule: 'h2', filled: false, selected: 's1s' },
        revealView: { molecule: 'h2', selected: 's1s' },
        quiz: {
          question: 'Where do H₂’s 2 electrons go?',
          choices: ['Both in σ_1s, with opposite spins', 'One in σ_1s, one in σ*_1s', 'Both in σ*_1s', 'They stay in the atomic 1s orbitals'],
          answer: 0,
          explain: 'Lowest first: both go into the bonding σ_1s orbital, paired. Nothing goes into σ*_1s, so the molecule is stable.',
          hint: 'Electrons fill the lowest-energy orbital first, and each orbital holds two.',
        },
      },
      {
        title: 'Bond order',
        text: {
          simple:
            'Bonding electrons hold the atoms together; antibonding electrons push them apart. Bond order = (bonding − antibonding) ÷ 2. For H₂: (2 − 0) ÷ 2 = 1, a single bond. Now look at helium.',
          standard:
            'Bond order = (bonding electrons − antibonding electrons) ÷ 2. H₂: (2 − 0)/2 = 1, matching its Lewis single bond. A bond order of 0 means no bond. He₂ has 4 electrons; predict its bond order.',
          deep:
            'Higher bond order generally means a shorter, stronger bond. Nonbonding electrons (when present) don’t count either way.',
        },
        view: { molecule: 'he2', filled: false },
        revealView: { molecule: 'he2' },
        quiz: {
          question: 'He₂ has 4 electrons. What is its bond order?',
          choices: ['0', '1', '2', '½'],
          answer: 0,
          explain: 'Two go into σ_1s and two into σ*_1s: (2 − 2) ÷ 2 = 0. The antibonding pair cancels the bonding pair, so helium stays as single atoms.',
          hint: 'Fill 2 electrons into σ_1s, then 2 into σ*_1s, and use (bonding − antibonding) ÷ 2.',
        },
      },
      {
        title: 'Half a bond',
        text: {
          simple: 'Take one electron away from H₂ and you get H₂⁺, with just one bonding electron. Lewis structures can’t draw that, but MO theory handles it easily.',
          standard: 'H₂⁺ has one electron in σ_1s, so its bond order is ½. It exists (in space and in electric discharges), with a longer, weaker bond than H₂.',
          deep: 'Fractional bond orders are one of MO theory’s advantages over Lewis structures: H₂⁺, He₂⁺, O₂⁺, and NO all have half-integer bond orders.',
        },
        view: { molecule: 'h2', electrons: 1, selected: 's1s' },
        quiz: {
          question: 'What is the bond order of H₂⁺ (one electron)?',
          choices: ['½', '1', '0', '2'],
          answer: 0,
          explain: '(1 bonding − 0 antibonding) ÷ 2 = ½: half a bond. Weaker than H₂, but still a bond.',
          hint: 'Use (bonding − antibonding) ÷ 2 with just one bonding electron.',
        },
      },
      {
        title: 'Your turn: He₂⁺',
        text: {
          simple: 'Fill the diagram for He₂⁺ yourself: it has 3 electrons. Click a line once for one electron (↿), again to pair it (↿⇂). Then press Check.',
          standard: 'Fill He₂⁺ (3 electrons): lowest level first, two per orbital. Then work out its bond order.',
          deep: 'He₂⁺ is a real (if fleeting) ion with bond order ½, detected by spectroscopy, unlike neutral He₂.',
        },
        view: { molecule: 'he2', electrons: 3, build: true },
        task: {
          prompt: 'Fill He₂⁺ (3 electrons), then press Check.',
          check: (i) => i.filled === true,
          success: 'Two in σ_1s, one in σ*_1s: bond order (2 − 1) ÷ 2 = ½.',
          hint: 'Fill σ_1s completely (2) before putting anything in σ*_1s.',
        },
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'second-row',
    title: 'Second-row molecules',
    summary: 'σ and π orbitals from 2s and 2p, and what bond order predicts.',
    minutes: 6,
    steps: [
      {
        title: 'More orbitals: 2s and 2p',
        text: {
          simple:
            'Second-row atoms bring four valence orbitals each (2s and three 2p), so there are 8 molecular orbitals. The 2p orbitals can meet head-on (making σ) or side by side (making two π orbitals of equal energy).',
          standard:
            '2s + 2s → σ_2s and σ*_2s. The 2p orbitals pointing along the bond → σ_2p and σ*_2p. The two pairs of 2p orbitals perpendicular to the bond overlap side by side → two π_2p and two π*_2p (each pair drawn as one level with two lines). The selected level is π_2p.',
          deep:
            'Eight valence MOs hold up to 16 electrons, which is exactly Ne₂’s count. π orbitals have a nodal plane containing the bond axis; σ orbitals are cylindrically symmetric around it.',
        },
        view: { molecule: 'n2', filled: false, selected: 'p2p' },
        task: {
          prompt: 'Click the σ_2p bonding orbital, made from 2p orbitals meeting head-on.',
          check: (i) => i.level === 's2p',
          success: 'σ_2p: the two 2p orbitals point straight at each other, so the density gathers along the bond axis.',
          hint: 'Look for σ (not π) with 2p under it, and no *.',
        },
      },
      {
        title: 'Filling N₂',
        text: {
          simple: 'Nitrogen brings 5 valence electrons per atom: 10 in all. Fill them in from the bottom and count.',
          standard: 'N₂ has 10 valence electrons. Fill the levels in order, then work out the bond order.',
          deep: 'For N₂ (and Li₂ through N₂), π_2p sits BELOW σ_2p; the third lesson explains why.',
        },
        view: { molecule: 'n2', filled: false },
        revealView: { molecule: 'n2', selected: 's2p' },
        quiz: {
          question: 'What is N₂’s bond order?',
          choices: ['3', '2', '2.5', '1'],
          answer: 0,
          explain: 'Bonding: σ_2s (2) + π_2p (4) + σ_2p (2) = 8. Antibonding: σ*_2s (2). (8 − 2) ÷ 2 = 3: a triple bond, just like its Lewis structure. Measured bond energy: 945 kJ/mol.',
          hint: 'Bonding: σ_2s, π_2p, σ_2p. Antibonding: σ*_2s. Count the electrons in each.',
        },
      },
      {
        title: 'Bond order, length, and strength',
        text: {
          simple: 'More bond order means a shorter, stronger bond. Going from N₂ to O₂ to F₂, electrons start filling antibonding orbitals and the bond order drops.',
          standard:
            'Measured: N₂ (order 3) 109.8 pm, 945 kJ/mol. O₂ (order 2) 120.7 pm, 498 kJ/mol. F₂ (order 1) 141.2 pm, 159 kJ/mol. Each step adds electrons to π* orbitals.',
          deep: 'The trend is a correlation, not a law: bond energy also depends on lone-pair repulsion and atom size (F₂’s bond is unusually weak partly because of crowded lone pairs).',
        },
        view: { molecule: 'f2', selected: 'p2p*' },
        quiz: {
          question: 'Which has the longest bond?',
          choices: ['F₂ (bond order 1)', 'O₂ (bond order 2)', 'N₂ (bond order 3)'],
          answer: 0,
          explain: 'Lowest bond order, longest bond: F₂ is 141.2 pm, versus 120.7 pm for O₂ and 109.8 pm for N₂.',
          hint: 'A lower bond order means a weaker, longer bond.',
        },
      },
      {
        title: 'When there’s no bond',
        text: {
          simple: 'Neon has a full set of electrons. Put two neons together and every antibonding orbital fills up too, cancelling all the bonding. That’s why noble gases stay as single atoms.',
          standard: 'Ne₂ has 16 valence electrons: every MO is full. Eight bonding minus eight antibonding gives bond order 0. Be₂ is another bond-order-0 case.',
          deep: 'Bond order 0 means no covalent bond, though extremely weak attractions (London forces) can still hold atoms together very briefly at very low temperatures.',
        },
        view: { molecule: 'ne2' },
        quiz: {
          question: 'Ne₂ fills every molecular orbital. What is its bond order?',
          choices: ['0', '1', '4', '8'],
          answer: 0,
          explain: '8 bonding − 8 antibonding = 0, ÷ 2 = 0. Neon doesn’t form Ne₂.',
          hint: 'When everything is full, bonding and antibonding electrons are equal.',
        },
      },
      {
        title: 'Your turn: C₂',
        text: {
          simple: 'Now fill C₂ (8 valence electrons). Watch the order: for carbon, the π level comes before σ_2p.',
          standard: 'Fill C₂’s 8 valence electrons using the Li₂–N₂ order (π_2p below σ_2p). Put one electron in each π orbital before pairing.',
          deep: 'C₂ ends with a filled π_2p and an empty σ_2p: bond order 2, made entirely of π bonding. It is a real molecule, seen in flames and comets.',
        },
        view: { molecule: 'c2', build: true },
        task: {
          prompt: 'Fill C₂ (8 electrons), then press Check.',
          check: (i) => i.filled === true,
          success: 'σ_2s², σ*_2s², π_2p⁴: bond order (6 − 2) ÷ 2 = 2, all electrons paired (diamagnetic).',
          hint: 'After σ_2s and σ*_2s, the next level up for carbon is π_2p (two orbitals).',
        },
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'oxygen',
    title: 'Why oxygen is magnetic',
    summary: 'The puzzle Lewis structures can’t solve, and why the level order switches.',
    minutes: 5,
    steps: [
      {
        title: 'A puzzle',
        text: {
          simple:
            'The Lewis structure of O₂ shows O=O with every electron in a pair. Paired electrons cancel each other’s magnetism. But pour liquid oxygen between the poles of a magnet and it sticks there.',
          standard:
            'Substances with unpaired electrons are attracted into a magnetic field (paramagnetic); with all electrons paired, they are weakly pushed out (diamagnetic). Lewis’s O=O has every electron paired, yet liquid O₂ clings to a magnet.',
          deep: 'This was one of the early triumphs of MO theory: it predicted O₂’s paramagnetism (and its bond order of 2) from the same diagram.',
        },
        view: { molecule: 'o2', filled: false },
        revealView: { molecule: 'o2', selected: 'p2p*' },
        quiz: {
          question: 'If every electron in O₂ were paired (as the Lewis structure shows), how would O₂ act near a magnet?',
          choices: ['It would not be attracted (diamagnetic)', 'It would be attracted (paramagnetic)'],
          answer: 0,
          explain: 'All-paired means diamagnetic: no attraction. But real O₂ IS attracted, so the Lewis structure is missing something. The filled diagram shows what.',
          hint: 'Paired electrons cancel each other’s magnetism.',
        },
      },
      {
        title: 'Two unpaired electrons',
        text: {
          simple: 'Fill O₂’s 12 electrons. The last two go into the two π* orbitals, which have equal energy, so they spread out one in each instead of pairing.',
          standard: 'O₂’s 11th and 12th electrons enter the two degenerate π*_2p orbitals. By Hund’s rule they occupy separate orbitals with parallel spins: two unpaired electrons, so O₂ is paramagnetic. Bond order (8 − 4)/2 = 2.',
          deep: 'This ground state is called triplet oxygen. Its two unpaired electrons are why O₂ reacts slowly with most molecules (whose electrons are all paired) despite being a strong oxidizer.',
        },
        view: { molecule: 'o2', selected: 'p2p*' },
        task: {
          prompt: 'Click the level holding O₂’s two unpaired electrons.',
          check: (i) => i.level === 'p2p*',
          success: 'π*_2p: one electron in each of its two orbitals, spins parallel.',
          hint: 'Look for the level where the arrows aren’t in pairs.',
        },
      },
      {
        title: 'Add or remove electrons',
        text: {
          simple: 'Take an electron away from O₂ and it comes out of an antibonding orbital, so the bond gets STRONGER. Add one and the bond gets weaker.',
          standard:
            'O₂⁺ (11 electrons) loses a π* electron: bond order 2.5, a shorter bond. O₂⁻ (superoxide, 13) has order 1.5; O₂²⁻ (peroxide, 14) has order 1. Try it in Explore with the electron buttons.',
          deep: 'The same reasoning explains why removing an electron from N₂ (taking a bonding electron) weakens its bond, while removing one from O₂ strengthens it.',
        },
        view: { molecule: 'o2', electrons: 11, selected: 'p2p*' },
        quiz: {
          question: 'What is the bond order of O₂⁺ (11 electrons)?',
          choices: ['2.5', '2', '1.5', '3'],
          answer: 0,
          explain: 'Bonding 8, antibonding 3: (8 − 3) ÷ 2 = 2.5. Removing an antibonding electron strengthens the bond.',
          hint: 'The electron removed came out of π*, an antibonding orbital.',
        },
      },
      {
        title: 'Why the order switches',
        text: {
          simple:
            'For lighter atoms (up to nitrogen), the π_2p level is below σ_2p. For oxygen and heavier, it’s the other way round. Boron proves it: B₂ is magnetic, which only works if its last two electrons sit in the π level.',
          standard:
            'In Li₂–N₂, 2s and 2p orbitals are close in energy and mix. That pushes σ_2p up above π_2p. From O₂ on, 2s drops far below 2p, mixing fades, and σ_2p is lower. Evidence: B₂ (6 electrons) is paramagnetic.',
          deep:
            'The mixing is between σ orbitals of the same symmetry (σ_2s and σ_2p). It also lowers σ_2s; the effect fades as the 2s–2p gap grows across the period (about 2 eV in Li, about 20 eV in F).',
        },
        view: { molecule: 'b2', selected: 'p2p' },
        quiz: {
          question: 'If B₂ used the oxygen order (σ_2p below π_2p), where would its last 2 electrons go, and would it be magnetic?',
          choices: ['Paired in σ_2p: not magnetic', 'One in each π_2p: magnetic', 'In σ*_2s: magnetic'],
          answer: 0,
          explain: 'They would pair in σ_2p, leaving no unpaired electrons. Real B₂ IS paramagnetic, so π_2p must be lower for boron, as the diagram shows.',
          hint: 'σ_2p is a single orbital. Two electrons in one orbital must pair.',
        },
      },
      {
        title: 'Your turn: superoxide, O₂⁻',
        text: {
          simple: 'Fill O₂⁻: oxygen’s 12 electrons plus one more, 13 in all. Where does the extra one go?',
          standard: 'Fill O₂⁻ (13 electrons) with the O₂ order. The extra electron pairs up in one of the π* orbitals.',
          deep: 'Superoxide (O₂⁻) forms in cells as a by-product of using oxygen; enzymes called superoxide dismutases clean it up. Bond order 1.5, one unpaired electron.',
        },
        view: { molecule: 'o2', electrons: 13, build: true },
        task: {
          prompt: 'Fill O₂⁻ (13 electrons), then press Check.',
          check: (i) => i.filled === true,
          success: 'π* holds 3: bond order (8 − 5) ÷ 2 = 1.5, with one unpaired electron.',
          hint: 'Fill everything up to π_2p, then put 3 electrons in π*: one in each orbital, then pair one.',
        },
      },
    ],
  },

  /* =========================================================== 4 */
  {
    id: 'unequal',
    title: 'Unequal atoms: CO, NO, HF',
    summary: 'Lopsided diagrams, the same bond as N₂, a radical, and nonbonding orbitals.',
    minutes: 6,
    steps: [
      {
        title: 'Lopsided diagrams',
        text: {
          simple:
            'When the two atoms are different, the more electronegative one holds its electrons more tightly, so its orbitals are drawn lower. Bonding orbitals end up looking more like that atom’s orbitals.',
          standard:
            'In CO, oxygen’s orbitals sit lower than carbon’s. Each bonding MO lies closer to (and has more of) oxygen’s character; each antibonding MO has more of carbon’s. The 3D shapes are drawn lopsided to show this.',
          deep:
            'The bigger the energy gap between the two AOs, the more polar the bond and the less the energy drops on bonding. In the limit of a huge gap, the “bond” becomes ionic.',
        },
        view: { molecule: 'co', selected: 'p2p' },
        quiz: {
          question: 'Why are oxygen’s orbitals drawn lower than carbon’s?',
          choices: ['Oxygen is more electronegative: it holds electrons more tightly', 'Oxygen is a bigger atom', 'Oxygen has fewer electrons', 'Oxygen is on the right side of the drawing'],
          answer: 0,
          explain: 'Higher electronegativity = lower orbital energy (the electrons are more strongly held), so oxygen’s 2s and 2p sit below carbon’s.',
          hint: 'Think about which atom pulls harder on electrons.',
        },
      },
      {
        title: 'Same count, same bond',
        text: {
          simple: 'CO has 10 valence electrons, exactly like N₂. Same electron count, same filling, same bond order.',
          standard: 'CO is isoelectronic with N₂ (10 valence electrons) and fills the same way: bond order 3, all electrons paired. Its bond (1076 kJ/mol) is the strongest of any two-atom molecule.',
          deep: 'CO’s highest filled orbital (the top σ) is mostly a lone pair on carbon. That’s the pair CO uses to bind to metals, including the iron in hemoglobin.',
        },
        view: { molecule: 'co', selected: 's2p' },
        quiz: {
          question: 'What is CO’s bond order?',
          choices: ['3', '2', '2.5', '1'],
          answer: 0,
          explain: 'Bonding 8 (σ, π ×2, σ) − antibonding 2 (σ*) = 6; ÷ 2 = 3. A triple bond, matching :C≡O:.',
          hint: 'CO has the same number of valence electrons as N₂.',
        },
      },
      {
        title: 'NO: a radical with a half bond',
        text: {
          simple: 'Nitric oxide has 11 valence electrons. The odd one goes into a π* orbital by itself, so NO is magnetic and its bond order is 2.5.',
          standard: 'NO: 11 valence electrons. Bonding 8, antibonding 3 (σ*_2s pair + one π*): bond order 2.5, one unpaired electron (paramagnetic). Removing that electron gives NO⁺, with bond order 3.',
          deep: 'Lewis structures can only show NO as N=O with a lone electron; MO theory gives the 2.5 bond order. NO⁺’s bond is measurably shorter than NO’s, as predicted.',
        },
        view: { molecule: 'no', selected: 'p2p*' },
        task: {
          prompt: 'Click the level holding NO’s unpaired electron.',
          check: (i) => i.level === 'p2p*',
          success: 'π*: one electron in one of its two orbitals. That single electron makes NO a radical.',
          hint: 'Find the level with a single arrow.',
        },
      },
      {
        title: 'HF: nonbonding orbitals',
        text: {
          simple:
            'In HF, hydrogen has just one orbital to offer, so only one of fluorine’s orbitals can pair up with it. Fluorine’s other orbitals stay on fluorine: those are its lone pairs.',
          standard:
            'H 1s combines with the one F 2p orbital pointing at it, giving σ and σ*. Fluorine’s 2s and its other two 2p orbitals don’t match anything on H, so they stay as nonbonding orbitals (n). Bond order: (2 − 0) ÷ 2 = 1. Nonbonding electrons don’t count.',
          deep:
            'The σ orbital is mostly fluorine (in this model about 0.89 F to 0.45 H), so the bonding pair sits closer to fluorine: a polar bond, with H δ+ and F δ−. See the Polarity page.',
        },
        view: { molecule: 'hf', selected: 'nbp' },
        quiz: {
          question: 'How many of fluorine’s valence orbitals actually form the bond with hydrogen?',
          choices: ['One (a single 2p)', 'All four', 'Two', 'None'],
          answer: 0,
          explain: 'Only the 2p orbital aimed at hydrogen overlaps with H 1s. The other three (2s and two 2p) are nonbonding: fluorine’s three lone pairs.',
          hint: 'Hydrogen only has one orbital to pair with.',
        },
      },
      {
        title: 'Your turn: NO',
        text: {
          simple: 'Fill nitric oxide’s 11 valence electrons. One will end up alone.',
          standard: 'Fill NO (11 electrons). The last electron goes into π* by itself.',
          deep: 'Check your answer against the bond order of 2.5 and the one unpaired electron from the earlier step.',
        },
        view: { molecule: 'no', build: true },
        task: {
          prompt: 'Fill NO (11 electrons), then press Check.',
          check: (i) => i.filled === true,
          success: 'One electron in π*: bond order 2.5, paramagnetic.',
          hint: 'Fill all the bonding levels and σ*, then the 11th electron goes into π*.',
        },
      },
    ],
  },
]
