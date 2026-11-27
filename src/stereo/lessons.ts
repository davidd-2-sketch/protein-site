/*
  lessons.ts — the Stereochemistry lessons (Orgo 1 + MCAT level).

  Each step names a molecule (molecules.ts) and what the 3D view should do (StereoScene).
  Atom numbers are positions in the molecule's SMILES (heavy atoms first), listed here:
    cbrclf      [C@@H](F)(Cl)Br           0 C · 1 F · 2 Cl · 3 Br · 4 H
    butanol-r   CC[C@@H](C)O              2 = C2 (stereocenter) · 4 = O
    propanol    CC(C)O                    1 = C2 · 3 = O · 7 = H on C2
    l-alanine   C[C@@H](C(=O)O)N          1 = C2 · 2 = C1 (COOH) · 0 = CH₃
    d-glyceraldehyde C([C@H](C=O)O)O      1 = C2 · 2 = C1 (CHO) · 0 = C3
    l-threonine C[C@H]([C@@H](C(=O)O)N)O  2 = C2 · 1 = C3
    tartaric    [C@@H]([C@H](C(=O)O)O)(C(=O)O)O   0 = C2 · 1 = C3 · 9 = O on C2 · 5 = O on C3
*/
import type { BaseStep, Lesson } from '../lessons/types'

export interface StereoLessonView {
  molecule: string
  center?: number
  orient?: 'free' | 'lowest-away' | 'lowest-toward' | 'fischer'
  fischerAxis?: [number, number]
  arrow?: boolean
  mirror?: 'beside' | 'overlay'
  align?: [number, number]
  swap?: [number, number]
  eclipse?: [number, number, number, number]
  plane?: boolean
  compare?: string
  /** Show priority numbers 1–4 on the focused center. */
  priorities?: boolean
  /** Show R/S on every stereocenter. */
  rs?: boolean
  /** Show the 2D Fischer projection beside the model. */
  fischer?: boolean
}

/** What the student did: clicked an atom. */
export interface StereoInput {
  atom: number
}

export type StereoStep = BaseStep<StereoLessonView, StereoInput>

