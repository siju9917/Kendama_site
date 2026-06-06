/**
 * Data-driven resource type tables for the Terraform destructive-change classifier.
 * Extend by adding entries to the arrays — no logic changes required.
 */

/** Resource types where ANY modification (not just replace/delete) is CRITICAL. */
export const DATA_STORE_TYPES: readonly string[] = [
  "aws_db_instance",
  "aws_db_cluster",
  "aws_rds_cluster",
  "aws_rds_cluster_instance",
  "aws_dynamodb_table",
  "aws_elasticache_cluster",
  "aws_elasticache_replication_group",
  "aws_s3_bucket",
  "aws_efs_file_system",
  "aws_fsx_",           // prefix: all FSx variants (Windows, Lustre, OpenZFS)
  "aws_redshift_cluster",
  "aws_opensearch_domain",
  "aws_elasticsearch_domain",
  "google_sql_database_instance",
  "google_spanner_instance",
  "google_bigtable_instance",
  "google_firestore_database",
  "azurerm_sql_server",
  "azurerm_cosmosdb_account",
  "azurerm_storage_account",
  "azurerm_managed_disk",
];

/** Resource types where any change should be flagged for IAM/security review. */
export const IAM_TYPES: readonly string[] = [
  "aws_iam_role",
  "aws_iam_policy",
  "aws_iam_role_policy",
  "aws_iam_role_policy_attachment",
  "aws_iam_user_policy",
  "aws_iam_group_policy",
  "aws_security_group",
  "aws_security_group_rule",
  "aws_vpc_security_group_ingress_rule",
  "aws_vpc_security_group_egress_rule",
  "aws_network_acl",
  "aws_network_acl_rule",
  "google_iam_binding",
  "google_iam_member",
  "google_iam_policy",
  "google_project_iam_member",
  "google_project_iam_binding",
  "azurerm_role_assignment",
  "azurerm_key_vault_access_policy",
  "azurerm_user_assigned_identity",
];

/**
 * Returns true if the resource type exactly matches an entry or starts with a
 * prefix entry (entries ending with "_" are treated as type-family prefixes).
 */
export function matchesTypeList(type: string, list: readonly string[]): boolean {
  for (const entry of list) {
    if (entry.endsWith("_")) {
      if (type.startsWith(entry)) return true;
    } else {
      if (type === entry) return true;
    }
  }
  return false;
}

export function isDataStoreType(type: string): boolean {
  return matchesTypeList(type, DATA_STORE_TYPES);
}

export function isIamOrSecurityType(type: string): boolean {
  return matchesTypeList(type, IAM_TYPES);
}
