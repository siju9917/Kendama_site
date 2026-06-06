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
