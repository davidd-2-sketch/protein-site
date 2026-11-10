/*
  lessons.ts — the four VSEPR lessons.

  Teaching approach:
    • One idea per step, three depth levels (Simpler / Standard / Deeper).
    • PREDICT, THEN REVEAL: many steps hide the shape, ask the student to predict it,
      and only show the 3D model after they answer. Predicting first makes it stick.
    • DO IT: some steps hand the student the builder and ask them to make something.

  Facts: VSEPR rules and shapes are standard Gen Chem (e.g. Tro; Zumdahl; OpenStax
  Chemistry 2e, ch. 7.6). Measured angles come from molecules.ts (sources noted there).
*/
import type { BaseStep, Lesson } from '../lessons/types'

/** What the VSEPR 3D view should show for a step. */
export interface VseprView {
  /** A real molecule from molecules.ts, by formula (e.g. 'NH₃'). */
  molecule?: string
  /** Or: an ideal shape with these counts. Optional real elements; otherwise generic A and X. */
  bonds?: number
  lone?: number
  central?: string
  ligand?: string
  /** Show only the central atom (the shape is hidden until the student predicts). */
  mystery?: boolean
  /** Show the dashed electron-geometry outline. */
  hull?: boolean
  /** Let the student use the builder (+/− bonds and lone pairs) on this step. */
  build?: boolean
}

/** What the student did, for builder tasks. */
export interface BuilderInput {
  bonds: number
  lone: number
}

export type VseprStep = BaseStep<VseprView, BuilderInput>

