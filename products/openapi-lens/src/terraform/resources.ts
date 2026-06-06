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
  "aws_eks_cluster",
  "google_sql_database_instance",
  "google_spanner_instance",
  "google_bigtable_instance",
  "google_firestore_database",
  "azurerm_sql_server",
  "azurerm_sql_database",
  "azurerm_mysql_server",
  "azurerm_postgresql_server",
  "azurerm_mariadb_server",
  "azurerm_cosmosdb_account",
  "azurerm_storage_account",
  "azurerm_managed_disk",
  "azurerm_redis_cache",        // Azure Redis Cache — in-memory data store; update disrupts cache
  "azurerm_mssql_database",     // Azure SQL (MSSQL variant) — distinct from azurerm_sql_database
  "azurerm_mssql_server",       // Azure SQL managed instance server
  "google_redis_instance",      // Cloud Memorystore Redis — cache loss on update
  "google_memcache_instance",   // Cloud Memorystore Memcached — cache loss on update
  "google_container_cluster",   // GKE cluster — node drain disrupts all workloads (mirrors aws_eks_cluster)
  "azurerm_kubernetes_cluster", // AKS cluster — node drain disrupts all workloads (mirrors aws_eks_cluster)
  "aws_msk_cluster",            // Amazon MSK (Managed Kafka) — in-flight messages at risk on modify
  "aws_kinesis_stream",         // Kinesis Data Streams — in-flight records at risk; shard changes disrupt consumers
  "aws_kinesis_firehose_delivery_stream", // Kinesis Firehose — delivery disruption on config change
  "aws_sqs_queue",              // SQS — in-flight messages lost on queue deletion; visibility changes disrupt consumers
  "aws_documentdb_cluster",     // Amazon DocumentDB (MongoDB-compatible) — in-memory state + replica disruption
  "aws_neptune_cluster",        // Amazon Neptune (graph DB) — data store modification risks graph data
  "aws_timestream_database",    // Amazon Timestream — time-series data store
  "google_storage_bucket",      // GCP Cloud Storage bucket — object data loss risk (mirrors aws_s3_bucket)
  "google_bigquery_dataset",    // BigQuery dataset — schema or access-control changes affect all tables
  "azurerm_storage_container",  // Azure Blob Storage container within a storage account
  "azurerm_data_lake_store",    // Azure Data Lake Store — analytics data loss risk
  "aws_cognito_user_pool",      // Cognito User Pool — user accounts; modification can lock out all users
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
  "azurerm_key_vault",              // vault itself — access policy or SKU changes affect all secrets
  "azurerm_key_vault_secret",       // individual secret rotation or deletion
  "azurerm_key_vault_key",          // encryption key rotation — data encrypted under old key becomes inaccessible
  "aws_iam_policy_attachment",      // attaches policies to users/roles/groups (complements role_policy_attachment)
  "aws_iam_user",                   // user modification can affect auth
  "aws_iam_group",                  // group membership changes propagate to all members
  "aws_kms_key",                    // KMS key disable/delete renders all encrypted data inaccessible
  "google_service_account",         // GCP service account — credential of workload identity
  "google_service_account_key",     // key rotation or deletion breaks authenticating workloads
  "google_service_account_iam_binding",  // bindings grant impersonation
  "google_service_account_iam_member",
  "google_project_iam_policy",           // replaces the entire project IAM policy (highly destructive)
  "aws_cognito_identity_pool",           // Cognito Identity Pool — federated identity provider changes affect auth
  "aws_cognito_user_pool_client",        // app client credentials; rotation breaks all callers using that client
  "azurerm_federated_identity_credential", // workload identity federation — alters OIDC trust relationship
  "aws_iam_group_policy_attachment",     // attaches managed policies to a group (complements group_policy)
  "aws_ssm_parameter",                   // SSM Parameter Store — frequently used to store secrets/credentials
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
