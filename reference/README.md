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
