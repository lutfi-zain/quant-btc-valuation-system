# Verification and Consistency Review Report

**Subject:** Code audit of `normalizeValue()` in `backend/index.ts` vs. `normalize()` in `quant/components/normalization.py`.  
**Status:** **PASSED WITH OBSERVATIONS**

---

## 1. Executive Summary
A comprehensive audit of the TypeScript normalization implementation in the Hono API backend (`backend/index.ts`) was performed against the Python implementation (`quant/components/normalization.py`). 
The core normalization mathematical logic, direction detection (normal vs. inverted), boundary clamping, and single-sided threshold evaluations are **fully equivalent**. 
A minor runtime edge-case discrepancy was identified in the auxiliary composite `rescale()` function which warrants attention.

---

## 2. Core Logic & Formula Equivalence
Both implementations apply piecewise linear interpolation to map raw metric values to a $[-2.0, +2.0]$ scale. The logic splits into three main structural paths:

1. **Standard Case (Double-sided thresholds):** 
   - Normal/inverted direction auto-detection.
   - Piecewise mapping based on five regions ($<-2$, $[-2, -1]$, $[-1, +1]$, $[+1, +2]$, and $>+2$).
2. **One-sided Bottom Case (`is_bottom_only`):**
   - Active boundaries are $t_{\text{plus 2}}$ and $t_{\text{plus 1}}$.
3. **One-sided Top Case (`is_top_only`):**
   - Active boundaries are $t_{\text{minus 1}}$ and $t_{\text{minus 2}}$.

### Detailed Comparison Table
| Aspect | Python (`quant/components/normalization.py`) | TypeScript (`backend/index.ts`) | Equivalence Status |
| :--- | :--- | :--- | :--- |
| **Function Signature** | `normalize(raw_value, t_plus_2, t_plus_1, t_minus_1, t_minus_2)` | `normalizeValue(rawValue, t_plus_2, t_plus_1, t_minus_1, t_minus_2)` | **Equivalent** |
| **Auto-detect Direction** | Compares `t_plus_2 > t_minus_2` / `t_plus_2 > t_plus_1` / `t_minus_1 > t_minus_2` | Identical logic using strict comparison check vs. `null` | **Equivalent** |
| **Safe Division** | `num / denom if abs(denom) > 1e-9 else 0.0` | `Math.abs(denom) > 1e-9 ? num / denom : 0.0` | **Equivalent** (Uses $10^{-9}$ epsilon) |
| **Clamping Ranges** | Returns `2.0`, `-2.0`, `0.0`, or `-1.0` at boundaries | Identical bounds checking and return values | **Equivalent** |

---

## 3. Edge Cases & Null Handling

- **NaN Raw Values:**
  - **Python:** `if raw_value is None or (isinstance(raw_value, float) and math.isnan(raw_value)): return float('nan')`
  - **TypeScript:** `if (rawValue === null || isNaN(rawValue)) { return NaN; }`
  - **Equivalence:** Both correctly identify `null`/`None` or `NaN` inputs and return a floating-point `NaN` value. In TypeScript, explicitly checking `rawValue === null` before `isNaN(rawValue)` is crucial because `isNaN(null)` evaluates to `false` (since `null` coerces to `0`), which would have caused bugs. The implementation handles this correctly.
- **Null Threshold Parameters:**
  - Both correctly fallback to returning `0.0` if all thresholds are null, or if essential single-sided configuration thresholds are missing (e.g. `is_bottom_only` but one of `t_plus_2`/`t_plus_1` is null).

---

## 4. Boundary Conditions
The boundary logic checks were verified mathematically for values directly on boundary coordinates:
- **Upper Bound (e.g., $rawValue == t\_plus\_2$):** Both correctly clamp and return `2.0` (or `-2.0` for inverted).
- **Lower Bound (e.g., $rawValue == t\_minus\_2$):** Both correctly clamp and return `-2.0` (or `2.0` for inverted).
- **Midpoints (e.g., $rawValue == t\_plus\_1$):** Both return `1.0` through the exact same piecewise scaling formula.

---

## 5. Style, Conventions & Serialization Checks

1. **Naming Rules:**
   - Python uses PEP-8 compliant `snake_case` for all functions and arguments.
   - TypeScript uses standard `camelCase` for the function (`normalizeValue`) and `rawValue`, but maintains `snake_case` parameter names (`t_plus_2`, etc.) to align directly with SQLite database schemas and math definitions. This is a pragmatic convention.
2. **JSON Serialization Guardrails:**
   - Under Hono API, all endpoint registrations (`GET /api/metrics`, `GET /api/metrics/configs`, `GET /api/composite`, `GET /api/audit/summary`, etc.) return properties mapped directly from the database columns (`t_minus_2`, `raw_p50`, etc.).
   - No private or underscore-prefixed fields (e.g., `_metric_name`) are exposed or serialized in any response.

---

## 6. Recommendations & Observations

### Observation: TypeScript `rescale()` Null Handling Check
In `backend/index.ts`, the composite rescaling function is:
```typescript
function rescale(rawVal: number, params: { raw_p2_5: number, raw_p50: number, raw_p97_5: number }): number {
  const { raw_p2_5, raw_p50, raw_p97_5 } = params;
  if (rawVal <= raw_p2_5) return -2.0;
  ...
}
```
If the database holds `NULL` values for composite parameters (e.g. if the audit run has not populated them yet), the destructured parameters `raw_p2_5`, etc., will evaluate to `null` at runtime.
- **The Issue:** JavaScript evaluates `rawVal <= null` as `rawVal <= 0` because `null` coerces to `0`. This would lead to incorrect normalization values instead of passing the raw value through.
- **Python's Safe Handling:** Python's `rescale` in `quant/audit/composite.py` checks:
  ```python
  if p2_5 is None or p50 is None or p97_5 is None:
      return raw_value
  ```
- **Recommendation:** Implement a similar check in TS `rescale` to handle potential nulls gracefully.
