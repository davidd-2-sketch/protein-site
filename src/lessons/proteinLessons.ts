/*
  proteinLessons.ts — the six protein lessons, from one amino acid to sickle-cell disease.

  Writing rules for every step:
    • One idea per step. One to three sentences per depth level.
    • Simpler: everyday words and an analogy. Standard: AP Bio / intro college.
      Deeper: biochem detail. The real term always appears at least once.
    • Every number is either measured from the 4HHB structure or a standard
      textbook value, and residue numbers were checked against the file.

  Facts measured from 4HHB for these lessons:
    • α-chain helix AB (residues 20–35): every O(i)···N(i+4) distance is 2.78–3.27 Å.
    • Val1–Leu2 peptide bond (C–N): 1.29 Å.
    • Fe–Fe distances between the four hemes: 24.3–39.5 Å.
    • Heme residue numbers: 142 (α chains), 148 (β chains).
*/
import type { ChainId } from '../protein/hemoglobin'
import { BACKBONE, isPeptideBond } from '../protein/bonds'
import { HYDROPHOBIC, type AtomRef, type ResidueRef } from '../protein/ProteinViewer'
import type { Lesson } from './types'

const at = (chain: ChainId, seq: number, atom: string): AtomRef => ({ chain, seq, atom })
const res = (chain: ChainId, seq: number): ResidueRef => ({ chain, seq })
const span = (chain: ChainId, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => res(chain, from + i))

const ALL: ChainId[] = ['A', 'B', 'C', 'D']