export const VSEPR_LESSONS: Lesson<VseprStep>[] = [
  /* =========================================================== 1 */
  {
    id: 'why-shapes',
    title: 'Why molecules have shapes',
    summary: 'Electron groups push apart. Count them, and you know the basic shape.',
    minutes: 4,
    steps: [
      {
        title: 'Electrons push each other away',
        text: {
          simple:
            'Tie two balloons together at their knots and they point in opposite directions. Tie three, and they spread into a flat triangle. Electrons around an atom do the same thing: they are all negative, so they push each other as far apart as they can.',
          standard:
            '[[VSEPR]] theory says that [[electron groups|electron group]] around a central atom repel each other and arrange themselves as far apart as possible. Here, two groups end up 180° apart: a straight line.',
          deep:
            'VSEPR is a simple model: it ignores orbital energies and treats electron groups as repelling regions of charge. It predicts shapes for main-group molecules remarkably well, which is why it is the first tool chemists reach for.',
        },
        view: { bonds: 2, lone: 0 },
      },
      {
        title: 'Add a third group',
        text: {
          simple: 'Your turn. Use the + button next to "Bonded atoms" to add a third atom, and watch the other two make room.',
          standard: 'Add a third bonded atom with the builder. The three groups spread out until they are equally far apart.',
          deep: 'Three repelling groups find their lowest-energy arrangement in a plane, 120° apart: any other arrangement brings at least two of them closer together.',
        },
        view: { bonds: 2, lone: 0, build: true },
        task: {
          prompt: 'Use the builder: make 3 bonded atoms and 0 lone pairs.',
          check: (s) => s.bonds === 3 && s.lone === 0,
          success: 'Trigonal planar: three groups in a flat triangle, 120° apart.',
          hint: 'Aim for exactly 3 bonded atoms and 0 lone pairs.',
        },
      },
      {
        title: 'Four groups go 3D',
        text: {
          simple:
            'With four groups, a flat square would put neighbors only 90° apart. Instead they pop out into 3D, pointing to the corners of a tetrahedron, each 109.5° apart. Spin it to see.',
          standard:
            'Four [[electron groups|electron group]] form a tetrahedron with 109.5° angles. That is wider than the 90° of a flat square, so the groups are farther apart. Example: CH₄.',
          deep: '109.5° is arccos(−1/3), the largest possible minimum angle for four directions. Tetrahedral carbon is the foundation of organic chemistry.',
        },
        view: { molecule: 'CH₄', hull: true },
        quiz: {
          question: 'Why don’t the four bonds of CH₄ lie flat in a square?',
          choices: [
            'A flat square puts them only 90° apart; a tetrahedron gets them 109.5° apart',
            'Carbon is too small to fit four atoms in a plane',
            'Hydrogen atoms attract each other',
          ],
          answer: 0,
          explain: 'Right: the groups get as far apart as possible, and in 3D that means 109.5° instead of 90°.',
          hint: 'Think about the rule: electron groups get as far apart as possible.',
        },
      },
      {
        title: 'Counting electron groups',
        text: {
          simple:
            'Here is the trick that makes VSEPR easy: count the "directions" electrons point from the central atom. A double bond is still just one direction, so it counts as one group.',
          standard:
            'An [[electron group]] is any region of electrons around the central atom: a single, double, or triple bond, or a [[lone pair]]. Each counts as ONE group. CO₂ has two double bonds, so carbon has two groups.',
          deep: 'Multiple bonds do take up a bit more space than single bonds, which slightly widens nearby angles, but they still point in one direction and count as one group for predicting the shape.',
        },
        view: { molecule: 'CO₂', mystery: true },
        revealView: { molecule: 'CO₂' },
        quiz: {
          question: 'O=C=O: how many electron groups are around the central carbon, and what shape results?',
          choices: ['2 groups → linear', '4 groups → tetrahedral', '4 groups → square planar'],
          answer: 0,
          explain: 'Each C=O double bond counts as one group. Two groups point opposite each other, so CO₂ is linear (180°).',
          hint: 'Count directions, not individual bonds: a double bond counts once.',
        },
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'lone-pairs',
    title: 'Lone pairs change the shape',
    summary: 'Invisible lone pairs still take up space, and they squeeze bond angles.',
    minutes: 4,
    steps: [
      {
        title: 'Two kinds of geometry',
        text: {
          simple:
            'A lone pair is a pair of electrons that isn’t shared with another atom. It still pushes on the bonds, but it’s invisible in the final shape. So we name two things: where all the electrons point, and where just the atoms are.',
          standard:
            'The [[electron geometry]] includes every electron group, lone pairs too. The [[molecular shape]] describes only where the atoms are. With no lone pairs, as in CH₄, the two are the same: tetrahedral.',
          deep: 'Experimental methods like X-ray diffraction or microwave spectroscopy locate nuclei, so a measured "shape" is always the molecular shape. Lone pairs reveal themselves only through their effects on the atoms.',
        },
        view: { molecule: 'CH₄', hull: true },
      },
      {
        title: 'Ammonia: one lone pair',
        text: {
          simple: 'Nitrogen in NH₃ has three bonds and one lone pair: four groups, just like methane. Predict what shape the three hydrogens make.',
          standard: 'NH₃ has four electron groups (3 bonds + 1 lone pair), so its electron geometry is tetrahedral. Predict the molecular shape: just the atoms.',
          deep: 'Nitrogen has five valence electrons: three are shared in N–H bonds, and the remaining two form the lone pair.',
        },
        view: { molecule: 'NH₃', mystery: true },
        revealView: { molecule: 'NH₃', hull: true },
        quiz: {
          question: 'NH₃ has 3 bonds and 1 lone pair. What is its molecular shape?',
          choices: ['Trigonal planar', 'Trigonal pyramidal', 'Tetrahedral', 'T-shaped'],
          answer: 1,
          explain:
            'Trigonal pyramidal. The electrons are tetrahedral (dashed outline), but one corner is a lone pair, so the atoms form a short pyramid. The measured H–N–H angle is 106.7°, a little less than 109.5°.',
          hint: 'The four groups are still tetrahedral. Now hide one corner: what do the three remaining atoms look like?',
        },
      },
      {
        title: 'Water: two lone pairs',
        text: {
          simple: 'Oxygen in water has two bonds and two lone pairs. Same four groups, but now two of the corners are invisible.',
          standard: 'H₂O also has four electron groups (2 bonds + 2 lone pairs), so its electron geometry is tetrahedral and its molecular shape is bent.',
          deep: 'Two lone pairs make water strongly polar, which drives hydrogen bonding, its unusually high boiling point, and why ice is less dense than liquid water.',
        },
        view: { molecule: 'H₂O', mystery: true },
        revealView: { molecule: 'H₂O', hull: true },
        quiz: {
          question: 'Which order of bond angles is correct?',
          choices: ['CH₄ < NH₃ < H₂O', 'CH₄ = NH₃ = H₂O = 109.5°', 'CH₄ > NH₃ > H₂O'],
          answer: 2,
          explain:
            'CH₄ (109.5°) > NH₃ (106.7°) > H₂O (104.5°). Each lone pair squeezes the bonds a little closer together.',
          hint: 'Lone pairs push harder than bonds. More lone pairs means more squeezing.',
        },
      },
      {
        title: 'Why lone pairs push harder',
        text: {
          simple:
            'A bond is held between two atoms, like a rope pulled tight. A lone pair is held by only one atom, so it puffs out wider and shoves the bonds closer together. Try swapping bonds for lone pairs yourself.',
          standard:
            'Repulsion strength: lone pair–lone pair > lone pair–bond pair > bond pair–bond pair. A [[lone pair]] is attracted by only one nucleus, so its electrons spread out more and push harder. Use the builder to make the shape of water.',
          deep: 'Electronegative substituents shrink angles further by pulling bonding density away from the central atom: compare NF₃ (about 102°) to NH₃ (106.7°). VSEPR captures the trend, not exact numbers.',
        },
        view: { bonds: 4, lone: 0, build: true },
        task: {
          prompt: 'Starting from 4 bonds, make the shape of water: 2 bonded atoms and 2 lone pairs.',
          check: (s) => s.bonds === 2 && s.lone === 2,
          success: 'Bent, with tetrahedral electron geometry, just like H₂O. In the builder the angle shows "< 109.5°" because lone pairs squeeze it.',
          hint: 'Lower the bonded atoms to 2 and raise the lone pairs to 2.',
        },
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'five-six',
    title: 'Five and six groups',
    summary: 'Expanded octets, axial vs. equatorial, and where lone pairs prefer to sit.',
    minutes: 5,
    steps: [
      {
        title: 'Five groups: two kinds of position',
        text: {
          simple:
            'Five groups make two pyramids glued base to base. The three around the middle (the equator) are 120° apart. The two at the top and bottom (axial) are 90° from the middle ones.',
          standard:
            'Five electron groups form a trigonal bipyramid. The three equatorial positions are 120° apart; the two axial positions are 90° from the equator. Unlike the tetrahedron, these positions are NOT all equivalent. Example: PCl₅.',
          deep: 'Atoms in period 3 and below, like phosphorus and sulfur, can have more than eight electrons around them (an "expanded octet"). In PCl₅ the axial bonds are measurably longer than the equatorial ones because they have more close neighbors.',
        },
        view: { molecule: 'PCl₅', hull: true },
      },
      {
        title: 'Where does a lone pair go?',
        text: {
          simple: 'SF₄ has four bonds and one lone pair. The lone pair can sit at an axial spot or an equatorial spot. Which one gives it more room?',
          standard: 'SF₄ has five electron groups: 4 bonds and 1 lone pair. A lone pair needs the most room. Predict where it goes.',
          deep: 'Count the 90° neighbors: an axial position has three groups at 90°; an equatorial position has only two. Repulsions at 90° are by far the strongest, so this count decides it.',
        },
        // Before answering: just S inside the empty dashed bipyramid of available positions.
        view: { molecule: 'SF₄', mystery: true, hull: true },
        revealView: { molecule: 'SF₄', hull: true },
        quiz: {
          question: 'In SF₄, where does the lone pair sit?',
          choices: ['Axial (top or bottom)', 'Equatorial (around the middle)', 'It switches randomly'],
          answer: 1,
          explain:
            'Equatorial. There it has only two neighbors at 90° instead of three. The result is a seesaw shape, with the bonds bent slightly away from the lone pair (≈173° and ≈102°).',
          hint: 'Count how many groups are 90° away from each kind of position.',
        },
      },
      {
        title: 'More lone pairs, same rule',
        text: {
          simple: 'Add more lone pairs and they keep filling the roomy middle spots. Two lone pairs give a T-shape; three give a straight line.',
          standard:
            'Lone pairs fill equatorial positions first. With 2 lone pairs (ClF₃) the atoms form a T; with 3 (XeF₂) the two atoms are left axial, so the molecule is linear. Use the builder to go from SF₄ to XeF₂.',
          deep: 'XeF₂ is linear for a very different reason than CO₂: its steric number is 5, not 2. Two molecules can share a shape name while having completely different electron geometries.',
        },
        view: { molecule: 'SF₄', build: true, hull: true },
        task: {
          prompt: 'Turn SF₄ into the shape of XeF₂: 2 bonded atoms and 3 lone pairs.',
          check: (s) => s.bonds === 2 && s.lone === 3,
          success: 'Linear! Three lone pairs ring the middle, and the two atoms sit straight across from each other.',
          hint: 'Keep 5 groups in total: 2 bonded atoms and 3 lone pairs.',
        },
      },
      {
        title: 'Six groups',
        text: {
          simple:
            'Six groups point up, down, left, right, front, and back, like the faces of a die. Add two lone pairs, and they sit on opposite sides, leaving a flat square of atoms.',
          standard:
            'Six electron groups form an octahedron with 90° angles (SF₆). One lone pair gives a square pyramid (BrF₅). Two lone pairs go opposite each other, 180° apart, giving a square planar shape (XeF₄).',
          deep: 'In an octahedron all six positions are equivalent, so the first lone pair can go anywhere. The second goes directly opposite it, because any other spot would put the two lone pairs only 90° apart.',
        },
        view: { molecule: 'XeF₄', mystery: true },
        revealView: { molecule: 'XeF₄', hull: true },
        quiz: {
          question: 'XeF₄ has 4 bonds and 2 lone pairs (6 groups). Where are the two lone pairs?',
          choices: ['Next to each other, 90° apart', 'Opposite each other, 180° apart', 'Both in the same spot'],
          answer: 1,
          explain: 'Opposite each other. That keeps the two strongest repellers as far apart as possible and leaves the four F atoms in a flat square.',
        },
      },
    ],
  },

  /* =========================================================== 4 */
  {
    id: 'predict',
    title: 'Predict any shape',
    summary: 'The step-by-step method, then practice on molecules you haven’t seen.',
    minutes: 6,
    steps: [
      {
        title: 'The method',
        text: {
          simple:
            '1) Draw the Lewis structure. 2) Count the electron groups on the central atom: each bond (single, double, or triple) counts once, and each lone pair counts once. 3) That number picks the electron arrangement. 4) Name the shape from where the ATOMS are.',
          standard:
            '1) Draw the Lewis structure. 2) Count [[electron groups|electron group]] on the central atom (multiple bonds count once). 3) The [[steric number]] gives the [[electron geometry]]: 2 linear, 3 trigonal planar, 4 tetrahedral, 5 trigonal bipyramidal, 6 octahedral. 4) Place lone pairs (equatorial first for 5 groups, opposite each other for 6) and name the [[molecular shape]] from the atoms.',
          deep:
            'Shortcut for lone pairs on the central atom, when every bond is a single bond to H or a halogen: take its valence electrons, add 1 for each negative charge (subtract 1 for each positive charge), subtract 1 for each bond, then divide what’s left by 2. Always check against the Lewis structure.',
        },
        view: { bonds: 4, lone: 0, hull: true },
      },
      {
        title: 'Practice: PF₃',
        text: {
          simple: 'Phosphorus has 5 valence electrons. Three of them pair up with the three fluorines. How many are left over, and what shape does that make?',
          standard: 'P has 5 valence electrons; 3 go into P–F bonds, leaving 2 = one lone pair. Use that to predict the shape.',
          deep: 'Phosphorus is in the same group as nitrogen, so PF₃ has the same bonding pattern and the same shape as NH₃. Its F–P–F angle is smaller than NH₃’s H–N–H angle: electronegative fluorines pull bonding electrons away from the center.',
        },
        view: { central: 'P', ligand: 'F', bonds: 3, lone: 1, mystery: true },
        revealView: { central: 'P', ligand: 'F', bonds: 3, lone: 1, hull: true },
        quiz: {
          question: 'PF₃: 3 bonds + 1 lone pair. What is the molecular shape?',
          choices: ['Trigonal planar', 'Trigonal pyramidal', 'T-shaped', 'Tetrahedral'],
          answer: 1,
          explain: 'Trigonal pyramidal: 4 electron groups (tetrahedral), one of them a lone pair. Same as NH₃.',
          hint: 'Count all four groups first, then hide the lone pair.',
        },
      },
      {
        title: 'Practice: ICl₄⁻',
        text: {
          simple: 'Iodine has 7 valence electrons, plus 1 more from the negative charge: 8. Four go into bonds with chlorine. Four are left, which is two lone pairs.',
          standard: 'I: 7 valence electrons + 1 (negative charge) = 8. Four bonds use 4, leaving 4 = two lone pairs. That is six electron groups in total.',
          deep: 'For ions, add one electron per negative charge (or remove one per positive charge) before counting. ICl₄⁻ has the same electron count around the center as XeF₄.',
        },
        view: { central: 'I', ligand: 'Cl', bonds: 4, lone: 2, mystery: true },
        revealView: { central: 'I', ligand: 'Cl', bonds: 4, lone: 2, hull: true },
        quiz: {
          question: 'ICl₄⁻: 4 bonds + 2 lone pairs (6 groups). What is the shape?',
          choices: ['Tetrahedral', 'Seesaw', 'Square planar', 'Square pyramidal'],
          answer: 2,
          explain: 'Square planar: the two lone pairs sit opposite each other in the octahedron, leaving the four Cl atoms in a flat square.',
          hint: 'With 6 groups, where do two lone pairs go? Not next to each other.',
        },
      },
      {
        title: 'Practice: I₃⁻',
        text: {
          simple: 'The middle iodine has 7 + 1 = 8 electrons. Two go into bonds with the outer iodines, leaving 6, which is three lone pairs.',
          standard: 'Central I: 7 + 1 (charge) = 8 electrons. Two bonds use 2, leaving 6 = three lone pairs. Five electron groups in total.',
          deep: 'I₃⁻ forms when iodine dissolves in iodide solution. Triiodide and longer polyiodide chains, threaded inside starch’s helix, give the classic starch–iodine test its deep blue-black color.',
        },
        view: { central: 'I', ligand: 'I', bonds: 2, lone: 3, mystery: true },
        revealView: { central: 'I', ligand: 'I', bonds: 2, lone: 3, hull: true },
        quiz: {
          question: 'I₃⁻: 2 bonds + 3 lone pairs (5 groups). What is the shape?',
          choices: ['Bent', 'Linear', 'T-shaped', 'Trigonal planar'],
          answer: 1,
          explain: 'Linear. The three lone pairs fill the equatorial positions, leaving the two outer iodines axial, 180° apart: the same shape as XeF₂.',
          hint: 'Lone pairs fill the equatorial (middle) spots first. Where does that leave the two atoms?',
        },
      },
    ],
  },
]