export const STEREO_LESSONS: Lesson<StereoStep>[] = [
  /* ------------------------------------------------------------------ 1 */
  {
    id: 'chirality',
    title: 'Chirality: mirror images that don’t match',
    summary: 'Why some molecules have a left- and right-handed form, and how to spot them.',
    minutes: 5,
    steps: [
      {
        title: 'Left hand, right hand',
        text: {
          simple:
            'Your hands are mirror images, but you can’t stack one exactly on the other: a left glove never fits a right hand. Some molecules are like that too. We call them chiral (from the Greek for “hand”).',
          standard:
            'A molecule is chiral if it cannot be superimposed on its mirror image, the way a left hand can’t be laid perfectly over a right hand. This one, CHBrClF, is the simplest chiral molecule: one carbon holding four different atoms. Drag it to look around.',
          deep:
            'Chirality is a property of the whole object: a molecule is chiral if it has no improper symmetry element (no mirror plane, no inversion center, no rotation–reflection axis). The quickest practical test is a stereocenter: an sp³ atom with four different groups. CHBrClF is the textbook minimal case.',
        },
        view: { molecule: 'cbrclf', orient: 'free' },
      },
      {
        title: 'Its mirror image',
        text: {
          simple: 'On the right is its reflection in a mirror. Same atoms, same bonds. Just reflected.',
          standard:
            'Behind the glass is its mirror image. Every atom is connected the same way, so it has the same formula and the same bonds. The only difference is how the groups are arranged in space.',
          deep:
            'The mirror image has identical connectivity (constitution) and differs only in configuration. Two molecules related this way, if they can’t be superimposed, are enantiomers.',
        },
        view: { molecule: 'cbrclf', orient: 'free', mirror: 'beside' },
      },
      {
        title: 'Try to stack them',
        text: {
          simple:
            'Watch the reflection slide over and turn to line up with the original. Br and Cl match up, but then F and H end up in each other’s places. However you turn it, it never fits.',
          standard:
            'The mirror image now slides over and turns until Br and Cl line up exactly. Look at the ✕ marks: F and H are swapped. No rotation fixes this, so the two are different molecules: enantiomers.',
          deep:
            'Aligning any two substituents forces the other two to exchange positions, because reflection inverts the sense of rotation (1→2→3) around the center. Enantiomers are non-superimposable mirror images.',
        },
        view: { molecule: 'cbrclf', orient: 'free', mirror: 'overlay', align: [3, 2] },
      },
      {
        title: 'Find the stereocenter',
        text: {
          simple: 'The clue is a carbon with four DIFFERENT things attached. Find it in 2-butanol.',
          standard:
            'A carbon with four different groups is a stereocenter (also called a chiral center). It’s what makes a molecule like 2-butanol chiral. Its groups here: OH, CH₂CH₃, CH₃ and H.',
          deep:
            'Here the stereocenter is C2 of butan-2-ol: OH, ethyl, methyl and H are all different. C1 and C3 carry two or more H atoms, so they can’t be stereocenters.',
        },
        view: { molecule: 'butanol-r', orient: 'free' },
        task: {
          prompt: 'Click the stereocenter.',
          check: (i) => i.atom === 2,
          success: 'Yes: C2 holds OH, CH₂CH₃, CH₃ and H, four different groups.',
          hint: 'Look for the carbon with four different groups. A carbon with two H atoms on it can’t be one.',
        },
      },
      {
        title: 'Two identical groups: not chiral',
        text: {
          simple:
            '2-Propanol (rubbing alcohol) has two identical CH₃ groups on its middle carbon. Watch: its mirror image stacks on top perfectly. Not chiral.',
          standard:
            'Swap ethyl for a second methyl and you get 2-propanol. Its middle carbon has two identical groups, so it’s not a stereocenter, and the mirror image lines up exactly. Molecules like this are achiral.',
          deep:
            '2-Propanol has a mirror plane through C–O and C–H, bisecting the two methyls. Any molecule with a mirror plane is achiral and superimposable on its reflection.',
        },
        view: { molecule: 'propanol', orient: 'free', mirror: 'overlay', align: [3, 7] },
        quiz: {
          question: 'Which of these molecules is chiral?',
          choices: ['CH₂Cl₂ (dichloromethane)', 'CH₃CH₂OH (ethanol)', 'CH₃CH(OH)CH₂CH₃ (2-butanol)', '(CH₃)₂CHOH (2-propanol)'],
          answer: 2,
          explain: '2-Butanol’s C2 has four different groups (OH, CH₂CH₃, CH₃, H). The others all have a carbon with two identical groups.',
          hint: 'Look for one carbon with four different groups.',
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ 2 */
  {
    id: 'r-and-s',
    title: 'Naming R and S',
    summary: 'Rank the groups, point the lowest away, and trace 1 → 2 → 3.',
    minutes: 6,
    steps: [
      {
        title: 'Step 1: rank the groups',
        text: {
          simple: 'Give each group a number from 1 (most important) to 4. The rule: the atom with the bigger atomic number wins. Br beats Cl beats F beats H.',
          standard:
            'The Cahn–Ingold–Prelog (CIP) rules rank the four groups by the atomic number of the atom attached to the stereocenter: higher number = higher priority. Here Br (35) > Cl (17) > F (9) > H (1).',
          deep:
            'CIP rule 1: rank by atomic number of the directly attached atom (isotopes by mass if needed). Br 35 > Cl 17 > F 9 > H 1, so priorities are 1 = Br, 2 = Cl, 3 = F, 4 = H.',
        },
        view: { molecule: 'cbrclf', orient: 'free', priorities: true },
      },
      {
        title: 'Step 2: point group 4 away',
        text: {
          simple: 'Turn the molecule so group 4 (here H) points straight away from you, behind the carbon.',
          standard: 'Now turn the molecule so the lowest-priority group (4, the H) points directly away from you. Watch it turn.',
          deep: 'Orient the lowest-priority substituent anti to the viewer. The other three then project onto a plane facing you, and their order around the center is unambiguous.',
        },
        view: { molecule: 'cbrclf', orient: 'lowest-away', priorities: true },
      },
      {
        title: 'Step 3: trace 1 → 2 → 3',
        text: {
          simple: 'Follow 1 → 2 → 3. Clockwise (like a clock’s hands) is R. Counterclockwise is S. This one goes clockwise: R.',
          standard:
            'Trace from 1 to 2 to 3. Clockwise = R (Latin rectus, “right”); counterclockwise = S (sinister, “left”). The arrow goes clockwise, so this is (R)-bromochlorofluoromethane.',
          deep:
            'With 4 anti to the viewer, a clockwise 1→2→3 sequence is R and counterclockwise is S. This molecule is (R)-CHBrClF, matching PubChem CID 57518771.',
        },
        view: { molecule: 'cbrclf', orient: 'lowest-away', priorities: true, arrow: true, rs: true },
      },
      {
        title: 'Swap two groups: R becomes S',
        text: {
          simple: 'Watch F and Cl trade places. Now the arrow runs the other way: the molecule became S. It’s now the mirror-image molecule.',
          standard:
            'Swapping ANY two groups on a stereocenter reverses its configuration: R becomes S. Watch F and Cl trade places. One swap gives the enantiomer; a second swap would bring you back.',
          deep:
            'A single transposition of substituents inverts the configuration (odd permutation); two transpositions restore it. This is also a handy exam trick: swap groups to put 4 in back, assign, then undo.',
        },
        view: { molecule: 'cbrclf', orient: 'lowest-away', priorities: true, rs: true, swap: [1, 2] },
      },
      {
        title: 'The trap: group 4 toward you',
        text: {
          simple: 'If group 4 points AT you, read the arrow normally, then flip the answer. Here it looks counterclockwise, but it’s really R.',
          standard:
            'On paper, the lowest group often points toward you (a wedge). Then trace 1 → 2 → 3 as usual and reverse the answer. Here the arrow looks counterclockwise (S), so the real answer is R. Same molecule as before.',
          deep:
            'Viewing from the side of the lowest-priority group inverts the apparent sense of rotation. Assign as seen and invert (S → R). Equivalent: swap 4 with any group, assign, invert.',
        },
        view: { molecule: 'cbrclf', orient: 'lowest-toward', priorities: true, arrow: true },
        revealView: { molecule: 'cbrclf', orient: 'lowest-toward', priorities: true, arrow: true, rs: true },
        quiz: {
          question: 'Group 4 points toward you, and 1 → 2 → 3 looks counterclockwise. What is the configuration?',
          choices: ['R', 'S'],
          answer: 0,
          explain: 'Counterclockwise would be S, but with group 4 toward you the answer is reversed: R.',
          hint: 'With the lowest group toward you, whatever you read is backwards.',
        },
      },
      {
        title: 'Ties: go to the next atoms',
        text: {
          simple:
            'In 2-butanol, two groups start with carbon. Break the tie by looking at what’s attached next. The CH₂ in ethyl holds (C, H, H); the methyl holds (H, H, H). That extra C wins.',
          standard:
            'OH is first (O = 8). Ethyl and methyl both start with C, so compare the atoms attached to each, highest first: ethyl’s CH₂ has (C, H, H), methyl has (H, H, H). At the first difference C beats H, so ethyl is 2 and methyl is 3.',
          deep:
            'CIP rule 2: when the attached atoms tie, compare their substituent sets in order of decreasing atomic number, sphere by sphere, until the first point of difference. (C,H,H) > (H,H,H). Note: you compare the SETS, not the sum of atomic numbers.',
        },
        view: { molecule: 'butanol-r', orient: 'lowest-away', priorities: true, arrow: true, rs: true },
      },
      {
        title: 'Double bonds count twice',
        text: {
          simple: 'In alanine, COOH beats CH₃: its carbon is attached to O, O, O (the double bond counts twice) versus H, H, H.',
          standard:
            'A double bond counts as two single bonds to that atom. So the COOH carbon is treated as holding (O, O, O), and it outranks CH₃ (H, H, H). Alanine’s order: NH₂ > COOH > CH₃ > H. The natural form, L-alanine, is S.',
          deep:
            'CIP rule 3: multiple bonds are expanded with duplicate atoms (C=O counts as C bonded to O and a duplicate O). COOH → (O,O,O) beats CH₃ → (H,H,H). L-alanine = (2S), as in PubChem CID 5950.',
        },
        view: { molecule: 'l-alanine', orient: 'lowest-away', priorities: true, arrow: true },
        revealView: { molecule: 'l-alanine', orient: 'lowest-away', priorities: true, arrow: true, rs: true },
        quiz: {
          question: 'Priorities are NH₂ (1), COOH (2), CH₃ (3), H (4), with H pointing away. The arrow runs counterclockwise. Is L-alanine R or S?',
          choices: ['R', 'S'],
          answer: 1,
          explain: 'Counterclockwise with the lowest group away is S. Almost all amino acids in your proteins are S (cysteine is the famous exception, because of its sulfur).',
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ 3 */
  {
    id: 'two-centers',
    title: 'Two stereocenters: enantiomers and diastereomers',
    summary: 'The 2ⁿ rule, and which stereoisomers are mirror images.',
    minutes: 5,
    steps: [
      {
        title: 'Two stereocenters',
        text: {
          simple: 'Threonine, an amino acid, has two stereocenters. Each can be R or S, so there are 2 × 2 = 4 possible versions.',
          standard:
            'L-Threonine has two stereocenters: C2 (S) and C3 (R). With n stereocenters there are at most 2ⁿ stereoisomers, so threonine has up to 4: (2S,3R), (2R,3S), (2S,3S) and (2R,3R).',
          deep:
            'The maximum number of stereoisomers is 2ⁿ for n stereogenic centers; symmetry (meso forms) can reduce it. Natural L-threonine is (2S,3R) (PubChem CID 6288).',
        },
        view: { molecule: 'l-threonine', orient: 'free', center: 2, rs: true },
      },
      {
        title: 'Flip both: the enantiomer',
        text: {
          simple: 'Its mirror image flips BOTH centers: (2R,3S). Mirror images like this are enantiomers.',
          standard:
            'The mirror image inverts every stereocenter: (2S,3R) becomes (2R,3S). That pair is enantiomers. Enantiomers have the same melting point, boiling point and solubility.',
          deep:
            'Reflection inverts all stereocenters simultaneously. Enantiomers have identical scalar physical properties in an achiral environment; they differ only in interactions with other chiral things (plane-polarized light, enzymes, chiral receptors).',
        },
        view: { molecule: 'l-threonine', orient: 'free', center: 2, rs: true, mirror: 'beside' },
      },
      {
        title: 'Flip one: a diastereomer',
        text: {
          simple: 'Flip only ONE center and you get allothreonine (2S,3S). It’s not threonine’s mirror image. That makes them diastereomers.',
          standard:
            'Now compare L-threonine (left) with L-allothreonine (right): C2 is the same (S) but C3 is flipped (S). Stereoisomers that are NOT mirror images are diastereomers, and they have different physical properties.',
          deep:
            'Diastereomers differ at some but not all stereocenters. They are distinct compounds with different melting points, solubilities and reactivities, which is why they can be separated by ordinary methods (crystallization, chromatography).',
        },
        view: { molecule: 'l-threonine', orient: 'free', center: 2, rs: true, compare: 'l-allothreonine' },
        quiz: {
          question: '(2S,3R) and (2R,3R) are what to each other?',
          choices: ['Enantiomers', 'Diastereomers', 'The same molecule'],
          answer: 1,
          explain: 'Only C2 differs. Enantiomers need EVERY center flipped, so these are diastereomers.',
          hint: 'Count how many centers changed.',
        },
      },
      {
        title: 'Optical activity: an honest note',
        text: {
          simple:
            'Chiral molecules twist polarized light. One enantiomer twists it right (+), the other left (−) by the same amount. But R and S don’t tell you which way! (R)-2-butanol twists left, (R)-glyceraldehyde twists right.',
          standard:
            'Enantiomers rotate plane-polarized light by equal amounts in opposite directions: (+) dextrorotatory, (−) levorotatory. A 50:50 racemic mixture shows no rotation. You can’t predict the sign from R/S: (R)-2-butanol is (−), while (R)-glyceraldehyde is (+).',
          deep:
            'Specific rotation [α] is measured, not derived from CIP labels: R/S is a naming convention, while the sign of rotation depends on electronic structure, wavelength, solvent and temperature. Examples: (R)-butan-2-ol is (−); (R)-glyceraldehyde is (+). A racemate has [α] = 0.',
        },
        view: { molecule: 'butanol-r', orient: 'free', rs: true, compare: 'd-glyceraldehyde' },
        note: 'Signs of rotation from PubChem’s compound titles: (−)-2-butanol is CID 84682 (R); (+)-glyceraldehyde is CID 79014 (R).',
      },
    ],
  },

  /* ------------------------------------------------------------------ 4 */
  {
    id: 'meso',
    title: 'Meso compounds',
    summary: 'Two stereocenters, yet not chiral: the hidden mirror plane.',
    minutes: 4,
    steps: [
      {
        title: 'Tartaric acid',
        text: {
          simple: 'Tartaric acid (from grapes) has two stereocenters with the same four groups on each. This form is (R,R).',
          standard:
            'Tartaric acid has two stereocenters, and each carries the same set of groups: OH, COOH, H and the other half of the molecule. L-tartaric acid, from grapes, is (2R,3R). It is chiral.',
          deep:
            'Because both stereocenters bear constitutionally identical substituents, the (R,R)/(S,S) pair are enantiomers while (R,S) ≡ (S,R) is a single achiral compound. Hence 3 stereoisomers, not 2² = 4.',
        },
        view: { molecule: 'l-tartaric', orient: 'free', center: 0, rs: true },
      },
      {
        title: 'The (R,S) form',
        text: {
          simple: 'This one is (R,S): one center of each kind. It turns out to be special.',
          standard: 'Now the (2R,3S) form, called meso-tartaric acid. It has two stereocenters, but as you’ll see, the molecule as a whole is not chiral.',
          deep: 'meso-Tartaric acid, (2R,3S) (PubChem CID 447315). Its two halves are mirror images of each other.',
        },
        view: { molecule: 'meso-tartaric', orient: 'free', center: 0, rs: true },
      },
      {
        title: 'Turn the middle bond',
        text: {
          simple: 'Watch the middle bond turn until the two OH groups line up. A mirror plane appears: the top half reflects onto the bottom half.',
          standard:
            'Rotate around the central C–C bond until the two OH groups line up. Now a mirror plane cuts the molecule in half: each half is the reflection of the other. Any molecule with an internal mirror plane is achiral. That is a meso compound.',
          deep:
            'In the eclipsed conformation, meso-tartaric acid has a σ plane perpendicular to the C2–C3 bond. (In the anti conformation it has an inversion center instead.) Either improper symmetry element makes it achiral, so it is optically inactive.',
        },
        view: { molecule: 'meso-tartaric', orient: 'free', center: 0, rs: true, eclipse: [9, 0, 1, 5], plane: true },
      },
      {
        title: 'No plane in (R,R)',
        text: {
          simple: 'Do the same to the (R,R) form. When the OH groups line up, H sits across from COOH. No mirror plane, so it stays chiral.',
          standard: 'Try the same turn on (R,R)-tartaric acid: with the OH groups lined up, each H faces a COOH. The halves don’t reflect onto each other, so there is no mirror plane, and (R,R) stays chiral.',
          deep: 'For (R,R), no conformation has a σ plane or inversion center; it is chiral, and its enantiomer is (S,S). Tartaric acid therefore has three stereoisomers: (R,R), (S,S) and meso.',
        },
        view: { molecule: 'l-tartaric', orient: 'free', center: 0, rs: true, eclipse: [9, 0, 1, 5] },
        quiz: {
          question: 'How many stereoisomers does tartaric acid have?',
          choices: ['2', '3', '4'],
          answer: 1,
          explain: 'Three: (R,R), (S,S), and meso. The 2ⁿ rule gives a maximum of 4, but (R,S) and (S,R) are the same meso compound.',
          hint: 'Are (R,S) and (S,R) different here?',
        },
      },
    ],
  },

  /* ------------------------------------------------------------------ 5 */
  {
    id: 'fischer',
    title: 'Fischer projections, D and L',
    summary: 'The flat cross drawings for sugars and amino acids, and how they map to 3D.',
    minutes: 5,
    steps: [
      {
        title: 'Flatten a stereocenter',
        text: {
          simple: 'A Fischer projection is a quick flat drawing. The rule: side bonds come TOWARD you, up-and-down bonds go AWAY. Watch the 3D model line up with the drawing.',
          standard:
            'In a Fischer projection, each stereocenter is a cross. Horizontal bonds point toward you; vertical bonds point away. The carbon chain runs top to bottom, most oxidized carbon (here CHO) on top. Watch glyceraldehyde turn to match its drawing.',
          deep:
            'A Fischer projection draws each stereocenter in an eclipsed conformation viewed with the backbone curving away: vertical = behind the plane, horizontal = in front (a “bow tie”). Rotating the drawing 90° inverts the configuration; 180° preserves it.',
        },
        view: { molecule: 'd-glyceraldehyde', orient: 'fischer', fischerAxis: [2, 0], fischer: true },
      },
      {
        title: 'D and L',
        text: {
          simple: 'Look at the stereocenter lowest in the chain: OH on the right means D, on the left means L. This is D-glyceraldehyde.',
          standard:
            'D and L come from glyceraldehyde. In a Fischer projection, if the bottom stereocenter’s OH (or NH₂ for amino acids) is on the RIGHT, it’s D; on the LEFT, it’s L. Sugars in your body are mostly D; amino acids are L.',
          deep:
            'D/L describes the configuration of the stereocenter farthest from C1, relative to D-glyceraldehyde. It is an older convention, not the same as R/S: D-glyceraldehyde is R, L-alanine is S, but L-cysteine is R.',
        },
        view: { molecule: 'l-alanine', orient: 'fischer', fischerAxis: [2, 0], fischer: true },
        quiz: {
          question: 'In L-alanine’s Fischer projection (COOH on top), which side is NH₂ on?',
          choices: ['Left', 'Right'],
          answer: 0,
          explain: 'L means the NH₂ (or OH) on the lowest stereocenter points left. All amino acids in human proteins are L.',
        },
      },
      {
        title: 'R or S from a Fischer drawing',
        text: {
          simple: 'If H is on a side (horizontal) bond, it points at you. Read 1 → 2 → 3 and flip the answer.',
          standard:
            'In most Fischer projections H sits on a horizontal bond, pointing toward you. So trace 1 → 2 → 3 on the drawing and then REVERSE it. For L-alanine: NH₂ → COOH → CH₃ looks clockwise (R), so it’s really S.',
          deep:
            'Horizontal = toward the viewer, so with H horizontal, the observed sense is inverted. If H is vertical (pointing away), read it directly. Swapping any two groups in a Fischer projection inverts the center.',
        },
        view: { molecule: 'l-alanine', orient: 'fischer', fischerAxis: [2, 0], fischer: true, priorities: true, rs: true },
      },
      {
        title: 'Two centers on one drawing',
        text: {
          simple: 'Molecules with more stereocenters stack more crosses. This is L-threonine: NH₂ on the left (L), OH on the right.',
          standard:
            'With more stereocenters, Fischer crosses stack vertically, one per stereocenter. L-threonine: NH₂ left at C2, OH right at C3. The 3D model is turned to a natural shape; the drawing shows each center in Fischer form.',
          deep:
            'Each cross is a separate eclipsed center; the whole drawing corresponds to an all-eclipsed conformation curling away from you. Fischer projections make it easy to spot meso compounds: a horizontal mirror line through the middle.',
        },
        view: { molecule: 'l-threonine', orient: 'free', center: 2, rs: true, fischer: true },
        quiz: {
          question: 'In a Fischer projection, the horizontal bonds point…',
          choices: ['Away from you', 'Toward you', 'In the plane of the page'],
          answer: 1,
          explain: 'Horizontal = toward you, vertical = away. (Think of a bow tie held toward you.)',
        },
      },
    ],
  },
]