export const PROTEIN_LESSONS: Lesson[] = [
  /* =========================================================== 1 */
  {
    id: 'amino-acids',
    title: 'Amino acids',
    summary: 'Meet one building block, and see what makes the 20 kinds different.',
    minutes: 3,
    steps: [
      {
        title: 'Meet one amino acid',
        text: {
          simple:
            'This is **leucine**, one [[amino acid]] taken straight out of a real hemoglobin protein. Think of amino acids like LEGO bricks: every brick has the same connectors, but a different piece on top. Drag to spin it around.',
          standard:
            'This is **leucine**, one of the 20 [[amino acids|amino acid]] that make up proteins. Every amino acid has the same core: an amino group, a central [[α-carbon]], and a carboxyl group. What makes each one different is its [[side chain]], also called the R group.',
          deep:
            'Leucine (Leu, L) from position 2 of the α chain. Because it sits inside a protein, its amino and carboxyl groups are already used in [[peptide bonds|peptide bond]], so here they appear as a backbone N and a carbonyl C=O. The α-carbon is a stereocenter, and proteins are built almost entirely from L-amino acids.',
        },
        view: { chains: [], detail: [{ chain: 'A', from: 2, to: 2 }], pick: 'atom' },
        camera: { residues: [res('A', 2)], radius: 3 },
        labels: [
          { text: 'Amino group (N)', at: at('A', 2, 'N') },
          { text: 'α-carbon', at: at('A', 2, 'CA'), tone: 'accent' },
          { text: 'Carboxyl group (C=O)', at: at('A', 2, 'O') },
          { text: 'Side chain', at: at('A', 2, 'CG'), tone: 'warm' },
        ],
        note: "Hydrogen atoms aren't shown. X-ray experiments usually can't see them, so they aren't in this data.",
      },
      {
        title: 'The part they all share',
        text: {
          simple:
            'The amino group, the α-carbon, and the carboxyl carbon form a short "spine." Every amino acid has this exact same spine. It is the connector part of the LEGO brick.',
          standard:
            'The amino group, [[α-carbon]], and carboxyl group are identical in all 20 amino acids. In a protein, these atoms link up to form the [[backbone]].',
          deep:
            'The N–Cα–C atoms repeat along the whole chain as the [[backbone]]. The chain can rotate around the N–Cα and Cα–C bonds (the φ and ψ angles) but not around the peptide bond, and those two angles largely decide which local shapes a chain can take.',
        },
        view: { chains: [], detail: [{ chain: 'A', from: 2, to: 2 }], pick: 'atom' },
        labels: [
          { text: 'N', at: at('A', 2, 'N') },
          { text: 'α-carbon', at: at('A', 2, 'CA'), tone: 'accent' },
          { text: 'C', at: at('A', 2, 'C') },
        ],
        task: {
          prompt: 'Click the α-carbon: the atom in the middle of the spine.',
          check: (p) => p.kind === 'atom' && p.atom.seq === 2 && p.atom.atomName === 'CA',
          success: "That's the α-carbon. Every amino acid has exactly one, and the side chain hangs off it.",
          hint: 'Not quite. Look for the carbon between the nitrogen and the C=O carbon (it has the α-carbon label).',
        },
      },
      {
        title: 'The part that makes it unique',
        text: {
          simple:
            "Now the fun part: the [[side chain]]. It's the piece on top of the LEGO brick, and it's different for each of the 20 amino acids. Leucine's side chain is made only of carbon (plus hydrogens we can't see), so it's oily, like a tiny drop of cooking oil.",
          standard:
            "The [[side chain]] (R group) is what makes each amino acid unique. Leucine's side chain is a branched hydrocarbon, so it is nonpolar and [[hydrophobic]]: it avoids water.",
          deep:
            "Leucine's isobutyl side chain (–CH₂–CH(CH₃)₂) is purely aliphatic. Side chains like this stabilize proteins mainly by burying themselves away from water, a process driven largely by the hydrophobic effect.",
        },
        view: { chains: [], detail: [{ chain: 'A', from: 2, to: 2 }], pick: 'atom' },
        labels: [{ text: 'Side chain', at: at('A', 2, 'CG'), tone: 'warm' }],
        task: {
          prompt: 'Click any atom in the side chain.',
          check: (p) => p.kind === 'atom' && p.atom.seq === 2 && !BACKBONE.has(p.atom.atomName),
          success: "Yes, those carbons are leucine's side chain. Swap them for a different side chain and you get a different amino acid.",
          hint: "That one's part of the shared spine. Try the branched carbons sticking out to the side.",
        },
      },
      {
        title: 'Side chains have personalities',
        text: {
          simple:
            'Here are the first seven amino acids of the chain. Their side chains behave differently: some are oily and hide from water, some love water, and some carry an electric charge. Those "personalities" decide how the whole protein folds.',
          standard:
            'Side chains fall into a few groups: nonpolar ([[hydrophobic]]), polar but uncharged ([[hydrophilic]]), negatively charged (acidic), and positively charged (basic). These seven residues include all four kinds.',
          deep:
            "At pH 7.4, aspartate's side-chain carboxyl ([[pKa]] ≈ 3.9) is almost fully deprotonated (–COO⁻), and lysine's amino group (pKa ≈ 10.5) is almost fully protonated (–NH₃⁺). Serine's hydroxyl hydrogen-bonds with water but doesn't ionize at body pH.",
        },
        view: { chains: [], detail: [{ chain: 'A', from: 1, to: 7 }], pick: 'atom' },
        camera: { residues: span('A', 1, 7), radius: 4 },
        labels: [
          { text: 'Leu · oily', at: at('A', 2, 'CD1'), tone: 'warm' },
          { text: 'Ser · water-loving', at: at('A', 3, 'OG') },
          { text: 'Asp · negative (−)', at: at('A', 6, 'OD1') },
          { text: 'Lys · positive (+)', at: at('A', 7, 'NZ') },
        ],
        task: {
          prompt: 'Click the amino acid with a negative charge.',
          check: (p) => p.kind === 'atom' && p.atom.comp === 'ASP',
          success: 'Right: aspartate. Its side chain ends in a carboxylate (–COO⁻), which is negatively charged in the body.',
          hint: 'That one isn’t negatively charged. Look for the label marked (−).',
        },
      },
    ],
  },

  /* =========================================================== 2 */
  {
    id: 'peptide-bonds',
    title: 'Building a chain',
    summary: 'See how amino acids link up, and why every chain has a direction.',
    minutes: 3,
    steps: [
      {
        title: 'Two amino acids, one bond',
        text: {
          simple:
            'Amino acids connect end to end, like train cars. The coupling between them is a [[peptide bond]]. It joins the carbon of one amino acid to the nitrogen of the next.',
          standard:
            'A [[peptide bond]] forms between the carboxyl group of one amino acid and the amino group of the next. A water molecule is released, so it is a [[dehydration reaction]]. Here, valine is linked to leucine.',
          deep:
            'Resonance with the C=O gives the C–N peptide bond partial double-bond character, so the atoms around it lie flat in one plane and it does not rotate. Here it measures 1.29 Å; the textbook value is about 1.33 Å. Small differences like that come from experimental uncertainty.',
        },
        view: { chains: [], detail: [{ chain: 'A', from: 1, to: 2 }], pick: 'atom' },
        camera: { residues: span('A', 1, 2), radius: 3.5 },
        labels: [
          { text: 'Valine', at: at('A', 1, 'CB') },
          { text: 'Leucine', at: at('A', 2, 'CG') },
          { text: 'Peptide bond', at: { between: [at('A', 1, 'C'), at('A', 2, 'N')] }, tone: 'accent' },
        ],
        task: {
          prompt: "Click the peptide bond: the link between valine's carbon and leucine's nitrogen.",
          // The bond is short and atoms can hide it, so clicking either of its two atoms also counts.
          check: (p) =>
            (p.kind === 'bond' && isPeptideBond(p.a, p.b)) ||
            (p.kind === 'atom' &&
              ((p.atom.seq === 1 && p.atom.atomName === 'C') || (p.atom.seq === 2 && p.atom.atomName === 'N'))),
          success: "That's the peptide bond, joining valine's C to leucine's N. Every link in every protein chain is one of these.",
          hint: 'Not that one. Look under the "Peptide bond" label for where the two amino acids connect.',
        },
      },
      {
        title: 'A chain has two ends',
        text: {
          simple:
            'Link more amino acids and you get a chain. Like a train, it has a front and a back: the front is the [[N-terminus]], and the back is the [[C-terminus]]. Cells always build chains front to back.',
          standard:
            'Every chain has a direction. One end has a free amino group (the [[N-terminus]]), and the other has a free carboxyl group (the [[C-terminus]]). Ribosomes build proteins from the N-terminus to the C-terminus, and sequences are always written in that order.',
          deep:
            'The repeating N–Cα–C unit gives the backbone a polarity, much like the 5′→3′ direction of DNA. During translation, each new amino acid is added to the C-terminal end of the growing chain.',
        },
        view: { chains: [], detail: [{ chain: 'A', from: 1, to: 7 }], pick: 'atom' },
        camera: { residues: span('A', 1, 7), radius: 4 },
        labels: [
          { text: 'Start: N-terminus', at: at('A', 1, 'N'), tone: 'accent' },
          { text: 'The chain keeps going…', at: at('A', 7, 'C') },
        ],
      },
      {
        title: '141 in a row',
        text: {
          simple:
            "Zoom out, and here's the whole chain: 141 amino acids. The color runs from blue at the front to red at the end, so you can trace it. The letters below are the chain's recipe; hover one to find it.",
          standard:
            "This is one complete α chain of hemoglobin, 141 residues long. Its order of amino acids, shown below as one-letter codes, is the protein's [[primary structure]]. Hover a letter to find that residue in 3D.",
          deep:
            'Two genes (HBA1 and HBA2) encode this identical α chain. For many small proteins, the sequence alone is enough to determine the folded shape (shown by Anfinsen with ribonuclease), though inside crowded cells many proteins get help from chaperones.',
        },
        view: { chains: ['A'], style: 'cartoon', color: 'rainbow' },
        camera: 'all',
        showSequence: true,
        labels: [
          { text: 'N-terminus', at: at('A', 1, 'CA'), tone: 'accent' },
          { text: 'C-terminus', at: at('A', 141, 'CA') },
        ],
      },
    ],
  },

  /* =========================================================== 3 */
  {
    id: 'helices',
    title: 'Helices',
    summary: 'Why chains coil up, and the hydrogen bonds that hold each coil together.',
    minutes: 3,
    steps: [
      {
        title: 'The chain coils up',
        text: {
          simple:
            "The chain doesn't stay floppy. Parts of it twist into neat coils, like a phone cord or a spring. Each pink coil is an [[α-helix]].",
          standard:
            "Local folding patterns of the backbone are called [[secondary structure]]. The pink coils are α-helices; the grey parts are loops connecting them. Most of hemoglobin's α chain is helix.",
          deep:
            "The α chain contains seven of the classic globin helices, named A through H; the α chain lacks helix D. The loops between helices let the chain reverse direction and pack the helices against each other.",
        },
        view: { chains: ['A'], style: 'cartoon', color: 'secondary' },
        camera: 'all',
        task: {
          prompt: 'Click any helix.',
          check: (p) => p.kind === 'atom' && p.atom.secondary === 'helix',
          success: "That's an α-helix. Every helix in hemoglobin coils in the same direction: right-handed.",
          hint: 'That spot is a loop. Try one of the pink coils.',
        },
      },
      {
        title: 'What holds a helix together',
        text: {
          simple:
            "Here's the secret: each turn of the coil is \"velcroed\" to the next by [[hydrogen bonds|hydrogen bond]], shown as dashed lines. One hydrogen bond is weak, but a helix has dozens, so the coil holds firm.",
          standard:
            'In an α-helix, the C=O of each residue forms a [[hydrogen bond]] with the N–H of the residue four positions later (i → i+4). The dashed lines are two of these bonds, measured from the real structure.',
          deep:
            'An α-helix has 3.6 residues per turn, a rise of 1.5 Å per residue, and a pitch of about 5.4 Å. Backbone C=O and N–H groups line up along the axis while side chains point outward. Along this helix, every O(i)···N(i+4) distance measures 2.8–3.3 Å, typical for backbone hydrogen bonds.',
        },
        view: {
          chains: ['A'],
          style: 'cartoon',
          color: 'chain',
          detail: [{ chain: 'A', from: 20, to: 35 }],
          detailBackboneOnly: true,
          pick: 'atom',
        },
        camera: { residues: span('A', 20, 35), radius: 2 },
        lines: [
          { from: at('A', 24, 'O'), to: at('A', 28, 'N'), label: 'H-bond' },
          { from: at('A', 27, 'O'), to: at('A', 31, 'N'), label: 'H-bond' },
        ],
        note: "The hydrogen atom isn't in the X-ray data, so each line is measured from O to N.",
      },
      {
        title: 'What about β-sheets?',
        text: {
          simple:
            "The other common fold is a [[β-sheet]]: stretches of chain lying side by side, like the folds of a paper fan. Fun fact: hemoglobin doesn't have any. It's built almost entirely from helices.",
          standard:
            "The other major kind of secondary structure is the [[β-sheet]], where stretched-out strands lie side by side and hydrogen-bond to each other. Hemoglobin has no β-sheets; we'll explore them with a different protein in a future lesson.",
          deep:
            'β-strands pair in parallel or antiparallel arrangements, with hydrogen bonds running between strands rather than within one segment. Local sequence matters: proline and glycine, for example, tend to break helices.',
        },
        view: { chains: ['A'], style: 'cartoon', color: 'secondary' },
        camera: 'all',
      },
    ],
  },

  /* =========================================================== 4 */
  {
    id: 'folding',
    title: 'Folding',
    summary: 'Oily side chains hide inside, and the fold builds a pocket for heme.',
    minutes: 3,
    steps: [
      {
        title: 'Oily parts hide in the middle',
        text: {
          simple:
            'Remember the oily side chains? Water pushes them together, the same way oil drops in soup merge into one. So the chain folds with its oily parts (orange) tucked inside, away from water.',
          standard:
            'The full 3D fold of one chain is its [[tertiary structure]]. A major driving force is the hydrophobic effect: [[hydrophobic]] side chains (orange) cluster in the core, while polar and charged side chains stay on the surface, facing water.',
          deep:
            'Burying nonpolar side chains frees ordered water molecules from around them, raising the entropy of the solvent. Together with hydrogen bonds, salt bridges, and tight packing in the core, this makes the folded state more stable than the unfolded one, though usually only by a small margin.',
        },
        view: { chains: ['A'], style: 'cartoon', color: 'chain', hydrophobic: true },
        camera: 'all',
        task: {
          prompt: 'Click one of the orange, oily side chains.',
          check: (p) => p.kind === 'atom' && HYDROPHOBIC.includes(p.atom.comp),
          success: 'Yes, that one is hydrophobic. Spin the model: most orange side chains point inward.',
          hint: 'That residue isn’t one of the oily ones. Look for the orange side chains.',
        },
      },
      {
        title: 'A pocket made for heme',
        text: {
          simple:
            'Folding creates a snug pocket, and a [[heme]] sits inside it. The heme is a flat ring with an iron atom in the middle, and that iron is what grabs oxygen. Two histidines hold it from either side, like hands cupping it.',
          standard:
            'The fold forms a pocket that holds a [[heme]] group. Its central iron (Fe²⁺) is where O₂ binds. The proximal histidine (His87) bonds to the iron from below, and the distal histidine (His58) sits on the oxygen side.',
          deep:
            'The pocket’s nonpolar lining helps keep the iron as Fe²⁺. Free heme in water is easily oxidized to Fe³⁺, which cannot bind O₂. When O₂ does bind, the distal histidine hydrogen-bonds to it and helps hold it in place.',
        },
        view: {
          chains: ['A'],
          style: 'cartoon',
          color: 'chain',
          hemes: true,
          highlights: [res('A', 58), res('A', 87)],
          pick: 'atom',
        },
        camera: { residues: [res('A', 58), res('A', 87)], radius: 9 },
        labels: [
          { text: 'Iron (Fe)', at: at('A', 142, 'FE'), tone: 'warm' },
          { text: 'His87 holds the iron', at: at('A', 87, 'NE2'), tone: 'accent' },
          { text: 'His58', at: at('A', 58, 'NE2'), tone: 'accent' },
        ],
        task: {
          prompt: 'Click the iron atom at the center of the heme.',
          check: (p) => p.kind === 'atom' && p.atom.comp === 'HEM' && p.atom.element.toUpperCase() === 'FE',
          success: "That's the iron. In the lungs, an O₂ molecule binds right there.",
          hint: 'Look for the small orange-brown atom in the very middle of the flat heme ring.',
        },
      },
      {
        title: 'Shape is function',
        text: {
          simple:
            'Here is the same chain shown as a solid surface, roughly the way water "sees" it. The heme peeks out of its pocket. If the chain folded any other way, there would be no pocket, and no place to carry oxygen.',
          standard:
            "This surface view shows the protein's outer shape, with the heme sitting in a cleft created by the fold. That's the big idea of protein structure: the sequence decides the fold, and the fold creates the function.",
          deep:
            "Myoglobin and each hemoglobin subunit share this same globin fold, even though their sequences are only partly identical. In evolution, a protein's fold is often more conserved than its sequence, because function depends on shape.",
        },
        view: { chains: ['A'], style: 'surface', color: 'chain', hemes: true },
        camera: 'all',
      },
    ],
  },

  /* =========================================================== 5 */
  {
    id: 'teamwork',
    title: 'Four chains, one team',
    summary: 'How four chains fit together and help each other grab oxygen.',
    minutes: 4,
    steps: [
      {
        title: 'Four chains fit together',
        text: {
          simple:
            'A working hemoglobin is four chains packed together: two α chains and two β chains. Each chain folds on its own, then they fit together like four puzzle pieces.',
          standard:
            'Hemoglobin has [[quaternary structure]]: four [[subunits|subunit]] (two α and two β) held together mostly by noncovalent interactions. Each subunit has its own fold and its own heme.',
          deep:
            'The tetramer is best thought of as a pair of αβ dimers (α₁β₁ and α₂β₂). The α₁β₁ contact is large and barely changes when oxygen binds; the α₁β₂ contact is where the big shifts happen.',
        },
        view: { chains: ALL, style: 'cartoon', color: 'chain', hemes: true },
        camera: 'all',
        labels: [
          { text: 'α₁', at: { chainCenter: 'A' }, tone: 'accent' },
          { text: 'β₁', at: { chainCenter: 'B' }, tone: 'accent' },
          { text: 'α₂', at: { chainCenter: 'C' }, tone: 'accent' },
          { text: 'β₂', at: { chainCenter: 'D' }, tone: 'accent' },
        ],
        task: {
          prompt: 'Click one of the two β chains.',
          check: (p) => p.kind === 'atom' && (p.atom.chain === 'B' || p.atom.chain === 'D'),
          success: 'Yes. β chains are a little longer than α chains: 146 amino acids versus 141.',
          hint: "That's an α chain. Use the floating labels to find a β.",
        },
      },
      {
        title: 'Four hemes, four oxygens',
        text: {
          simple:
            'Each of the four chains holds one heme, so one hemoglobin can carry up to four O₂ molecules. A single red blood cell holds about 270 million hemoglobins.',
          standard:
            'With one heme per subunit, each hemoglobin binds up to four O₂. Red blood cells are packed with it: roughly 270 million hemoglobin molecules per cell.',
          deep:
            'In this structure, the four irons sit 24–40 Å apart, too far to affect each other directly. Any "communication" between the hemes has to travel through changes in the protein\'s shape.',
        },
        view: { chains: ALL, style: 'cartoon', color: 'chain', hemes: true },
        camera: 'all',
        labels: [
          { text: 'Heme', at: at('A', 142, 'FE'), tone: 'warm' },
          { text: 'Heme', at: at('B', 148, 'FE'), tone: 'warm' },
          { text: 'Heme', at: at('C', 142, 'FE'), tone: 'warm' },
          { text: 'Heme', at: at('D', 148, 'FE'), tone: 'warm' },
        ],
      },
      {
        title: 'Teamwork: cooperativity',
        text: {
          simple:
            "Here's the clever part. Grabbing the first oxygen is the hardest. Once one heme catches O₂, the whole protein shifts shape a little, and the others grab O₂ more easily. It's like a dance floor: once a few people start dancing, everyone else joins in faster.",
          standard:
            "This is [[cooperativity]]. When O₂ binds one heme, the tetramer shifts from the low-affinity [[T state]] toward the high-affinity [[R state]], raising the other hemes' affinity. That gives hemoglobin its S-shaped (sigmoidal) binding curve, so it loads O₂ in the lungs and unloads it in tissues.",
          deep:
            'When O₂ binds, the iron moves into the heme plane and pulls the proximal histidine and its F helix along. The shift spreads to the α₁β₂ contact, and one αβ dimer rotates about 15° relative to the other. 2,3-BPG, H⁺ (the Bohr effect), and CO₂ all stabilize the T state, which helps release O₂ in tissues.',
        },
        view: { chains: ALL, style: 'cartoon', color: 'chain', hemes: true },
        camera: 'all',
        note: 'This structure has no oxygen bound, so it shows the T state. Seeing the R state needs a second structure, planned for a future version.',
      },
    ],
  },

  /* =========================================================== 6 */
  {
    id: 'sickle-cell',
    title: 'One change, a disease',
    summary: 'How swapping a single amino acid causes sickle-cell disease.',
    minutes: 3,
    steps: [
      {
        title: 'Find the spot',
        text: {
          simple:
            'Each β chain has a glutamate at position 6 (highlighted). In sickle-cell disease, a single [[mutation]] swaps it for valine. That is one swap per β chain, and it changes everything.',
          standard:
            'In sickle-cell disease, a single base change in the β-globin gene replaces glutamate 6 (Glu6, highlighted) with valine. Glutamate is charged and [[hydrophilic]]; valine is nonpolar and [[hydrophobic]].',
          deep:
            'The mutation is an A→T change in codon 6 of the HBB gene (GAG → GTG), producing the variant HbS (β Glu6Val). Carrying one copy (sickle-cell trait) protects against severe malaria, which is why the allele is common in some populations.',
        },
        view: {
          chains: ALL,
          style: 'cartoon',
          color: 'chain',
          hemes: true,
          highlights: [res('B', 6), res('D', 6)],
          highlightStyle: 'spacefill',
        },
        labels: [
          { text: 'Glu6 (β₁)', at: at('B', 6, 'CD'), tone: 'accent' },
          { text: 'Glu6 (β₂)', at: at('D', 6, 'CD'), tone: 'accent' },
        ],
        camera: 'all',
        task: {
          prompt: 'Click one of the highlighted glutamates.',
          check: (p) => p.kind === 'atom' && p.atom.comp === 'GLU' && p.atom.seq === 6,
          success: "That's Glu6, on the outside of a β chain. Its spot on the surface is exactly why this swap matters.",
          hint: 'Look for the cyan spheres labeled GLU 6. Spin the model if one is hidden.',
        },
      },
      {
        title: 'A sticky patch',
        text: {
          simple:
            "Glu6 sits right on the outside of the protein. Swap it for oily valine, and it's like sticking a piece of tape on the surface. When oxygen is low, those sticky patches make hemoglobins clump into long, stiff fibers that bend red blood cells into sickles.",
          standard:
            'Because Glu6 is on the surface, a valine there creates a hydrophobic patch. In the deoxy (T) state, that patch fits into a hydrophobic pocket on a neighboring hemoglobin, so the molecules stack into long fibers. The fibers distort red blood cells into a sickle shape, and those cells can block small blood vessels.',
          deep:
            'Val6 of one HbS tetramer docks into a hydrophobic pocket formed by β Phe85 and Leu88 of a neighboring tetramer, a pocket that is exposed in the deoxy state. Fibers form only above a critical HbS concentration, which is why raising fetal hemoglobin (HbF) helps: HbF dilutes HbS and does not join the fibers.',
        },
        view: {
          chains: ALL,
          style: 'surface',
          color: 'chain',
          hemes: true,
          highlights: [res('B', 6), res('D', 6)],
          highlightStyle: 'spacefill',
        },
        labels: [
          { text: 'Glu6 (β₁)', at: at('B', 6, 'CD'), tone: 'accent' },
          { text: 'Glu6 (β₂)', at: at('D', 6, 'CD'), tone: 'accent' },
        ],
        camera: 'all',
        note: 'The structure shown is normal hemoglobin (HbA). The sickle-cell change is described here, not shown.',
      },
    ],
  },
]
