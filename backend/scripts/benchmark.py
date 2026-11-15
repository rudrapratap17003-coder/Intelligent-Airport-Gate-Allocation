"""
GateWise — Performance Benchmarking Suite (Phase 20).
Measures execution time and memory for:
1. Rook polynomial coefficient calculation.
2. Inclusion-Exclusion calculation.
3. Complete mathematical calculation pipeline.
4. Allocation generation under various limits.
5. Independent conflict detection (un-cached vs ConflictDetector).
6. Complete allocation workflow (generation + validation).

Evaluates representative matrices:
- Small sparse (3x3, 1-2 restrictions)
- Small dense (3x3, 4-6 restrictions)
- Medium sparse (6x6 SIM-001 benchmark, 5 restrictions)
- Medium dense (6x6, 18 restrictions)
- Larger sparse (8x8, 8 restrictions)
- Larger dense (8x8, 32 restrictions)
- Scaled sparse (10x10, 10 restrictions)
"""

import time
import json
import tracemalloc
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from typing import List, Dict, Any, Tuple

from app.services.rook_polynomial_service import RookPolynomialService
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.allocation_generator_service import AllocationGeneratorService
from app.services.conflict_detection_service import ConflictDetectionService, ConflictDetector


# =====================================================================
# REPRESENTATIVE BENCHMARK MATRICES
# =====================================================================

