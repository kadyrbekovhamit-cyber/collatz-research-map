# A narrow frontier, not a full proof

The map preserves the project's internal review classifications. Those
classifications have not been independently established by journal peer review.
This public snapshot is an index and explanation, not a substitute for checking
all upstream arguments. Report numbers identify the local research record.

The latest branch concerns the fixed family in report 389 with k >= 21 and
c = 2^(k+2)/3^(k+1). H denotes matrix length. For a prime p >= 5,
d = ord_p(c) is the multiplicative order and e = v_p(c^d - 1).
G is a common divisor of maximal minors, Gamma* is a proved divisor of G,
and xi = v_p(G) - v_p(Gamma*) is the additional divisibility depth.
The intended denominator estimate (D), and universal Collatz coverage, are open.

Reports 423–425 record the following internally accepted steps:

- **423:** Split log(G/Gamma*) into truncated small-order contributions and a
  remainder from depths above e or orders exceeding a cutoff M. The truncated
  contribution is at most M(M+1) log(b)/2 for c=a/b. With M <= C H this is O(H^2).
  Under the **unproved** criterion (D), the remainder must carry a specified
  cubic term. This is a necessary consequence of (D), not an independently
  proved estimate of the remainder.
- **424:** Under the local nondegeneracy assumptions of report 413, a first
  coefficient with valuation content a1 < e bounds the full excess by e+a1.
  The actual first coefficient has not been shown to meet this condition in
  every needed window.
- **425:** Under the same hypotheses, write H=mR+s with R=2d. For m >= 2,
  a polynomial factor can be removed from the first remainder coefficient,
  leaving a certificate B1 with degree less than 4d, independent of H.
  Small degree does not establish unit status, height bounds, or a bound on
  the sum of all prime contributions.

The local hypotheses include p not dividing the frozen weight denominators or
weights, 3 not dividing d, (3/2)^d != 1 mod p, and a further weight-ratio
nondegeneracy condition. They must not be dropped when using reports 424–425.
Complete local statements, internal acceptance notes and raw audits for these
three reports are in [latest-reports/](https://www.gero.uz/research/collatz-map/latest-reports/README.md), in their original
Russian/English working language. Upstream reports not included in that selection
are explicitly identified as external to this small public excerpt.

There are two different remaining scales of work. Within this restricted
family, actual coefficient and global divisor estimates are missing. Beyond it,
arbitrary codes and additional positive cycles remain open. Neither task can be
converted into a meaningful percentage remaining or an estimated completion date.

One sufficient universal statement is: every odd positive n > 1 has an iterate
below n. Even starts immediately decrease, and strong induction would give
convergence for all positive integers. That universal statement is not proved
by this project snapshot.
