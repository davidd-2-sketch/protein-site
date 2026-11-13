/*
  lessons.ts — the six Enzymes lessons.

  Measured from the PDB files (see reference/README.md; checked in tests/enzymes.test.ts):
    • Chymotrypsin triad His57–Ser195 2.72 Å, Asp102–His57 2.74 Å (6CHA).
    • The mimic (PBA) is attached to Ser195 (B–O 1.88 Å); one PBA oxygen sits 3.12 Å from
      Gly193 N and 2.88 Å from Ser195 N (the oxyanion hole).
    • Empty vs mimic-bound chymotrypsin: 0.25 Å RMSD overall; no active-site residue moves > 1 Å.
    • Glucokinase: lid (151–153) ~28 Å from the glucose-binding side when open, ~6 Å closed;
      residues 157–179 disordered in the open form.
  Standard textbook facts (Lehninger; Berg/Tymoczko/Stryer; Voet):
    • Chymotrypsin cleaves after large hydrophobic/aromatic residues (Phe, Tyr, Trp; Leu, Met
      more slowly). Trypsin has Asp189 at the bottom of its S1 pocket and prefers Lys/Arg.
    • Serine-protease mechanism: Ser195 attack → tetrahedral intermediate (oxyanion stabilized
      by the oxyanion hole) → acyl-enzyme + amine product → water attack → second tetrahedral
      intermediate → carboxylic acid product, enzyme regenerated.
    • Enzymes lower Eₐ by binding the transition state more tightly than the substrate; they
      do not change ΔG or the equilibrium.
    • Hexokinase closing excludes water, so ATP's phosphate goes to glucose, not to water
      (Koshland's induced-fit example).
    • Uncatalyzed peptide-bond hydrolysis in neutral water: half-life of roughly 350–600 years,
      depending on the bond (Radzicka & Wolfenden, J. Am. Chem. Soc. 1996).
    • Glucokinase is half-saturated at ~8 mM glucose and its curve is sigmoidal (not simple
      Michaelis–Menten); hexokinase I has a Km below 0.1 mM. Statins are competitive
      inhibitors of HMG-CoA reductase; lithium is an uncompetitive inhibitor of inositol
      monophosphatase; HIV protease inhibitors are transition-state mimics.
*/
import type { BaseStep, Lesson, MeasureLine, PinLabel } from '../lessons/types'
import type { ResidueRef } from '../protein/ProteinViewer'
import type { KineticsPlot } from './KineticsChart'
import type { Inhibition } from './kinetics'
import type { StructureId } from './structures'

export type EnzymeLessonView =
  | {
      kind: 'structure'
      structure: StructureId
      /** Where the camera goes: the active site (default), the whole enzyme, or chosen residues. */
      focus?: 'site' | 'whole' | ResidueRef[]
      radius?: number
      /** Labels to pin; defaults to the structure's standard labels. [] hides them. */
      labels?: PinLabel[]
      lines?: MeasureLine[]
      style?: 'cartoon' | 'surface'
    }
  | { kind: 'energy'; uncatalyzed: boolean; catalyzed: boolean }
  | { kind: 'kinetics'; plot: KineticsPlot; type: Inhibition; inhibitor: number; substrate: number }

/** What the student clicked in 3D (for "click the …" tasks). */
export interface EnzymePick {
  chain: string
  seq: number
  comp: string
}

export type EnzymeStep = BaseStep<EnzymeLessonView, EnzymePick>

const TS = 'chymo-ts' as const
const triad: ResidueRef[] = [
  { chain: 'C', seq: 195 },
  { chain: 'B', seq: 57 },
  { chain: 'B', seq: 102 },
]
const ser = (atom: string) => ({ chain: 'C', seq: 195, atom })
const his = (atom: string) => ({ chain: 'B', seq: 57, atom })
const asp = (atom: string) => ({ chain: 'B', seq: 102, atom })
const mimic = (atom: string) => ({ chain: 'C', seq: 1, atom })

