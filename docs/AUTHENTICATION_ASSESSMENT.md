# GateWise — Authentication & Role-Based Access Control Assessment
**Phase 27 Deliverable — Security, Authentication & User Management Blueprint**

**Document Version:** 1.0.0  
**Date:** November 16, 2026  
**Auditor:** Antigravity Autonomous Agent (Google DeepMind)  
**Project:** GateWise — Intelligent Airport Gate Allocation & Mathematical Decision Support System  

---

## 1. Current Authentication Baseline Assessment

### 1.1 Current State: Single-Tenant Operational Workspace
A comprehensive code audit of `backend/app` confirms that **no authentication or session layer is currently active**:
- No user accounts or credential storage tables exist in `backend/app/models/entities.py`.
- No password hashing algorithms (such as bcrypt, argon2, or scrypt) are imported.
- No JSON Web Token (JWT) or session cookie middleware exists in `backend/app/main.py`.
- No login, registration, or OAuth2 routes exist under `/api/v1/`.

### 1.2 Truthful Product Positioning (Zero-Mock Protocol)
In adherence to the core GateWise engineering principles:
1. **No Fake Logins:** The application does not present artificial login modals or cosmetic user switchers that do not enforce actual backend security boundaries.
2. **Open Educational Access:** In its present state, GateWise serves as an open mathematical decision-support system suitable for academic evaluation, research demonstrations, and offline algorithmic exploration.
3. **No Unenforced RBAC Claims:** The UI does not claim role-based access restrictions that are not cryptographically validated and enforced by backend middleware.

---

## 2. Production Security Architecture & RBAC Roadmap

To transition GateWise from an academic decision-support tool into an enterprise-grade airport operational system, the following 4-tier Role-Based Access Control (RBAC) architecture is designed:

### 2.1 Role Hierarchy & Permissions Matrix

```
+----------------------------------------------------------------------------------------------------+
|                                      GATEWISE RBAC PERMISSION MATRIX                               |
+----------------------------------------------------------------------------------------------------+
| PERMISSION / CAPABILITY            | VIEWER     | ANALYST    | OPERATIONS MGR | SYSTEM ADMIN       |
+------------------------------------+------------+------------+----------------+--------------------+
| View Dashboard & Telemetry         | Read       | Read       | Read           | Read               |
| View Flights & Gates Registry      | Read       | Read       | Full CRUD      | Full CRUD          |
| Create & Configure Scenarios       | None       | Full CRUD  | Full CRUD      | Full CRUD          |
| Edit Restriction Matrix (Board B)  | None       | Read/Write | Read/Write     | Read/Write         |
| Execute Rook Polynomial & PIE      | None       | Execute    | Execute        | Execute            |
| Generate Backtracking Allocations  | None       | Execute    | Execute        | Execute            |
| Export Reports (CSV / PDF)         | Read Only  | Full       | Full           | Full               |
| Approve & Publish Live Schedules   | None       | None       | Approve        | Approve            |
| Manage User Accounts & API Keys    | None       | None       | None           | Full Admin         |
| Database Maintenance & Diagnostics | None       | None       | None           | Full Admin         |
+----------------------------------------------------------------------------------------------------+
```

### 2.2 Proposed Database Schema Extensions

When authentication is introduced, the database will be migrated with the following models:

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(50), primary_key=True) # UUID
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="VIEWER", nullable=False) # VIEWER, ANALYST, OPERATIONS_MGR, ADMIN
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # e.g. "Terminal 1 Ops", "Fleet Planning"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class AuditSession(Base):
    __tablename__ = "audit_sessions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(50), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=False)
    user_agent: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
```

### 2.3 Cryptographic Standards & Token Implementation
1. **Password Hashing:** Passlib with Argon2id (`argon2-cffi`) or bcrypt with work factor 12.
2. **Access Tokens:** Short-lived JWT (HMAC-SHA256 or RS256, 15-minute expiration) carrying `sub` (user_id), `email`, and `role`.
3. **Refresh Tokens:** Cryptographically random 256-bit entropy tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` browser cookies with 7-day sliding expiration.
4. **FastAPI Guard Dependencies:**
   ```python
   def require_role(allowed_roles: List[str]):
       async def role_checker(current_user: User = Depends(get_current_active_user)):
           if current_user.role not in allowed_roles:
               raise HTTPException(
                   status_code=status.HTTP_403_FORBIDDEN,
                   detail="Insufficient operational authorization for this action."
               )
           return current_user
       return role_checker
   ```

---

## 3. Summary Assessment

* **Current Implementation:** Completely functional as an open, authoritative decision-support engine without artificial security facades.
* **Migration Plan:** Ready for immediate implementation whenever multi-user collaboration or enterprise operational integration is required.
