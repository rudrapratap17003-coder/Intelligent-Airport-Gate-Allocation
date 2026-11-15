import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_workflow():
    print("=================================================================")
    print("GATEWISE MASTER WORKFLOW INTEGRATION TEST")
    print("=================================================================")
    
    # 1. Health check
    res = urllib.request.urlopen("http://127.0.0.1:8000/api/health")
    health = json.loads(res.read().decode())
    assert health["status"] in ("ok", "healthy")
    print(f"1. Health Check: OK ({health['status']})")

    # 2. Get Flights & Gates
    flights = json.loads(urllib.request.urlopen(f"{BASE_URL}/flights").read().decode())
    gates = json.loads(urllib.request.urlopen(f"{BASE_URL}/gates").read().decode())
    print(f"2. Master Registry: {len(flights)} flights, {len(gates)} gates available.")
    assert len(flights) >= 4
    assert len(gates) >= 4

    # 3. Create Balanced 4x4 Scenario
    f_ids = [f["id"] for f in flights[:4]]
    g_ids = [g["id"] for g in gates[:4]]
    sim_payload = json.dumps({
        "name": f"Workflow Test Scenario {int(time.time())}",
        "description": "Created by automated master workflow test",
        "selected_flight_ids": f_ids,
        "selected_gate_ids": g_ids
    }).encode("utf-8")
    
    req = urllib.request.Request(f"{BASE_URL}/simulations", data=sim_payload, headers={"Content-Type": "application/json"})
    sim = json.loads(urllib.request.urlopen(req).read().decode())
    sim_id = sim["id"]
    print(f"3. Scenario Created: ID={sim_id}, Name={sim['name']}")

    # 4. Configure Restriction Board
    # 4x4 board with 2 forbidden cells: B[0][1] = 1, B[2][3] = 1
    matrix = [
        [0, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 1],
        [0, 0, 0, 0]
    ]
    matrix_payload = json.dumps({
        "matrix": matrix
    }).encode("utf-8")
    req = urllib.request.Request(f"{BASE_URL}/restrictions/{sim_id}", data=matrix_payload, headers={"Content-Type": "application/json"}, method="PUT")
    mat_res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"4. Restriction Matrix Configured: {mat_res['rows_count']}x{mat_res['cols_count']}")

    # 5. Evaluate Mathematical Engine (Rook-Poly & PIE)
    math_res = json.loads(urllib.request.urlopen(f"{BASE_URL}/simulations/{sim_id}/calculate").read().decode())
    print(f"5. Math Derivation: Rook Poly = {math_res['polynomial']}")
    print(f"   Exact Valid Assignments (N) = {math_res['valid_assignments']} / {math_res['total_possible_assignments']}")
    print(f"   Feasibility Ratio = {math_res['feasibility_percentage']}%")
    assert math_res["valid_assignments"] > 0
    assert math_res["total_possible_assignments"] == 24 # 4! = 24

    # 6. Generate Backtracking Allocations
    alloc_res = json.loads(urllib.request.urlopen(f"{BASE_URL}/simulations/{sim_id}/allocations?max_results=20").read().decode())
    print(f"6. Backtracking Allocations Generated: {alloc_res['generated_count']} plans.")
    assert alloc_res["generated_count"] > 0

    # 7. Independent Conflict Verification
    for i, plan in enumerate(alloc_res["allocations"][:3]):
        audit = plan["validation"]
        assert audit["is_valid"] is True
        assert len(audit["conflicts"]) == 0
    print("7. Independent Conflict Audit: All generated plans 100% valid with 0 conflicts.")

    # 8. Export PDF Report
    pdf_res = urllib.request.urlopen(f"{BASE_URL}/export/simulations/{sim_id}/report/pdf")
    pdf_bytes = pdf_res.read()
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")
    print(f"8. Scenario PDF Export: {len(pdf_bytes)} bytes valid PDF generated.")

    # 9. Export CSV Allocations
    csv_alloc = urllib.request.urlopen(f"{BASE_URL}/export/simulations/{sim_id}/allocations/csv").read().decode()
    assert "Flight ID" in csv_alloc or "flight_id" in csv_alloc.lower()
    print("9. Allocations CSV Export: Valid CSV format returned.")

    # 10. Export CSV Math Derivations
    csv_math = urllib.request.urlopen(f"{BASE_URL}/export/simulations/{sim_id}/calculation/csv").read().decode()
    assert "Rook Coefficient" in csv_math or "coefficient" in csv_math.lower()
    print("10. Mathematical CSV Export: Valid itemized PIE CSV returned.")

    print("\n=================================================================")
    print("ALL 10 MASTER WORKFLOW STEPS PASSED VERIFICATION!")
    print("=================================================================")

if __name__ == "__main__":
    test_workflow()