BENCHMARK_SUITE: Dict[str, Dict[str, Any]] = {
    "3x3_sparse": {
        "name": "3x3 Sparse Board (SIM-002 variant)",
        "matrix": [
            [0, 1, 0],
            [0, 0, 0],
            [1, 0, 0]
        ],
        "density": "22.2% (2/9)"
    },
    "3x3_dense": {
        "name": "3x3 Dense Board",
        "matrix": [
            [1, 1, 0],
            [0, 1, 1],
            [1, 0, 1]
        ],
        "density": "66.7% (6/9)"
    },
    "6x6_sim001": {
        "name": "6x6 SIM-001 Benchmark (Standard)",
        "matrix": [
            [0, 1, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ],
        "density": "13.9% (5/36)"
    },
    "6x6_dense": {
        "name": "6x6 Dense Board (50% forbidden)",
        "matrix": [
            [1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1]
        ],
        "density": "50.0% (18/36)"
    },
    "8x8_sparse": {
        "name": "8x8 Sparse Board (Diagonal)",
        "matrix": [[1 if i == j else 0 for j in range(8)] for i in range(8)],
        "density": "12.5% (8/64)"
    },
    "8x8_dense": {
        "name": "8x8 Dense Board (Checkerboard 50%)",
        "matrix": [[1 if (i + j) % 2 == 0 else 0 for j in range(8)] for i in range(8)],
        "density": "50.0% (32/64)"
    },
    "10x10_sparse": {
        "name": "10x10 Sparse Board (10 restrictions)",
        "matrix": [[1 if (i + 1) % 10 == j else 0 for j in range(10)] for i in range(10)],
        "density": "10.0% (10/100)"
    }
}


def time_callable(fn, *args, repeat=15, **kwargs) -> Tuple[float, Any, int]:
    """Execute fn multiple times and return (median_time_ms, last_result, peak_memory_bytes)."""
    # Warmup
    fn(*args, **kwargs)

    tracemalloc.start()
    tracemalloc.reset_peak()
    
    times = []
    result = None
    for _ in range(repeat):
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000.0)

    _, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    times.sort()
    median_time = times[len(times) // 2]
    return median_time, result, peak_mem


def run_comprehensive_benchmark() -> Dict[str, Any]:
    """Run benchmark across all representative configurations."""
    report: Dict[str, Any] = {}

    print("=" * 80)
    print("GATEWISE COMBINATORIAL ENGINE BENCHMARK SUITE")
    print("=" * 80)

    for key, spec in BENCHMARK_SUITE.items():
        name = spec["name"]
        matrix = spec["matrix"]
        density = spec["density"]
        n = len(matrix)
        flight_ids = [f"FL-{i+1:03d}" for i in range(n)]
        gate_ids = [f"GT-{j+1:03d}" for j in range(n)]

        print(f"\n--- Matrix: {name} (Size: {n}x{n}, Density: {density}) ---")

        # 1. Rook Polynomial
        t_rook, rook_res, mem_rook = time_callable(RookPolynomialService.calculate, matrix)
        print(f"  1. Rook Polynomial:                   {t_rook:7.3f} ms (Peak Mem: {mem_rook/1024:6.1f} KB)")

        # 2. Inclusion-Exclusion
        t_pie, pie_res, mem_pie = time_callable(InclusionExclusionService.calculate, matrix)
        exact_valid = pie_res["valid_assignments"]
        total_possible = pie_res["total_possible_assignments"]
        print(f"  2. Inclusion-Exclusion:               {t_pie:7.3f} ms | Valid: {exact_valid:,} / {total_possible:,}")

        # 3. Complete Mathematical Pipeline (Rook + PIE)
        def math_pipeline():
            r = RookPolynomialService.calculate(matrix)
            return InclusionExclusionService.calculate(matrix)

        t_math, _, mem_math = time_callable(math_pipeline)
        print(f"  3. Complete Math Pipeline:            {t_math:7.3f} ms")

        # 4. Backtracking Allocation Generator under limits
        limits = [10, 50, 100]
        if n >= 6 and exact_valid >= 309:
            limits.append(309)
        if exact_valid > 100:
            limits.append(min(500, exact_valid))

        gen_metrics = {}
        for limit in limits:
            t_gen, gen_res, mem_gen = time_callable(
                AllocationGeneratorService.generate,
                matrix,
                flight_ids,
                gate_ids,
                max_results=limit
            )
            g_count = gen_res["generated_count"]
            complete = gen_res["generation_complete"]
            has_more = gen_res["has_more"]
            print(f"  4. Generator (limit={limit:4d}):             {t_gen:7.3f} ms | generated: {g_count:4d}")
            gen_metrics[f"limit_{limit}"] = {
                "limit": limit,
                "time_ms": t_gen,
                "peak_mem_bytes": mem_gen,
                "generated_count": g_count,
                "complete": complete,
                "has_more": has_more
            }

        # 5. Independent Conflict Detection
        sample_allocs = gen_res["allocations"][:min(100, len(gen_res["allocations"]))]
        
        # 5a. Legacy un-cached per-allocation validation
        def audit_batch_legacy():
            for a in sample_allocs:
                ConflictDetectionService.detect_conflicts(matrix, flight_ids, gate_ids, a["assignments"])

        # 5b. Optimized ConflictDetector pre-indexed batch audit
        def audit_batch_optimized():
            detector = ConflictDetectionService.create_detector(matrix, flight_ids, gate_ids)
            for a in sample_allocs:
                detector.detect_conflicts(a["assignments"])

        if sample_allocs:
            t_audit_leg, _, mem_audit_leg = time_callable(audit_batch_legacy, repeat=10)
            t_audit_opt, _, mem_audit_opt = time_callable(audit_batch_optimized, repeat=10)
            avg_per_alloc_leg = t_audit_leg / len(sample_allocs)
            avg_per_alloc_opt = t_audit_opt / len(sample_allocs)
            speedup_audit = t_audit_leg / t_audit_opt if t_audit_opt > 0 else 1.0
            print(f"  5. Conflict Detection ({len(sample_allocs)} allocs):")
            print(f"     - Un-cached:                       {t_audit_leg:7.3f} ms ({avg_per_alloc_leg:6.3f} ms/alloc)")
            print(f"     - ConflictDetector (Cached):       {t_audit_opt:7.3f} ms ({avg_per_alloc_opt:6.3f} ms/alloc) [{speedup_audit:.1f}x speedup]")
        else:
            t_audit_leg, t_audit_opt, avg_per_alloc_opt = 0.0, 0.0, 0.0

        # 6. Complete End-to-End Workflow (Gen 100 + Audit)
        def complete_workflow_opt():
            res = AllocationGeneratorService.generate(matrix, flight_ids, gate_ids, max_results=100)
            detector = ConflictDetectionService.create_detector(matrix, flight_ids, gate_ids)
            for a in res["allocations"]:
                detector.detect_conflicts(a["assignments"])

        t_workflow_opt, _, mem_wf_opt = time_callable(complete_workflow_opt, repeat=10)
        print(f"  6. Complete Optimized Workflow:       {t_workflow_opt:7.3f} ms")

        report[key] = {
            "name": name,
            "size": n,
            "density": density,
            "total_possible": total_possible,
            "exact_valid": exact_valid,
            "t_rook_ms": t_rook,
            "mem_rook_bytes": mem_rook,
            "t_pie_ms": t_pie,
            "mem_pie_bytes": mem_pie,
            "t_math_pipeline_ms": t_math,
            "t_audit_legacy_ms": t_audit_leg,
            "t_audit_opt_ms": t_audit_opt,
            "t_audit_per_alloc_ms": avg_per_alloc_opt,
            "t_workflow_opt_ms": t_workflow_opt,
            "mem_workflow_bytes": mem_wf_opt,
            "generation": gen_metrics
        }

    return report


def print_comparison_table(baseline: Dict[str, Any], optimized: Dict[str, Any]):
    print("\n" + "=" * 95)
    print("PHASE 20 PERFORMANCE COMPARISON: BASELINE vs OPTIMIZED")
    print("=" * 95)
    print(f"{'Matrix Case':<22} | {'Operation':<22} | {'Baseline':<12} | {'Optimized':<12} | {'Speedup':<10}")
    print("-" * 95)

    for k, opt_data in optimized.items():
        base_data = baseline.get(k, {})
        name = opt_data["name"]

        # Rook
        b_rook = base_data.get("t_rook_ms", 0.0)
        o_rook = opt_data["t_rook_ms"]
        s_rook = f"{b_rook / o_rook:.2f}x" if o_rook > 0 and b_rook > 0 else "N/A"
        print(f"{name:<22} | {'Rook Polynomial':<22} | {b_rook:8.3f} ms | {o_rook:8.3f} ms | {s_rook:<10}")

        # PIE
        b_pie = base_data.get("t_pie_ms", 0.0)
        o_pie = opt_data["t_pie_ms"]
        s_pie = f"{b_pie / o_pie:.2f}x" if o_pie > 0 and b_pie > 0 else "N/A"
        print(f"{'':<22} | {'Inclusion-Exclusion':<22} | {b_pie:8.3f} ms | {o_pie:8.3f} ms | {s_pie:<10}")

        # Generator limit 100
        b_gen = base_data.get("generation", {}).get("limit_100", {}).get("time_ms", 0.0)
        o_gen = opt_data.get("generation", {}).get("limit_100", {}).get("time_ms", 0.0)
        s_gen = f"{b_gen / o_gen:.2f}x" if o_gen > 0 and b_gen > 0 else "N/A"
        print(f"{'':<22} | {'Generator (lim=100)':<22} | {b_gen:8.3f} ms | {o_gen:8.3f} ms | {s_gen:<10}")

        # Conflict Detection Audit
        b_aud = base_data.get("t_audit_batch_ms", 0.0)
        o_aud = opt_data.get("t_audit_opt_ms", 0.0)
        s_aud = f"{b_aud / o_aud:.2f}x" if o_aud > 0 and b_aud > 0 else "N/A"
        print(f"{'':<22} | {'Conflict Detection':<22} | {b_aud:8.3f} ms | {o_aud:8.3f} ms | {s_aud:<10}")

        # Workflow
        b_wf = base_data.get("t_workflow_ms", 0.0)
        o_wf = opt_data.get("t_workflow_opt_ms", 0.0)
        s_wf = f"{b_wf / o_wf:.2f}x" if o_wf > 0 and b_wf > 0 else "N/A"
        print(f"{'':<22} | {'Complete Workflow':<22} | {b_wf:8.3f} ms | {o_wf:8.3f} ms | {s_wf:<10}")
        print("-" * 95)


if __name__ == "__main__":
    results = run_comprehensive_benchmark()
    with open("benchmark_optimized.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("\nBenchmark results saved to benchmark_optimized.json")

    if os.path.exists("benchmark_baseline.json"):
        with open("benchmark_baseline.json", "r", encoding="utf-8") as f:
            baseline = json.load(f)
        print_comparison_table(baseline, results)
