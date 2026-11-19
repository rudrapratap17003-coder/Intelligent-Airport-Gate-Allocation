# GateWise BLR — Mathematical Model
## Discrete Mathematics, Rook Polynomials, & Principle of Inclusion-Exclusion

### 1. Mathematical Problem Formulation
The **Airport Gate Allocation Problem (AGAP)** is formulated as a bipartite matching problem between a set of $n$ flights $F = \{f_1, f_2, \dots, f_n\}$ and a set of $n$ apron stands/gates $G = \{g_1, g_2, \dots, g_n\}$.

Operational incompatibilities (such as wingspan violations, terminal boundaries, or maintenance closures) define a **binary restriction board** $B \subseteq [n] \times [n]$:

$$B_{i, j} = \begin{cases} 1 & \text{if flight } f_i \text{ is forbidden from stand } g_j \\ 0 & \text{if flight } f_i \text{ is permitted at stand } g_j \end{cases}$$

---

### 2. The Rook Polynomial $R(B, x)$
In combinatorial mathematics, placing a chess rook at cell $(i, j)$ corresponds to assigning flight $f_i$ to gate $g_j$. Two rooks attack each other if they share a row (same flight assigned to two gates) or a column (two flights assigned to the same gate simultaneously).

The **Rook Polynomial** of the forbidden board $B$ is the generating function:
$$R(B, x) = \sum_{k=0}^n r_k(B) x^k = r_0 + r_1 x + r_2 x^2 + \dots + r_n x^n$$

Where:
- $r_0(B) = 1$ (by definition: there is 1 way to place 0 rooks).
- $r_1(B) = \sum_{i, j} B_{i, j}$ (the total count of forbidden cells on board $B$).
- $r_k(B)$: The number of ways to place $k$ non-attacking rooks on the forbidden cells of $B$.

---

### 3. Exact Solution via the Principle of Inclusion-Exclusion (PIE)
Let $S_n$ denote the set of all $n!$ bijective assignments $\pi: F \rightarrow G$.
For each forbidden cell $(i, j) \in B$, let $A_{i, j}$ denote the property that flight $f_i$ is assigned to gate $g_j$.

By the **Principle of Inclusion-Exclusion (PIE)**, the exact number $N$ of valid, conflict-free assignments (where *none* of the forbidden pairings occur) is given by:

$$N = \sum_{k=0}^n (-1)^k r_k(B) (n - k)!$$

Expanded term-by-term:
$$N = n! - r_1(n-1)! + r_2(n-2)! - r_3(n-3)! + \dots + (-1)^n r_n(0)!$$

#### Benchmark Example (SIM-001: 6 × 6 Matrix with 5 Forbidden Cells):
$$n = 6 \implies n! = 720$$
Forbidden cells count: $r_1 = 5$.
Higher coefficients: $r_2 = 9$, $r_3 = 7$, $r_4 = 2$, $r_5 = 0$, $r_6 = 0$.

Term-by-term calculation:
$$\begin{aligned}
k = 0: & \quad (+1) \cdot 1 \cdot 6! = +720 \\
k = 1: & \quad (-1) \cdot 5 \cdot 5! = -600 \\
k = 2: & \quad (+1) \cdot 9 \cdot 4! = +216 \\
k = 3: & \quad (-1) \cdot 7 \cdot 3! = -42 \\
k = 4: & \quad (+1) \cdot 2 \cdot 2! = +4 \\
k = 5: & \quad (-1) \cdot 0 \cdot 1! = 0 \\
k = 6: & \quad (+1) \cdot 0 \cdot 0! = 0
\end{aligned}$$

Summing all contributions:
$$N = 720 - 600 + 216 - 42 + 4 = 309$$

Out of $720$ possible assignments, exactly **$309$** conflict-free allocations exist.

---

### 4. Assignment Generation & Conflict Verification
Once $N$ is proven to be positive ($N > 0$), the application executes constraint-directed backtracking to generate concrete allocation vectors:
1. Each generated allocation $\pi = \{(f_1, g_{\pi(1)}), \dots, (f_n, g_{\pi(n)})\}$ is verified against the 5-rule independent auditor:
   - Rule 1: No double-booked gates ($g_{\pi(i)} \ne g_{\pi(j)}$ for $i \ne j$).
   - Rule 2: Passenger capacity sufficiency.
   - Rule 3: Aircraft class compatibility.
   - Rule 4: Turnaround time buffer non-overlap.
   - Rule 5: Zero intersection with forbidden cells ($B_{i, \pi(i)} = 0 \quad \forall i$).
2. This creates complete mathematical certainty and traceability from polynomial expansion down to physical gate assignments.