export const ENZYME_LESSONS: Lesson<EnzymeStep>[] = [
  /* =========================================================== 1 */
  {
    id: 'meet-enzyme',
    title: 'Meet an enzyme',
    summary: 'A protein that speeds up a reaction, the active site, and what a catalyst can’t change.',
    minutes: 4,
    steps: [
      {
        title: 'A protein that speeds things up',
        text: {
          simple:
            'This is **chymotrypsin**, a real enzyme from the pancreas. Its job: cut other proteins into pieces when you digest food. Without it, breaking one peptide bond in water would take hundreds of years. With it, it takes a tiny fraction of a second.',
          standard:
            'An [[enzyme]] is a biological [[catalyst]]: it speeds up a reaction without being used up. Chymotrypsin digests proteins in the small intestine by hydrolyzing peptide bonds. On its own, a peptide bond in water has a half-life of hundreds of years.',
          deep:
            'Chymotrypsin is a serine protease (about 25 kDa) made as an inactive precursor, chymotrypsinogen, and activated by cutting, which is why this structure has three chains (A, B, C) held together by disulfide bonds. Uncatalyzed peptide hydrolysis at neutral pH has a half-life of roughly 350–600 years, depending on the bond (Radzicka & Wolfenden, 1996).',
        },
        view: { kind: 'structure', structure: TS, focus: 'whole', labels: [] },
        note: 'Experimental structure: PDB 6CHA, cow chymotrypsin, X-ray, 1.8 Å. One of the two copies in the file is shown.',
      },
      {
        title: 'The active site',
        text: {
          simple:
            'All the action happens in one small spot: the **active site**. Out of about 240 amino acids, only a handful (colored) do the chemistry. The rest of the protein is the frame that holds them in exactly the right places.',
          standard:
            'The [[active site]] is a small pocket where the [[substrate]] binds and the reaction happens. Here: the catalytic triad (cyan), the oxyanion hole (gold), and the specificity pocket (violet). The large rest of the protein positions these few residues precisely.',
          deep:
            'Active sites are usually clefts that bring together residues far apart in the sequence: His57 and Asp102 are on chain B, Ser195 on chain C, yet their side chains touch. That precise 3D arrangement is what folding buys an enzyme.',
        },
        view: { kind: 'structure', structure: TS, focus: 'site' },
        quiz: {
          question: 'After chymotrypsin cuts one peptide bond, what happens to the enzyme?',
          choices: ['It is used up, like a reactant', 'It comes out unchanged and can cut another bond', 'It becomes the product'],
          answer: 1,
          explain:
            'It comes out unchanged. That’s what makes it a [[catalyst]]: it takes part in the reaction but is regenerated at the end, so one enzyme molecule can handle many substrate molecules.',
          hint: 'A catalyst speeds up a reaction without being consumed.',
        },
      },
      {
        title: 'Caught in the act',
        text: {
          simple:
            'This crystal was grown with a small molecule (pink) stuck in the active site. It sits exactly where a protein chain would sit while being cut. Click it.',
          standard:
            'The pink molecule is phenylethane boronic acid, a [[transition-state|transition state]] mimic. It binds where the substrate binds, and its ring points into the specificity pocket. Click it to see what it is.',
          deep:
            'Boron is attached to Ser195’s oxygen (1.9 Å) and is tetrahedral, like the carbon of a peptide bond halfway through being cut. That is why it binds so tightly and why crystallographers use it: it freezes the moment of catalysis.',
        },
        view: { kind: 'structure', structure: TS, focus: [{ chain: 'C', seq: 195 }, { chain: 'C', seq: 1 }], radius: 9 },
        task: {
          prompt: 'Click the pink bound molecule.',
          check: (p) => p.comp === 'PBA',
          success: 'That’s it: a transition-state mimic, attached to Ser195 and sitting in the active site.',
          hint: 'Look for the pink sticks in the middle of the colored residues.',
        },
      },
      {
        title: 'Faster, not further',
        text: {
          simple:
            'Enzymes make reactions faster by lowering the “hill” in the middle (the activation energy). But they don’t change where the reaction starts or ends.',
          standard:
            'Enzymes lower the [[activation energy]] (Eₐ). They do not change ΔG: the reactants and products have the same energies with or without the enzyme, so the equilibrium is the same. The enzyme just helps the reaction get there faster.',
          deep:
            'Because ΔG is unchanged, so is the equilibrium constant. An enzyme speeds up the forward and reverse reactions by the same factor. Rate depends on Eₐ (via the Arrhenius/Eyring relationship); a modest drop in Eₐ gives an enormous rate increase.',
        },
        view: { kind: 'energy', uncatalyzed: true, catalyzed: true },
        quiz: {
          question: 'What does an enzyme change?',
          choices: ['ΔG of the reaction', 'The activation energy, Eₐ', 'Both ΔG and Eₐ'],
          answer: 1,
          explain: 'Only Eₐ. The diagram’s two paths start and end at the same heights, so ΔG (and the equilibrium) is unchanged. The barrier in between is much lower.',
          hint: 'Compare where the two curves start and end.',
        },
        note: 'Schematic energy diagram: the shapes are standard, the heights are not measured values.',
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'triad',
    title: 'The catalytic triad',
    summary: 'Ser195, His57, and Asp102: what each does, step by step.',
    minutes: 6,
    steps: [
      {
        title: 'Three residues, one team',
        text: {
          simple:
            'Three amino acids work together to cut the bond: **serine 195**, **histidine 57**, and **aspartate 102**. They’re called the catalytic triad. Click serine 195, the one that does the attacking.',
          standard:
            'The [[catalytic triad]] is Ser195, His57, and Asp102. They’re linked by hydrogen bonds, and each has a job. Click Ser195: its side-chain oxygen is the [[nucleophile]] that attacks the peptide bond.',
          deep:
            'The numbers follow chymotrypsinogen numbering, which is why they’re not consecutive with the chain boundaries. The same Ser/His/Asp triad evolved independently in unrelated proteases (e.g. subtilisin), a classic case of convergent evolution.',
        },
        view: { kind: 'structure', structure: TS, focus: triad, radius: 7 },
        task: {
          prompt: 'Click serine 195 (Ser195).',
          check: (p) => p.chain === 'C' && p.seq === 195,
          success: 'Right: Ser195. Its –OH oxygen will attack the carbonyl carbon of the peptide bond.',
          hint: 'It’s the cyan residue attached to the pink molecule.',
        },
      },
      {
        title: 'His57: the proton taker',
        text: {
          simple:
            'A plain –OH group is a weak attacker. Histidine 57 sits right next to it and pulls off its hydrogen, turning serine’s oxygen into a much stronger attacker.',
          standard:
            'His57 is a general base: as Ser195 attacks, His57 takes Ser195’s proton. That makes the serine oxygen far more nucleophilic. The dashed line is the hydrogen bond between them (measured in the crystal).',
          deep:
            'His57’s imidazole (pKa near 7) is ideal for shuttling protons at physiological pH. It acts as a base in the attack step and as an acid when it hands the proton to the leaving amine.',
        },
        view: {
          kind: 'structure',
          structure: TS,
          focus: triad,
          radius: 6,
          labels: [
            { text: 'Ser195', at: ser('OG'), tone: 'accent' },
            { text: 'His57', at: his('NE2'), tone: 'accent' },
          ],
          lines: [{ from: his('NE2'), to: ser('OG'), label: 'H-bond' }],
        },
        quiz: {
          question: 'His57’s nitrogen sits right next to Ser195’s –OH. What does His57 do in the first step?',
          choices: ['Takes the proton from Ser195’s –OH', 'Attacks the peptide bond itself', 'Holds the substrate’s side chain'],
          answer: 0,
          explain:
            'It takes the proton. That turns Ser195’s oxygen into a strong nucleophile at the moment of attack. His57 is a general base here.',
          hint: 'Which job needs a base?',
        },
      },
      {
        title: 'Asp102: holding His57 in place',
        text: {
          simple:
            'Aspartate 102 is behind histidine. It holds histidine at the right angle, and its negative charge helps steady histidine once histidine picks up the extra hydrogen.',
          standard:
            'Asp102 hydrogen-bonds the other nitrogen of His57. It keeps His57 in the right orientation and stabilizes the positive charge His57 carries after it takes a proton.',
          deep:
            'Sometimes called a “charge-relay” system. Replacing Asp102 with Asn slows catalysis by roughly 10⁴-fold, showing it matters even though it never touches the substrate.',
        },
        view: {
          kind: 'structure',
          structure: TS,
          focus: triad,
          radius: 6,
          labels: [
            { text: 'His57', at: his('NE2'), tone: 'accent' },
            { text: 'Asp102', at: asp('CG'), tone: 'accent' },
          ],
          lines: [{ from: asp('OD1'), to: his('ND1'), label: 'H-bond' }],
        },
        note: 'The 10⁴-fold figure comes from mutation studies of the related protease trypsin (Craik et al., Science 1987).',
      },
      {
        title: 'The attack, and the oxyanion hole',
        text: {
          simple:
            'Serine’s oxygen attacks the carbon of the peptide bond. For a split second that carbon has four groups attached, and its oxygen gains a negative charge. A small pocket called the **oxyanion hole** holds that negative oxygen with two hydrogen bonds.',
          standard:
            'Ser195 attacks the carbonyl carbon, forming a short-lived tetrahedral intermediate with a negatively charged oxygen (an oxyanion). Backbone N–H groups of Gly193 and Ser195 form the [[oxyanion hole]] and hydrogen-bond that oxygen. The mimic here copies this tetrahedral shape.',
          deep:
            'The oxyanion hole binds the tetrahedral transition state better than the flat substrate, a direct example of transition-state stabilization. In this crystal, the mimic’s oxygen is 3.1 Å from Gly193 N and 2.9 Å from Ser195 N.',
        },
        view: {
          kind: 'structure',
          structure: TS,
          focus: [{ chain: 'C', seq: 193 }, { chain: 'C', seq: 195 }, { chain: 'C', seq: 1 }],
          radius: 6,
          labels: [
            { text: 'Oxyanion hole', at: { chain: 'C', seq: 193, atom: 'N' }, tone: 'warm' },
            { text: 'Ser195', at: ser('OG'), tone: 'accent' },
          ],
          lines: [
            { from: mimic('O1'), to: { chain: 'C', seq: 193, atom: 'N' }, label: 'H-bond' },
            { from: mimic('O1'), to: { chain: 'C', seq: 195, atom: 'N' }, label: 'H-bond' },
          ],
        },
        note: 'Illustrative steps on real atom positions (PDB 6CHA). The bound molecule is a mimic, not a real substrate.',
      },
      {
        title: 'Two halves, and water finishes the job',
        text: {
          simple:
            'The bond breaks: one half of the protein chain leaves, and the other half stays stuck to serine. Then a water molecule comes in, histidine helps it attack, and the second half is released. The enzyme is back where it started.',
          standard:
            'Breaking the C–N bond releases the first product (the amine half) and leaves an acyl-enzyme: the other half bonded to Ser195. Then water, activated by His57, attacks; a second tetrahedral intermediate forms and collapses, releasing the carboxylic acid half and regenerating free Ser195.',
          deep:
            'This “ping-pong” mechanism has two tetrahedral intermediates and a covalent acyl-enzyme intermediate. With some substrates the acyl-enzyme is stable enough to trap and study, which is how the mechanism was first worked out (burst kinetics).',
        },
        view: { kind: 'structure', structure: TS, focus: triad, radius: 9 },
        quiz: {
          question: 'After the first half of the chain leaves, the other half is stuck to Ser195. What frees it?',
          choices: ['A water molecule, activated by His57', 'A second protein molecule', 'Asp102 attacks it'],
          answer: 0,
          explain:
            'Water. His57 now pulls a proton from water, which attacks the acyl-enzyme. The second product is released and Ser195 is free again: the enzyme is regenerated.',
          hint: 'The overall reaction is hydrolysis, “splitting with water”.',
        },
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'specificity',
    title: 'Picking the right target',
    summary: 'The specificity pocket, lock-and-key vs induced fit, with real before-and-after structures.',
    minutes: 6,
    steps: [
      {
        title: 'The specificity pocket',
        text: {
          simple:
            'Chymotrypsin doesn’t cut just anywhere. Next to the active site is a deep, oily pocket. Only big, ring-shaped side chains fit well, so chymotrypsin cuts right after those.',
          standard:
            'The S1 [[specificity pocket]] is deep and nonpolar. Ser189 sits at the bottom, and Gly216 and Gly226 (no side chains) leave room for a large ring. So chymotrypsin cuts after Phe, Tyr, and Trp. Here, the mimic’s ring sits in that pocket.',
          deep:
            'Trypsin, a close relative with the same triad, has Asp189 at the bottom of its pocket instead of Ser189: its negative charge attracts Lys and Arg, so trypsin cuts after those. Same mechanism, different pocket, different target.',
        },
        view: {
          kind: 'structure',
          structure: TS,
          focus: [{ chain: 'C', seq: 189 }, { chain: 'C', seq: 216 }, { chain: 'C', seq: 226 }, { chain: 'C', seq: 1 }],
          radius: 7,
          labels: [
            { text: 'Ser189', at: { chain: 'C', seq: 189, atom: 'OG' } },
            { text: 'Gly216', at: { chain: 'C', seq: 216, atom: 'CA' } },
            { text: 'Gly226', at: { chain: 'C', seq: 226, atom: 'CA' } },
            { text: 'Mimic’s ring', at: mimic('CZ'), tone: 'accent' },
          ],
        },
        quiz: {
          question: 'Which side chain fits chymotrypsin’s deep, nonpolar pocket best?',
          choices: ['Phenylalanine (a large ring)', 'Lysine (positively charged)', 'Glycine (no side chain)'],
          answer: 0,
          explain:
            'Phenylalanine. A large, nonpolar aromatic ring fills the deep, oily pocket. Lysine’s charge would be unhappy there (it suits trypsin), and glycine has nothing to put in it.',
          hint: 'Oily pockets like oily side chains.',
        },
      },
      {
        title: 'Lock and key? Check the data',
        text: {
          simple:
            'One old idea: the enzyme is a rigid lock and the substrate is a key that just fits. Here’s chymotrypsin with nothing bound. Predict: when the molecule binds, how much will the active site move?',
          standard:
            'The [[lock-and-key|lock and key]] model says the active site is already the right shape. Here is chymotrypsin with nothing bound (4CHA). Predict how much the active site changes when the mimic binds (6CHA).',
          deep:
            'Both structures are lined up on all 236 matched Cα atoms before comparing, so any movement you see is real, not a difference in viewpoint.',
        },
        view: { kind: 'structure', structure: 'chymo-free', focus: 'site' },
        revealView: { kind: 'structure', structure: TS, focus: 'site' },
        quiz: {
          question: 'When the mimic binds, how far do the active-site residues move?',
          choices: ['Barely: less than 1 Å', 'About 5 Å', 'More than 10 Å'],
          answer: 0,
          explain:
            'Barely. The two structures match to 0.25 Å overall, and no active-site residue moves more than 1 Å. Chymotrypsin’s pocket is already shaped before anything binds: close to “lock and key”. The view now shows the mimic bound.',
          hint: 'Chymotrypsin’s pocket is a fairly rigid groove.',
        },
      },
      {
        title: 'Induced fit: glucokinase',
        text: {
          simple:
            'Now a different enzyme: **glucokinase**, which grabs glucose in your liver. Here it is with no glucose: wide open, like a mouth. Predict what happens when glucose binds.',
          standard:
            'Glucokinase (hexokinase IV) adds a phosphate to glucose. This is the open form, with nothing in the glucose site (1V4T). The orange residues are on the “lid”. Predict what glucose binding does.',
          deep:
            'Koshland’s [[induced fit]] idea is classically illustrated with hexokinase: substrate binding drives a conformational change that creates the catalytically competent active site. These are two real crystal structures of the same human enzyme, lined up on their rigid core (279 residues, 0.77 Å).',
        },
        view: { kind: 'structure', structure: 'gk-open', focus: 'site', radius: 18 },
        revealView: { kind: 'structure', structure: 'gk-closed', focus: 'site', radius: 18 },
        quiz: {
          question: 'Glucose binds to the open enzyme. What happens to the lid?',
          choices: ['Nothing: it’s a rigid lock', 'It swings shut over the glucose', 'The enzyme falls apart'],
          answer: 1,
          explain:
            'It swings shut. In the data, the lid moves from about 28 Å away from the glucose-binding residues to about 6 Å, closing over glucose. The binding itself changes the enzyme’s shape: induced fit. The view now shows the closed form.',
          hint: 'The module calls this enzyme the induced-fit example.',
        },
        note: 'Two experimental structures (1V4T, 3.4 Å; 1V4S, 2.3 Å), not an animation. The closed form also holds a synthetic activator at a separate site.',
      },
      {
        title: 'Why close the lid?',
        text: {
          simple:
            'Closing around glucose squeezes out water. That matters: the enzyme moves a phosphate from ATP onto glucose. If water could get in, the phosphate would often go to water instead, wasting ATP.',
          standard:
            'Closing the cleft excludes water from the active site. That stops the wasteful transfer of ATP’s phosphate to water and puts the right groups in position only once glucose is bound. Most enzymes sit somewhere between pure lock-and-key and dramatic induced fit.',
          deep:
            'In the open structure, residues 157–179 (including glucose-binding Thr168 and Lys169) are too disordered to see; they become ordered only in the closed form. Glucokinase is unusual: its rate curve is sigmoidal and it is half-saturated near 8 mM glucose, suiting it to sensing blood glucose in liver and pancreas.',
        },
        view: { kind: 'structure', structure: 'gk-closed', focus: 'site', radius: 14 },
      },
    ],
  },

  /* =========================================================== 4 */
  {
    id: 'barrier',
    title: 'Lowering the barrier',
    summary: 'Transition-state stabilization, and why mimics make good drugs.',
    minutes: 4,
    steps: [
      {
        title: 'Two paths, one destination',
        text: {
          simple:
            'Without the enzyme (dashed), the reaction has to climb one huge hill. With the enzyme (colored), the path takes a few small steps, and the highest hill is much lower. Same start, same finish.',
          standard:
            'With the enzyme, the path passes through bound complexes: ES (enzyme–substrate), the stabilized transition state ES‡, then EP. The highest barrier is much lower than for the uncatalyzed reaction, and ΔG is unchanged.',
          deep:
            'The relevant barrier for the catalytic step is from ES to ES‡ (it sets kcat). Binding energy is “spent” to destabilize the substrate or, mostly, to stabilize the transition state more than the substrate.',
        },
        view: { kind: 'energy', uncatalyzed: true, catalyzed: true },
        note: 'Schematic energy diagram: the shapes are standard, the heights are not measured values.',
      },
      {
        title: 'Hug the transition state',
        text: {
          simple:
            'The secret: the enzyme is built to grip the reaction’s **in-between** shape more tightly than the starting molecule. The oxyanion hole’s two hydrogen bonds only line up with that in-between shape.',
          standard:
            'Enzymes bind the [[transition state]] more tightly than the substrate. In chymotrypsin, the oxyanion hole makes two hydrogen bonds that fit the tetrahedral transition state, not the flat peptide. That extra binding lowers the barrier.',
          deep:
            'Pauling (1946) first proposed that enzymes are complementary to the transition state. The dashed lines are measured in 6CHA: the mimic’s oxygen to Gly193 N and to Ser195 N.',
        },
        view: {
          kind: 'structure',
          structure: TS,
          focus: [{ chain: 'C', seq: 193 }, { chain: 'C', seq: 195 }, { chain: 'C', seq: 1 }],
          radius: 6,
          labels: [
            { text: 'Oxyanion hole', at: { chain: 'C', seq: 193, atom: 'N' }, tone: 'warm' },
            { text: 'Mimic (tetrahedral)', at: mimic('B'), tone: 'accent' },
          ],
          lines: [
            { from: mimic('O1'), to: { chain: 'C', seq: 193, atom: 'N' }, label: 'H-bond' },
            { from: mimic('O1'), to: { chain: 'C', seq: 195, atom: 'N' }, label: 'H-bond' },
          ],
        },
      },
      {
        title: 'Mimics make strong inhibitors',
        text: {
          simple:
            'If an enzyme grips the in-between shape so tightly, a stable molecule that looks like it will stick and jam the enzyme. That’s exactly what the pink molecule does.',
          standard:
            'Transition-state analogs bind far more tightly than substrates, so they are powerful inhibitors. This is a real drug-design strategy: HIV protease inhibitors, for example, mimic that enzyme’s transition state.',
          deep:
            'A stable analog captures some of the binding energy the enzyme reserves for the transition state, so its affinity can exceed the substrate’s by orders of magnitude.',
        },
        view: { kind: 'structure', structure: TS, focus: 'site' },
        quiz: {
          question: 'Why does the boronic acid mimic bind so tightly?',
          choices: ['It looks like the reaction’s transition state', 'It is much larger than the substrate', 'It is positively charged'],
          answer: 0,
          explain:
            'It resembles the transition state: boron is tetrahedral, like the carbon halfway through the reaction, and its oxygen fits the oxyanion hole. Enzymes bind that shape most tightly of all.',
          hint: 'What shape is the enzyme best at gripping?',
        },
      },
    ],
  },

  /* =========================================================== 5 */
  {
    id: 'kinetics',
    title: 'Michaelis–Menten kinetics',
    summary: 'Saturation, Vmax, Km, and the Lineweaver–Burk plot.',
    minutes: 5,
    steps: [
      {
        title: 'More substrate, faster, up to a point',
        text: {
          simple:
            'Add more substrate and the enzyme works faster, at first. But each enzyme can only handle one substrate at a time. Once every enzyme is busy, adding more substrate doesn’t help: the curve flattens out.',
          standard:
            'At low [S], rate rises almost in proportion to [S]. At high [S], every enzyme molecule is busy (saturated), and the rate levels off at [[Vmax]]. This hyperbolic curve is described by the Michaelis–Menten equation, v = Vmax[S] / (Km + [S]).',
          deep:
            'The equation assumes a steady state for ES and initial rates (no product buildup). Vmax = kcat·[E]total, so Vmax depends on how much enzyme is present; kcat (the turnover number) does not.',
        },
        view: { kind: 'kinetics', plot: 'mm', type: 'none', inhibitor: 0, substrate: 16 },
        note: 'Example numbers (Vmax = 100 µM/s, Km = 2 mM); the equation is the standard one.',
      },
      {
        title: 'Km: the half-speed point',
        text: {
          simple:
            '**Km** is the amount of substrate where the enzyme runs at half its top speed. A small Km means the enzyme gets going even when there’s very little substrate.',
          standard:
            '[[Km]] is the [S] that gives half of Vmax (here, 2 mM gives 50 µM/s). A lower Km generally means higher apparent affinity for the substrate: the enzyme reaches half speed at a lower concentration.',
          deep:
            'Km = (k₋₁ + kcat)/k₁. It equals the dissociation constant of ES only when kcat ≪ k₋₁. kcat/Km measures catalytic efficiency. Example: hexokinase I has a Km below 0.1 mM for glucose, while liver glucokinase is half-saturated near 8 mM.',
        },
        view: { kind: 'kinetics', plot: 'mm', type: 'none', inhibitor: 0, substrate: 2 },
        quiz: {
          question: 'Enzyme A has Km = 0.1 mM; enzyme B has Km = 10 mM. Which reaches half its top speed at a lower substrate concentration?',
          choices: ['Enzyme A', 'Enzyme B', 'They’re the same'],
          answer: 0,
          explain: 'Enzyme A: by definition, it reaches half of Vmax at [S] = 0.1 mM, a hundred times less substrate than B needs.',
          hint: 'Km is the substrate concentration at half speed.',
        },
      },
      {
        title: 'The double-reciprocal plot',
        text: {
          simple:
            'Curves are hard to read exactly. Flip both axes (1 over rate vs 1 over substrate) and the curve becomes a straight line. Where it crosses the axes tells you Vmax and Km.',
          standard:
            'The Lineweaver–Burk plot graphs 1/v against 1/[S]: a straight line. The y-intercept is 1/Vmax, the x-intercept is −1/Km, and the slope is Km/Vmax.',
          deep:
            'Taking reciprocals spreads out low-[S] points, which have the largest errors, so modern labs fit the hyperbola directly. The plot is still the clearest way to SEE how inhibitors change Vmax and Km.',
        },
        view: { kind: 'kinetics', plot: 'lb', type: 'none', inhibitor: 0, substrate: 4 },
        quiz: {
          question: 'On a Lineweaver–Burk plot, the y-intercept equals…',
          choices: ['1/Vmax', 'Km', '−1/Km'],
          answer: 0,
          explain: '1/Vmax. At infinitely high substrate (1/[S] = 0), the rate is Vmax, so 1/v = 1/Vmax. The x-intercept is −1/Km.',
          hint: 'The y-axis is where 1/[S] = 0, i.e. infinite substrate.',
        },
      },
    ],
  },

  /* =========================================================== 6 */
  {
    id: 'inhibition',
    title: 'Inhibitors',
    summary: 'Competitive, noncompetitive, and uncompetitive: what each does to Vmax and Km.',
    minutes: 6,
    steps: [
      {
        title: 'Competitive: fighting for the active site',
        text: {
          simple:
            'A competitive inhibitor looks enough like the substrate to sit in the active site, blocking it. But if you add lots of substrate, the substrate wins most of the time, so the enzyme can still reach its top speed.',
          standard:
            'A competitive inhibitor binds the free enzyme at the active site. [[Km]] goes up (more substrate is needed for half speed), but [[Vmax]] is unchanged: enough substrate outcompetes the inhibitor.',
          deep:
            'Apparent Km = Km(1 + [I]/Ki). Statins, for example, are competitive inhibitors of HMG-CoA reductase in cholesterol synthesis.',
        },
        view: { kind: 'kinetics', plot: 'mm', type: 'competitive', inhibitor: 2, substrate: 16 },
        quiz: {
          question: 'With a competitive inhibitor present, can a very high substrate concentration still reach the normal Vmax?',
          choices: ['Yes', 'No', 'Only if the inhibitor is removed'],
          answer: 0,
          explain: 'Yes. Substrate and inhibitor compete for the same site, so at high enough [S] the substrate wins and the rate approaches the same Vmax. That’s why only Km changes.',
          hint: 'Look where both curves head at the far right.',
        },
      },
      {
        title: 'Noncompetitive: a different site',
        text: {
          simple:
            'A noncompetitive inhibitor sticks somewhere else on the enzyme and jams it. More substrate can’t push it off, so the top speed drops. But the enzymes still working behave normally.',
          standard:
            'A noncompetitive inhibitor binds at a different site, to the enzyme whether or not substrate is bound. [[Vmax]] drops; Km is unchanged. Extra substrate can’t rescue it.',
          deep:
            'Apparent Vmax = Vmax/(1 + [I]/Ki). This “pure” case assumes the inhibitor binds E and ES equally well. When it prefers one, Km also changes: that general case is called mixed inhibition, and it’s more common in real enzymes.',
        },
        view: { kind: 'kinetics', plot: 'mm', type: 'noncompetitive', inhibitor: 2, substrate: 16 },
        quiz: {
          question: 'A noncompetitive inhibitor is added. What happens to Vmax and Km?',
          choices: ['Vmax down, Km unchanged', 'Vmax unchanged, Km up', 'Both down by the same factor'],
          answer: 0,
          explain: 'Vmax goes down and Km stays the same. Part of the enzyme is effectively switched off, while the rest behaves normally.',
          hint: 'Compare the two dashed Km lines on the graph.',
        },
      },
      {
        title: 'Uncompetitive: trapping the complex',
        text: {
          simple:
            'An uncompetitive inhibitor can only grab the enzyme while substrate is already bound, trapping the pair. Both the top speed and Km drop.',
          standard:
            'An uncompetitive inhibitor binds only the enzyme–substrate complex. Both [[Vmax]] and [[Km]] fall by the same factor, so on a Lineweaver–Burk plot the lines are parallel.',
          deep:
            'Apparent Vmax = Vmax/α′ and apparent Km = Km/α′, with α′ = 1 + [I]/Ki′. Lithium, used to treat bipolar disorder, is an uncompetitive inhibitor of inositol monophosphatase.',
        },
        view: { kind: 'kinetics', plot: 'lb', type: 'uncompetitive', inhibitor: 2, substrate: 4 },
        quiz: {
          question: 'On a Lineweaver–Burk plot, which inhibitor gives lines parallel to the no-inhibitor line?',
          choices: ['Uncompetitive', 'Competitive', 'Noncompetitive'],
          answer: 0,
          explain: 'Uncompetitive. Vmax and Km drop by the same factor, so the slope (Km/Vmax) stays the same and the line just shifts up.',
          hint: 'Which type keeps Km/Vmax the same?',
        },
      },
      {
        title: 'Reading the plots',
        text: {
          simple:
            'A quick way to tell them apart on a Lineweaver–Burk plot: **competitive** lines meet on the y-axis, **noncompetitive** lines meet on the x-axis, and **uncompetitive** lines never meet (parallel).',
          standard:
            'Competitive: lines cross on the y-axis (same 1/Vmax). Noncompetitive: lines cross on the x-axis (same −1/Km). Uncompetitive: parallel lines (same slope). Try each one in Explore → Kinetics.',
          deep:
            'Mixed inhibitors give lines that cross to the left of the y-axis, above or below the x-axis depending on whether the inhibitor prefers E or ES. The pure cases here are its special cases.',
        },
        view: { kind: 'kinetics', plot: 'lb', type: 'competitive', inhibitor: 2, substrate: 4 },
        quiz: {
          question: 'Two Lineweaver–Burk lines cross exactly on the y-axis. What kind of inhibitor is it?',
          choices: ['Competitive', 'Noncompetitive', 'Uncompetitive'],
          answer: 0,
          explain: 'Competitive. Crossing on the y-axis means the same 1/Vmax, so Vmax is unchanged while the slope (and Km) increased.',
          hint: 'The y-intercept is 1/Vmax.',
        },
      },
    ],
  },
]
