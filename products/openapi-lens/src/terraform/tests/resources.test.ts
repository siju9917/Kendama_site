import { describe, it, expect } from "vitest";
import {
  matchesTypeList,
  isDataStoreType,
  isIamOrSecurityType,
  DATA_STORE_TYPES,
  IAM_TYPES,
} from "../resources.js";

describe("matchesTypeList", () => {
  it("matches exact entry", () => {
    expect(matchesTypeList("aws_s3_bucket", ["aws_s3_bucket"])).toBe(true);
  });

  it("matches prefix entry (ending with _)", () => {
    expect(matchesTypeList("aws_fsx_windows_file_system", ["aws_fsx_"])).toBe(true);
  });

  it("does not match non-exact string without prefix marker", () => {
    expect(matchesTypeList("aws_s3_bucket_object", ["aws_s3_bucket"])).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(matchesTypeList("aws_s3_bucket", [])).toBe(false);
  });

  it("matches the first hit in a list", () => {
    expect(matchesTypeList("aws_db_instance", ["aws_db_instance", "aws_rds_cluster"])).toBe(true);
  });
});

describe("isDataStoreType", () => {
  it("matches aws_db_instance", () => {
    expect(isDataStoreType("aws_db_instance")).toBe(true);
  });

  it("matches aws_dynamodb_table", () => {
    expect(isDataStoreType("aws_dynamodb_table")).toBe(true);
  });

  it("matches aws_s3_bucket", () => {
    expect(isDataStoreType("aws_s3_bucket")).toBe(true);
  });

  it("matches aws_fsx_ prefix family (aws_fsx_windows_file_system)", () => {
    expect(isDataStoreType("aws_fsx_windows_file_system")).toBe(true);
  });

  it("matches aws_fsx_ prefix family (aws_fsx_lustre_file_system)", () => {
    expect(isDataStoreType("aws_fsx_lustre_file_system")).toBe(true);
  });

  it("matches Google Cloud SQL", () => {
    expect(isDataStoreType("google_sql_database_instance")).toBe(true);
  });

  it("matches Azure CosmosDB", () => {
    expect(isDataStoreType("azurerm_cosmosdb_account")).toBe(true);
  });

  it("does not match stateless compute (aws_instance)", () => {
    expect(isDataStoreType("aws_instance")).toBe(false);
  });

  it("does not match aws_s3_bucket_object (suffix — not the bucket itself)", () => {
    expect(isDataStoreType("aws_s3_bucket_object")).toBe(false);
  });

  it("does not match aws_s3_bucket_policy", () => {
    expect(isDataStoreType("aws_s3_bucket_policy")).toBe(false);
  });
});

describe("isIamOrSecurityType", () => {
  it("matches aws_iam_role", () => {
    expect(isIamOrSecurityType("aws_iam_role")).toBe(true);
  });

  it("matches aws_iam_policy", () => {
    expect(isIamOrSecurityType("aws_iam_policy")).toBe(true);
  });

  it("matches aws_security_group", () => {
    expect(isIamOrSecurityType("aws_security_group")).toBe(true);
  });

  it("matches aws_network_acl", () => {
    expect(isIamOrSecurityType("aws_network_acl")).toBe(true);
  });

  it("matches google_iam_binding", () => {
    expect(isIamOrSecurityType("google_iam_binding")).toBe(true);
  });

  it("matches azurerm_role_assignment", () => {
    expect(isIamOrSecurityType("azurerm_role_assignment")).toBe(true);
  });

  it("does not match aws_instance", () => {
    expect(isIamOrSecurityType("aws_instance")).toBe(false);
  });

  it("does not match aws_lambda_function", () => {
    expect(isIamOrSecurityType("aws_lambda_function")).toBe(false);
  });
});

describe("resource tables are non-empty and contain expected anchors", () => {
  it("DATA_STORE_TYPES contains aws_db_instance", () => {
    expect(DATA_STORE_TYPES).toContain("aws_db_instance");
  });

  it("IAM_TYPES contains aws_iam_role", () => {
    expect(IAM_TYPES).toContain("aws_iam_role");
  });

  it("DATA_STORE_TYPES has at least 10 entries", () => {
    expect(DATA_STORE_TYPES.length).toBeGreaterThanOrEqual(10);
  });

  it("IAM_TYPES has at least 10 entries", () => {
    expect(IAM_TYPES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("new resource types added in rounds 47-48 are in the correct tables", () => {
  // Data stores (rounds 47 + fix)
  it("azurerm_redis_cache is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("azurerm_redis_cache");
  });
  it("google_redis_instance is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("google_redis_instance");
  });
  it("google_container_cluster is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("google_container_cluster");
  });
  it("azurerm_kubernetes_cluster is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("azurerm_kubernetes_cluster");
  });
  it("aws_msk_cluster is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("aws_msk_cluster");
  });

  // IAM/security types (round 48)
  it("azurerm_key_vault is in IAM_TYPES", () => {
    expect(IAM_TYPES).toContain("azurerm_key_vault");
  });
  it("aws_kms_key is in IAM_TYPES", () => {
    expect(IAM_TYPES).toContain("aws_kms_key");
  });
  it("google_service_account is in IAM_TYPES", () => {
    expect(IAM_TYPES).toContain("google_service_account");
  });

  // Negative: stateless compute not in either list
  it("aws_lambda_function is in neither DATA_STORE_TYPES nor IAM_TYPES", () => {
    expect(DATA_STORE_TYPES).not.toContain("aws_lambda_function");
    expect(IAM_TYPES).not.toContain("aws_lambda_function");
  });
});

describe("new resource types added in round 61 are in the correct tables", () => {
  // Data store additions (round 61)
  it("aws_kinesis_stream is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("aws_kinesis_stream");
  });
  it("aws_sqs_queue is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("aws_sqs_queue");
  });
  it("aws_documentdb_cluster is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("aws_documentdb_cluster");
  });
  it("google_storage_bucket is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("google_storage_bucket");
  });
  it("google_bigquery_dataset is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("google_bigquery_dataset");
  });
  it("aws_cognito_user_pool is in DATA_STORE_TYPES", () => {
    expect(DATA_STORE_TYPES).toContain("aws_cognito_user_pool");
  });

  // IAM additions (round 61)
  it("google_project_iam_policy is in IAM_TYPES", () => {
    expect(IAM_TYPES).toContain("google_project_iam_policy");
  });
  it("aws_ssm_parameter is in IAM_TYPES", () => {
    expect(IAM_TYPES).toContain("aws_ssm_parameter");
  });
  it("aws_iam_group_policy_attachment is in IAM_TYPES", () => {
    expect(IAM_TYPES).toContain("aws_iam_group_policy_attachment");
  });

  // Stateless compute still not in either list
  it("aws_lambda_function is still in neither table after round 61 additions", () => {
    expect(DATA_STORE_TYPES).not.toContain("aws_lambda_function");
    expect(IAM_TYPES).not.toContain("aws_lambda_function");
  });
});
