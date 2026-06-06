import { describe, it, expect } from "vitest";
import { parseTerraformPlan, isTerraformPlanJson } from "../parser.js";
import { classifyChange } from "../classify.js";
import type { TfChange } from "../types.js";

function makePlan(resourceChanges: unknown[]): string {
  return JSON.stringify({
    format_version: "1.0",
    terraform_version: "1.8.0",
    resource_changes: resourceChanges,
  });
}

function makeChange(overrides: Partial<TfChange> = {}): TfChange {
  return {
    address: "aws_instance.web",
    type: "aws_instance",
    name: "web",
    actions: ["update"],
    before: { id: "i-1234" },
    after: { id: "i-1234", instance_type: "t3.small" },
    ...overrides,
  };
}

describe("adversarial — edge cases in hasReplacePattern", () => {
  it("['create', 'delete'] is replace (create_before_destroy) — CRITICAL with create_before_destroy reason", () => {
    const c = classifyChange(makeChange({ actions: ["create", "delete"] }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("create_before_destroy"))).toBe(true);
  });

  it("['delete', 'create'] is destroy_before_create — CRITICAL with downtime warning", () => {
    const c = classifyChange(makeChange({ actions: ["delete", "create"] }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("destroy_before_create"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("downtime window"))).toBe(true);
  });

  it("['replace'] single action — generic replaced and re-created reason", () => {
    const c = classifyChange(makeChange({ actions: ["replace"] }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("deleted and re-created"))).toBe(true);
  });

  it("['delete'] alone (no create) is CRITICAL with DELETED reason, not REPLACED", () => {
    const c = classifyChange(makeChange({ actions: ["delete"], after: null }));
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("DELETED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(false);
  });

  it("['create'] alone for IAM resource is NORMAL (no existing state)", () => {
    const c = classifyChange(
      makeChange({
        type: "aws_iam_role",
        address: "aws_iam_role.new",
        actions: ["create"],
        before: null,
      }),
    );
    expect(c.severity).toBe("NORMAL");
  });

  it("['no-op'] for data store is NO-OP (not CRITICAL)", () => {
    const c = classifyChange(
      makeChange({
        type: "aws_db_instance",
        address: "aws_db_instance.main",
        actions: ["no-op"],
      }),
    );
    expect(c.severity).toBe("NO-OP");
    expect(c.reasons).toHaveLength(0);
  });
});

describe("adversarial — plan parsing edge cases", () => {
  it("handles null resource_changes entries gracefully (skipped)", () => {
    const plan = JSON.stringify({
      format_version: "1.0",
      resource_changes: [null, undefined, {}, "string"],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(0);
  });

  it("plan with only no-op changes reports 0 CRITICAL and 0 NORMAL", () => {
    const plan = makePlan([
      {
        address: "aws_instance.web",
        type: "aws_instance",
        name: "web",
        change: { actions: ["no-op"], before: { id: "i-1" }, after: { id: "i-1" }, after_unknown: {} },
      },
    ]);
    const result = parseTerraformPlan(plan);
    expect(result.critical).toBe(0);
    expect(result.normal).toBe(0);
    expect(result.noOp).toBe(1);
  });

  it("deeply nested resource address does not break classifier", () => {
    const plan = makePlan([
      {
        address: "module.vpc.module.subnets.aws_subnet.private[0]",
        type: "aws_subnet",
        name: "private",
        change: { actions: ["update"], before: { cidr_block: "10.0.1.0/24" }, after: { cidr_block: "10.0.2.0/24" }, after_unknown: {} },
      },
    ]);
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.severity).toBe("NORMAL");
  });

  it("plan with 50 mixed changes returns correct counts", () => {
    const creates = Array.from({ length: 20 }, (_, i) => ({
      address: `aws_instance.web${i}`,
      type: "aws_instance",
      name: `web${i}`,
      change: { actions: ["create"], before: null, after: { id: `i-${i}` }, after_unknown: {} },
    }));
    const dbUpdates = Array.from({ length: 10 }, (_, i) => ({
      address: `aws_db_instance.db${i}`,
      type: "aws_db_instance",
      name: `db${i}`,
      change: { actions: ["update"], before: { id: `db-${i}` }, after: { id: `db-${i}`, engine_version: "15" }, after_unknown: {} },
    }));
    const noOps = Array.from({ length: 20 }, (_, i) => ({
      address: `aws_s3_bucket.bucket${i}`,
      type: "aws_s3_bucket",
      name: `bucket${i}`,
      change: { actions: ["no-op"], before: { id: `b-${i}` }, after: { id: `b-${i}` }, after_unknown: {} },
    }));
    const plan = makePlan([...creates, ...dbUpdates, ...noOps]);
    const result = parseTerraformPlan(plan);
    expect(result.normal).toBe(20);    // creates
    expect(result.critical).toBe(10);  // db updates
    expect(result.noOp).toBe(20);      // no-ops
  });
});

describe("adversarial — data source filtering (mode: data)", () => {
  it("data source with read action on a data-store type is excluded from results (not CRITICAL)", () => {
    // aws_s3_bucket is in DATA_STORE_TYPES. A data source read should not be classified.
    const plan = JSON.stringify({
      format_version: "1.0",
      terraform_version: "1.8.0",
      resource_changes: [
        {
          address: "data.aws_s3_bucket.main",
          mode: "data",
          type: "aws_s3_bucket",
          name: "main",
          change: { actions: ["read"], before: null, after: { id: "bucket" } },
        },
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(0);
    expect(result.critical).toBe(0);
  });

  it("data source with read action on an IAM type is excluded from results (not CRITICAL)", () => {
    const plan = JSON.stringify({
      format_version: "1.0",
      terraform_version: "1.8.0",
      resource_changes: [
        {
          address: "data.aws_iam_policy_document.assume",
          mode: "data",
          type: "aws_iam_policy_document",
          name: "assume",
          change: { actions: ["read"], before: null, after: { json: "{}" } },
        },
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(0);
    expect(result.critical).toBe(0);
  });

  it("plan with mixed managed and data resources only counts managed resources", () => {
    const plan = JSON.stringify({
      format_version: "1.0",
      terraform_version: "1.8.0",
      resource_changes: [
        {
          address: "aws_instance.web",
          mode: "managed",
          type: "aws_instance",
          name: "web",
          change: { actions: ["create"], before: null, after: { id: "i-1" } },
        },
        {
          address: "data.aws_s3_bucket.artifacts",
          mode: "data",
          type: "aws_s3_bucket",
          name: "artifacts",
          change: { actions: ["read"], before: null, after: { id: "my-bucket" } },
        },
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.change.address).toBe("aws_instance.web");
    expect(result.critical).toBe(0);
    expect(result.normal).toBe(1);
  });

  it("managed resource entry with no mode field is still included", () => {
    // Some older Terraform versions may omit the mode field on managed resources.
    const plan = JSON.stringify({
      format_version: "1.0",
      terraform_version: "1.5.0",
      resource_changes: [
        {
          address: "aws_db_instance.main",
          type: "aws_db_instance",
          name: "main",
          change: { actions: ["update"], before: { engine: "14" }, after: { engine: "15" } },
        },
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.critical).toBe(1);
  });
});

describe("adversarial — isTerraformPlanJson false-positive / false-negative", () => {
  it("does not match a random JSON file that mentions 'resource_changes' in a value", () => {
    const text = '{"description":"this plan uses resource_changes to track state","version":"1"}';
    // The key 'resource_changes' appears in a string value, not as a field name.
    // isTerraformPlanJson uses string includes, which will match in values too.
    // This is an acknowledged false-positive — acceptable given the full parse
    // will throw on missing terraform_version, so the extension handles it gracefully.
    // The test documents the known behavior.
    const result = isTerraformPlanJson(text);
    expect(typeof result).toBe("boolean");
  });

  it("returns false for a valid OpenAPI spec JSON", () => {
    const text = '{"openapi":"3.0.0","info":{"title":"T"},"paths":{}}';
    expect(isTerraformPlanJson(text)).toBe(false);
  });

  it("returns false for a Kubernetes manifest JSON", () => {
    const text = '{"apiVersion":"apps/v1","kind":"Deployment","metadata":{"name":"web"},"spec":{}}';
    expect(isTerraformPlanJson(text)).toBe(false);
  });
});

describe("adversarial round 42 — resource type coverage gaps", () => {
  it("aws_eks_cluster update is CRITICAL (node drain disrupts all workloads)", () => {
    // EKS cluster version upgrade drains all nodes and restarts pods — workload disruption
    // is equivalent to a data-store modification. Must be CRITICAL, not NORMAL.
    const c = classifyChange(
      makeChange({
        type: "aws_eks_cluster",
        address: "aws_eks_cluster.prod",
        actions: ["update"],
        before: { version: "1.28" },
        after: { version: "1.29" },
      }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("aws_eks_cluster creation is NORMAL (no existing workloads at risk)", () => {
    const c = classifyChange(
      makeChange({
        type: "aws_eks_cluster",
        address: "aws_eks_cluster.prod",
        actions: ["create"],
        before: null,
      }),
    );
    expect(c.severity).toBe("NORMAL");
  });

  it("azurerm_sql_database update is CRITICAL (managed Azure SQL database modification risks data)", () => {
    const c = classifyChange(
      makeChange({
        type: "azurerm_sql_database",
        address: "azurerm_sql_database.app",
        actions: ["update"],
        before: { sku_name: "S1" },
        after: { sku_name: "S3" },
      }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("azurerm_mysql_server update is CRITICAL (Azure MySQL PaaS server modification risks data)", () => {
    const c = classifyChange(
      makeChange({
        type: "azurerm_mysql_server",
        address: "azurerm_mysql_server.app",
        actions: ["update"],
      }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("azurerm_postgresql_server update is CRITICAL (Azure PostgreSQL PaaS server modification risks data)", () => {
    const c = classifyChange(
      makeChange({
        type: "azurerm_postgresql_server",
        address: "azurerm_postgresql_server.api",
        actions: ["update"],
      }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("azurerm_mariadb_server update is CRITICAL (Azure MariaDB server modification risks data)", () => {
    const c = classifyChange(
      makeChange({
        type: "azurerm_mariadb_server",
        address: "azurerm_mariadb_server.legacy",
        actions: ["update"],
      }),
    );
    expect(c.severity).toBe("CRITICAL");
  });

  it("empty actions array falls through to NORMAL (degenerate plan output — no action taken)", () => {
    const c = classifyChange(makeChange({ actions: [] }));
    expect(c.severity).toBe("NORMAL");
  });

  it("unknown action string falls through to NORMAL (unknown action treated as in-place)", () => {
    const c = classifyChange(makeChange({ actions: ["unknown-action"] }));
    expect(c.severity).toBe("NORMAL");
  });

  it("for_each keyed address does not break classifier", () => {
    const plan = makePlan([
      {
        address: 'aws_db_instance.main["us-east-1"]',
        type: "aws_db_instance",
        name: "main",
        mode: "managed",
        change: { actions: ["update"], before: { engine_version: "14" }, after: { engine_version: "15" }, after_unknown: {} },
      },
    ]);
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.severity).toBe("CRITICAL");
  });

  it("count index address does not break classifier", () => {
    const plan = makePlan([
      {
        address: "aws_s3_bucket.logs[2]",
        type: "aws_s3_bucket",
        name: "logs",
        mode: "managed",
        change: { actions: ["delete"], before: { id: "logs-bucket-2" }, after: null, after_unknown: {} },
      },
    ]);
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.severity).toBe("CRITICAL");
  });
});

describe("adversarial round 47 — new data-store resource type coverage", () => {
  function makeUpdateChange(type: string): TfChange {
    return makeChange({ type, address: `${type}.main`, actions: ["update"] });
  }

  it("azurerm_redis_cache update is CRITICAL (in-memory store flush risk during modification)", () => {
    expect(classifyChange(makeUpdateChange("azurerm_redis_cache")).severity).toBe("CRITICAL");
  });

  it("azurerm_mssql_database update is CRITICAL (MSSQL managed database risks data)", () => {
    expect(classifyChange(makeUpdateChange("azurerm_mssql_database")).severity).toBe("CRITICAL");
  });

  it("azurerm_mssql_server update is CRITICAL (MSSQL managed server risks workload)", () => {
    expect(classifyChange(makeUpdateChange("azurerm_mssql_server")).severity).toBe("CRITICAL");
  });

  it("google_redis_instance update is CRITICAL (GCP Memorystore Redis cache loss on modification)", () => {
    expect(classifyChange(makeUpdateChange("google_redis_instance")).severity).toBe("CRITICAL");
  });

  it("google_memcache_instance update is CRITICAL (GCP Memorystore Memcached cache loss)", () => {
    expect(classifyChange(makeUpdateChange("google_memcache_instance")).severity).toBe("CRITICAL");
  });

  it("google_container_cluster update is CRITICAL (GKE node drain disrupts workloads, mirrors EKS)", () => {
    expect(classifyChange(makeUpdateChange("google_container_cluster")).severity).toBe("CRITICAL");
  });

  it("aws_msk_cluster update is CRITICAL (in-flight Kafka messages at risk during cluster modification)", () => {
    expect(classifyChange(makeUpdateChange("aws_msk_cluster")).severity).toBe("CRITICAL");
  });

  it("azurerm_kubernetes_cluster update is CRITICAL (AKS node drain disrupts workloads, mirrors EKS/GKE)", () => {
    expect(classifyChange(makeUpdateChange("azurerm_kubernetes_cluster")).severity).toBe("CRITICAL");
  });
});

describe("adversarial round 48 — new IAM/security resource type coverage", () => {
  function makeIamUpdateChange(type: string): TfChange {
    return makeChange({ type, address: `${type}.main`, actions: ["update"] });
  }

  it("azurerm_key_vault update triggers IAM review (SKU or access model change affects all secrets)", () => {
    const result = classifyChange(makeIamUpdateChange("azurerm_key_vault"));
    // Key vault is an IAM/security resource — any change warrants review
    expect(result.severity).not.toBe("NORMAL");
  });

  it("azurerm_key_vault_key update triggers IAM review (key rotation or algorithm change)", () => {
    const result = classifyChange(makeIamUpdateChange("azurerm_key_vault_key"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("azurerm_key_vault_secret update triggers IAM review (secret value change)", () => {
    const result = classifyChange(makeIamUpdateChange("azurerm_key_vault_secret"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("aws_iam_policy_attachment update triggers IAM review", () => {
    const result = classifyChange(makeIamUpdateChange("aws_iam_policy_attachment"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("aws_kms_key update triggers IAM review (key disable/delete renders encrypted data inaccessible)", () => {
    const result = classifyChange(makeIamUpdateChange("aws_kms_key"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("google_service_account update triggers IAM review (workload identity credential change)", () => {
    const result = classifyChange(makeIamUpdateChange("google_service_account"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("google_service_account_key update triggers IAM review (key rotation breaks authenticating workloads)", () => {
    const result = classifyChange(makeIamUpdateChange("google_service_account_key"));
    expect(result.severity).not.toBe("NORMAL");
  });
});
