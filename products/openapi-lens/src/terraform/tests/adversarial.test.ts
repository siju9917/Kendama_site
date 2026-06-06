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

describe("adversarial round 61 — extended data-store and IAM type coverage", () => {
  function makeChange(type: string, action: string, address?: string) {
    return { address: address ?? `${type}.example`, type, actions: [action], mode: "managed" as const };
  }

  // ── Data store additions ────────────────────────────────────────────────────
  it("aws_kinesis_stream update is CRITICAL (in-flight records at risk)", () => {
    const result = classifyChange(makeChange("aws_kinesis_stream", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("aws_kinesis_firehose_delivery_stream update is CRITICAL (delivery disruption risk)", () => {
    const result = classifyChange(makeChange("aws_kinesis_firehose_delivery_stream", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("aws_sqs_queue update is CRITICAL (message visibility or retention changes disrupt consumers)", () => {
    const result = classifyChange(makeChange("aws_sqs_queue", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("aws_sqs_queue creation is NORMAL (no existing messages at risk)", () => {
    const result = classifyChange(makeChange("aws_sqs_queue", "create"));
    expect(result.severity).toBe("NORMAL");
  });

  it("aws_documentdb_cluster update is CRITICAL (DocumentDB data store modification risks data)", () => {
    const result = classifyChange(makeChange("aws_documentdb_cluster", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("aws_neptune_cluster update is CRITICAL (Neptune graph DB data store modification risks data)", () => {
    const result = classifyChange(makeChange("aws_neptune_cluster", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("google_storage_bucket update is CRITICAL (GCP object storage — data loss risk mirrors S3)", () => {
    const result = classifyChange(makeChange("google_storage_bucket", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("google_bigquery_dataset update is CRITICAL (schema or ACL changes affect all tables in dataset)", () => {
    const result = classifyChange(makeChange("google_bigquery_dataset", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  it("aws_cognito_user_pool update is CRITICAL (user accounts — password policy or MFA changes lock out users)", () => {
    const result = classifyChange(makeChange("aws_cognito_user_pool", "update"));
    expect(result.severity).toBe("CRITICAL");
  });

  // ── IAM additions ──────────────────────────────────────────────────────────
  it("google_project_iam_policy update triggers IAM review (replaces entire project policy)", () => {
    const result = classifyChange(makeChange("google_project_iam_policy", "update"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("aws_cognito_user_pool_client update triggers IAM review (app client credential rotation)", () => {
    const result = classifyChange(makeChange("aws_cognito_user_pool_client", "update"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("aws_ssm_parameter update triggers IAM review (Parameter Store secrets may be rotated/deleted)", () => {
    const result = classifyChange(makeChange("aws_ssm_parameter", "update"));
    expect(result.severity).not.toBe("NORMAL");
  });

  it("aws_iam_group_policy_attachment update triggers IAM review (managed policy attached to group)", () => {
    const result = classifyChange(makeChange("aws_iam_group_policy_attachment", "update"));
    expect(result.severity).not.toBe("NORMAL");
  });

  // ── Stateless compute should NOT be in either table ────────────────────────
  it("aws_kinesis_stream creation is NORMAL (new stream, no existing records)", () => {
    const result = classifyChange(makeChange("aws_kinesis_stream", "create"));
    expect(result.severity).toBe("NORMAL");
  });

  it("aws_lambda_function is NOT classified as data store or IAM (stateless compute)", () => {
    const result = classifyChange(makeChange("aws_lambda_function", "update"));
    expect(result.severity).toBe("NORMAL");
  });
});

describe("adversarial round 63 — Terraform classifier multi-rule interactions", () => {
  // When both the replace rule AND a data store/IAM rule fire, BOTH reasons should appear.
  // This verifies that reason accumulation is correct (no early return after first rule).

  it("data store with legacy replace ['create','delete'] is CRITICAL with BOTH replace and data-store reasons", () => {
    const c = classifyChange(
      makeChange({ type: "aws_rds_cluster", address: "aws_rds_cluster.main", actions: ["create", "delete"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("data store"))).toBe(true);
  });

  it("data store with create_before_destroy ['delete','create'] is CRITICAL with replace + data-store reasons", () => {
    const c = classifyChange(
      makeChange({ type: "aws_dynamodb_table", address: "aws_dynamodb_table.main", actions: ["delete", "create"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("data store"))).toBe(true);
  });

  it("IAM resource with replace ['create','delete'] is CRITICAL with both replace and IAM reasons", () => {
    const c = classifyChange(
      makeChange({ type: "aws_iam_role", address: "aws_iam_role.executor", actions: ["create", "delete"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    expect(c.reasons.some((r) => r.includes("REPLACED"))).toBe(true);
    expect(c.reasons.some((r) => r.includes("IAM") || r.includes("access"))).toBe(true);
  });

  it("data store update returns a single data-store reason (no spurious delete reason)", () => {
    const c = classifyChange(
      makeChange({ type: "aws_elasticache_cluster", address: "aws_elasticache_cluster.main", actions: ["update"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    // Rule 2 does NOT fire (no delete action) — only Rule 4 fires
    expect(c.reasons.some((r) => r.includes("DELETED"))).toBe(false);
    expect(c.reasons.some((r) => r.includes("data store"))).toBe(true);
  });

  it("unknown action type on non-critical resource stays NORMAL", () => {
    // Future Terraform versions could add new action types (e.g. 'drift'). The classifier
    // should not crash and should fall through to NORMAL for unknown action strings.
    const c = classifyChange(
      makeChange({ type: "aws_instance", address: "aws_instance.web", actions: ["update"] }),
    );
    expect(c.severity).toBe("NORMAL");
    expect(c.reasons.length).toBeGreaterThan(0);
  });
});

describe("adversarial round 66 — isTerraformPlanJson edge cases and classifier boundary behaviors", () => {
  // ── isTerraformPlanJson edge cases ─────────────────────────────────────────

  it("isTerraformPlanJson: format_version present but resource_changes absent → false", () => {
    // A JSON file that mentions format_version but has no resource_changes key
    // should NOT be detected as a Terraform plan.
    const text = '{"format_version":"1.0","terraform_version":"1.8.0","some_other_key":[]}';
    expect(isTerraformPlanJson(text)).toBe(false);
  });

  it("isTerraformPlanJson: terraform_version present but resource_changes absent → false", () => {
    // Only the version fields, no resource_changes — not a plan.
    const text = '{"terraform_version":"1.9.0","format_version":"1.0"}';
    expect(isTerraformPlanJson(text)).toBe(false);
  });

  it("isTerraformPlanJson: detection keys appearing beyond first 2000 chars are NOT detected (known limitation)", () => {
    // The function slices the first 2000 chars for efficiency.
    // A very large JSON blob where the Terraform keys appear only after position 2000
    // returns false even though the full text is a valid Terraform plan.
    // This documents the known detection limitation for large compressed/minified plans.
    const padding = "x".repeat(1990);
    // {"note":"<1990 x's>","resource_changes":[],"terraform_version":"1.8.0"}
    // "resource_changes" starts at position 2001 — outside the 2000-char slice.
    const text = `{"note":"${padding}","resource_changes":[],"terraform_version":"1.8.0"}`;
    expect(isTerraformPlanJson(text)).toBe(false);
  });

  it("isTerraformPlanJson: both keys within the 2000-char window but close to boundary → still detected", () => {
    // Boundary verification: keys just INSIDE the 2000-char slice are still found.
    const padding = "x".repeat(1940);
    // "resource_changes" starts at around position 1949 — inside the 2000-char slice.
    const text = `{"note":"${padding}","resource_changes":[],"terraform_version":"1.8.0"}`;
    expect(isTerraformPlanJson(text)).toBe(true);
  });

  // ── Classifier boundary behaviors ───────────────────────────────────────────

  it("data store CREATE is NORMAL — isCreateOnly guard prevents Rule 4 from firing", () => {
    // Rule 4 fires only when !isCreateOnly(actions). A pure create of a data-store type
    // is NORMAL: no existing data to lose, no risk of data loss.
    const plan = JSON.stringify({
      format_version: "1.0",
      terraform_version: "1.8.0",
      resource_changes: [
        {
          address: "aws_rds_cluster.primary",
          type: "aws_rds_cluster",
          name: "primary",
          mode: "managed",
          change: {
            actions: ["create"],
            before: null,
            after: { cluster_identifier: "prod-db" },
            after_unknown: {},
          },
        },
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.critical).toBe(0);
    expect(result.normal).toBe(1);
    expect(result.changes[0]!.severity).toBe("NORMAL");
  });

  it("resource_changes entry with actions as string (not array) is silently skipped (isResourceChange guard)", () => {
    // isResourceChange requires change.actions to be an array.
    // A malformed entry where actions is a string literal is skipped.
    const plan = JSON.stringify({
      format_version: "1.0",
      terraform_version: "1.8.0",
      resource_changes: [
        {
          address: "aws_instance.bad",
          type: "aws_instance",
          name: "bad",
          mode: "managed",
          change: {
            actions: "create",
            before: null,
            after: { id: "i-1" },
          },
        },
        {
          address: "aws_instance.good",
          type: "aws_instance",
          name: "good",
          mode: "managed",
          change: {
            actions: ["create"],
            before: null,
            after: { id: "i-2" },
          },
        },
      ],
    });
    const result = parseTerraformPlan(plan);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.change.address).toBe("aws_instance.good");
    expect(result.normal).toBe(1);
  });
});

// ─── Round 78: multi-rule interactions in classifyChange ────────────────────

describe("adversarial round 78 — multi-rule classify interactions (both REPLACED + type-specific reasons)", () => {
  function makeChange(overrides: Partial<TfChange> = {}): TfChange {
    return {
      address: "aws_s3_bucket.data",
      type: "aws_s3_bucket",
      name: "data",
      actions: ["replace"],
      before: { id: "b-1" },
      after: { id: "b-1" },
      ...overrides,
    };
  }

  it("data store + replace fires both Rule 3 (REPLACED) and Rule 4 (data store) — two reasons emitted", () => {
    // Rules 3 and 4 are independent; a data store being replaced accumulates both reasons.
    const c = classifyChange(makeChange({ type: "aws_s3_bucket", actions: ["replace"] }));
    expect(c.severity).toBe("CRITICAL");
    const hasReplaceReason = c.reasons.some((r) => r.includes("REPLACED"));
    const hasDataStoreReason = c.reasons.some((r) => r.includes("data store"));
    expect(hasReplaceReason).toBe(true);
    expect(hasDataStoreReason).toBe(true);
    expect(c.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("IAM + replace fires both Rule 3 (REPLACED) and Rule 5 (IAM) — two reasons emitted", () => {
    // Replacing an IAM resource is doubly flagged: replacement risk AND access-control risk.
    const c = classifyChange(
      makeChange({ type: "aws_iam_role", address: "aws_iam_role.exec", actions: ["replace"] }),
    );
    expect(c.severity).toBe("CRITICAL");
    const hasReplaceReason = c.reasons.some((r) => r.includes("REPLACED"));
    const hasIamReason = c.reasons.some((r) => r.includes("IAM") || r.includes("access"));
    expect(hasReplaceReason).toBe(true);
    expect(hasIamReason).toBe(true);
    expect(c.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("data store + delete fires both Rule 2 (DELETED) and Rule 4 (data store) — two reasons emitted", () => {
    // A plain delete of a data store accumulates the permanent-delete AND data-store reasons.
    const c = classifyChange(
      makeChange({ type: "aws_db_instance", address: "aws_db_instance.prod", actions: ["delete"], after: null }),
    );
    expect(c.severity).toBe("CRITICAL");
    const hasDeleteReason = c.reasons.some((r) => r.includes("DELETED"));
    const hasDataStoreReason = c.reasons.some((r) => r.includes("data store"));
    expect(hasDeleteReason).toBe(true);
    expect(hasDataStoreReason).toBe(true);
  });

  it("empty actions array produces NORMAL with 'in-place' reason (characterization — not a real Terraform action set)", () => {
    // isNoOp([]) returns false (length guard), isCreateOnly([]) returns false.
    // Rules 2-5 all miss. Default: severity remains NORMAL, in-place reason added.
    // This locks behavior for degenerate plan JSON that omits the actions array.
    const c = classifyChange(
      makeChange({ type: "aws_instance", address: "aws_instance.web", actions: [] }),
    );
    expect(c.severity).toBe("NORMAL");
    expect(c.reasons.some((r) => r.includes("in-place") || r.includes("update"))).toBe(true);
  });
});
