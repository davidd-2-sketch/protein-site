# Reference data (not shipped with the site)

- `4hhb.cif` — text version of hemoglobin structure 4HHB from the RCSB Protein Data Bank.
  The site loads the smaller binary version (`public/structures/4hhb.bcif`). This copy is kept
  so facts in the lessons (residue numbers, distances, helix ranges) can be re-checked by hand.

## Enzymes module

All downloaded on 2026-11-12 from the RCSB Protein Data Bank (https://www.rcsb.org).
Text copies here (`*.cif`, from files.rcsb.org/download); the site loads the binary versions
(`public/structures/*.bcif`, from models.rcsb.org). Facts below are measured from these files
and checked automatically by `tests/enzymes.test.ts`.

| PDB | What | Organism | Method | Resolution | Released |
|---|---|---|---|---|---|
| 6CHA | α-Chymotrypsin with phenylethane boronic acid (PBA), a tetrahedral transition-state mimic | *Bos taurus* (cow) | X-ray diffraction | 1.8 Å | 1987 |
| 4CHA | α-Chymotrypsin, nothing bound | *Bos taurus* (cow) | X-ray diffraction | 1.68 Å | 1985 |
| 1V4S | Human glucokinase (hexokinase IV), closed, with glucose (GLC) and a synthetic activator (MRK) | *Homo sapiens* | X-ray diffraction | 2.3 Å | 2004 |
| 1V4T | Human glucokinase, open ("super-open"), no glucose | *Homo sapiens* | X-ray diffraction | 3.4 Å | 2004 |

Glucokinase structures: Kamata et al., "Structural basis for allosteric regulation of the
monomeric allosteric enzyme human glucokinase", Structure 12, 429–438 (2004).

### Chymotrypsin (6CHA, 4CHA)
- Standard chymotrypsinogen numbering. The files contain TWO copies of the enzyme:
  chains A/B/C and E/F/G. The site uses A/B/C (A = residues 1–13, B = 16–146, C = 149–245).
- Catalytic triad: His57 (chain B), Asp102 (chain B), Ser195 (chain C).
  - His57 NE2 – Ser195 OG: 2.72 Å (6CHA), 2.82 Å (4CHA).
  - Asp102 OD1 – His57 ND1: 2.74 Å (6CHA), 2.61 Å (4CHA).
- PBA (6CHA, chain C): boron 1.88 Å from Ser195 OG (attached to Ser195).
  One PBA oxygen is 3.12 Å from Gly193 N and 2.88 Å from Ser195 N: the oxyanion hole.
- Residues within 4 Å of PBA (copy 1): His57, Tyr146 (B); Ser189, Ser190, Cys191, Met192,
  Gly193, Asp194, Ser195, Val213, Ser214, Trp215, Gly216 (C). Gly226 lines the S1 pocket
  (within 5 Å of the PBA ring).

### Glucokinase (1V4S, 1V4T)
- Residues with N/O atoms within 3.3 Å of a glucose oxygen (1V4S): Thr168, Lys169, Asn204,
  Asp205, Asn231, Glu256, Glu290. Within 4.0 Å also: Ser151, Phe152, Pro153, Ile225,
  Gly229, Cys230, Gln287.
- Residues 157–179 (including Thr168 and Lys169) are missing from the open structure 1V4T:
  disordered, too mobile to locate in the crystal.
- Pocket closing: the Cα center of residues 151–153 ("lid") is 27.9 Å from the Cα center of
  204/205/231/256/290 ("base") in 1V4T, and 6.3 Å in 1V4S. The base residues themselves barely
  move (average Cα spacing 9.9 Å open vs 9.7 Å closed).
- The activator MRK binds a separate (allosteric) site lined by residues 61–66, 210–220, 235,
  452 and 455; its nearest atom is 16.2 Å from glucose.

## Lewis structures (`src/lewis/molecules.ts`)

Rules (valence electron count, octet/duet, formal charge, resonance, exceptions) as taught in
OpenStax *Chemistry 2e* §7.3–7.4, Tro, and Zumdahl. Every structure is checked automatically by
`tests/lewis.test.ts` (electron count, octets, formal charges summing to the overall charge).

Measured values quoted in the lessons:
- O₃: both O–O bonds 127.8 pm (bond angle 116.8°). H₂O₂ O–O single bond 147.5 pm; O₂ O=O 120.7 pm.
- CO₂: both C–O bonds 116 pm (116.3 pm).
- CO: dipole moment 0.11 D, negative end on carbon.
- Carbonate and nitrate: all three bonds equal in length (stated qualitatively; no number shown).

## MO theory (`src/mo/diatomics.ts`)

Level order: standard Gen Chem (OpenStax *Chemistry 2e* §8.4; Tro; Housecroft):
Li₂–N₂ σ2s < σ*2s < π2p < σ2p < π*2p < σ*2p; O₂–Ne₂ σ2s < σ*2s < σ2p < π2p < π*2p < σ*2p.
Energies in the diagrams are schematic (order only). For CO, NO and HF the atoms' orbital heights
follow the order of measured valence orbital ionization energies (eV): H 1s −13.6; C 2s −19.4,
2p −10.7; N 2s −25.6, 2p −13.2; O 2s −32.4, 2p −15.9; F 2s −40.2, 2p −18.7 (Miessler, Fischer &
Tarr, *Inorganic Chemistry*). Bond orders and magnetism are computed by filling the diagrams and
checked against textbook values in `tests/mo.test.ts`.

Measured data shown (neutral molecules):

| Molecule | Bond length (pm) | Bond energy, 298 K (kJ/mol) | Magnetism |
|---|---|---|---|
| H₂ | 74.1 | 436.0 | diamagnetic |
| Li₂ | 267.3 | not shown | not shown |
| B₂ | 159.0 | not shown | paramagnetic |
| C₂ | 124.2 | not shown | diamagnetic |
| N₂ | 109.8 | 945.3 | diamagnetic |
| O₂ | 120.7 | 498.4 | paramagnetic |
| F₂ | 141.2 | 158.8 | diamagnetic |
| CO | 112.8 | 1076.5 | diamagnetic |
| NO | 115.1 | not shown | paramagnetic |
| HF | 91.7 | 569.9 | diamagnetic |

Bond lengths: Huber & Herzberg, *Constants of Diatomic Molecules* (1979), as listed by NIST.
Bond energies: CRC Handbook of Chemistry and Physics, cross-checked 2026-11-22 against the
Queen's University bond energy table and WebElements (N₂ 945.33, F₂ 158.78, CO 1076.5).
Li₂ (267 pm) and C₂ (124.2 pm) were cross-checked against recent papers citing Huber & Herzberg;
B₂ (159 pm) against a university MO handout. Not shown because they were not confirmed: NO's bond
energy, and bond lengths of the ions (O₂⁺, O₂⁻, O₂²⁻, NO⁺); the lessons only state their trend.

3D molecular orbital surfaces are an illustrative LCAO model (Slater effective nuclear charges;
CO geometry for the "polar" shapes; HF coefficients 0.45 H : 0.89 F), not computed orbitals.
