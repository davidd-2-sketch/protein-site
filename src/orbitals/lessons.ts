/*
  lessons.ts — the three orbital lessons.

  Facts used (computed from wavefunctions.ts and checked numerically, or standard Gen Chem):
    • 1s 90% surface radius for hydrogen: 2.66 a₀ = 1.41 Å (computed and checked by integration).
    • 2s radial node at r = 2 a₀ = 1.06 Å; 3s radial nodes at 1.90 and 7.10 a₀ (checked).
    • Nodes: n − 1 total; l angular; n − l − 1 radial.
    • H–H bond length 0.74 Å; C=C in ethene 1.34 Å.
    • Hybrid s character: sp 50%, sp² 33%, sp³ 25%.
    • C–H acidity (approx. pKa): ethyne ≈ 25, ethene ≈ 44, ethane ≈ 50 (standard organic tables).
    • He₂ bond order 0; only an extremely weak van der Waals dimer has been observed near 0 K.
*/
import type { BaseStep, Lesson } from '../lessons/types'
import type { OrbitalView } from './OrbitalScene'

export type OrbitalStep = BaseStep<OrbitalView & { axes?: boolean }, never>

export const ORBITAL_LESSONS: Lesson<OrbitalStep>[] = [
  /* =========================================================== 1 */
  {
    id: 'orbitals-basics',
    title: 'Where electrons live',
    summary: 's, p, and d orbitals: their shapes, phases, and nodes.',
    minutes: 5,
    steps: [
      {
        title: 'An electron is a cloud',
        text: {
          simple:
            'You can’t pin down exactly where an electron is. Think of a photo of a spinning fan: all you see is a blur showing where the blades usually are. This surface wraps the space where the electron spends 90% of its time. This is a 1s orbital: a simple sphere.',
          standard:
            'An [[orbital]] is a region where an electron is likely to be found. Since it has no hard edge, we draw the surface that encloses 90% of the probability. The 1s orbital is a sphere; for hydrogen, that surface has a radius of about 1.4 Å.',
          deep:
            'Orbitals are solutions ψ of the Schrödinger equation, and ψ² is the probability density. This surface is computed from hydrogen’s exact 1s wavefunction: it encloses 90% of the probability and sits at r ≈ 2.66 a₀ (1.41 Å).',
        },
        view: { kind: 'orbital', id: '1s', fit: 4.6 },
      },
      {
        title: 'Bigger shells, hidden nodes',
        text: {
          simple:
            'The 2s orbital is the same idea, but bigger: the electron is usually farther out. Here it’s cut in half, and there’s a surprise inside: a smaller sphere, separated by an empty shell where the electron is never found. That empty shell is a node.',
          standard:
            'Higher shells (larger n) are larger. The 2s orbital also has a [[node]]: a sphere where the probability is exactly zero (at 1.06 Å for hydrogen). The cutaway shows the inner and outer parts, which have opposite [[phases|phase]].',
          deep:
            'An orbital has n − 1 nodes in total: l angular nodes (planes or cones) and n − l − 1 radial nodes (spheres). 2s has one radial node, at exactly r = 2a₀.',
        },
        view: { kind: 'orbital', id: '2s', cutaway: true, fit: 4.6 },
        revealView: { kind: 'orbital', id: '3s', cutaway: true },
        quiz: {
          question: '2s has one node. How many nodes does a 3s orbital have?',
          choices: ['1', '2', '3'],
          answer: 1,
          explain: 'Two: an orbital has n − 1 nodes, and for s orbitals they are all spheres. The view now shows a 3s orbital cut open: three nested regions, separated by two nodes.',
          hint: 'Each step up in n adds one more node.',
        },
      },
      {
        title: 'The p orbital: two lobes',
        text: {
          simple:
            'p orbitals look like a dumbbell, or a figure 8: two lobes on opposite sides of the nucleus (the white dot). The electron is never found on the flat plane between the lobes.',
          standard:
            'A p [[orbital]] has two lobes with a flat nodal plane through the nucleus. The lobes have opposite [[phases|phase]]: + (blue) and − (orange, with a mesh pattern). Phase is not electric charge; it’s the sign of the electron’s wave, and it matters when orbitals overlap to make bonds.',
          deep:
            'The 2p_z wavefunction is ∝ z·e^(−r/2a₀), so it changes sign across the xy-plane: that plane is its single angular node (l = 1). The sign of one isolated orbital is arbitrary; only the relative phases of overlapping orbitals have physical consequences.',
        },
        view: { kind: 'orbital', id: '2pz', axes: true },
      },
      {
        title: 'Three p orbitals',
        text: {
          simple: 'Every shell from n = 2 up has three p orbitals, pointing along x, y, and z, like the three edges at the corner of a box.',
          standard:
            'Each shell from n = 2 has three p orbitals: pₓ, p_y, and p_z. They’re identical except for direction, and in an isolated atom they have the same energy. Each is shown in its own color here; the mesh pattern still marks the − phase.',
          deep:
            'For l = 1, m_l can be −1, 0, or +1, giving three orbitals. The pₓ, p_y, p_z drawn here are combinations of those solutions, chosen because they point along axes, which is convenient for describing bonds.',
        },
        view: { kind: 'set', ids: ['2px', '2py', '2pz'], axes: true },
        quiz: {
          question: 'A p subshell has how many orbitals, and holds how many electrons?',
          choices: ['1 orbital, 2 electrons', '3 orbitals, 6 electrons', '3 orbitals, 3 electrons', '5 orbitals, 10 electrons'],
          answer: 1,
          explain: 'Three orbitals, and each holds up to two electrons (with opposite spins), so six in total.',
        },
      },
      {
        title: 'd orbitals',
        text: {
          simple: 'From the third shell up, d orbitals appear. Most of them look like a four-leaf clover.',
          standard:
            'There are five d orbitals. Four look like four-leaf clovers (like this one, d_xy); the fifth, d_z², is a dumbbell with a donut around its middle. Each d orbital has two nodal surfaces.',
          deep: 'l = 2 gives two angular nodes and five orbitals. d orbitals drive transition-metal chemistry: the colors, magnetism, and catalytic behavior of metal compounds come from how surrounding atoms split d-orbital energies.',
        },
        view: { kind: 'orbital', id: '3dxy', axes: true },
        revealView: { kind: 'orbital', id: '3dz2', axes: true },
        quiz: {
          question: 'How many orbitals are in a d subshell?',
          choices: ['3', '5', '7'],
          answer: 1,
          explain: 'Five. The view now shows the unusual one, d_z²: two lobes along z, with a donut-shaped ring around the middle (opposite phase).',
          hint: 's has 1, p has 3; each subshell adds two more.',
        },
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'hybridization',
    title: 'Hybridization',
    summary: 'How s and p orbitals mix to match the shapes VSEPR predicts.',
    minutes: 5,
    steps: [
      {
        title: 'A puzzle',
        text: {
          simple:
            'Methane (CH₄) has four identical C–H bonds pointing to the corners of a tetrahedron, 109.5° apart. But carbon’s outer orbitals are one round 2s and three 2p orbitals at 90° to each other. Neither matches 109.5°! So how does carbon do it?',
          standard:
            'Carbon’s valence orbitals are 2s and three 2p, with the p orbitals 90° apart. Yet CH₄ has four identical bonds, 109.5° apart. [[Hybridization|hybridization]] resolves this: the orbitals mix into new ones that match the shape.',
          deep:
            'Hybridization is a model: a convenient description of bonding that matches VSEPR geometry. Full molecular-orbital calculations describe molecules differently, but the hybrid picture is excellent for predicting shapes and σ/π bonding.',
        },
        view: { kind: 'set', ids: ['2px', '2py', '2pz'], axes: true },
      },
      {
        title: 'sp³: four equal hybrids',
        text: {
          simple:
            'Mix one s and three p orbitals, and you get four new, identical orbitals called sp³. They point to the corners of a tetrahedron, exactly like methane’s bonds.',
          standard:
            'Mixing one 2s with three 2p orbitals gives four equivalent sp³ hybrids, 109.5° apart. Four electron groups (VSEPR) means sp³. Each colored lobe is one hybrid; their small back lobes are hidden here for clarity.',
          deep:
            'Each sp³ hybrid is (2s + √3·2p_n)/2: 25% s character and 75% p. These surfaces are computed from that exact mixture of hydrogen’s 2s and 2p wavefunctions.',
        },
        view: { kind: 'hybrids', set: 'sp3' },
        quiz: {
          question: 'What angle separates sp³ hybrid orbitals?',
          choices: ['90°', '109.5°', '120°', '180°'],
          answer: 1,
          explain: '109.5°, the tetrahedral angle. That’s why sp³ carbon matches VSEPR’s 4-group shape.',
        },
      },
      {
        title: 'Inside one hybrid',
        text: {
          simple:
            'Look at just one hybrid: it’s lopsided, with a big lobe on one side and a small one behind. The big lobe points toward the atom it will bond with.',
          standard:
            'Mixing makes a lopsided orbital: the s and p waves add together on one side (big + lobe) and partly cancel on the other (small − lobe). The big lobe overlaps strongly with a bonding partner.',
          deep:
            'That asymmetry is why hybrids form stronger, more directional bonds than pure p orbitals: more electron density points toward the bonding partner.',
        },
        view: { kind: 'hybrids', set: 'sp3', only: 0 },
      },
      {
        title: 'sp² and a leftover p',
        text: {
          simple:
            'Mix one s with only two p’s, and you get three sp² hybrids in a flat triangle, 120° apart. One p orbital is left over (grey), sticking up and down. That leftover p is what makes double bonds.',
          standard:
            'One s + two p gives three sp² hybrids, 120° apart in a plane (3 electron groups). The unhybridized p orbital (grey) is perpendicular to that plane; it forms the π bond in a C=C double bond.',
          deep:
            'sp² hybrids have 33% s character. More s character holds electrons closer to the nucleus, which is why sp² C–H bonds are shorter, and more acidic, than sp³ C–H bonds.',
        },
        view: { kind: 'hybrids', set: 'sp2', leftover: true, axes: true },
        quiz: {
          question: 'Each carbon in ethene (H₂C=CH₂) has 3 electron groups. Its hybridization is…',
          choices: ['sp', 'sp²', 'sp³'],
          answer: 1,
          explain: 'sp². Three groups means three hybrids (trigonal planar, 120°), and the leftover p forms the π part of the C=C double bond.',
        },
      },
      {
        title: 'sp: two hybrids, two leftover p’s',
        text: {
          simple:
            'Mix one s with one p, and you get two sp hybrids pointing in opposite directions (180°). Two p orbitals are left over, which makes triple bonds possible.',
          standard:
            'One s + one p gives two sp hybrids at 180° (2 electron groups, linear), plus two unhybridized p orbitals at right angles to each other. Each carbon in ethyne (HC≡CH) is sp.',
          deep:
            'With 50% s character, sp C–H bonds are the shortest and most acidic of the three. Approximate pKa values: ethyne ≈ 25, ethene ≈ 44, ethane ≈ 50.',
        },
        view: { kind: 'hybrids', set: 'sp', leftover: true, axes: true },
        quiz: {
          question: 'NH₃ has 3 bonds and 1 lone pair on nitrogen. What is nitrogen’s hybridization?',
          choices: ['sp', 'sp²', 'sp³'],
          answer: 2,
          explain: 'sp³. Count electron groups, including lone pairs: 4 groups means 4 hybrids. One of them holds the lone pair.',
          hint: 'Count every electron group, lone pairs too.',
        },
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'bonding',
    title: 'Bonds from overlap',
    summary: 'σ and π bonds, and why some combinations hold atoms together while others push them apart.',
    minutes: 5,
    steps: [
      {
        title: 'Sharing electrons: the σ bond',
        text: {
          simple:
            'When two hydrogen atoms come together, their 1s orbitals overlap and merge into one orbital wrapped around both nuclei (the white dots). The electron pair sits mostly between them, gluing the nuclei together. That’s a covalent bond.',
          standard:
            'Adding the two 1s orbitals in phase gives a bonding [[σ bond|sigma bond]]: electron density builds up between the nuclei and attracts both of them. It’s symmetric around the bond axis. The H–H bond is 0.74 Å long.',
          deep:
            'In molecular orbital theory (LCAO), ψ_bonding ≈ 1s_A + 1s_B. Two electrons with paired spins in this lower-energy orbital give H₂ a bond order of 1. Shown is a simple LCAO surface, not a full quantum-chemistry calculation.',
        },
        view: { kind: 'bond', id: 'h2-bonding' },
        note: 'Simple model: the bond surfaces add or subtract atomic orbitals (LCAO). Real molecular orbitals have the same shape and nodes, but slightly different sizes.',
      },
      {
        title: 'Out of phase: antibonding',
        text: {
          simple:
            'If the two orbitals combine with opposite phases, they cancel out in the middle, leaving an empty gap between the nuclei. With no glue between them, the nuclei push apart. This is an antibonding orbital.',
          standard:
            'Subtracting the orbitals gives an antibonding σ* orbital, with a [[node]] between the nuclei. Electrons in σ* raise the energy and weaken the bond.',
          deep:
            'Bond order = (bonding electrons − antibonding electrons) / 2. For He₂, two electrons fill σ and two fill σ*: bond order 0. He₂ doesn’t form a stable molecule; only an extremely weak van der Waals pair has been detected near absolute zero.',
        },
        view: { kind: 'bond', id: 'h2-antibonding' },
        quiz: {
          question: 'Two He atoms would put 2 electrons in σ (bonding) and 2 in σ* (antibonding). What happens?',
          choices: ['A strong double bond forms', 'No stable bond: the effects cancel', 'Half a bond forms'],
          answer: 1,
          explain: 'Bond order = (2 − 2) / 2 = 0. The antibonding electrons cancel the bonding ones, so He₂ isn’t a stable molecule.',
        },
      },
      {
        title: 'Head-on p overlap: σ',
        text: {
          simple: 'p orbitals can also overlap end to end, pointing right at each other. That makes a σ bond too, with the shared electrons right on the line between the atoms.',
          standard: 'Head-on overlap of two p orbitals (or hybrids) along the bond axis forms a [[σ bond|sigma bond]]. Every single bond is a σ bond.',
          deep: 'σ bonds are symmetric around the axis, so twisting one end doesn’t break the overlap. That’s why single bonds rotate freely, as in ethane.',
        },
        view: { kind: 'bond', id: 'p-sigma', axes: true },
      },
      {
        title: 'Side-by-side overlap: π',
        text: {
          simple:
            'Two parallel p orbitals can overlap side by side, above and below the line between the atoms. That’s a π bond: two sausage-shaped regions, with nothing on the axis itself.',
          standard:
            'Side-by-side overlap of parallel p orbitals forms a [[π bond|pi bond]], with electron density above and below the bond axis and a nodal plane along it. A double bond = 1 σ + 1 π; a triple bond = 1 σ + 2 π.',
          deep:
            'Twisting one end of a π bond pulls the p orbitals out of alignment and breaks the overlap, so double bonds don’t rotate freely. That’s why cis and trans alkenes are different compounds.',
        },
        view: { kind: 'bond', id: 'p-pi', axes: true },
        quiz: {
          question: 'How many σ and π bonds are in a C≡C triple bond?',
          choices: ['3 σ', '1 σ + 2 π', '2 σ + 1 π'],
          answer: 1,
          explain: 'One σ (head-on, from sp hybrids) and two π (side by side, from the two leftover p orbitals at right angles).',
        },
      },
    ],
  },
]
